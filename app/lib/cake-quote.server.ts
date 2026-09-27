import {buildCakeOptions} from '~/lib/cake-render/builder-options';
import {adminApiQuery} from '~/lib/admin.server';

/**
 * The price of a custom cake, worked out on the server.
 *
 * `api.custom-cake-order` used to charge whatever `finalTotal` the browser
 * posted: open dev tools, send `finalTotal: 1`, and Shopify issued a real
 * invoice for a 1-riyal cake. The builder's number is only a display now; the
 * money comes from here.
 *
 * It prices the cake exactly the way the builder does — the same
 * `cake_attribute` rows run through the same `buildCakeOptions`, summed the
 * same way as `calculateTotal` — so an honest shopper's total always matches,
 * and a price changed in admin between page load and checkout is caught
 * rather than silently charged.
 */

/** The fields `buildCakeOptions` reads. Images matter: they decide which rows count as managed options. */
const CAKE_PRICE_QUERY = `#graphql
  query CakeQuote {
    cakeAttributes: metaobjects(type: "cake_attribute", first: 250) {
      nodes {
        attributeType: field(key: "attribute_type") { value }
        nameEn: field(key: "name_english") { value }
        nameAr: field(key: "name_arabic") { value }
        priceDelta: field(key: "price_delta") { value }
        builderKey: field(key: "builder_key") { value }
        provisional: field(key: "provisional") { value }
        hidden: field(key: "hidden") { value }
        thumbnailUrl: field(key: "thumbnail_image") { reference { ... on MediaImage { image { url } } } }
        imageFront: field(key: "image_front") { reference { ... on MediaImage { image { url } } } }
        imageSliced: field(key: "image_sliced") { reference { ... on MediaImage { image { url } } } }
      }
    }
  }
` as const;

export type CakeSpecInput = {
  formatId?: string | null;
  fillingId?: string | null;
  colorId?: string | null;
  decorationId?: string | null;
};

export type CakeQuote =
  | {ok: true; total: number; lines: Array<{key: string; amount: number}>}
  | {ok: false; reason: 'incomplete' | 'unpriced' | 'unavailable'; detail?: string};

/**
 * Price the selected cake. `hasPhoto` adds the photo-print extra, as the
 * builder does when an image is uploaded. Nothing chosen may be unpriced — the
 * same rule the builder's checkout button enforces — so an unknown id or a
 * row with no price refuses the order instead of charging zero for it.
 */
export async function quoteCake(
  context: any,
  spec: CakeSpecInput | null | undefined,
  hasPhoto: boolean,
): Promise<CakeQuote> {
  let nodes: any[];
  try {
    const data: any = await context.storefront.query(CAKE_PRICE_QUERY, {
      cache: context.storefront.CacheShort(),
    });
    nodes = data?.cakeAttributes?.nodes ?? [];
  } catch (e: any) {
    console.error('[cake-quote] Could not read cake prices:', e?.message || e);
    return {ok: false, reason: 'unavailable'};
  }
  if (!nodes.length) return {ok: false, reason: 'unavailable'};

  const options = buildCakeOptions(nodes, false);
  const pick = (list: Array<{id: string}>, id?: string | null) =>
    id ? list.find((o) => o.id === String(id)) : undefined;

  const shape = pick(options.shapes, spec?.formatId) as any;
  const flavor = pick(options.flavors, spec?.fillingId) as any;
  const style = pick(options.styles, spec?.decorationId) as any;
  const color = pick(options.colors, spec?.colorId) as any;

  // The builder will not check out without all four (see stepComplete).
  if (!shape || !flavor || !style || !color) {
    return {ok: false, reason: 'incomplete'};
  }

  const unpriced = [
    !shape.priced && `format:${shape.id}`,
    !flavor.priced && `filling:${flavor.id}`,
    !style.priced && `decoration:${style.id}`,
    !color.priced && `color:${color.id}`,
  ].filter(Boolean);
  if (unpriced.length) {
    return {ok: false, reason: 'unpriced', detail: unpriced.join(', ')};
  }

  const lines: Array<{key: string; amount: number}> = [
    {key: `format:${shape.id}`, amount: Number(shape.price) || 0},
    {key: `filling:${flavor.id}`, amount: Number(flavor.price) || 0},
    {key: `decoration:${style.id}`, amount: Number(style.price) || 0},
    {key: `color:${color.id}`, amount: Number(color.price) || 0},
  ];

  if (hasPhoto) {
    // Same lookup as the builder's photoPrintPrice: one exact key, or no charge.
    const row = nodes.find((n) => n?.builderKey?.value === 'photoPrint');
    const raw = row?.priceDelta?.value;
    const price = raw === null || raw === undefined || raw === '' ? NaN : Number(raw);
    if (Number.isFinite(price) && price > 0) {
      lines.push({key: 'extra:photo', amount: price});
    }
  }

  const total = Math.round(lines.reduce((sum, l) => sum + l.amount, 0) * 100) / 100;
  return {ok: true, total, lines};
}

/**
 * The branch's own delivery fee, read from its location metafield.
 *
 * Same rule as the builder's `branchDeliveryFeeFrom`: `custom.delivery_fee`,
 * bare or JSON-wrapped, and 0 for a branch without one. Null when the branch
 * cannot be read, so the caller refuses rather than delivering for free.
 */
export async function branchDeliveryFee(
  shopDomain: string,
  token: string,
  branchId: string,
): Promise<number | null> {
  const id = String(branchId).startsWith('gid://')
    ? String(branchId)
    : `gid://shopify/Location/${String(branchId).replace(/\D/g, '')}`;
  try {
    const res: any = await adminApiQuery(
      shopDomain,
      token,
      `query BranchFee($id: ID!) {
        location(id: $id) {
          id
          fee: metafield(namespace: "custom", key: "delivery_fee") { value }
        }
      }`,
      {id},
    );
    const loc = res?.data?.location;
    if (!loc) return null;
    const raw = loc.fee?.value;
    if (raw === undefined || raw === null || raw === '') return 0;
    let fee = NaN;
    if (typeof raw === 'string' && raw.trim().startsWith('{')) {
      try {
        fee = parseFloat((JSON.parse(raw) as any)?.value);
      } catch {
        fee = NaN;
      }
    } else {
      fee = parseFloat(raw);
    }
    return Number.isFinite(fee) && fee > 0 ? fee : 0;
  } catch (e: any) {
    console.error('[cake-quote] Could not read branch delivery fee:', e?.message || e);
    return null;
  }
}
