/**
 * The render pipeline: a cake selection in, RGBA pixels out.
 *
 * This is our replacement for the driver loop in the vendor's `app.js`. Their
 * version was tangled with their DOM — it read `state`, poked `#loading`, and
 * wrote straight to their canvas. This does the same sequence of work with no
 * DOM at all, so React owns the canvas and this owns the pixels.
 *
 * The sequence, which is theirs and is load-bearing:
 *
 *   1. prepareGeometry  — build and rasterize the mesh into typed arrays
 *   2. paintGeometry    — sample the fondant and filling textures, tint
 *   3. applyPrint       — the shopper's photo and message on the top face
 *   4. applyDecorations — sprites placed in 3D, depth-tested, with shadows
 *
 * Steps 1 and 2 are the expensive ones and both are cached, because a shopper
 * dragging the photo slider changes only step 3.
 *
 * ── Browser only ──
 *
 * Everything here touches `document`, `createImageBitmap` or `OffscreenCanvas`.
 * It must never run during SSR. `CakeRenderer` imports it dynamically inside an
 * effect for exactly that reason; importing it at module scope in a route would
 * break the server render.
 */

import {prepareGeometry, paintGeometry} from './render-core';
import {applyPrint, applyDecorations, decorationInstances} from './finishing';
import {createAssetLoader} from './asset-loader';
import {
  CAKE_ASSET_BASE,
  findFormat,
  findFilling,
  findColor,
  type CakeFormat,
} from './catalog';

export type CakeView = 'whole' | 'slice' | 'cut' | 'filling' | 'combo';
export type CakeAngle = 'original' | 'front' | 'side' | 'high';

export type CakeChoice = {
  format: string;
  filling: string;
  color: string;
  decoration: string;
  /** One of the vendor's three cream tones for piped decorations. */
  theme: 'white' | 'pink' | 'chocolate';
  view: CakeView;
  angle: CakeAngle;
  photo: {
    scale: number;
    x: number;
    y: number;
    rotation: number;
    shape: 'circle' | 'rectangle';
  };
  text: {
    value: string;
    color: string;
    scale: number;
    x: number;
    y: number;
    font: string;
  };
};

type Texture = {
  width: number;
  height: number;
  channels: number;
  data: Uint8ClampedArray;
};

/**
 * Decode an image URL into raw RGBA.
 *
 * Capped at 2048 on the long edge: a shopper's 12-megapixel phone photo costs
 * ~48MB as RGBA and is sampled down to a few hundred pixels on the cake, so
 * carrying the full resolution buys nothing and risks the tab.
 */
async function decode(blob: Blob): Promise<Texture> {
  const bitmap = await createImageBitmap(blob);
  const scale = Math.min(1, 2048 / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  const ctx = canvas.getContext('2d', {willReadFrequently: true})!;
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  return {
    width: canvas.width,
    height: canvas.height,
    channels: 4,
    data: ctx.getImageData(0, 0, canvas.width, canvas.height).data,
  };
}

/**
 * The vendor addresses assets by their original PNG names. We serve WebP from
 * our own public folder, so this is the one place that translates.
 *
 * Kept as a function rather than their big literal map: their map existed to
 * carry content hashes for cache-busting on their Apache host, and Oxygen
 * already handles that for anything under /public.
 */
function assetURL(key: string): string {
  const name = key.replace(/^assets\//, '').replace(/\.png$/, '');
  if (name.startsWith('deco-')) return `${CAKE_ASSET_BASE}/decorations/${name}.webp`;
  if (name.startsWith('fondant-')) return `${CAKE_ASSET_BASE}/materials/${name}.webp`;
  if (name.startsWith('filling-')) return `${CAKE_ASSET_BASE}/fillings/${name}.webp`;
  if (name.startsWith('presentation-slice-'))
    return `${CAKE_ASSET_BASE}/slices/${name}.webp`;
  return `${CAKE_ASSET_BASE}/thumbnails/${name}.webp`;
}

const texture = createAssetLoader(assetURL, decode, {limit: 14});

/**
 * Geometry is the expensive step and depends only on shape, view, angle and
 * size — never on filling or colour. Two entries is the vendor's number and it
 * is the right one: a shopper flips between two views far more often than they
 * revisit a third.
 */
const geometries = new Map<string, any>();
let paintedBase: {key: string; raw: Uint8ClampedArray} | null = null;

/** Rendering a message needs a canvas; there is no text support in the engine. */
function textTexture(text: CakeChoice['text']): Texture | null {
  if (!text.value.trim()) return null;
  const canvas = document.createElement('canvas');
  canvas.width = 1200;
  canvas.height = 260;
  const ctx = canvas.getContext('2d')!;
  const allowed = ['Noto Sans Arabic', 'Tahoma', 'Arial', 'cursive'];
  const family = allowed.includes(text.font) ? text.font : allowed[0];
  let size = 150;
  ctx.font = `600 ${size}px "${family}"`;
  // Shrink to fit rather than clip: a birthday name that runs off the cake is
  // worse than one a few points smaller.
  while (ctx.measureText(text.value).width > 1150 && size > 28) {
    size -= 2;
    ctx.font = `600 ${size}px "${family}"`;
  }
  ctx.fillStyle = /^#[0-9a-fA-F]{6}$/.test(text.color) ? text.color : '#6d3747';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.direction = /[؀-ۿ]/.test(text.value) ? 'rtl' : 'ltr';
  ctx.shadowColor = '#44241425';
  ctx.shadowBlur = 1;
  ctx.shadowOffsetY = 2;
  ctx.fillText(text.value, 600, 136);
  return {
    width: 1200,
    height: 260,
    channels: 4,
    data: ctx.getImageData(0, 0, 1200, 260).data,
  };
}

async function spriteSet(format: CakeFormat, choice: CakeChoice) {
  const names = [
    ...new Set(
      decorationInstances(format, choice.decoration, choice.theme).map(
        (item: any) => item.sprite,
      ),
    ),
  ];
  const loaded = await Promise.all(
    names.map(async (name) => [name, await texture(`assets/deco-${name}.png`)]),
  );
  return Object.fromEntries(loaded);
}

export type ComposeResult = {raw: Uint8ClampedArray; size: number; geometry: any};

/**
 * Render one cake.
 *
 * `size` is the square canvas edge. 940 is the vendor's preview size and 1254
 * their export size; anything in between works but costs time quadratically,
 * so do not raise the preview to "look sharper" without measuring.
 *
 * `photo` is the shopper's decoded upload, or null. It is passed in rather
 * than loaded here because it lives in React state, not at a URL.
 */
export async function composeCake(
  choice: CakeChoice,
  photo: Texture | null,
  size = 940,
): Promise<ComposeResult> {
  const format = findFormat(choice.format);
  if (!format) throw new Error(`Unknown cake format: ${choice.format}`);
  const filling = findFilling(choice.filling);
  if (!filling) throw new Error(`Unknown cake filling: ${choice.filling}`);

  // The default camera on a round slice is drawn from a rectified photograph
  // rather than from the mesh, so that one combination needs its image up
  // front — prepareGeometry consumes it while building the buffers.
  const usesPhotographicSlice =
    choice.view === 'slice' &&
    choice.angle === 'original' &&
    format.shape === 'round';

  const key = `${format.id}/${choice.view}/${choice.angle}/${size}${
    usesPhotographicSlice ? '/' + choice.filling : ''
  }`;

  let geometry = geometries.get(key);
  if (!geometry) {
    const reference = usesPhotographicSlice
      ? await texture(`assets/presentation-slice-${choice.filling}.png`)
      : null;
    geometry = prepareGeometry(format, choice.view, size, choice.angle, reference);
    if (geometries.size >= 2)
      geometries.delete(geometries.keys().next().value as string);
    geometries.set(key, geometry);
  }

  const baseKey = `${key}/${choice.filling}/${choice.color}`;
  let base: Uint8ClampedArray;
  if (paintedBase?.key === baseKey) {
    base = paintedBase.raw;
  } else {
    const [material, food] = await Promise.all([
      geometry.photographic
        ? Promise.resolve(null)
        : texture(
            `assets/fondant-${geometry.photoWhole ? 'photo-' : ''}${geometry.material}.png`,
          ),
      choice.view === 'whole'
        ? Promise.resolve(null)
        : texture(
            geometry.photographic
              ? `assets/presentation-slice-${choice.filling}.png`
              : `assets/filling-${choice.filling}.png`,
          ),
    ]);

    // PURE_WHITE is the master itself, so it is passed as null: multiplying the
    // white photograph by its own sampled colour would darken it slightly.
    const colour = findColor(choice.color);
    const tint = !colour || colour.id === '00' ? null : colour.rgb;

    base = paintGeometry(geometry, material, food, tint);
    paintedBase = {key: baseKey, raw: base};
  }

  // Everything above is cached; from here down runs on every keystroke of the
  // message and every pixel of a photo drag, so it works on a copy.
  const raw = base.slice();
  applyPrint(raw, geometry, photo, choice, textTexture(choice.text));
  if (choice.decoration !== 'none' && choice.view !== 'filling') {
    applyDecorations(
      raw,
      geometry,
      await spriteSet(format, choice),
      choice.decoration,
      choice.theme,
    );
  }

  return {raw, size: geometry.size, geometry};
}

/**
 * A `data:` URL is turned into bytes here, not fetched.
 *
 * The shopper's photo arrives as a data URL — `CustomCakeBuilder` reads the
 * file with `readAsDataURL` so the chosen design survives being written to
 * storage and restored, which an object URL or a `File` cannot do.
 *
 * This used to hand every string to `fetch`, and `fetch` is governed by
 * `connect-src`. Our CSP lists `data:` under `img-src` and `font-src` but not
 * `connect-src`, so the browser blocked the request with a bare "Failed to
 * fetch" — while the same data URL in an `<img>` loaded fine, because that is
 * `img-src`. The upload thumbnail appeared, the preview died, and the two
 * outcomes disagreeing is what made it look like a renderer bug.
 *
 * Decoding the base64 in-process removes the request altogether, so this no
 * longer depends on a header in `entry.server.tsx` that nobody would think to
 * check when adding a photo feature. `http(s)` sources still go through
 * `fetch`, which is correct — those are real requests and `connect-src` should
 * have a say in them.
 */
export async function decodeUserPhoto(source: Blob | string): Promise<Texture> {
  if (typeof source !== 'string') return decode(source);
  if (source.startsWith('data:')) return decode(dataURLToBlob(source));
  return decode(await (await fetch(source)).blob());
}

/** `data:[<mediatype>][;base64],<data>` → Blob, with no network involved. */
function dataURLToBlob(url: string): Blob {
  const comma = url.indexOf(',');
  if (comma === -1) throw new Error('Malformed data URL: no comma');

  // Between "data:" and the comma. Empty is legal and means text/plain.
  const meta = url.slice(5, comma);
  const isBase64 = /;base64$/i.test(meta);
  const type = meta.replace(/;base64$/i, '') || 'text/plain;charset=US-ASCII';
  const payload = url.slice(comma + 1);

  if (!isBase64) {
    return new Blob([decodeURIComponent(payload)], {type});
  }

  /**
   * `atob` yields a binary string; each code unit is one byte. Passing that
   * string to `Blob` directly would UTF-8 encode it and corrupt every byte
   * above 0x7F, which is most of a JPEG.
   */
  const binary = atob(payload);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new Blob([bytes], {type});
}

/**
 * Drop every cache. Call when the asset base changes or in tests — not between
 * renders, which is what the caches exist to avoid.
 */
export function clearCakeRenderCache() {
  geometries.clear();
  paintedBase = null;
}
