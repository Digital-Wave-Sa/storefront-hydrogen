/**
 * The agency's per-size cake pictures («cake-agency-delivery-final 2»).
 *
 * Every size the agency finished has its own front picture of the cake on its
 * board, and its own front picture of each of the 29 toppings, drawn on the
 * same 1254px canvas so the layers stack exactly. The files live in
 * `public/cake/v6` and are built from the agency package by a script; nothing
 * here is drawn or measured at runtime.
 *
 * ── Only the finished sizes ──
 *
 * The agency's manifest marks 14 of its 29 sizes 'not-yet-reference-matched'
 * (all tall rounds except 20 cm, round 35–50, square 35 and 45): in those the
 * topping shrinks to a small placeholder. They are left out on purpose and
 * added here when the agency delivers them — one line each, plus their files.
 *
 * ── Prices ──
 *
 * None here. Each id is also the `builder_key` of its price row in the
 * `cake_attribute` metaobject, exactly as for the drawn catalog.
 */

export const SIZED_ART_BASE = '/cake/v6';

/** Which managed shape row (and slice pictures) a size belongs to. */
export type SizedArtFamily = 'classic_round' | 'standard' | 'classic_square' | 'sheet';

export type SizedArtFormat = {
  id: string;
  family: SizedArtFamily;
  shape: 'round' | 'square' | 'rectangle';
  width: number;
  depth: number;
  height: number;
  /**
   * The overhead picture to use. The agency's top views are identical across
   * sizes of one shape (the camera is framed to the cake), so rounds share
   * one, squares share one, and sheets share one per aspect ratio.
   */
  topKey: 'round' | 'square' | 'sheet-3x2' | 'sheet-4x3' | 'sheet-5x4';
};

const round = (d: number, height = 8, family: SizedArtFamily = 'classic_round'): SizedArtFormat => ({
  id: `round-${d}x${d}-h${height}`,
  family,
  shape: 'round',
  width: d,
  depth: d,
  height,
  topKey: 'round',
});
const square = (s: number): SizedArtFormat => ({
  id: `square-${s}x${s}-h8`,
  family: 'classic_square',
  shape: 'square',
  width: s,
  depth: s,
  height: 8,
  topKey: 'square',
});
const sheet = (w: number, d: number, topKey: SizedArtFormat['topKey']): SizedArtFormat => ({
  id: `rectangle-${w}x${d}-h8`,
  family: 'sheet',
  shape: 'rectangle',
  width: w,
  depth: d,
  height: 8,
  topKey,
});

/** In the order the builder lists them: shape, then size, then height. */
export const SIZED_ART_FORMATS: SizedArtFormat[] = [
  round(15),
  round(20),
  round(20, 14, 'standard'),
  round(25),
  round(30),
  square(15),
  square(20),
  square(25),
  square(30),
  square(40),
  square(50),
  sheet(30, 20, 'sheet-3x2'),
  sheet(40, 30, 'sheet-4x3'),
  sheet(60, 40, 'sheet-3x2'),
  sheet(80, 60, 'sheet-4x3'),
  sheet(100, 80, 'sheet-5x4'),
];

/** Topping ids with pictures; each is the `builder_key` of its topping row. */
export const SIZED_ART_DESIGNS = new Set([
  'berry-garden', 'blue-macarons', 'butterfly-ribbon', 'cherry-cream',
  'classic-chocolate', 'classic-graduation', 'colorful-hearts', 'comic-bow',
  'comic-cake', 'comic-graduation', 'disco-balls', 'eid-mubarak', 'garden',
  'gender-reveal', 'great-meeting', 'hearts-doodles', 'mermaid', 'pink-ribbons',
  'pistachio-rose', 'roses', 'signature-caramel', 'signature-chocolate',
  'signature-fruit', 'signature-lemon', 'signature-pistachio', 'signature-ruby',
  'since-1991', 'spider-web', 'super-dad',
]);

/** The agency drew no overhead layer for this one; its top view is the plain cake. */
const NO_TOP_LAYER = new Set(['hearts-doodles']);

export const findSizedArt = (id?: string | null) =>
  id ? SIZED_ART_FORMATS.find((f) => f.id === id) : undefined;

/** The cake on its board, from the front. */
export const sizedFrontUrl = (f: SizedArtFormat) => `${SIZED_ART_BASE}/front/${f.id}.webp`;

/** The cake on its board, from above. */
export const sizedTopUrl = (f: SizedArtFormat) => `${SIZED_ART_BASE}/top/${f.topKey}.webp`;

/**
 * The frosting alone, in grey, transparent everywhere else: the plain cake
 * from the agency turned to luminance, with the lit cream at white. The
 * builder multiplies it by the chosen colour and lays it over the cake, so
 * the frosting takes the colour and keeps its texture while the board and
 * toppings stay as drawn.
 */
export const sizedFrostingUrls = (f: SizedArtFormat) => ({
  front: `${SIZED_ART_BASE}/frosting/${f.id}.webp`,
  top: `${SIZED_ART_BASE}/frosting/top-${f.topKey}.webp`,
});

/** This size's own card picture on the size step: its front picture, cropped. */
export const sizedSizeThumb = (f: SizedArtFormat) =>
  `${SIZED_ART_BASE}/thumbs/size-${f.id}.webp`;

/** Shape card picture on step 1. */
export const sizedShapeThumb = (shape: SizedArtFormat['shape']) =>
  `${SIZED_ART_BASE}/thumbs/shape-${shape}.webp`;

/** A topping's transparent layers for one size, or undefined when it has none. */
export function sizedToppingArt(
  f: SizedArtFormat | undefined,
  design?: string | null,
): {front?: string; top?: string} | undefined {
  if (!f || !design || !SIZED_ART_DESIGNS.has(design)) return undefined;
  return {
    front: `${SIZED_ART_BASE}/toppings/${design}/${f.id}.webp`,
    top: NO_TOP_LAYER.has(design)
      ? undefined
      : `${SIZED_ART_BASE}/toppings-top/${design}/${f.topKey}.webp`,
  };
}
