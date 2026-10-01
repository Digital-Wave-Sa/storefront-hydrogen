/**
 * Matching for the listing filters — see ~/lib/catalog-filters for the rules.
 *
 * Works on product ids only (cheap, cached for a few minutes): which
 * collection holds which products, and which products carry a set of tags.
 * The listing then fetches full product data just for the page it shows.
 */
import {
  DIETARY_OPTIONS,
  dietaryOptionForTag,
  isOccasionHandle,
  type DietaryCounts,
  type DietaryOption,
} from '~/lib/catalog-filters';

const COLLECTION_MEMBERSHIP_QUERY = `#graphql
  query CatalogFilterMembership($country: CountryCode, $language: LanguageCode)
  @inContext(country: $country, language: $language) {
    collections(first: 60) {
      nodes {
        handle
        products(first: 250) {
          nodes {
            id
          }
        }
      }
    }
  }
`;

const PRODUCT_IDS_BY_QUERY = `#graphql
  query CatalogFilterTagIds(
    $query: String!
    $after: String
    $country: CountryCode
    $language: LanguageCode
  ) @inContext(country: $country, language: $language) {
    products(first: 250, query: $query, after: $after) {
      nodes {
        id
      }
      pageInfo {
        hasNextPage
        endCursor
      }
    }
  }
`;

const ctxOf = (storefront: any) => ({
  country: storefront.i18n.country,
  language: storefront.i18n.language,
});

/** handle → product ids, in each collection's own order. */
export async function loadCollectionMembership(
  storefront: any,
): Promise<Map<string, string[]>> {
  const res: any = await storefront.query(COLLECTION_MEMBERSHIP_QUERY, {
    variables: ctxOf(storefront),
    cache: storefront.CacheShort(),
  });
  const out = new Map<string, string[]>();
  for (const c of res?.collections?.nodes || []) {
    out.set(
      String(c.handle),
      (c.products?.nodes || []).map((n: any) => n.id).filter(Boolean),
    );
  }
  return out;
}

/** Ids of products carrying ANY of `tags`, by exact tag. */
export async function productIdsWithTags(
  storefront: any,
  tags: string[],
): Promise<Set<string>> {
  const ids = new Set<string>();
  const clean = [...new Set(tags.map((t) => String(t).trim()).filter(Boolean))];
  if (!clean.length) return ids;
  const query = clean.map((t) => `tag:'${t.replace(/'/g, "\\'")}'`).join(' OR ');
  let after: string | null = null;
  for (let page = 0; page < 4; page++) {
    const res: any = await storefront.query(PRODUCT_IDS_BY_QUERY, {
      variables: {...ctxOf(storefront), query, after},
      cache: storefront.CacheShort(),
    });
    for (const n of res?.products?.nodes || []) if (n?.id) ids.add(n.id);
    if (!res?.products?.pageInfo?.hasNextPage) break;
    after = res.products.pageInfo.endCursor;
  }
  return ids;
}

async function idsForDietary(
  storefront: any,
  option: DietaryOption,
  membership: Map<string, string[]>,
): Promise<Set<string>> {
  const ids = await productIdsWithTags(storefront, option.tags);
  for (const h of option.collections) {
    for (const id of membership.get(h) || []) ids.add(id);
  }
  return ids;
}

/** How many products each dietary option matches — the sidebar hides zeros. */
export async function loadDietaryCounts(
  storefront: any,
  membership?: Map<string, string[]>,
): Promise<DietaryCounts> {
  try {
    const m = membership || (await loadCollectionMembership(storefront));
    const counts: DietaryCounts = {};
    await Promise.all(
      DIETARY_OPTIONS.map(async (o) => {
        counts[o.key] = (await idsForDietary(storefront, o, m)).size;
      }),
    );
    return counts;
  } catch (e) {
    console.warn('[catalog-filters] Could not count dietary options:', e);
    return {};
  }
}

/**
 * The product ids allowed by the ticked tags and categories, or null when
 * nothing is ticked. Dietary options are ANDed, occasions ORed, categories
 * ORed, groups ANDed; an unknown tag is matched exactly (ORed with other
 * unknown tags).
 */
export async function allowedProductIds(
  storefront: any,
  {
    tags,
    categories,
    membership,
  }: {
    tags: string[];
    categories: string[];
    membership: Map<string, string[]>;
  },
): Promise<Set<string> | null> {
  const groups: Set<string>[] = [];

  // Dietary: each option is its own requirement.
  const dietary = new Map<string, DietaryOption>();
  const otherTags: string[] = [];
  for (const t of tags) {
    const o = dietaryOptionForTag(t);
    if (o) dietary.set(o.key, o);
    else otherTags.push(t);
  }
  for (const o of dietary.values()) {
    groups.push(await idsForDietary(storefront, o, membership));
  }

  if (otherTags.length) {
    groups.push(await productIdsWithTags(storefront, otherTags));
  }

  // Categories and occasions: a collection of that handle, or that tag.
  const handleIds = async (handles: string[]) => {
    const ids = await productIdsWithTags(storefront, handles);
    for (const h of handles) for (const id of membership.get(h) || []) ids.add(id);
    return ids;
  };
  const occasions = categories.filter(isOccasionHandle);
  const plain = categories.filter((c) => !isOccasionHandle(c));
  if (occasions.length) groups.push(await handleIds(occasions));
  if (plain.length) groups.push(await handleIds(plain));

  if (!groups.length) return null;
  let allowed = groups[0];
  for (const g of groups.slice(1)) {
    allowed = new Set([...allowed].filter((id) => g.has(id)));
  }
  return allowed;
}
