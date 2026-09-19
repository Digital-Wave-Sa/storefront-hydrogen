/**
 * Cutting Saadeddin's own cake open, instead of rendering a different one.
 *
 * من الداخل used to hand the preview to the 3D engine, and the engine draws a
 * procedural cake: its own mesh, its own shading, its own camera. Beside the
 * photographed front view it read as a completely different product, which is
 * exactly what it was.
 *
 * None of that is necessary. `art-camera.ts` already recovered where any point
 * of the cake lands inside the art frame — that is what places the toppings —
 * and a cut cake is not a new object, it is the same still with a wedge taken
 * out of it. So this module works out, in the art's own camera:
 *
 *   1. the screen outline of the removed wedge, to erase from the still, and
 *   2. the interior faces it exposes, to fill with the real cross-section
 *      photograph of the chosen flavour.
 *
 * Nothing is modelled and nothing is shaded. The cake, the board, the icing
 * colour, the toppings and the camera all stay exactly as the shopper saw them
 * a moment earlier; the only new pixels are inside the notch.
 *
 * A cylinder loses a 70-degree wedge, as the engine does. A box gets one
 * straight cut across — see `planCut`. Both are placed on whichever side faces
 * the camera, because the art's azimuth is not the engine's.
 */

import type {ArtCamera} from './art-camera';
import {projectArt} from './art-camera';

export type Pt = [number, number];

/**
 * The art asset's OWN dimensions, which are not always the format's.
 *
 * 23 formats have art and the catalog holds 150, so a 60x60 borrows the nearest
 * asset. The wedge has to be built from the borrowed asset's size or it will
 * not line up with the picture it is being cut out of — the cake on screen is
 * a 50x50 whatever the label says.
 */
export function assetDims(
  asset: string,
): {shape: 'round' | 'square' | 'rectangle'; w: number; d: number; h: number} | null {
  const m = /^(round|square|rectangle)-(\d+)x(\d+)-h(\d+)$/.exec(asset);
  if (!m) return null;
  return {
    shape: m[1] as 'round' | 'square' | 'rectangle',
    w: Number(m[2]),
    d: Number(m[3]),
    h: Number(m[4]),
  };
}

/** One flat face of the cut, as a parallelogram plus how lit it is. */
export type CutFace = {
  /** Top-left, top-right and bottom-left in screen pixels; the fourth follows. */
  tl: Pt;
  tr: Pt;
  bl: Pt;
  /** 1 is the texture untouched; lower is deeper in shadow. */
  shade: number;
};

export type CutPlan = {
  /** Fill these to get the wedge's screen footprint. They may overlap. */
  silhouette: Pt[][];
  /** Painted with the filling photograph, far one first. */
  faces: CutFace[];
};

/**
 * Where to take the wedge from.
 *
 * The engine always cuts the same corner because it controls its camera. Here
 * the camera is whatever the art was rendered at, so the corner is chosen by
 * asking which one projects LOWEST — on an axonometric still, lower is nearer,
 * and a cut you cannot see into is worth nothing.
 */
function nearestCorner(cam: ArtCamera, w: number, d: number, h: number): [number, number] {
  let best: [number, number] = [-w / 2, -d / 2];
  let bestY = -Infinity;
  for (const sx of [-1, 1]) {
    for (const sy of [-1, 1]) {
      const y = projectArt(cam, (sx * w) / 2, (sy * d) / 2, 0, h)[1];
      if (y > bestY) {
        bestY = y;
        best = [sx, sy];
      }
    }
  }
  return best;
}

function nearestAngle(cam: ArtCamera, r: number, h: number): number {
  let best = 90;
  let bestY = -Infinity;
  for (let a = 0; a < 360; a += 2) {
    const t = (a * Math.PI) / 180;
    const y = projectArt(cam, r * Math.cos(t), r * Math.sin(t), 0, h)[1];
    if (y > bestY) {
      bestY = y;
      best = a;
    }
  }
  return best;
}

/**
 * Work out the cut for one asset.
 *
 * Returns null for anything it cannot place, and the caller then leaves the
 * cake whole rather than drawing something wrong.
 */
export function planCut(
  cam: ArtCamera,
  asset: string,
  /** The frame the art was rendered in, scaled to the canvas being drawn. */
  scale: number,
  /**
   * The height the cake is being DRAWN at, when the still has been grown to the
   * chosen size. Defaults to the asset's own.
   */
  heightCm?: number,
): CutPlan | null {
  const dims = assetDims(asset);
  if (!dims) return null;
  const {shape, w, d} = dims;
  const h = heightCm && heightCm > 0 ? heightCm : dims.h;

  const P = (x: number, y: number, z: number): Pt => {
    const [px, py] = projectArt(cam, x, y, z, h);
    return [px * scale, py * scale];
  };

  if (shape === 'round') {
    const r = w / 2;
    const span = 70;
    const mid = nearestAngle(cam, r, h);
    const a1 = mid - span / 2;
    const a2 = mid + span / 2;
    const rim = (deg: number, z: number): Pt => {
      const t = (deg * Math.PI) / 180;
      return P(r * Math.cos(t), r * Math.sin(t), z);
    };
    const arc = (z: number, steps = 40): Pt[] =>
      Array.from({length: steps + 1}, (_, i) => rim(a1 + ((a2 - a1) * i) / steps, z));

    const radial = (deg: number): Pt[] => [
      P(0, 0, h),
      rim(deg, h),
      rim(deg, 0),
      P(0, 0, 0),
    ];

    return {
      // Top face, the two radial walls, and the curved outer wall. Filled
      // together they cover exactly what the wedge hid.
      silhouette: [
        [P(0, 0, h), ...arc(h)],
        radial(a1),
        radial(a2),
        [...arc(h), ...arc(0).reverse()],
      ],
      faces: [
        {tl: P(0, 0, h), tr: rim(a1, h), bl: P(0, 0, 0), shade: 0.8},
        {tl: P(0, 0, h), tr: rim(a2, h), bl: P(0, 0, 0), shade: 0.92},
      ],
    };
  }

  /*
    A box gets ONE straight cut, the way a sheet cake is actually cut.

    The engine gouges a corner block out (19% across, 8% deep). Nobody cuts a
    cake like that, and it showed: two cramped inner walls and a floor of bare
    board. A single knife pass across the cake leaves one flat face the full
    width, which reads as a slice taken away.

    The cut runs on whichever near side shows the bigger face to this camera —
    for a rectangle that is not always the long side.
  */
  const [sx, sy] = nearestCorner(cam, w, d, h);
  const depth = 0.22;

  const across = (() => {
    const yc = sy * (d / 2 - depth * d);
    const face: CutFace = {tl: P(-w / 2, yc, h), tr: P(w / 2, yc, h), bl: P(-w / 2, yc, 0), shade: 0.86};
    const block: Pt[] = [];
    for (const x of [-w / 2, w / 2])
      for (const y of [(sy * d) / 2, yc]) for (const z of [0, h]) block.push(P(x, y, z));
    return {face, block};
  })();
  const along = (() => {
    const xc = sx * (w / 2 - depth * w);
    const face: CutFace = {tl: P(xc, -d / 2, h), tr: P(xc, d / 2, h), bl: P(xc, -d / 2, 0), shade: 0.86};
    const block: Pt[] = [];
    for (const x of [(sx * w) / 2, xc])
      for (const y of [-d / 2, d / 2]) for (const z of [0, h]) block.push(P(x, y, z));
    return {face, block};
  })();

  const pick = faceArea(across.face) >= faceArea(along.face) ? across : along;
  return {silhouette: [convexHull(pick.block)], faces: [pick.face]};
}

/** Screen area of a face parallelogram — to pick the side the camera sees. */
function faceArea(f: CutFace): number {
  const ax = f.tr[0] - f.tl[0];
  const ay = f.tr[1] - f.tl[1];
  const bx = f.bl[0] - f.tl[0];
  const by = f.bl[1] - f.tl[1];
  return Math.abs(ax * by - ay * bx);
}

/** Monotone chain. The block is convex, so its outline is its hull. */
function convexHull(pts: Pt[]): Pt[] {
  const p = [...pts].sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const cross = (o: Pt, a: Pt, b: Pt) =>
    (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const half = (src: Pt[]) => {
    const out: Pt[] = [];
    for (const q of src) {
      while (out.length >= 2 && cross(out[out.length - 2], out[out.length - 1], q) <= 0)
        out.pop();
      out.push(q);
    }
    return out.slice(0, -1);
  };
  return [...half(p), ...half(p.reverse())];
}
