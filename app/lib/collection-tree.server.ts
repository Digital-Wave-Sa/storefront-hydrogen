import {buildCollectionTree, type CollectionTree} from '~/lib/collection-tree';

const COLLECTION_TREE_QUERY = `#graphql
  query CollectionTree($country: CountryCode, $language: LanguageCode)
    @inContext(country: $country, language: $language) {
    collections(first: 250) {
      nodes {
        handle
        title
        parent: metafield(namespace: "custom", key: "parent_category") {
          reference {
            ... on Collection {
              handle
            }
          }
        }
        urlName: metafield(namespace: "custom", key: "url_name") {
          value
        }
      }
    }
  }
` as const;

/**
 * The sub-category tree (~/lib/collection-tree). Short cache: the client sets
 * a parent in Shopify admin and reloads to see the new address. Never throws —
 * without it every collection simply keeps its flat address.
 */
export async function loadCollectionTree(storefront: any): Promise<CollectionTree> {
  try {
    const res: any = await storefront.query(COLLECTION_TREE_QUERY, {
      variables: {
        country: storefront.i18n?.country,
        language: storefront.i18n?.language,
      },
      cache: storefront.CacheShort(),
    });
    return buildCollectionTree(res?.collections?.nodes || []);
  } catch (error) {
    console.error('[collection-tree] load failed:', (error as Error)?.message);
    return {};
  }
}
