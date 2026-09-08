/**
 * Product names and artwork for orders that came from the Admin REST API.
 *
 * The account dashboard does not read its orders from the Storefront customer
 * query. A shopper who signed in by OTP holds one of this storefront's own
 * `session-...` tokens, which that query will not accept, so the loader falls
 * back to Admin REST and maps the result by hand. Admin REST line items carry
 * `title`, `quantity` and `variant_id` — and no image, and no product — so the
 * mapper wrote:
 *
 *     variant: {id: ..., image: null}
 *
 * The card then had nothing to show but `li.title`, which is Shopify's ENGLISH
 * snapshot frozen at purchase time. Hence the same order reading «بينات كرانش»
 * with a photograph on /account/orders and "PANUT CRUNCH" with an empty tile on
 * the dashboard.
 *
 * One Storefront query fixes both at once. The variant ids the mapper already
 * keeps are enough to ask for the live, translated product name and its
 * artwork, and `@inContext(language:)` returns them in the shopper's language.
 *
 * /account/orders still holds its own near-identical title lookup. It works and
 * is left alone for now; this is where the two should meet.
 */

type EnrichOptions = {
  /** How many orders to enrich, newest first. The dashboard shows one. */
  maxOrders?: number;
  /** Ceiling on ids per request, so a large account cannot send a huge query. */
  maxVariants?: number;
};

export async function enrichOrderLineItems(
  storefront: any,
  orders: any[],
  {maxOrders = 5, maxVariants = 50}: EnrichOptions = {},
): Promise<any[]> {
  if (!storefront || !Array.isArray(orders) || orders.length === 0) {
    return orders;
  }

  const scope = orders.slice(0, maxOrders);

  const variantIds = Array.from(
    new Set(
      scope.flatMap((o: any) =>
        (o?.lineItems?.nodes || [])
          .map((li: any) => li?.variant?.id || li?.variantId)
          .filter(Boolean)
          .map((id: any) =>
            String(id).startsWith('gid://')
              ? String(id)
              : `gid://shopify/ProductVariant/${id}`,
          ),
      ),
    ),
  ).slice(0, maxVariants);

  if (variantIds.length === 0) return orders;

  const query = `#graphql
    query OrderLineItemMedia($ids: [ID!]!, $country: CountryCode, $language: LanguageCode)
      @inContext(country: $country, language: $language) {
      nodes(ids: $ids) {
        ... on ProductVariant {
          id
          image { url altText }
          product {
            title
            featuredImage { url altText }
          }
        }
      }
    }
  `;

  let nodes: any[] = [];
  try {
    const result: any = await storefront.query(query, {
      variables: {ids: variantIds},
      cache: storefront.CacheShort(),
    });
    nodes = result?.nodes || [];
  } catch (err: any) {
    /**
     * Best effort. A failure here costs a translated name and a thumbnail,
     * which is the state this page was already in — never the order itself.
     */
    console.warn(
      '[Account] Order line-item media lookup failed:',
      err?.message || err,
    );
    return orders;
  }

  const byVariant = new Map<string, any>();
  for (const node of nodes) {
    if (node?.id) byVariant.set(String(node.id), node);
  }
  if (byVariant.size === 0) return orders;

  const enrichOne = (order: any) => {
    const lines = order?.lineItems?.nodes;
    if (!Array.isArray(lines)) return order;

    return {
      ...order,
      lineItems: {
        ...order.lineItems,
        nodes: lines.map((li: any) => {
          const rawId = li?.variant?.id || li?.variantId;
          if (!rawId) return li;
          const gid = String(rawId).startsWith('gid://')
            ? String(rawId)
            : `gid://shopify/ProductVariant/${rawId}`;
          const match = byVariant.get(gid);
          if (!match) return li;

          return {
            ...li,
            // The live translated name, keeping the purchase-time title as the
            // fallback so a delisted product still reads as something.
            title: match.product?.title || li.title,
            variant: {
              ...(li.variant || {}),
              id: gid,
              image: match.image || li.variant?.image || null,
              product: {
                ...(li.variant?.product || {}),
                title: match.product?.title || li.variant?.product?.title,
                featuredImage:
                  match.product?.featuredImage ||
                  li.variant?.product?.featuredImage ||
                  null,
              },
            },
          };
        }),
      },
    };
  };

  const enrichedScope = scope.map(enrichOne);
  return [...enrichedScope, ...orders.slice(maxOrders)];
}
