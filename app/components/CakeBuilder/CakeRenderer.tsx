/**
 * The cake canvas.
 *
 * Owns a `<canvas>` and nothing else — no option lists, no steps, no chrome.
 * Everything it draws comes from the props, so the surrounding builder keeps
 * its own design and this stays swappable.
 *
 * ── Why the engine is imported inside an effect ──
 *
 * `compose.ts` reaches for `document`, `createImageBitmap` and `Image` at
 * module scope on the paths it takes. A static import would pull all of that
 * into the server bundle and break the SSR pass for the whole route, so it is
 * imported dynamically the first time the component actually renders in a
 * browser. The import is cached by the bundler, so this costs one await once.
 *
 * ── Why renders are serialised ──
 *
 * A full render is hundreds of milliseconds of synchronous JavaScript. A
 * shopper dragging the photo slider fires far faster than that, and running
 * two composes concurrently would interleave their work on the shared geometry
 * cache. Every render therefore takes a ticket (`revision`) and a late result
 * is discarded rather than painted — otherwise releasing the slider would
 * leave the canvas showing a frame from halfway through the drag.
 */

import {useEffect, useRef, useState, useCallback} from 'react';
// Type-only, so it is erased at build time and pulls no browser code into the
// server bundle. The runtime import of the same module happens in `loadEngine`.
import type {CakeChoice, CakeView, CakeAngle} from '~/lib/cake-render/compose';
// Plain data and pure maths — no browser globals — so a static import is safe
// here where `compose` has to stay dynamic.
import {
  ART_CAMERAS,
  ART_FRAME,
  TOP_ART_CAMERAS,
  artScale,
  projectArt,
} from '~/lib/cake-render/art-camera';
import type {ArtCamera} from '~/lib/cake-render/art-camera';
import type {CutPlan, Pt} from '~/lib/cake-render/art-cut';
import {planCut, assetDims} from '~/lib/cake-render/art-cut';
import {
  growToHeight,
  liftCamera,
  fitDecoration,
} from '~/lib/cake-render/art-height';

export type CakeRendererProps = {
  formatId: string;
  fillingId: string;
  colorId: string;
  decorationId: string;
  creamTheme?: 'white' | 'pink' | 'chocolate';
  view?: CakeView;
  angle?: CakeAngle;
  /** The shopper's uploaded image, as a data URL or object URL. */
  photoSrc?: string | null;
  photo?: {
    scale: number;
    x: number;
    y: number;
    rotation: number;
    shape: 'circle' | 'rectangle';
  };
  text?: {
    value: string;
    color: string;
    scale: number;
    x: number;
    y: number;
    font: string;
  };
  /**
   * Canvas edge in pixels. 940 is the vendor's preview size. Cost is
   * quadratic, so raising this to sharpen the image is expensive — the canvas
   * is already displayed larger than it renders via CSS.
   */
  size?: number;
  className?: string;
  /** Arabic or English, for the loading and error text only. */
  isEn?: boolean;
  /** Fires after every successful paint, with the canvas, for export. */
  onRendered?: (canvas: HTMLCanvasElement) => void;
  /**
   * DOM id for the canvas element.
   *
   * Load-bearing: `CustomCakeBuilder.handleCheckout` captures the preview for
   * the order with `document.getElementById('cake-3d-canvas')`. Drop or rename
   * this and the order still completes — it just silently arrives at the branch
   * with no picture of the cake, which is the kind of failure nobody notices
   * until a baker calls.
   */
  canvasId?: string;
  /**
   * Use Saadeddin's board-and-cake art for the front view. On by default,
   * because the builder's preview is the only caller and wants it. Turning it
   * off puts every view back on the live renderer, which is what an export
   * wanting the decoration and the message drawn would ask for.
   */
  showBoard?: boolean;
};

type PhotoOpts = {
  scale: number;
  x: number;
  y: number;
  rotation: number;
  shape: 'circle' | 'rectangle';
};
const DEFAULT_PHOTO: PhotoOpts = {
  scale: 1,
  x: 0,
  y: 0,
  rotation: 0,
  shape: 'circle',
};
const DEFAULT_TEXT = {
  value: '',
  color: '#6d3747',
  scale: 1,
  x: 0,
  y: -0.2,
  font: 'Noto Sans Arabic',
};

/**
 * The front view is Saadeddin's own art; the other views are the engine.
 *
 * ── Why the art replaces the render here rather than sitting under it ──
 *
 * The obvious move was to keep rendering the cake and slide the board art
 * underneath. I measured whether the two pipelines agree, and they only agree
 * for round cakes. Stretching each silhouette to a common box and comparing:
 *
 *     round-20x20-h8        engine 1.497   art 1.243   IoU 0.997
 *     square-30x30-h8       engine 1.583   art 1.558   IoU 0.950
 *     rectangle-100x80-h8   engine 2.734   art 2.060   IoU 0.872
 *
 * Round is a pure scale, so it registers. Square and rectangle differ in SHAPE,
 * not just proportion — a different camera azimuth — so no scale-and-translate
 * puts an engine-rendered box cake on an art board correctly. On screen the
 * cake hung off the front edge.
 *
 * Within one set the layers are registered to each other by construction. So
 * for the front view both come from the art and there is no registration maths
 * at all: draw the board frame, draw the cake frame, done.
 *
 * ── What the art shows today ──
 *
 * The art is one still per format, and everything the shopper chooses is
 * drawn onto it: the colour is a multiply of the white master, the toppings
 * are the vendor's overlay frames, and the written message and the photo
 * print are laid on the top face through the art camera (`paintOnFace`). The
 * capture that travels to the branch is that same picture. The engine is
 * reached only for formats the art cannot serve.
 */

/** Formats with their own art. Everything else borrows the nearest. */
const ART_FORMATS = [
  'round-15x15-h8', 'round-20x20-h8', 'round-25x25-h8', 'round-30x30-h8',
  'round-40x40-h8', 'round-50x50-h8', 'round-15x15-h14', 'round-20x20-h14',
  'round-25x25-h14', 'round-30x30-h14', 'round-40x40-h14', 'round-50x50-h14',
  'square-15x15-h8', 'square-20x20-h8', 'square-25x25-h8', 'square-30x30-h8',
  'square-40x40-h8', 'square-50x50-h8', 'rectangle-30x20-h8',
  'rectangle-40x30-h8', 'rectangle-60x40-h8', 'rectangle-80x60-h8',
  'rectangle-100x80-h8',
];

/**
 * Which art to use for a format.
 *
 * 23 formats have art and the catalog holds 150, so a 90 cm round or a 12 cm
 * square borrows the nearest of its own shape — height first, then footprint.
 * Height leads because it changes the cake's proportions visibly, while a
 * footprint that is slightly off just reads as a slightly different cake.
 */
function artFor(cfg: any): string | null {
  if (!cfg?.shape) return null;
  if (ART_FORMATS.includes(cfg.id)) return cfg.id;
  const candidates = ART_FORMATS.filter((k) => k.startsWith(cfg.shape + '-'));
  if (!candidates.length) return null;

  const area = cfg.width * cfg.depth;
  let best = candidates[0];
  let bestScore = Infinity;
  for (const key of candidates) {
    const m = key.match(/^[a-z]+-(\d+)x(\d+)-h(\d+)$/);
    if (!m) continue;
    const score =
      Math.abs(Number(m[3]) - cfg.height) * 10 +
      Math.abs(Number(m[1]) * Number(m[2]) - area) / Math.max(area, 1);
    if (score < bestScore) {
      bestScore = score;
      best = key;
    }
  }
  return best;
}

/** Decoded once and kept — the preview repaints on every keystroke. */
const artImages = new Map<string, Promise<HTMLImageElement | null>>();
function artImage(path: string): Promise<HTMLImageElement | null> {
  let pending = artImages.get(path);
  if (!pending) {
    pending = new Promise<HTMLImageElement | null>((resolve) => {
      const img = new Image();
      img.onload = () => resolve(img);
      // A missing layer must never take the whole preview down.
      img.onerror = () => resolve(null);
      img.src = path;
    });
    artImages.set(path, pending);
  }
  return pending;
}

/**
 * Tint the white cake master, keeping its shading AND its soft edges.
 *
 * The tint itself is a plain multiply: every channel of the master scaled by
 * the swatch. That is the same operation the engine performs on its own fondant
 * photograph, which is why these values come from the client's printed swatches
 * rather than a hand-picked hex.
 *
 * It is done on the pixels rather than with `globalCompositeOperation`, and
 * that is the whole point of this function.
 *
 * Canvas blend modes composite with source-over semantics, so an opaque source
 * over a backdrop of alpha `ab` produces
 *
 *     co = (1 - ab) * Cs  +  ab * (Cb * Cs)
 *
 * Where the cake is solid, `ab` is 1, the first term vanishes and the result is
 * the correct `Cb * Cs`. Where `ab` is less than 1 the first term takes over and
 * paints the fondant colour at close to full strength — and about 11% of a cake
 * frame is exactly that: the contact shadow and the anti-aliased rim. Measured
 * on square-20x20-h8 against a teal swatch, the 9,400 pixels at alpha 0.35 came
 * out (67, 113, 107) where they should be (0, 1, 1). The cake's shadow was not
 * being tinted, it was being replaced, and it spilled across the board as a
 * coloured wash. A `destination-in` pass afterwards restores the silhouette but
 * cannot undo the colour.
 *
 * Multiplying the channels directly has no such term: solid pixels come out
 * bit-identical to the old path, and only the soft ones change. Alpha is never
 * touched, so the shadow keeps its shape and stays a shadow.
 *
 * A null `rgb` is the white master itself, left alone — multiplying it by its
 * own sampled grey would quietly darken every uncoloured cake.
 */
const tintCache = new Map<string, HTMLCanvasElement>();
/** Small on purpose: a handful of swatches at one size, not a leak. */
const TINT_CACHE_MAX = 24;

function tintedCake(
  img: CanvasImageSource,
  edge: number,
  rgb: [number, number, number] | null,
  key: string,
): HTMLCanvasElement {
  const hit = tintCache.get(key);
  if (hit) return hit;

  const c = document.createElement('canvas');
  c.width = edge;
  c.height = edge;
  // `willReadFrequently` keeps the canvas CPU-side; without it the getImageData
  // below forces a GPU readback on every swatch the shopper tries.
  const g = c.getContext('2d', {willReadFrequently: true})!;
  g.drawImage(img, 0, 0, edge, edge);

  if (rgb) {
    const frame = g.getImageData(0, 0, edge, edge);
    const px = frame.data;
    const kr = rgb[0] / 255;
    const kg = rgb[1] / 255;
    const kb = rgb[2] / 255;
    for (let i = 0; i < px.length; i += 4) {
      // Fully transparent pixels carry no colour worth scaling, and they are
      // most of the frame.
      if (px[i + 3] === 0) continue;
      px[i] = px[i] * kr;
      px[i + 1] = px[i + 1] * kg;
      px[i + 2] = px[i + 2] * kb;
    }
    g.putImageData(frame, 0, 0);
  }

  if (tintCache.size >= TINT_CACHE_MAX) {
    const oldest = tintCache.keys().next().value;
    if (oldest !== undefined) tintCache.delete(oldest);
  }
  tintCache.set(key, c);
  return c;
}

/**
 * Writing on the cake without leaving the photograph.
 *
 * A message or a printed photo used to hand the whole preview to the 3D
 * engine, because "the shopper's own content on a surface needs real
 * geometry". It does not. The top face of the cake is a flat plane, and the
 * art camera is an affine map of that plane: `projectArt` already puts every
 * (x, y) of the top face on its pixel. Anything flat drawn in cake
 * centimetres and pushed through that same 2x2 lands on the top face in the
 * art's own perspective — foreshortened, tilted, exactly where a real message
 * would be. So the message is set in an offscreen canvas at a fixed
 * pixels-per-centimetre and drawn through the face transform. The photograph
 * stays; the cake the shopper has been looking at keeps its board, its colour
 * and its toppings, and gains the words.
 *
 * Reading direction is chosen on screen, not in cake space. Of the four cake
 * axes, the text runs along the one that projects most nearly rightward and
 * stands up along the one that projects most nearly upward; the affine is
 * built from those two vectors, so the text can never come out mirrored
 * whatever sign the art's determinant has.
 */
type Face = {
  /** The 2x2 of the art camera on the top face, column-major [a, c, b, d]. */
  m: [number, number, number, number];
  /** Where cake-space (0, 0) on the top face lands, in art pixels. */
  o: [number, number];
  /** Half-extents of the face in centimetres. */
  hx: number;
  hy: number;
  round: boolean;
};

function topFace(cam: ArtCamera, asset: string): Face | null {
  const dims = assetDims(asset);
  if (!dims) return null;
  if (cam.kind === 'round') {
    return {m: [cam.kx, 0, 0, cam.ky], o: [cam.cx, cam.cy], hx: dims.w / 2, hy: dims.d / 2, round: true};
  }
  const [a, b, ox, c, d, oy] = cam.m;
  return {m: [a, c, b, d], o: [ox, oy], hx: dims.w / 2, hy: dims.d / 2, round: false};
}

/** Reading frame on the face: `u` runs rightward on screen, `v` upward. */
function readingFrame(face: Face): {u: [number, number]; v: [number, number]} {
  const [a, c, b, d] = face.m;
  const screen = (e: [number, number]): [number, number] => [a * e[0] + b * e[1], c * e[0] + d * e[1]];
  const axes: Array<[number, number]> = [[1, 0], [-1, 0], [0, 1], [0, -1]];
  const rightness = (e: [number, number]) => {
    const s = screen(e);
    return s[0] / Math.hypot(s[0], s[1]);
  };
  const upness = (e: [number, number]) => {
    const s = screen(e);
    return -s[1] / Math.hypot(s[0], s[1]);
  };
  const u = axes.reduce((best, e) => (rightness(e) > rightness(best) ? e : best));
  const v = axes
    .filter((e) => e[0] * u[0] + e[1] * u[1] === 0)
    .reduce((best, e) => (upness(e) > upness(best) ? e : best));
  return {u, v};
}

/**
 * Set the context so that drawing in "flat canvas pixels at K px/cm, origin
 * at the centre, x right, y down" lands on the top face around cake-space
 * `centre`, with `k` the canvas pixels per art pixel.
 */
function enterFace(
  ctx: CanvasRenderingContext2D,
  face: Face,
  k: number,
  K: number,
  centre: [number, number],
  rotation = 0,
) {
  const {u, v} = readingFrame(face);
  const [a, c, b, d] = face.m;
  const cosR = Math.cos(rotation);
  const sinR = Math.sin(rotation);
  // Rotate the reading frame in the face plane before projecting it.
  const ur: [number, number] = [u[0] * cosR + v[0] * sinR, u[1] * cosR + v[1] * sinR];
  const vr: [number, number] = [v[0] * cosR - u[0] * sinR, v[1] * cosR - u[1] * sinR];
  const col = (e: [number, number], sign: number) => [
    (sign * k * (a * e[0] + b * e[1])) / K,
    (sign * k * (c * e[0] + d * e[1])) / K,
  ];
  const [A, B] = col(ur, 1);
  const [C, D] = col(vr, -1);
  const E = k * (a * centre[0] + b * centre[1] + face.o[0]);
  const F = k * (c * centre[0] + d * centre[1] + face.o[1]);
  ctx.setTransform(A, B, C, D, E, F);
}

/** Set the context to cake-space centimetres on the top face. */
function enterFaceCm(ctx: CanvasRenderingContext2D, face: Face, k: number) {
  const [a, c, b, d] = face.m;
  ctx.setTransform(k * a, k * c, k * b, k * d, k * face.o[0], k * face.o[1]);
}

/** Draw a flat image on the top face so that its width spans `widthCm`. */
function drawOnFace(
  ctx: CanvasRenderingContext2D,
  face: Face,
  k: number,
  img: CanvasImageSource,
  imgW: number,
  imgH: number,
  widthCm: number,
  centre: [number, number],
  rotation = 0,
) {
  const K = imgW / widthCm; // the image's own pixels per centimetre
  ctx.save();
  enterFace(ctx, face, k, K, centre, rotation);
  ctx.drawImage(img, -imgW / 2, -imgH / 2, imgW, imgH);
  ctx.restore();
}

const photoImages = new Map<string, Promise<HTMLImageElement | null>>();
function userImage(src: string): Promise<HTMLImageElement | null> {
  let pending = photoImages.get(src);
  if (!pending) {
    pending = new Promise<HTMLImageElement | null>((resolve) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => resolve(null);
      img.src = src;
    });
    if (photoImages.size > 4) photoImages.clear();
    photoImages.set(src, pending);
  }
  return pending;
}

/**
 * The message and the printed photo, on the art's top face.
 *
 * Sizes are in centimetres of cake, so a message is the same size on a 20 cm
 * and a 50 cm cake in the shopper's kitchen — and therefore smaller on screen
 * for the bigger cake, as it should be. `text.x`/`text.y` and `photo.x`/
 * `photo.y` are fractions of the face's half-extents, in the reading frame.
 */
async function paintOnFace(
  ctx: CanvasRenderingContext2D,
  cam: ArtCamera,
  asset: string,
  edge: number,
  text: typeof DEFAULT_TEXT,
  photo: PhotoOpts,
  photoSrc: string | null | undefined,
) {
  const face = topFace(cam, asset);
  if (!face) return;
  const k = edge / ART_FRAME;
  const {u, v} = readingFrame(face);
  // Extents along the reading axes, in cm.
  const along = Math.abs(u[0]) ? face.hx : face.hy;
  const across = Math.abs(u[0]) ? face.hy : face.hx;
  const at = (fx: number, fy: number): [number, number] => [
    u[0] * fx * along + v[0] * fy * across,
    u[1] * fx * along + v[1] * fy * across,
  ];

  if (photoSrc) {
    const img = await userImage(photoSrc);
    if (img && img.naturalWidth) {
      const maxCm = Math.min(along, across) * 1.2 * (photo.scale || 1);
      const ratio = img.naturalHeight / img.naturalWidth;
      const wCm = ratio > 1 ? maxCm / ratio : maxCm;
      const hCm = wCm * ratio;
      // Clip to the print's own shape, then to the face, both in cake cm.
      ctx.save();
      const centre = at(photo.x || 0, photo.y || 0);
      enterFaceCm(ctx, face, k);
      ctx.beginPath();
      if (face.round) ctx.ellipse(0, 0, face.hx - 0.4, face.hy - 0.4, 0, 0, Math.PI * 2);
      else ctx.rect(-face.hx + 0.4, -face.hy + 0.4, 2 * face.hx - 0.8, 2 * face.hy - 0.8);
      ctx.clip();
      const rotation = ((photo.rotation || 0) * Math.PI) / 180;
      const K = img.naturalWidth / wCm;
      enterFace(ctx, face, k, K, centre, rotation);
      ctx.beginPath();
      if (photo.shape === 'circle') {
        const r = (Math.min(wCm, hCm) / 2) * K;
        ctx.arc(0, 0, r, 0, Math.PI * 2);
      } else {
        ctx.rect((-wCm / 2) * K, (-hCm / 2) * K, wCm * K, hCm * K);
      }
      ctx.clip();
      ctx.drawImage(img, (-wCm / 2) * K, (-hCm / 2) * K, wCm * K, hCm * K);
      ctx.restore();
    }
  }

  const value = text.value.trim();
  if (!value) return;

  // Set the type at 60 px per centimetre, then fit: no wider than 78% of the
  // face along the reading axis, no taller than 22% of it across.
  const K = 60;
  const maxW = along * 2 * 0.78 * K;
  let fontCm = Math.min(across * 2 * 0.22, 3.2) * (text.scale || 1);
  const family = text.font || 'Noto Sans Arabic';
  try {
    await (document as any).fonts?.load(`700 ${Math.round(fontCm * K)}px "${family}"`, value);
  } catch {
    // The fallback face is fine; better a message in the wrong font than none.
  }
  const measure = document.createElement('canvas').getContext('2d')!;
  measure.font = `700 ${fontCm * K}px "${family}", "Noto Sans Arabic", sans-serif`;
  const width = measure.measureText(value).width;
  if (width > maxW) fontCm *= maxW / width;
  const px = fontCm * K;
  const pad = px * 0.5;
  const sheet = document.createElement('canvas');
  sheet.width = Math.ceil(Math.min(width, maxW) + pad * 2);
  sheet.height = Math.ceil(px * 1.5 + pad);
  const sg = sheet.getContext('2d')!;
  sg.font = `700 ${px}px "${family}", "Noto Sans Arabic", sans-serif`;
  sg.textAlign = 'center';
  sg.textBaseline = 'middle';
  sg.fillStyle = text.color || DEFAULT_TEXT.color;
  sg.fillText(value, sheet.width / 2, sheet.height / 2);

  const widthCm = sheet.width / K;
  drawOnFace(ctx, face, k, sheet, sheet.width, sheet.height, widthCm, at(text.x || 0, text.y || 0));
}

/**
 * Paint the front view from the art. Returns false when it cannot, so the
 * caller falls through to the engine rather than showing an empty canvas.
 */
async function paintArt(
  ctx: CanvasRenderingContext2D,
  formatId: string,
  colorId: string,
  decorationId: string,
  fillingId: string,
  edge: number,
  /**
   * `whole` is the iced cake; `cut` is the same cake with a wedge taken out.
   *
   * There is no second set of stills for the cut. There does not need to be:
   * the wedge is removed from THIS one, in the art's own camera, and the faces
   * it exposes are filled with the cross-section photograph of the chosen
   * flavour. See `art-cut.ts`. A supplied `cakes-cut/` set would still be
   * better — a real render knows about crumb and a soft inner edge — but this
   * is the same cake, at the same angle, on the same board, today.
   */
  variant: 'whole' | 'cut' = 'whole',
  /** The shopper's own additions, drawn on the top face. */
  extras: {
    text: typeof DEFAULT_TEXT;
    photo: PhotoOpts;
    photoSrc?: string | null;
  } = {text: DEFAULT_TEXT, photo: DEFAULT_PHOTO, photoSrc: null},
): Promise<boolean> {
  const {findFormat, findColor} = await import('~/lib/cake-render/catalog');
  const format = findFormat(formatId);
  const asset = artFor(format);
  if (!asset) return false;

  const [board, cake] = await Promise.all([
    artImage(`/cake/v5/boards/${asset}.webp`),
    artImage(`/cake/v5/cakes/${asset}.webp`),
  ]);
  if (!board || !cake) return false;

  const colour = findColor(colorId);
  const rgb = !colour || colour.id === '00' ? null : colour.rgb;

  /*
    The still is 8 cm and the shopper may have bought 12. Grow it before
    anything else measures it — the tint, the toppings and the cut all have to
    agree about how tall this cake is.
  */
  const cam = ART_CAMERAS[asset];
  const tall =
    cam && format
      ? growToHeight(cake, cam, asset, format.height, edge, ART_FRAME)
      : {source: cake, lift: 0, liftArt: 0, height: assetDims(asset)?.h ?? 0};
  const camShown = cam ? liftCamera(cam, tall.liftArt) : null;

  const cut =
    variant === 'cut' && camShown
      ? await planCutFor(camShown, asset, edge, fillingId, tall.height)
      : null;
  // A cut we cannot place is not worth guessing at: show the cake whole rather
  // than a hole in the wrong spot.
  if (variant === 'cut' && !cut) return false;

  ctx.drawImage(board, 0, 0, edge, edge);

  if (cut) paintCutFaces(ctx, cut.plan, cut.filling);

  const layer = document.createElement('canvas');
  layer.width = edge;
  layer.height = edge;
  const lg = layer.getContext('2d', {willReadFrequently: true})!;
  lg.drawImage(
    tintedCake(
      tall.source,
      edge,
      rgb,
      `cakes/${asset}@${edge}:${colorId}:h${tall.height}`,
    ),
    0,
    0,
    edge,
    edge,
  );
  if (cut) {
    eraseCut(lg, cut.plan.silhouette, edge, Math.round(edge * 0.015), {
      raw: tall.source,
      minLuminance: 60,
    });
  }

  /*
    The toppings are cut on their own layer with a deeper sweep and no shadow
    guard: piping is light, hangs below the lip, and has no shadow of its own.
  */
  const deco = document.createElement('canvas');
  deco.width = edge;
  deco.height = edge;
  const dg = deco.getContext('2d')!;
  await paintDecorations(
    dg,
    asset,
    decorationId,
    edge,
    cam && format
      ? (img) =>
          fitDecoration(
            img,
            cam,
            asset,
            decorationId,
            format.height,
            edge,
            ART_FRAME,
          )
      : undefined,
  );
  // The message and the print go on the same layer as the toppings: flat on
  // the (possibly lifted) top face, in the art's own camera.
  if (camShown && (extras.photoSrc || extras.text.value.trim())) {
    await paintOnFace(dg, camShown, asset, edge, extras.text, extras.photo, extras.photoSrc);
  }
  if (cut) eraseCut(dg, cut.plan.silhouette, edge, Math.round(edge * 0.023), null);
  lg.drawImage(deco, 0, 0);

  ctx.drawImage(layer, 0, 0);
  return true;
}

/**
 * Paint the top view from the overhead art (`/cake/v5/top/`).
 *
 * The same three layers as the front — board, tinted cake, toppings — from a
 * second set rendered straight down, and the message and photo laid on the
 * top face through `TOP_ART_CAMERAS`. Overhead, the top face IS the picture:
 * it is a true circle, so the face transform is a plain scale and the writing
 * reads flat, the way a shopper checks spelling on a real cake.
 *
 * Round only: that is the set Saadeddin supplied. Height needs no growing
 * here either — from above an 8 cm and a 10 cm cake are the same disc — so a
 * borrowed still is chosen by `artFor` exactly as for the front, and nothing
 * is stretched. Returns false for anything it cannot serve.
 */
async function paintTopArt(
  ctx: CanvasRenderingContext2D,
  formatId: string,
  colorId: string,
  decorationId: string,
  edge: number,
  extras: {
    text: typeof DEFAULT_TEXT;
    photo: PhotoOpts;
    photoSrc?: string | null;
  },
): Promise<boolean> {
  const {findFormat, findColor} = await import('~/lib/cake-render/catalog');
  const format = findFormat(formatId);
  if (format?.shape !== 'round') return false;
  const asset = artFor(format);
  const cam = asset ? TOP_ART_CAMERAS[asset] : undefined;
  if (!asset || !cam) return false;

  const [board, cake] = await Promise.all([
    artImage(`/cake/v5/top/boards/${asset}.webp`),
    artImage(`/cake/v5/top/cakes/${asset}.webp`),
  ]);
  if (!board || !cake) return false;

  const colour = findColor(colorId);
  const rgb = !colour || colour.id === '00' ? null : colour.rgb;

  ctx.drawImage(board, 0, 0, edge, edge);
  ctx.drawImage(
    tintedCake(cake, edge, rgb, `top/cakes/${asset}@${edge}:${colorId}`),
    0,
    0,
    edge,
    edge,
  );

  if (decorationId && decorationId !== 'none') {
    const deco = await artImage(`/cake/v5/top/toppings/${decorationId}/${asset}.webp`);
    // A decoration with no overlay leaves a plain cake, never a blank canvas.
    if (deco) ctx.drawImage(deco, 0, 0, edge, edge);
  }

  if (extras.photoSrc || extras.text.value.trim()) {
    await paintOnFace(ctx, cam, asset, edge, extras.text, extras.photo, extras.photoSrc);
  }
  return true;
}

/**
 * Punch the cut out of a layer.
 *
 * The outline is exact geometry, but the photograph is not: the real cake has
 * a rounded lip that bulges a few pixels below the geometric base, and piping
 * hangs off that lip further still. Erasing the outline alone left a green
 * sliver and a row of pearls lying on the board where the slice used to be.
 *
 * So the outline is SWEPT DOWNWARD by `sweep` pixels — every copy of it from 0
 * to `sweep` lower is filled too. Down only: below the removed piece there is
 * only lip, piping and board, while above and beside it is the cake left
 * standing, which must not be touched.
 *
 * `guard` keeps the contact shadow. It is baked into the still, it is
 * near-black, and the cake — even dark fondant — is a white master, so a
 * luminance threshold on the UNTINTED still separates the two cleanly where an
 * alpha threshold could not (the lip is fully opaque).
 */
function eraseCut(
  g: CanvasRenderingContext2D,
  silhouette: Pt[][],
  edge: number,
  sweep: number,
  guard: {raw: CanvasImageSource; minLuminance: number} | null,
) {
  const mask = document.createElement('canvas');
  mask.width = edge;
  mask.height = edge;
  const mg = mask.getContext('2d', {willReadFrequently: true})!;
  mg.fillStyle = '#000';
  for (let t = 0; t <= sweep; t += 2) {
    for (const poly of silhouette) {
      tracePoly(mg, poly.map(([x, y]) => [x, y + t] as Pt), true);
    }
  }

  if (!guard) {
    g.globalCompositeOperation = 'destination-out';
    g.drawImage(mask, 0, 0);
    g.globalCompositeOperation = 'source-over';
    return;
  }

  const probe = document.createElement('canvas');
  probe.width = edge;
  probe.height = edge;
  const pg = probe.getContext('2d', {willReadFrequently: true})!;
  pg.drawImage(guard.raw, 0, 0, edge, edge);

  const m = mg.getImageData(0, 0, edge, edge).data;
  const r = pg.getImageData(0, 0, edge, edge).data;
  const frame = g.getImageData(0, 0, edge, edge);
  const px = frame.data;
  const min = guard.minLuminance;
  for (let i = 0; i < px.length; i += 4) {
    const cover = m[i + 3];
    if (!cover) continue;
    const lum = (r[i] + r[i + 1] + r[i + 2]) / 3;
    if (lum <= min) continue;
    px[i + 3] = (px[i + 3] * (255 - cover)) / 255;
  }
  g.putImageData(frame, 0, 0);
}

/** Trace a polygon, optionally filling it. */
function tracePoly(g: CanvasRenderingContext2D, poly: Pt[], fill = false) {
  if (poly.length < 3) return;
  g.beginPath();
  g.moveTo(poly[0][0], poly[0][1]);
  for (let i = 1; i < poly.length; i++) g.lineTo(poly[i][0], poly[i][1]);
  g.closePath();
  if (fill) g.fill();
}

/**
 * Everything the cut needs, or null if any of it is missing.
 *
 * Kept apart from the painting so a missing filling photograph or an unmeasured
 * format fails before a single pixel has been drawn.
 */
async function planCutFor(
  cam: ArtCamera,
  asset: string,
  edge: number,
  fillingId: string,
  heightCm: number,
): Promise<{plan: CutPlan; filling: HTMLImageElement} | null> {
  const plan = planCut(cam, asset, edge / ART_FRAME, heightCm);
  if (!plan) return null;
  const filling = await artImage(`/cake/v5/fillings/filling-${fillingId}.webp`);
  return filling ? {plan, filling} : null;
}

/** Push a polygon's corners out from its centre by `px`. */
function outset(poly: Pt[], px: number): Pt[] {
  const cx = poly.reduce((a, p) => a + p[0], 0) / poly.length;
  const cy = poly.reduce((a, p) => a + p[1], 0) / poly.length;
  return poly.map(([x, y]) => {
    const d = Math.hypot(x - cx, y - cy) || 1;
    return [x + ((x - cx) / d) * px, y + ((y - cy) / d) * px] as Pt;
  });
}

/**
 * Paint the exposed faces with the flavour's own cross-section.
 *
 * Each face is a rectangle of cake, so under an axonometric camera it lands as
 * a parallelogram — which an affine transform maps a photograph onto exactly,
 * no sampling of our own. The texture spans the cake's full height, so its
 * vertical axis is the wall from board to icing with nothing to align by hand.
 *
 * The shade is a flat black wash rather than a multiply: these are interior
 * walls a few centimetres inside a cake, and the thing that sells them is being
 * plainly darker than the lit exterior, not a lighting model.
 */
function paintCutFaces(
  ctx: CanvasRenderingContext2D,
  plan: CutPlan,
  filling: HTMLImageElement,
) {
  const tw = filling.naturalWidth || filling.width;
  const th = filling.naturalHeight || filling.height;
  if (!tw || !th) return;

  for (const face of plan.faces) {
    /*
      Grown by a pixel and a bit, and the TEXTURE grows with it.

      Two clipped parallelograms meeting along a corner each antialias their
      own edge, and the board showed through the hairline between them. An
      earlier version grew only the clip, which just showed the board through
      the new margin instead as a dark outline. The mapping has to be built
      from the grown corners too, so the margin is cake and not board.
    */
    const q = outset(
      [
        face.tl,
        face.tr,
        [face.tr[0] + (face.bl[0] - face.tl[0]), face.tr[1] + (face.bl[1] - face.tl[1])],
        face.bl,
      ],
      1.2,
    );
    const [tl, tr, , bl] = q;
    const [ax, ay] = [tr[0] - tl[0], tr[1] - tl[1]];
    const [bx, by] = [bl[0] - tl[0], bl[1] - tl[1]];
    if (Math.abs(ax * by - ay * bx) < 1e-6) continue;
    const quad = q;

    ctx.save();
    tracePoly(ctx, quad);
    ctx.clip();
    ctx.transform(ax / tw, ay / tw, bx / th, by / th, tl[0], tl[1]);
    ctx.drawImage(filling, 0, 0);
    ctx.restore();

    ctx.save();
    tracePoly(ctx, quad);
    ctx.clip();
    ctx.fillStyle = `rgba(0, 0, 0, ${(1 - face.shade).toFixed(3)})`;
    ctx.fill();
    ctx.restore();
  }
}

/**
 * Toppings: Saadeddin's own overlay, not sprites placed by us.
 *
 * The first version of this projected each piece itself — it recovered the
 * art's camera from the frames, took the positions `decorationInstances`
 * already gives in centimetres, and drew the sprites. It worked, and the
 * recovered camera stays in `art-camera.ts` because the printed message and the
 * photo will need it.
 *
 * It is not what runs here. The supplied `toppings/` set is one overlay per
 * decoration per format, rendered in the same scene as the cake and the board,
 * so it is registered to them by construction and lands with no maths at all —
 * and being a render rather than a scatter of flat cutouts it carries its own
 * shading and contact shadows. A measured camera is a good answer to a missing
 * asset and a poor substitute for having it.
 *
 * Drawn after the tinted cake, so the fondant colour sits UNDER the toppings
 * rather than washing over them: a cherry does not change colour because the
 * icing did.
 */
async function paintDecorations(
  ctx: CanvasRenderingContext2D,
  asset: string,
  decorationId: string,
  edge: number,
  /** Re-fits the overlay when the cake has been grown past the still. */
  fit?: (img: HTMLImageElement) => CanvasImageSource,
) {
  if (!decorationId || decorationId === 'none') return;
  const img = await artImage(`/cake/v5/toppings/${decorationId}/${asset}.webp`);
  // A decoration with no overlay leaves a plain cake, never a blank canvas.
  if (!img) return;
  ctx.drawImage(fit ? fit(img) : img, 0, 0, edge, edge);
}

/**
 * Put the engine's cake exactly where the art's cake would be, and bend the
 * board to the engine's camera so the two agree.
 *
 * TWO things have to line up, and they fail differently.
 *
 * SIZE. `prepareGeometry` fits every view on its own: it measures the mesh's
 * bounding box for that view AND that angle, then scales it to fill 79% of the
 * canvas (`render-core.ts`, the `sc = Math.min(size*frame/...)` line). A cut
 * cake has a different bounding box than a whole one, so each view arrived at
 * its own magnification and the cake changed size when the shopper pressed a
 * button. The cure is to divide the engine's pixels-per-centimetre by the art's
 * and draw through the ratio, so every view lands at the art's magnification.
 *
 * Measured the same way on both sides, which is shape-dependent. For a box it
 * is the screen length of the unit x edge — `hypot(cp, sp*S)` on the engine,
 * `hypot(m0, m3)` on the art. For a cylinder the top face is a circle, so its
 * horizontal radius is `scale` whatever the azimuth, and bringing the azimuth
 * into it would be wrong.
 *
 * ORIENTATION. The board is a photograph. Its own rotation is baked into the
 * pixels and no 2D transform can turn it. So the cake must not turn either: the
 * only engine cameras usable here are the ones that keep the art's azimuth,
 * which for a box means 22 degrees — `original` and `high`. `side` turns a box
 * by 67 degrees and the cake sits visibly skew on its own board.
 *
 * Elevation is the one axis that IS free, because the board is flat. Between
 * two cameras of the same azimuth, a point of the ground plane moves by a pure
 * vertical scale of sin(elevation), so stretching the board by `S_engine/S_art`
 * about the base centre is not a fudge — it is the same board seen from the
 * new height, wordmark and all. At 52 degrees that is 1.66x, and the stretched
 * board still sits inside the frame.
 *
 * The anchor is the centre of the BASE, not of the cake. Cakes sit on boards,
 * so matching the footprint is what makes one look placed rather than floating,
 * and the engine projects cake-space (0, 0, 0) to exactly `(camera.cx,
 * camera.cy)`, which costs nothing to read.
 *
 * Returns null when the format has no measured camera, in which case the caller
 * draws the engine's own framing and no board, as before.
 */
function artRegistration(
  asset: string | null,
  height: number,
  geometry: any,
  edge: number,
): {k: number; dx: number; dy: number; boardY: number; anchorY: number} | null {
  if (!asset) return null;
  const cam = ART_CAMERAS[asset];
  const c = geometry?.camera;
  if (!cam || !c || !(c.scale > 0)) return null;

  const s = edge / ART_FRAME;

  const engineAcross =
    cam.kind === 'round'
      ? c.scale
      : c.scale * Math.hypot(c.cp ?? 1, (c.sp ?? 0) * (c.S ?? 0));
  const k = (artScale(cam) * s) / engineAcross;
  if (!Number.isFinite(k) || k <= 0) return null;

  // How hard each camera squashes the ground plane.
  const artS =
    cam.kind === 'round'
      ? cam.ky / cam.kx
      : Math.hypot(cam.m[3], cam.m[4]) / Math.hypot(cam.m[0], cam.m[1]);
  const boardY = artS > 0 && c.S > 0 ? c.S / artS : 1;

  const [bx, by] = projectArt(cam, 0, 0, 0, height);
  return {
    k,
    dx: bx * s - k * c.cx,
    dy: by * s - k * c.cy,
    boardY: Number.isFinite(boardY) && boardY > 0 ? boardY : 1,
    anchorY: by * s,
  };
}

type Engine = typeof import('~/lib/cake-render/compose');

let enginePromise: Promise<Engine> | null = null;
function loadEngine(): Promise<Engine> {
  if (!enginePromise) enginePromise = import('~/lib/cake-render/compose');
  return enginePromise;
}

export default function CakeRenderer({
  formatId,
  fillingId,
  colorId,
  decorationId,
  creamTheme = 'white',
  view = 'whole',
  angle = 'original',
  photoSrc = null,
  photo = DEFAULT_PHOTO,
  text = DEFAULT_TEXT,
  size = 940,
  className = '',
  isEn = false,
  onRendered,
  canvasId,
  showBoard = true,
}: CakeRendererProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const revision = useRef(0);
  // The decoded upload, kept out of React state: it is a multi-megabyte typed
  // array and re-rendering on it would be pure cost.
  const decodedPhoto = useRef<{src: string; texture: any} | null>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');

  const draw = useCallback(async () => {
    const token = ++revision.current;
    setStatus((s) => (s === 'ready' ? s : 'loading'));

    try {
      /*
        The front view short-circuits the engine entirely.

        It is not only that the art looks better: skipping composeCake saves a
        few hundred milliseconds of synchronous work on the view the shopper
        spends most of their time on, and the art needs no photo decode either.
        Anything it cannot serve — an unknown format, a missing file — returns
        false and falls through to the render below, so the preview degrades to
        the old behaviour rather than to an empty canvas.
      */
      /*
        Nothing sends the preview back to the engine any more. Toppings are
        drawn on the art, and so are the two things that used to be the
        exception — a message written on the cake and a photo printed on it.
        Both are flat content on the top face, and the top face is a plane the
        art camera maps affinely (`paintOnFace`). Writing a message no longer
        swaps Saadeddin's cake for a different one; the engine is only reached
        when the art cannot serve the format at all.
      */
      const artVariant: 'whole' | 'cut' | 'top' | null =
        view === 'whole' && angle === 'high' ? 'top'
        : angle !== 'original' ? null
        : view === 'whole' ? 'whole'
        : view === 'cut' ? 'cut'
        : null;

      if (showBoard && artVariant) {
        const canvas = canvasRef.current;
        if (canvas) {
          const edge = size;
          canvas.width = edge;
          canvas.height = edge;
          const ctx = canvas.getContext('2d')!;
          ctx.clearRect(0, 0, edge, edge);
          const extras = {
            text: {...DEFAULT_TEXT, ...text},
            photo: {...DEFAULT_PHOTO, ...photo},
            photoSrc,
          };
          const painted =
            artVariant === 'top'
              ? await paintTopArt(ctx, formatId, colorId, decorationId, edge, extras)
              : await paintArt(
                  ctx,
                  formatId,
                  colorId,
                  decorationId,
                  fillingId,
                  edge,
                  artVariant,
                  extras,
                );
          if (token !== revision.current) return;
          if (painted) {
            setStatus('ready');
            onRendered?.(canvas);
            return;
          }
          ctx.clearRect(0, 0, edge, edge);
        }
      }

      const engine = await loadEngine();
      if (token !== revision.current) return;

      if (photoSrc && decodedPhoto.current?.src !== photoSrc) {
        decodedPhoto.current = {
          src: photoSrc,
          texture: await engine.decodeUserPhoto(photoSrc),
        };
      } else if (!photoSrc) {
        decodedPhoto.current = null;
      }
      if (token !== revision.current) return;

      const choice: CakeChoice = {
        format: formatId,
        filling: fillingId,
        color: colorId,
        decoration: decorationId,
        theme: creamTheme,
        view,
        angle,
        photo: {...DEFAULT_PHOTO, ...photo},
        text: {...DEFAULT_TEXT, ...text},
      };

      const {raw, size: edge, geometry} = await engine.composeCake(
        choice,
        decodedPhoto.current?.texture ?? null,
        size,
      );
      if (token !== revision.current) return;

      const canvas = canvasRef.current;
      if (!canvas) return;
      canvas.width = edge;
      canvas.height = edge;
      const ctx = canvas.getContext('2d')!;
      ctx.clearRect(0, 0, edge, edge);

      /*
        The cake is composited rather than written straight to the canvas.

        This was a single `putImageData`, which is the fastest way to get pixels
        onto a canvas and also the reason nothing could ever go UNDER them:
        putImageData replaces the destination outright, alpha and all, so a
        board drawn first would be erased by the cake's own transparent
        background. The engine's output is RGBA with everything outside the cake
        at alpha 0, so drawing it through an offscreen canvas composites
        correctly over whatever is already there.
      */
      const layer = document.createElement('canvas');
      layer.width = edge;
      layer.height = edge;
      layer.getContext('2d')!.putImageData(new ImageData(raw, edge, edge), 0, 0);

      /*
        Registered to the art, so the engine's views are the same cake at the
        same distance as the front view — and so the branded board can go under
        them.

        This also catches the front view itself once the shopper adds a message
        or a photo: that hands the preview to the engine mid-journey, and
        without this the cake would jump size and lose its board at the exact
        moment the shopper is fussing over a detail.

        The board is drawn unscaled. It IS the art frame, so it needs no
        transform — the registration exists precisely to bring the cake into
        its coordinates rather than the other way round.
      */
      const {findFormat: findFmt} = await import('~/lib/cake-render/catalog');
      const engineAsset = showBoard ? artFor(findFmt(formatId)) : null;
      const reg = artRegistration(
        engineAsset,
        findFmt(formatId)?.height ?? 0,
        geometry,
        edge,
      );

      if (reg) {
        const board = await artImage(`/cake/v5/boards/${engineAsset}.webp`);
        if (token !== revision.current) return;
        if (board) {
          ctx.save();
          // Vertical only, about the point where the cake meets the board.
          ctx.setTransform(
            1,
            0,
            0,
            reg.boardY,
            0,
            reg.anchorY - reg.boardY * reg.anchorY,
          );
          ctx.drawImage(board, 0, 0, edge, edge);
          ctx.restore();
        }
        ctx.save();
        ctx.setTransform(reg.k, 0, 0, reg.k, reg.dx, reg.dy);
        ctx.drawImage(layer, 0, 0);
        ctx.restore();
      } else {
        ctx.drawImage(layer, 0, 0);
      }

      setStatus('ready');
      onRendered?.(canvas);
    } catch (error) {
      if (token !== revision.current) return;
      console.error('[CakeRenderer] render failed:', error);
      setStatus('error');
    }
  }, [
    formatId,
    fillingId,
    colorId,
    decorationId,
    creamTheme,
    view,
    angle,
    photoSrc,
    // Spread rather than the objects themselves: the parent rebuilds these
    // literals on every keystroke, and depending on identity would redraw on
    // every render whether or not anything actually moved.
    photo.scale,
    photo.x,
    photo.y,
    photo.rotation,
    photo.shape,
    text.value,
    text.color,
    text.scale,
    text.x,
    text.y,
    text.font,
    size,
    onRendered,
    showBoard,
  ]);

  useEffect(() => {
    let cancelled = false;
    // One frame of debounce. A slider drag fires many times per render, and
    // without this every intermediate position queues a full compose that is
    // thrown away by the revision check anyway — the work still blocks the
    // main thread and the drag stutters.
    const timer = setTimeout(() => {
      if (!cancelled) void draw();
    }, 60);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [draw]);

  return (
    <div className={`relative ${className}`}>
      <canvas
        ref={canvasRef}
        id={canvasId}
        className="w-full h-auto block select-none"
        style={{aspectRatio: '1 / 1'}}
        aria-label={isEn ? 'Cake design preview' : 'معاينة تصميم الكيك'}
      />

      {status === 'loading' && (
        <div className="absolute inset-0 flex items-center justify-center bg-white/70 backdrop-blur-sm rounded-2xl">
          <span className="text-sm font-bold text-[#294941]">
            {isEn ? 'Preparing your cake…' : 'بنجهّز كيكتك…'}
          </span>
        </div>
      )}

      {status === 'error' && (
        <button
          type="button"
          onClick={() => void draw()}
          className="absolute inset-0 flex items-center justify-center bg-white/85 rounded-2xl text-sm font-bold text-[#294941] cursor-pointer"
        >
          {isEn
            ? 'Preview failed — tap to retry'
            : 'تعذّر تحميل المعاينة — اضغط للمحاولة'}
        </button>
      )}
    </div>
  );
}
