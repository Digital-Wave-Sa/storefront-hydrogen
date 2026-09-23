/**
 * Turns the render catalog plus the client's prices into the option lists the
 * builder already knows how to draw.
 *
 * ── Why this file exists rather than a rewrite of the builder ──
 *
 * `CustomCakeBuilder` is a 102 KB component that also owns the cart, the draft
 * order, the branch choice and both languages. It consumes option lists in one
 * specific shape — `{id, name, price, image}` — and that shape is threaded
 * through every step, the summary, the submit payload and the reorder cache.
 *
 * So the swap from six hand-named sizes to the vendor's 23 formats is done
 * HERE, by producing the same shape from different data. The builder's own code
 * barely changes, which is the point: the smaller the diff in that file, the
 * fewer places a regression can hide.
 *
 * ── Identity here, prices from Shopify ──
 *
 * Names, dimensions and thumbnails come from `catalog.ts`, which is generated
 * from the vendor's package. Prices come from the `cake_attribute` metaobject,
 * joined on its `builder_key` field. Nothing in this file invents a riyal: an
 * option with no matching metaobject row comes back `priced: false`, and the
 * builder refuses to sell it rather than selling it for nothing.
 */

import {
  CAKE_FORMATS,
  CAKE_FILLINGS,
  CAKE_COLORS,
  CAKE_DECORATIONS,
} from './catalog';

export type BuilderOption = {
  /** The catalog id — also the `builder_key` on the metaobject row. */
  id: string;
  /** Bilingual label, built the way the builder's existing cards expect. */
  name: string;
  nameAr: string;
  nameEn: string;
  /** SAR. Zero when the client has set it to zero AND when unpriced — see `priced`. */
  price: number;
  /**
   * False when no `cake_attribute` row carries this `builder_key`, or its
   * `price_delta` is blank. A zero price is a real answer meaning free; an
   * absent one is not, and the two must stay distinguishable all the way to
   * the checkout guard.
   */
  priced: boolean;
  /**
   * True when this price was modelled by us, not supplied by Saadeddin.
   *
   * The 51 seeded prices are derived from the store's own four published cakes
   * by fitting `price = a · volume^b` — a defensible model, and still a guess.
   * It exists so the whole builder can be exercised and demonstrated before
   * the client returns their sheet, WITHOUT the guesses becoming sellable.
   *
   * Distinct from `priced`, and the distinction matters: unpriced means we do
   * not know the number, provisional means we made it up. Both block checkout;
   * only the second one renders a total.
   */
  provisional: boolean;
  image: string;
  /**
   * Present on shapes managed in Shopify: the finished pictures of this cake
   * from each side, straight from the metaobject. When a shape has these the
   * builder shows them instead of drawing the cake.
   */
  art?: {
    front?: string;
    top?: string;
    sliced?: string;
    /**
     * Frosting layers for each view: a grey shading picture of just the
     * frosting, transparent everywhere else. The builder paints it in the
     * chosen colour and lays it over the matching picture.
     */
    frosting?: {front?: string; top?: string; sliced?: string};
  };
  /** Present on colours only: the swatch the preview tints with. */
  color?: string;
  /** Present on shapes only: the geometry the renderer needs. */
  shape?: 'round' | 'square' | 'rectangle';
  width?: number;
  depth?: number;
  height?: number;
  /** Present on decorations only. */
  categoryAr?: string;
  categoryEn?: string;
};

export type CakeOptionSet = {
  shapes: BuilderOption[];
  flavors: BuilderOption[];
  styles: BuilderOption[];
  colors: BuilderOption[];
};

/**
 * Index the metaobject rows by `builder_key`.
 *
 * Deliberately NOT matched on `name_english`. The five prototype rows in the
 * store today are named "Small Standard", "Vanilla" and so on — free text that
 * an admin will reasonably fix a typo in one day, silently unpricing whatever
 * it was joined to. A key the client never sees is a key the client never
 * breaks.
 */
function priceIndex(
  cakeAttributes: any[],
): Map<string, {price: number; provisional: boolean}> {
  const index = new Map<string, {price: number; provisional: boolean}>();
  for (const attr of cakeAttributes ?? []) {
    const key = attr?.builderKey?.value;
    const raw = attr?.priceDelta?.value;
    if (!key) continue;
    const price = raw === null || raw === undefined || raw === '' ? NaN : Number(raw);
    if (!Number.isFinite(price) || price < 0) continue;
    // A boolean metafield comes back as the string "true"/"false", or null
    // when never set. Null means a real price: the client's own rows have no
    // reason to carry the flag, so absence is the safe, permissive default and
    // only our seeded rows opt in.
    const provisional = attr?.provisional?.value === 'true';
    index.set(String(key), {price, provisional});
  }
  return index;
}

const label = (ar: string, en: string, isEn: boolean) =>
  isEn ? en : ar;

export function buildCakeOptions(
  cakeAttributes: any[],
  isEn: boolean,
): CakeOptionSet {
  const prices = priceIndex(cakeAttributes);
  const priceOf = (key: string) => {
    const found = prices.get(key);
    return {
      price: found?.price ?? 0,
      priced: found !== undefined,
      provisional: found?.provisional ?? false,
    };
  };

  /**
   * Shapes managed in Shopify.
   *
   * A `cake_attribute` row is a builder shape when it is typed `shape`, has a
   * `builder_key`, a front picture, and is not marked hidden. Everything about
   * it — name, price, pictures, position — is edited in admin; adding a shape
   * is adding a row, with no deploy.
   *
   * The older size rows (round-20x20-h8 …) have no pictures, so they are not
   * listed, and stay in place for the price book and for old orders.
   *
   * When no such row exists yet the builder falls back to the render catalog
   * below, so the page never opens empty.
   */
  const urlOf = (field: any): string | undefined =>
    field?.reference?.image?.url || undefined;
  const managedShapes: BuilderOption[] = (cakeAttributes ?? [])
    .filter(
      (a: any) =>
        a?.attributeType?.value === 'shape' &&
        a?.builderKey?.value &&
        urlOf(a?.imageFront) &&
        a?.hidden?.value !== 'true',
    )
    .map((a: any) => {
      const key = String(a.builderKey.value);
      const nameEn = String(a?.nameEn?.value || key);
      const nameAr = String(a?.nameAr?.value || nameEn);
      const front = urlOf(a.imageFront);
      return {
        id: key,
        name: label(nameAr, nameEn, isEn),
        nameAr,
        nameEn,
        image: urlOf(a.thumbnailUrl) || front || '',
        art: {
          front,
          top: urlOf(a.imageTop),
          sliced: urlOf(a.imageSliced),
          frosting: {
            front: urlOf(a.frostingFront),
            top: urlOf(a.frostingTop),
            sliced: urlOf(a.frostingSliced),
          },
        },
        sortOrder: Number(a?.sortOrder?.value ?? NaN),
        ...priceOf(key),
      };
    })
    .sort((x: any, y: any) => {
      const ax = Number.isFinite(x.sortOrder) ? x.sortOrder : 1e9;
      const ay = Number.isFinite(y.sortOrder) ? y.sortOrder : 1e9;
      return ax - ay || x.nameEn.localeCompare(y.nameEn);
    })
    .map(({sortOrder, ...rest}: any) => rest as BuilderOption);

  const catalogShapes: BuilderOption[] = CAKE_FORMATS.map((f) => ({
    id: f.id,
    name: label(f.nameAr, f.nameEn, isEn),
    nameAr: f.nameAr,
    nameEn: f.nameEn,
    image: f.thumb,
    shape: f.shape,
    width: f.width,
    depth: f.depth,
    height: f.height,
    ...priceOf(f.id),
  }));

  const shapes = managedShapes.length > 0 ? managedShapes : catalogShapes;

  /**
   * Flavours managed in Shopify, the same way as shapes: a `cake_attribute`
   * row typed `flavor` with a `builder_key`, a slice picture and not hidden.
   * The per-shape slice pictures live in `cake_flavor_slice`.
   *
   * The older filling price rows (01–10) have no slice picture and are left
   * out; with no managed flavour at all the catalog list below is used.
   */
  const managedFlavors: BuilderOption[] = (cakeAttributes ?? [])
    .filter(
      (a: any) =>
        a?.attributeType?.value === 'flavor' &&
        a?.builderKey?.value &&
        urlOf(a?.imageSliced) &&
        a?.hidden?.value !== 'true',
    )
    .map((a: any) => {
      const key = String(a.builderKey.value);
      const nameEn = String(a?.nameEn?.value || key);
      const nameAr = String(a?.nameAr?.value || nameEn);
      return {
        id: key,
        name: label(nameAr, nameEn, isEn),
        nameAr,
        nameEn,
        image: urlOf(a.thumbnailUrl) || urlOf(a.imageSliced) || '',
        sortOrder: Number(a?.sortOrder?.value ?? NaN),
        ...priceOf(key),
      };
    })
    .sort((x: any, y: any) => {
      const ax = Number.isFinite(x.sortOrder) ? x.sortOrder : 1e9;
      const ay = Number.isFinite(y.sortOrder) ? y.sortOrder : 1e9;
      return ax - ay || x.nameEn.localeCompare(y.nameEn);
    })
    .map(({sortOrder, ...rest}: any) => rest as BuilderOption);

  const catalogFlavors: BuilderOption[] = CAKE_FILLINGS.map((f) => ({
    id: f.id,
    name: label(f.nameAr, f.nameEn, isEn),
    nameAr: f.nameAr,
    nameEn: f.nameEn,
    image: f.thumb,
    ...priceOf(f.id),
  }));

  // `none` is a real decoration with its own row and its own thumbnail. It is
  // NOT the old hand-written "Smooth Minimalist" placeholder, which existed
  // only because the absence of a topping had nowhere to live.
  const flavors = managedFlavors.length > 0 ? managedFlavors : catalogFlavors;

  /**
   * Toppings managed in Shopify: `cake_attribute` rows typed `topping` with a
   * `builder_key` and a thumbnail, not hidden. Their pictures per shape live
   * in `cake_topping_design` (topping × shape → front/top/sliced layers) and
   * are laid over the cake by the builder. When any exist they replace the
   * drawn decorations, with "no decoration" kept first.
   */
  const managedStyles: BuilderOption[] = (cakeAttributes ?? [])
    .filter(
      (a: any) =>
        a?.attributeType?.value === 'topping' &&
        a?.builderKey?.value &&
        urlOf(a?.thumbnailUrl) &&
        a?.hidden?.value !== 'true',
    )
    .map((a: any) => {
      const key = String(a.builderKey.value);
      const nameEn = String(a?.nameEn?.value || key);
      const nameAr = String(a?.nameAr?.value || nameEn);
      return {
        id: key,
        name: label(nameAr, nameEn, isEn),
        nameAr,
        nameEn,
        image: urlOf(a.thumbnailUrl) || '',
        sortOrder: Number(a?.sortOrder?.value ?? NaN),
        ...priceOf(key),
      };
    })
    .sort((x: any, y: any) => {
      const ax = Number.isFinite(x.sortOrder) ? x.sortOrder : 1e9;
      const ay = Number.isFinite(y.sortOrder) ? y.sortOrder : 1e9;
      return ax - ay || x.nameEn.localeCompare(y.nameEn);
    })
    .map(({sortOrder, ...rest}: any) => rest as BuilderOption);

  const catalogStyles: BuilderOption[] = CAKE_DECORATIONS.map((d) => ({
    id: d.id,
    name: label(d.nameAr, d.nameEn, isEn),
    nameAr: d.nameAr,
    nameEn: d.nameEn,
    image: d.thumb,
    categoryAr: d.categoryAr,
    categoryEn: d.categoryEn,
    ...priceOf(d.id),
  }));

  /**
   * Colours are free and always have been, so they carry `priced: true` with a
   * price of zero rather than going through the index. If the client ever
   * charges for a coating, this becomes a `priceOf(c.id)` like the rest and
   * the optional `colors` map in the price book is already there for it.
   */
  const colors: BuilderOption[] = CAKE_COLORS.map((c) => ({
    id: c.id,
    name: label(c.nameAr, c.nameEn, isEn),
    nameAr: c.nameAr,
    nameEn: c.nameEn,
    image: '',
    // PURE_WHITE's sampled hex is a grey — it is the unpainted master, not a
    // colour choice — so the swatch shows the cream the shopper actually gets.
    color: c.id === '00' ? '#f5f3ee' : c.hex,
    price: 0,
    priced: true,
    provisional: false,
  }));

  const noneStyle = catalogStyles.find((d) => d.id === 'none');
  const styles: BuilderOption[] =
    managedStyles.length > 0
      ? [...(noneStyle ? [{...noneStyle, priced: true, provisional: false}] : []), ...managedStyles]
      : catalogStyles;

  return {shapes, flavors, styles, colors};
}

/**
 * Every selected option that has no price yet.
 *
 * The builder calls this to decide whether checkout is allowed. Until the
 * client returns the price sheet this will name everything, and the button will
 * stay disabled — which is the correct behaviour, not a bug to work around.
 */
export function unpricedSelections(selections: {
  shape?: BuilderOption | null;
  flavor?: BuilderOption | null;
  style?: BuilderOption | null;
}): string[] {
  const gaps: string[] = [];
  if (selections.shape && !selections.shape.priced)
    gaps.push(`format:${selections.shape.id}`);
  if (selections.flavor && !selections.flavor.priced)
    gaps.push(`filling:${selections.flavor.id}`);
  if (selections.style && !selections.style.priced)
    gaps.push(`decoration:${selections.style.id}`);
  return gaps;
}

/**
 * Selected options whose price we modelled rather than received.
 *
 * Separate from `unpricedSelections` because the two need different handling:
 * an unpriced cake cannot show a total at all, while a provisional one shows a
 * complete, plausible total and simply must not be sold. Keeping them apart is
 * what lets the builder be fully demonstrable while staying unsellable.
 */
export function provisionalSelections(selections: {
  shape?: BuilderOption | null;
  flavor?: BuilderOption | null;
  style?: BuilderOption | null;
}): string[] {
  const flagged: string[] = [];
  if (selections.shape?.provisional) flagged.push(`format:${selections.shape.id}`);
  if (selections.flavor?.provisional) flagged.push(`filling:${selections.flavor.id}`);
  if (selections.style?.provisional) flagged.push(`decoration:${selections.style.id}`);
  return flagged;
}
