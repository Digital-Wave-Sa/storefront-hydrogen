/**
 * Making a borrowed still the height the shopper actually chose.
 *
 * 23 formats have art; the catalog sells 150. A 60x60x12 cm cake borrows
 * `square-50x50-h8`, and the footprint being off does not matter — the board
 * borrows with it, so cake and board stay a matched pair and the pair simply
 * reads as "a square cake". The HEIGHT is different. Every square and rectangle
 * still is 8 cm, so a 12 cm cake was drawn two thirds as tall as it was sold,
 * and once من الداخل started showing the layers that became impossible to miss:
 * a 52px wall where 79px was chosen.
 *
 * Height is the one dimension that can be fixed from the still alone. In this
 * camera z enters the projection only as a vertical offset — `drop = (h - z) *
 * kz` — so the wall is the rim swept straight down and its on-screen height is
 * the same `h * kz` in every column. Growing the cake is therefore a per-column
 * stretch of one band: everything below the rim and above the base, scaled from
 * the base upward. The base, the bottom edge and the contact shadow never move,
 * and the top face rides up on top of the taller wall.
 *
 * What it cannot invent is detail. The fondant's vertical shading is stretched
 * with the wall rather than re-lit, so a 16 cm cake built from an 8 cm still is
 * a smoother wall than a real one. Ask for the missing heights and this module
 * stops being needed — see docs/cut-frames-request.md.
 */

import type {ArtCamera} from './art-camera';
import {assetDims} from './art-cut';

/**
 * The seam between the top face and the wall, per column.
 *
 * Returns null outside the cake, where there is nothing to stretch.
 */
function rimY(cam: ArtCamera, asset: string): (x: number) => number | null {
  const dims = assetDims(asset);
  if (!dims) return () => null;

  if (cam.kind === 'round') {
    const r = dims.w / 2;
    const ax = r * cam.kx;
    const ay = r * cam.ky;
    return (x: number) => {
      const u = (x - cam.cx) / ax;
      if (!(Math.abs(u) <= 1)) return null;
      return cam.cy + ay * Math.sqrt(1 - u * u);
    };
  }

  // A box's top face is a parallelogram; its lower boundary is what we want.
  const [a, b, ox, c, d, oy] = cam.m;
  const corners: Array<[number, number]> = [];
  for (const sx of [-1, 1])
    for (const sy of [-1, 1]) {
      const X = (sx * dims.w) / 2;
      const Y = (sy * dims.d) / 2;
      corners.push([a * X + b * Y + ox, c * X + d * Y + oy]);
    }
  const xs = corners.map((p) => p[0]);
  const lo = Math.min(...xs);
  const hi = Math.max(...xs);

  return (x: number) => {
    if (x < lo || x > hi) return null;
    let best: number | null = null;
    for (let i = 0; i < 4; i++)
      for (let j = i + 1; j < 4; j++) {
        const [x1, y1] = corners[i];
        const [x2, y2] = corners[j];
        if (x1 === x2) continue;
        if (x < Math.min(x1, x2) - 1e-6 || x > Math.max(x1, x2) + 1e-6) continue;
        const y = y1 + ((y2 - y1) * (x - x1)) / (x2 - x1);
        best = best === null ? y : Math.max(best, y);
      }
    return best;
  };
}

/** Cached by asset, target height and canvas size — never by colour. */
const grown = new Map<string, HTMLCanvasElement>();
const GROWN_CACHE_MAX = 12;

export type Grown = {
  /** Draw this instead of the still. */
  source: CanvasImageSource;
  /** How far the top face and its toppings moved up, in canvas pixels. */
  lift: number;
  /** The same lift in art-frame pixels, which is what `liftCamera` wants. */
  liftArt: number;
  /** The height the result now represents, in centimetres. */
  height: number;
};

/**
 * Grow a still to `wantH` centimetres, or hand back the still unchanged.
 *
 * `edge` is the canvas the result will be drawn at, so the stretch happens once
 * at final resolution instead of being scaled afterwards.
 */
export function growToHeight(
  img: HTMLImageElement,
  cam: ArtCamera,
  asset: string,
  wantH: number,
  edge: number,
  artFrame: number,
): Grown {
  const dims = assetDims(asset);
  const none: Grown = {source: img, lift: 0, liftArt: 0, height: dims?.h ?? wantH};
  if (!dims || !(wantH > 0) || Math.abs(wantH - dims.h) < 0.01) return none;

  const s = edge / artFrame;
  const wall = Math.round(dims.h * cam.kz * s);
  const lift = Math.round((wantH - dims.h) * cam.kz * s);
  // Shrinking below the art's own height would eat the wall entirely.
  if (wall < 2 || wall + lift < 2) return none;

  const key = `${asset}@${edge}:h${wantH}`;
  const liftArt = (wantH - dims.h) * cam.kz;
  const hit = grown.get(key);
  if (hit) return {source: hit, lift, liftArt, height: wantH};

  const out = remap(img, rimY(cam, asset), wall, lift, edge, s, artFrame, 'stretch');

  if (grown.size >= GROWN_CACHE_MAX) {
    const oldest = grown.keys().next().value;
    if (oldest !== undefined) grown.delete(oldest);
  }
  grown.set(key, out);
  return {source: out, lift, liftArt, height: wantH};
}

/**
 * Redraw a still column by column, either stretching the wall or splitting it.
 *
 * `stretch` is for the cake: the band between the rim and the base is scaled
 * from the base upward, so the wall gains height and everything else holds
 * still.
 *
 * `split` is for the toppings, and it exists because a rigid shift is wrong.
 * Most decorations are TWO borders — one piped round the top rim and one round
 * the base. Moving the whole overlay up put the bottom border halfway up the
 * wall and left it hanging off the silhouette as a row of loose pearls in mid
 * air. Cutting the overlay at mid-wall instead and lifting only the upper half
 * sends each border to the edge it belongs on, and because it is a translation
 * rather than a scale the pearls stay round. Nothing is piped across the middle
 * of a wall, so the seam falls where there is nothing to tear.
 */
function remap(
  img: CanvasImageSource,
  rim: (x: number) => number | null,
  wall: number,
  lift: number,
  edge: number,
  s: number,
  artFrame: number,
  mode: 'stretch' | 'split',
): HTMLCanvasElement {
  const out = document.createElement('canvas');
  out.width = edge;
  out.height = edge;
  const g = out.getContext('2d')!;

  for (let x = 0; x < edge; x++) {
    const ry = rim(x / s);
    if (ry === null) {
      // Outside the cake: shadow and empty frame, copied straight across.
      g.drawImage(img, x / s, 0, 1 / s, artFrame, x, 0, 1, edge);
      continue;
    }
    const top = Math.round(ry * s);
    const base = top + wall;

    if (mode === 'split') {
      const seam = Math.max(0, Math.min(edge, top + Math.round(wall / 2)));
      g.drawImage(
        img, x / s, seam / s, 1 / s, (edge - seam) / s,
        x, seam, 1, edge - seam,
      );
      if (seam > 0) {
        g.drawImage(img, x / s, 0, 1 / s, seam / s, x, -lift, 1, seam);
      }
      continue;
    }

    // Below the base — the bottom edge and the contact shadow — stays put.
    g.drawImage(
      img, x / s, base / s, 1 / s, (edge - base) / s,
      x, base, 1, edge - base,
    );
    // The wall, grown from the base upward.
    g.drawImage(
      img, x / s, top / s, 1 / s, wall / s,
      x, base - wall - lift, 1, wall + lift,
    );
    // The top face, carried up on it.
    g.drawImage(img, x / s, 0, 1 / s, top / s, x, -lift, 1, top);
  }
  return out;
}

/**
 * Put a topping overlay on the grown cake.
 *
 * Returns the overlay untouched when the still is already the right height.
 */
const fitted = new Map<string, HTMLCanvasElement>();

export function fitDecoration(
  img: HTMLImageElement,
  cam: ArtCamera,
  asset: string,
  decorationId: string,
  wantH: number,
  edge: number,
  artFrame: number,
): CanvasImageSource {
  const dims = assetDims(asset);
  if (!dims || !(wantH > 0) || Math.abs(wantH - dims.h) < 0.01) return img;

  const sc = edge / artFrame;
  const wall = Math.round(dims.h * cam.kz * sc);
  const lift = Math.round((wantH - dims.h) * cam.kz * sc);
  if (wall < 2) return img;

  const key = `${decorationId}/${asset}@${edge}:h${wantH}`;
  const hit = fitted.get(key);
  if (hit) return hit;

  const out = remap(img, rimY(cam, asset), wall, lift, edge, sc, artFrame, 'split');
  if (fitted.size >= GROWN_CACHE_MAX) {
    const oldest = fitted.keys().next().value;
    if (oldest !== undefined) fitted.delete(oldest);
  }
  fitted.set(key, out);
  return out;
}

/**
 * The same camera, looking at the grown cake.
 *
 * The stretch keeps the base where it was and lifts the top face, so a camera
 * that still thinks the cake is 8 cm tall would put the cut faces and the
 * toppings in the old place. Raising the vertical origin by the lift, and
 * telling `projectArt` the new height, moves every z with the art: z = 0 still
 * lands on the base and z = H on the new top face.
 */
export function liftCamera(cam: ArtCamera, liftArtPx: number): ArtCamera {
  if (!liftArtPx) return cam;
  if (cam.kind === 'round') return {...cam, cy: cam.cy - liftArtPx};
  const [a, b, ox, c, d, oy] = cam.m;
  return {...cam, m: [a, b, ox, c, d, oy - liftArtPx]};
}
