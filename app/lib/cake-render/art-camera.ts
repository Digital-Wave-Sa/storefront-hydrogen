/**
 * Where a point on the cake lands inside Saadeddin's art frames.
 *
 * The art comes from a different pipeline than the renderer, with no camera
 * data supplied — just 1254px stills. These tables were MEASURED back out of
 * the images themselves, from the alpha channel alone, and then checked by
 * rebuilding each silhouette from the recovered parameters and comparing it to
 * the original:
 *
 *     round     IoU 0.995 - 0.997   (12 assets)
 *     square    IoU 0.930 - 0.974   (6 assets)
 *     rectangle IoU 0.891 - 0.983   (5 assets)
 *
 * Round is near-exact because a cylinder's outline is two congruent ellipses
 * joined by a band: fit `t(x) = wall + 2b·sqrt(1 - u²)` across the width and
 * both axes and the wall height fall out. Boxes are fitted from three measured
 * corners of the top face, and read lower mainly because the real art has
 * rounded corners that a straight-edged rebuild cannot match — the error is at
 * the corners, not in the placement, which is why it is still good enough to
 * sit a 1.5 cm sprite on the rim.
 *
 * Note the recovered camera is NOT a plain orthographic tilt: `b/a` says
 * sin(elev) ≈ 0.48 while the wall says cos(elev) ≈ 0.80, and those do not
 * square to 1. So the numbers are kept as measured scales rather than as an
 * angle — deriving an elevation from them and re-deriving the scales would
 * bake in an error the art does not have.
 */

export type ArtCamera =
  | {kind: 'round'; cx: number; cy: number; kx: number; ky: number; kz: number}
  | {kind: 'box'; m: [number, number, number, number, number, number]; kz: number};

/** The frame every art asset was rendered in. */
export const ART_FRAME = 1254;

/**
 * Per asset. `cx`/`cy` is the centre of the TOP face; `kx`/`ky` are pixels per
 * centimetre across and into the picture; `kz` is pixels per centimetre of
 * height, positive downward. For boxes the top face is a parallelogram, so the
 * first four of `m` are the 2x2 and the last two are the origin.
 */
export const ART_CAMERAS: Record<string, ArtCamera> = {
  'round-15x15-h14': {kind: 'round', cx: 627.0, cy: 433.0, kx: 22.5333, ky: 11.4659, kz: 18.0656},
  'round-15x15-h8': {kind: 'round', cx: 625.5, cy: 463.8, kx: 26.3333, ky: 12.9109, kz: 21.1033},
  'round-20x20-h14': {kind: 'round', cx: 626.5, cy: 447.2, kx: 19.6500, ky: 9.7232, kz: 15.9072},
  'round-20x20-h8': {kind: 'round', cx: 625.5, cy: 487.8, kx: 20.9500, ky: 10.1810, kz: 16.7462},
  'round-25x25-h14': {kind: 'round', cx: 626.5, cy: 468.4, kx: 16.2800, ky: 7.9511, kz: 13.2511},
  'round-25x25-h8': {kind: 'round', cx: 625.5, cy: 506.1, kx: 17.4000, ky: 8.4102, kz: 13.8791},
  'round-30x30-h14': {kind: 'round', cx: 626.5, cy: 482.3, kx: 13.9000, ky: 6.7543, kz: 11.3371},
  'round-30x30-h8': {kind: 'round', cx: 625.5, cy: 523.3, kx: 14.9000, ky: 7.2174, kz: 11.6156},
  'round-40x40-h14': {kind: 'round', cx: 626.5, cy: 503.1, kx: 10.7750, ky: 5.1534, kz: 8.8575},
  'round-40x40-h8': {kind: 'round', cx: 626.0, cy: 544.2, kx: 11.5000, ky: 5.4624, kz: 9.4026},
  'round-50x50-h14': {kind: 'round', cx: 626.5, cy: 520.2, kx: 8.8200, ky: 4.2465, kz: 7.0830},
  'round-50x50-h8': {kind: 'round', cx: 625.0, cy: 560.2, kx: 9.4000, ky: 4.4876, kz: 7.4397},
  'rectangle-100x80-h8': {kind: 'box', m: [1.9400, -6.6125, 625.5, -1.9800, -1.4000, 581.0], kz: 5.1250},
  'rectangle-30x20-h8': {kind: 'box', m: [5.0167, -24.2250, 625.5, -5.0333, -5.4000, 519.5], kz: 14.8750},
  'rectangle-40x30-h8': {kind: 'box', m: [4.3125, -16.5167, 626.0, -4.3250, -4.5667, 551.0], kz: 8.0000},
  'rectangle-60x40-h8': {kind: 'box', m: [2.7000, -13.2250, 625.5, -2.7500, -2.8750, 554.0], kz: 8.0000},
  'rectangle-80x60-h8': {kind: 'box', m: [2.2687, -8.8250, 625.5, -2.3250, -1.8833, 571.5], kz: 6.2500},
  'square-15x15-h8': {kind: 'box', m: [12.4000, -25.8667, 626.0, -12.3333, -7.2667, 481.0], kz: 21.7500},
  'square-20x20-h8': {kind: 'box', m: [9.8500, -20.8000, 625.5, -9.8500, -4.8000, 498.5], kz: 19.2500},
  'square-25x25-h8': {kind: 'box', m: [8.2200, -17.3800, 625.0, -8.2800, -3.8400, 515.5], kz: 16.1250},
  'square-30x30-h8': {kind: 'box', m: [7.0000, -14.9667, 625.5, -7.0667, -3.4000, 528.0], kz: 13.6250},
  'square-40x40-h8': {kind: 'box', m: [5.4125, -11.7125, 625.5, -5.5250, -2.6000, 543.5], kz: 10.5000},
  'square-50x50-h8': {kind: 'box', m: [4.4300, -9.5900, 625.5, -4.5200, -2.1200, 552.0], kz: 8.7500},
};

/**
 * A point on the cake, in centimetres, to a pixel in the art frame.
 *
 * `x` and `y` are measured from the centre of the cake and `z` upward from the
 * board, which is exactly the space `decorationInstances` already works in — so
 * a topping's position needs no conversion, only this projection.
 */
export function projectArt(
  cam: ArtCamera,
  x: number,
  y: number,
  z: number,
  height: number,
): [number, number] {
  const drop = (height - z) * cam.kz;
  if (cam.kind === 'round') {
    return [cam.cx + x * cam.kx, cam.cy + y * cam.ky + drop];
  }
  const [a, b, ox, c, d, oy] = cam.m;
  return [a * x + b * y + ox, c * x + d * y + oy + drop];
}

/** Pixels per centimetre across the picture — for scaling a sprite. */
export function artScale(cam: ArtCamera): number {
  if (cam.kind === 'round') return cam.kx;
  return Math.hypot(cam.m[0], cam.m[3]);
}

/**
 * The overhead set (`/cake/v5/top/`), round formats only.
 *
 * Measured the same way as above, from the alpha of the shadowless `cakes/`
 * frames: the centre is the alpha-weighted centroid and the scale comes from
 * the disc's area, which is steadier than a bounding box because it averages
 * the anti-aliased rim instead of trusting its outermost pixel. The camera
 * looks straight down, so across and into the picture are the same scale and
 * height does not move anything (`kz: 0`) — the side wall is out of sight.
 * Width and height of every silhouette agree to within a pixel, which is what
 * says the camera really is overhead.
 */
export const TOP_ART_CAMERAS: Record<string, ArtCamera> = {
  'round-15x15-h8': {kind: 'round', cx: 624.9, cy: 629.8, kx: 36.3934, ky: 36.3934, kz: 0},
  'round-20x20-h8': {kind: 'round', cx: 626.0, cy: 631.8, kx: 28.9697, ky: 28.9697, kz: 0},
  'round-25x25-h8': {kind: 'round', cx: 626.0, cy: 631.7, kx: 24.0288, ky: 24.0288, kz: 0},
  'round-30x30-h8': {kind: 'round', cx: 625.5, cy: 631.3, kx: 20.5351, ky: 20.5351, kz: 0},
  'round-40x40-h8': {kind: 'round', cx: 626.0, cy: 631.7, kx: 15.9419, ky: 15.9419, kz: 0},
  'round-50x50-h8': {kind: 'round', cx: 625.0, cy: 630.8, kx: 13.0132, ky: 13.0132, kz: 0},
  'round-15x15-h14': {kind: 'round', cx: 626.0, cy: 629.9, kx: 31.1166, ky: 31.1166, kz: 0},
  'round-20x20-h14': {kind: 'round', cx: 627.0, cy: 630.7, kx: 27.1828, ky: 27.1828, kz: 0},
  'round-25x25-h14': {kind: 'round', cx: 626.5, cy: 631.3, kx: 22.5503, ky: 22.5503, kz: 0},
  'round-30x30-h14': {kind: 'round', cx: 626.5, cy: 631.3, kx: 19.2733, ky: 19.2733, kz: 0},
  'round-40x40-h14': {kind: 'round', cx: 626.5, cy: 631.3, kx: 14.9375, ky: 14.9375, kz: 0},
  'round-50x50-h14': {kind: 'round', cx: 627.0, cy: 630.7, kx: 12.1924, ky: 12.1924, kz: 0},
};
