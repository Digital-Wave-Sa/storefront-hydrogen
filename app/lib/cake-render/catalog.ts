/**
 * The cake builder's option catalog — the single list of what can be ordered.
 *
 * Generated from the vendor's `config/catalog.json` (schema_version 5) plus the
 * decoration list in their `finishing.js`, with English labels added: their
 * package is Arabic-only and this storefront is bilingual.
 *
 * ── What belongs here and what does not ──
 *
 * This file holds IDENTITY: which formats exist, what they measure, what each
 * one is called. It holds NO prices. Prices live in the `cake_attribute`
 * metaobject so the client can change them without a deploy, and they are
 * joined onto these entries by `id` through the metaobject's `builder_key`
 * field. Putting a price here would recreate exactly the rival-source-of-truth
 * problem the delivery fees had.
 *
 * The `id` of every entry is a contract with three other places: the renderer
 * (which looks up geometry by format id and textures by flavour id), the price
 * book, and the design spec written onto the order. Renaming one silently
 * unprices an option, so ids are never edited — only added.
 */

export type CakeShape = 'round' | 'square' | 'rectangle';

export type CakeFormat = {
  id: string;
  shape: CakeShape;
  /** Centimetres. For a round cake, width is the diameter and depth equals it. */
  width: number;
  depth: number;
  height: number;
  nameAr: string;
  nameEn: string;
  /** Thumbnail for the option card, served from our own public folder. */
  thumb: string;
};

export type CakeFilling = {
  id: string;
  slug: string;
  nameAr: string;
  nameEn: string;
  /** The cut-face texture the renderer samples. */
  texture: string;
  /** The rectified photograph used for the hero slice at the default camera. */
  presentation: string;
  /**
   * The card image on «اختر نكهة الكيك».
   *
   * A downscale of the `texture` above — the cut face itself — rather than the
   * little rendered slice this used to point at. Ten flavours side by side are
   * chosen by what the cake looks like INSIDE, and at card size a 3D wedge
   * shows mostly its own white icing; the cross-section shows the strawberries.
   *
   * A separate file rather than the texture directly: the texture is 2048px and
   * around 400 KB because the renderer samples it, and ten of those is 4.8 MB
   * for one step. These are 420px and 663 KB for the set.
   */
  thumb: string;
};

export type CakeColor = {
  id: string;
  code: string;
  nameAr: string;
  nameEn: string;
  hex: string;
  /**
   * The colour as sampled off the client's own printed swatch. The renderer
   * multiplies a luminance curve of the white master by this, which is why a
   * hand-picked hex would not match the physical fondant.
   */
  rgb: [number, number, number];
};

export type CakeDecoration = {
  id: string;
  nameAr: string;
  nameEn: string;
  categoryAr: string;
  categoryEn: string;
  thumb: string;
};

/** Where the vendor's assets live once copied into our public folder. */
export const CAKE_ASSET_BASE = '/cake/v5';

/**
 * Which cakes exist, as the client's own size sheet lists them.
 *
 * Three shapes x their sizes x five heights = 150 formats, generated rather
 * than typed: 150 hand-written lines is 150 chances to mistype a dimension,
 * and the ids are a contract with the renderer, the price book and the order
 * spec. Generating them means the id, the name and the geometry cannot
 * disagree with each other.
 *
 * The 23 formats that existed before this list grew keep their exact ids —
 * `round-20x20-h8` still spells `round-20x20-h8` — so no price row and no
 * past order is orphaned by the expansion.
 *
 * ── What the renderer can and cannot dress ──
 *
 * The MESH is parametric: `buildMesh` reads width, depth and height, so every
 * one of these 150 renders with correct geometry, including sizes far beyond
 * the original six.
 *
 * The FONDANT is not. `render-core.ts` chooses its material with
 * `shape === 'round' ? (height === 14 ? 'round14' : 'round8') : shape`, and
 * only those four masters exist. So a 10, 12 or 16 cm cake is dressed in the
 * 8 cm fondant stretched over a taller body, and its photographic front view
 * is framed by the 8 cm preset. That is a deliberate, accepted approximation,
 * not an oversight — the client asked for all five heights before the vendor
 * supplied masters for the three new ones. Replacing it means new
 * `fondant-round{10,12,16}` art and matching PHOTO_PRESETS, at which point the
 * only change needed here is deleting this paragraph.
 */

/** Diameters in centimetres, for round cakes. */
const ROUND_DIAMETERS = [15, 20, 25, 30, 40, 50, 60, 70, 80, 90, 100];

/** Side lengths in centimetres, for square cakes. */
const SQUARE_SIDES = [15, 20, 25, 30, 40, 50, 60, 70, 80, 90, 100];

/** [width, depth] in centimetres, in the order the client's sheet lists them. */
const RECTANGLE_SIZES: Array<[number, number]> = [
  [30, 20], [40, 30], [60, 40], [80, 60], [120, 60], [100, 80], [150, 100], [200, 100],
];

/** Every height offered, in centimetres. Applies to all three shapes. */
export const CAKE_HEIGHTS = [8, 10, 12, 14, 16];

/**
 * The thumbnails that actually exist on disk.
 *
 * 23 were rendered from the vendor's package; the other 127 formats have no
 * art of their own. Rather than 404, each one borrows the nearest thumbnail of
 * the same shape. This is only ever shown on the shape card — the size and
 * height steps are plain lists, because a white cake photographed from above
 * cannot tell 40x40 from 50x50 and pretending otherwise wastes the customer's
 * attention.
 */
const THUMBS: Record<CakeShape, {heights: number[]; sizes: Array<[number, number]>}> = {
  round: {heights: [8, 14], sizes: [[15, 15], [20, 20], [25, 25], [30, 30], [40, 40], [50, 50]]},
  square: {heights: [8], sizes: [[15, 15], [20, 20], [25, 25], [30, 30], [40, 40], [50, 50]]},
  rectangle: {heights: [8], sizes: [[30, 20], [40, 30], [60, 40], [80, 60], [100, 80]]},
};

const nearest = (options: number[], value: number) =>
  options.reduce((best, o) => (Math.abs(o - value) < Math.abs(best - value) ? o : best));

function thumbFor(shape: CakeShape, width: number, depth: number, height: number): string {
  const available = THUMBS[shape];
  const h = nearest(available.heights, height);
  // Nearest by footprint area, so a 200x100 borrows the largest rectangle
  // rather than whichever happens to share a width.
  const area = width * depth;
  const [w, d] = available.sizes.reduce((best, s) =>
    Math.abs(s[0] * s[1] - area) < Math.abs(best[0] * best[1] - area) ? s : best,
  );
  return `${CAKE_ASSET_BASE}/thumbnails/shape-${shape}-${w}x${d}-h${h}.webp`;
}

function format(
  shape: CakeShape,
  width: number,
  depth: number,
  height: number,
): CakeFormat {
  const size =
    shape === 'round'
      ? {ar: `قطر ${width} سم`, en: `${width}cm`}
      : {ar: `${width} × ${depth} سم`, en: `${width} × ${depth}cm`};
  const noun =
    shape === 'round' ? {ar: 'دائري', en: 'Round'}
    : shape === 'square' ? {ar: 'مربع', en: 'Square'}
    : {ar: 'مستطيل', en: 'Rectangle'};
  return {
    id: `${shape}-${width}x${depth}-h${height}`,
    shape,
    width,
    depth,
    height,
    // The height is in the name as well as its own step: this string is what
    // gets written onto the order, and a bakery reading "40 × 30" with no
    // height has to come back and ask.
    nameAr: `${noun.ar} — ${size.ar}، ارتفاع ${height} سم`,
    nameEn: `${noun.en} — ${size.en}, ${height}cm tall`,
    thumb: thumbFor(shape, width, depth, height),
  };
}

export const CAKE_FORMATS: CakeFormat[] = [
  ...ROUND_DIAMETERS.flatMap((d) => CAKE_HEIGHTS.map((h) => format('round', d, d, h))),
  ...SQUARE_SIDES.flatMap((s) => CAKE_HEIGHTS.map((h) => format('square', s, s, h))),
  ...RECTANGLE_SIZES.flatMap(([w, d]) => CAKE_HEIGHTS.map((h) => format('rectangle', w, d, h))),
];

/**
 * The three cards on the first step. Each borrows a mid-size thumbnail of its
 * own shape — big enough to read as round, square or rectangular, which is the
 * only question that step asks.
 */
export const CAKE_SHAPES: Array<{
  id: CakeShape;
  nameAr: string;
  nameEn: string;
  thumb: string;
}> = [
  {id: 'round', nameAr: 'دائري', nameEn: 'Round', thumb: thumbFor('round', 25, 25, 8)},
  {id: 'square', nameAr: 'مربع', nameEn: 'Square', thumb: thumbFor('square', 25, 25, 8)},
  {id: 'rectangle', nameAr: 'مستطيل', nameEn: 'Rectangle', thumb: thumbFor('rectangle', 40, 30, 8)},
];

export const CAKE_FILLINGS: CakeFilling[] = [
  {id: '01', slug: 'blueberry_cheese', nameAr: 'تشيز بلو بيري', nameEn: 'Blueberry Cheesecake', texture: `${CAKE_ASSET_BASE}/fillings/filling-01.webp`, presentation: `${CAKE_ASSET_BASE}/slices/presentation-slice-01.webp`, thumb: `${CAKE_ASSET_BASE}/thumbnails/flavor-card-01.webp`},
  {id: '02', slug: 'vanilla', nameAr: 'كيكة فانيلا', nameEn: 'Vanilla', texture: `${CAKE_ASSET_BASE}/fillings/filling-02.webp`, presentation: `${CAKE_ASSET_BASE}/slices/presentation-slice-02.webp`, thumb: `${CAKE_ASSET_BASE}/thumbnails/flavor-card-02.webp`},
  {id: '03', slug: 'mango_cheese', nameAr: 'مانجو تشيز', nameEn: 'Mango Cheesecake', texture: `${CAKE_ASSET_BASE}/fillings/filling-03.webp`, presentation: `${CAKE_ASSET_BASE}/slices/presentation-slice-03.webp`, thumb: `${CAKE_ASSET_BASE}/thumbnails/flavor-card-03.webp`},
  {id: '04', slug: 'vanilla_strawberry', nameAr: 'فانيلا فراولة', nameEn: 'Vanilla & Strawberry', texture: `${CAKE_ASSET_BASE}/fillings/filling-04.webp`, presentation: `${CAKE_ASSET_BASE}/slices/presentation-slice-04.webp`, thumb: `${CAKE_ASSET_BASE}/thumbnails/flavor-card-04.webp`},
  {id: '05', slug: 'black_forest', nameAr: 'بلاك فورست', nameEn: 'Black Forest', texture: `${CAKE_ASSET_BASE}/fillings/filling-05.webp`, presentation: `${CAKE_ASSET_BASE}/slices/presentation-slice-05.webp`, thumb: `${CAKE_ASSET_BASE}/thumbnails/flavor-card-05.webp`},
  {id: '06', slug: 'light_chocolate_mousse', nameAr: 'شوكليت موس', nameEn: 'Chocolate Mousse', texture: `${CAKE_ASSET_BASE}/fillings/filling-06.webp`, presentation: `${CAKE_ASSET_BASE}/slices/presentation-slice-06.webp`, thumb: `${CAKE_ASSET_BASE}/thumbnails/flavor-card-06.webp`},
  {id: '07', slug: 'nutella', nameAr: 'كيكة نوتيلا', nameEn: 'Nutella', texture: `${CAKE_ASSET_BASE}/fillings/filling-07.webp`, presentation: `${CAKE_ASSET_BASE}/slices/presentation-slice-07.webp`, thumb: `${CAKE_ASSET_BASE}/thumbnails/flavor-card-07.webp`},
  {id: '08', slug: 'peanut', nameAr: 'كيكة فول سوداني', nameEn: 'Peanut', texture: `${CAKE_ASSET_BASE}/fillings/filling-08.webp`, presentation: `${CAKE_ASSET_BASE}/slices/presentation-slice-08.webp`, thumb: `${CAKE_ASSET_BASE}/thumbnails/flavor-card-08.webp`},
  {id: '09', slug: 'chocolate_mousse_09', nameAr: 'شوكولاتة موس — مرجع 09', nameEn: 'Dark Chocolate Mousse', texture: `${CAKE_ASSET_BASE}/fillings/filling-09.webp`, presentation: `${CAKE_ASSET_BASE}/slices/presentation-slice-09.webp`, thumb: `${CAKE_ASSET_BASE}/thumbnails/flavor-card-09.webp`},
  {id: '10', slug: 'rocher', nameAr: 'روشيه', nameEn: 'Rocher', texture: `${CAKE_ASSET_BASE}/fillings/filling-10.webp`, presentation: `${CAKE_ASSET_BASE}/slices/presentation-slice-10.webp`, thumb: `${CAKE_ASSET_BASE}/thumbnails/flavor-card-10.webp`},
];

export const CAKE_COLORS: CakeColor[] = [
  {id: '00', code: 'PURE_WHITE', nameAr: 'أبيض نقي', nameEn: 'Pure White', hex: '#dcd9d5', rgb: [220, 217, 213]},
  {id: '01', code: 'RED_101', nameAr: 'أحمر 101', nameEn: 'Red 101', hex: '#bf3e49', rgb: [191, 62, 73]},
  {id: '02', code: 'GREEN_201', nameAr: 'أخضر 201', nameEn: 'Green 201', hex: '#467e4b', rgb: [70, 126, 75]},
  {id: '03', code: 'TEAL_1000', nameAr: 'بترولي 1000', nameEn: 'Teal 1000', hex: '#365a5e', rgb: [54, 90, 94]},
  {id: '04', code: 'TEAL_2000', nameAr: 'فيروزي 2000', nameEn: 'Teal 2000', hex: '#77afac', rgb: [119, 175, 172]},
  {id: '05', code: 'FUCHSIA_301', nameAr: 'فوشيا 301', nameEn: 'Fuchsia 301', hex: '#b83852', rgb: [184, 56, 82]},
  {id: '06', code: 'ORANGE_401', nameAr: 'برتقالي 401', nameEn: 'Orange 401', hex: '#b94a1e', rgb: [185, 74, 30]},
  {id: '07', code: 'RED_102', nameAr: 'أحمر 102', nameEn: 'Red 102', hex: '#ce2b2f', rgb: [206, 43, 47]},
  {id: '08', code: 'GREEN_202', nameAr: 'أخضر 202', nameEn: 'Green 202', hex: '#5ca851', rgb: [92, 168, 81]},
  {id: '09', code: 'GRAY_3000', nameAr: 'رمادي 3000', nameEn: 'Gray 3000', hex: '#7f7e80', rgb: [127, 126, 128]},
  {id: '10', code: 'SILVER_4000', nameAr: 'فضي 4000', nameEn: 'Silver 4000', hex: '#c6c6c7', rgb: [198, 198, 199]},
  {id: '11', code: 'PINK_302', nameAr: 'وردي 302', nameEn: 'Pink 302', hex: '#bd718a', rgb: [189, 113, 138]},
  {id: '12', code: 'ORANGE_402', nameAr: 'برتقالي 402', nameEn: 'Orange 402', hex: '#c2671e', rgb: [194, 103, 30]},
  {id: '13', code: 'RED_103', nameAr: 'أحمر 103', nameEn: 'Red 103', hex: '#d1515e', rgb: [209, 81, 94]},
  {id: '14', code: 'GREEN_203', nameAr: 'أخضر 203', nameEn: 'Green 203', hex: '#8ebf7d', rgb: [142, 191, 125]},
  {id: '15', code: 'PINK_303', nameAr: 'وردي 303', nameEn: 'Pink 303', hex: '#bf9aa9', rgb: [191, 154, 169]},
  {id: '16', code: 'ORANGE_403', nameAr: 'برتقالي 403', nameEn: 'Orange 403', hex: '#c09c67', rgb: [192, 156, 103]},
  {id: '17', code: 'YELLOW_501', nameAr: 'أصفر 501', nameEn: 'Yellow 501', hex: '#bfbf1b', rgb: [191, 191, 27]},
  {id: '18', code: 'VIOLET_601', nameAr: 'بنفسجي 601', nameEn: 'Violet 601', hex: '#302f4b', rgb: [48, 47, 75]},
  {id: '19', code: 'BLUE_701', nameAr: 'أزرق 701', nameEn: 'Blue 701', hex: '#1f2b46', rgb: [31, 43, 70]},
  {id: '20', code: 'BROWN_801', nameAr: 'بني 801', nameEn: 'Brown 801', hex: '#423430', rgb: [66, 52, 48]},
  {id: '21', code: 'YELLOW_502', nameAr: 'أصفر 502', nameEn: 'Yellow 502', hex: '#b4c228', rgb: [180, 194, 40]},
];

export const CAKE_DECORATIONS: CakeDecoration[] = [
  {id: 'none', nameAr: 'بدون تزيين', nameEn: 'No decoration', categoryAr: 'كلاسيك', categoryEn: 'Classic', thumb: `${CAKE_ASSET_BASE}/thumbnails/decoration-card-none.webp`},
  {id: 'classic', nameAr: 'حافة كريمة', nameEn: 'Cream border', categoryAr: 'كلاسيك', categoryEn: 'Classic', thumb: `${CAKE_ASSET_BASE}/thumbnails/decoration-card-classic.webp`},
  {id: 'pearls', nameAr: 'لآلئ ناعمة', nameEn: 'Fine pearls', categoryAr: 'كلاسيك', categoryEn: 'Classic', thumb: `${CAKE_ASSET_BASE}/thumbnails/decoration-card-pearls.webp`},
  {id: 'retro-cherries', nameAr: 'ريترو كرز', nameEn: 'Retro cherries', categoryAr: 'ريترو', categoryEn: 'Retro', thumb: `${CAKE_ASSET_BASE}/thumbnails/decoration-card-retro-cherries.webp`},
  {id: 'retro-rose', nameAr: 'ريترو وردي', nameEn: 'Retro rose', categoryAr: 'ريترو', categoryEn: 'Retro', thumb: `${CAKE_ASSET_BASE}/thumbnails/decoration-card-retro-rose.webp`},
  {id: 'retro-chocolate', nameAr: 'ريترو شوكولاتة', nameEn: 'Retro chocolate', categoryAr: 'ريترو', categoryEn: 'Retro', thumb: `${CAKE_ASSET_BASE}/thumbnails/decoration-card-retro-chocolate.webp`},
  {id: 'rose-garden', nameAr: 'باقة ورود', nameEn: 'Rose bouquet', categoryAr: 'ورود', categoryEn: 'Roses', thumb: `${CAKE_ASSET_BASE}/thumbnails/decoration-card-rose-garden.webp`},
  {id: 'ribbons', nameAr: 'فيونكات', nameEn: 'Bows', categoryAr: 'فيونكات', categoryEn: 'Bows', thumb: `${CAKE_ASSET_BASE}/thumbnails/decoration-card-ribbons.webp`},
  {id: 'pearl-bows', nameAr: 'فيونكات ولآلئ', nameEn: 'Bows & pearls', categoryAr: 'فيونكات', categoryEn: 'Bows', thumb: `${CAKE_ASSET_BASE}/thumbnails/decoration-card-pearl-bows.webp`},
  {id: 'strawberries', nameAr: 'فراولة وكريمة', nameEn: 'Strawberries & cream', categoryAr: 'فواكه', categoryEn: 'Fruit', thumb: `${CAKE_ASSET_BASE}/thumbnails/decoration-card-strawberries.webp`},
  {id: 'berries', nameAr: 'توت وكريمة', nameEn: 'Berries & cream', categoryAr: 'فواكه', categoryEn: 'Fruit', thumb: `${CAKE_ASSET_BASE}/thumbnails/decoration-card-berries.webp`},
  {id: 'mixed-fruit', nameAr: 'فاكهة مشكّلة', nameEn: 'Mixed fruit', categoryAr: 'فواكه', categoryEn: 'Fruit', thumb: `${CAKE_ASSET_BASE}/thumbnails/decoration-card-mixed-fruit.webp`},
  {id: 'chocolate', nameAr: 'لفائف شوكولاتة', nameEn: 'Chocolate curls', categoryAr: 'شوكولاتة', categoryEn: 'Chocolate', thumb: `${CAKE_ASSET_BASE}/thumbnails/decoration-card-chocolate.webp`},
  {id: 'macarons', nameAr: 'ماكرون وورود', nameEn: 'Macarons & roses', categoryAr: 'حلويات', categoryEn: 'Sweets', thumb: `${CAKE_ASSET_BASE}/thumbnails/decoration-card-macarons.webp`},
  {id: 'sprinkles', nameAr: 'رشّات ملونة', nameEn: 'Colourful sprinkles', categoryAr: 'رشّات', categoryEn: 'Sprinkles', thumb: `${CAKE_ASSET_BASE}/thumbnails/decoration-card-sprinkles.webp`},
  {id: 'stars', nameAr: 'نجوم ذهبية', nameEn: 'Gold stars', categoryAr: 'احتفال', categoryEn: 'Celebration', thumb: `${CAKE_ASSET_BASE}/thumbnails/decoration-card-stars.webp`},
];

/** The four fixed cameras, mirroring the vendor's CAMERAS table by id. */
export const CAKE_ANGLES = [
  {id: 'original', nameAr: 'زاوية أساسية', nameEn: 'Default'},
  {id: 'front', nameAr: 'أمام الطبقات', nameEn: 'Front'},
  {id: 'side', nameAr: 'جانبية', nameEn: 'Side'},
  {id: 'high', nameAr: 'من أعلى', nameEn: 'Top'},
] as const;

/**
 * The views the shopper can switch between.
 *
 * The vendor also renders `combo` (whole cake with a slice pulled out) and
 * `filling` (the bare filling with no coating). They are omitted from the
 * shopper-facing switcher — `combo` reads as two cakes at small sizes and
 * `filling` looks like a mistake without explanation — but both still work in
 * the engine and are used by the order export.
 */
export const CAKE_VIEWS = [
  {id: 'whole', nameAr: 'القالب كامل', nameEn: 'Whole'},
  {id: 'slice', nameAr: 'القطعة', nameEn: 'Slice'},
  {id: 'cut', nameAr: 'مقطوع', nameEn: 'Cut'},
] as const;

export const findFormat = (id: string) => CAKE_FORMATS.find((f) => f.id === id);
export const findFilling = (id: string) => CAKE_FILLINGS.find((f) => f.id === id);
export const findColor = (id: string) => CAKE_COLORS.find((c) => c.id === id);
export const findDecoration = (id: string) =>
  CAKE_DECORATIONS.find((d) => d.id === id);
