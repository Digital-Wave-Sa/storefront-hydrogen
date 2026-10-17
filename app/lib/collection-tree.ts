/**
 * Sub-categories: collections that live under another collection.
 *
 * Shopify collections are a flat list, so the tree is data on each collection
 * (Shopify admin → the collection → Metafields):
 *   custom.parent_category  collection reference  «Parent category»
 *   custom.url_name         single line text      «URL name»
 * A collection with a parent is served at /collections/<parent>/<url name>,
 * e.g. «Chocolate cakes» (handle chocolate-cakes, parent Cake, URL name
 * chocolate) → /collections/cake/chocolate. Its own flat address
 * (/collections/chocolate-cakes) redirects there, and every link, the
 * breadcrumb and the sitemap use the nested one.
 *
 * One level only: a parent must itself be a main category. Rules for bad data
 * are in buildCollectionTree; the page never disappears because of them.
 */
import {useLocation, useRouteLoaderData} from 'react-router';

export type CollectionTreeNode = {
  /** The collection's title in the shopper's language. */
  title: string;
  /** Handle of the parent collection, when this is a sub-category. */
  parent?: string;
  /** Last URL segment under the parent (URL name, or the handle). */
  slug?: string;
};

/** Only collections that are a parent or a child are listed. */
export type CollectionTree = Record<string, CollectionTreeNode>;

export type RawTreeCollection = {
  handle: string;
  title: string;
  parent?: {reference?: {handle?: string | null} | null} | null;
  urlName?: {value?: string | null} | null;
};

const SLUG = /^[a-z0-9]+(-[a-z0-9]+)*$/;

/**
 * The tree from every collection's two metafields.
 *
 * - A parent that is itself a sub-category, or the collection itself, is
 *   ignored (the collection stays a main category) — URLs have two levels.
 * - URL name must be lowercase letters, numbers and hyphens; otherwise the
 *   handle is used.
 * - Two children of the same parent claiming the same URL name: the first by
 *   handle keeps it, the other uses its handle; if that is taken too, it stays
 *   a main category. Every collection keeps exactly one address.
 */
export function buildCollectionTree(collections: RawTreeCollection[]): CollectionTree {
  const byHandle = new Map(collections.map((c) => [c.handle, c]));
  const parentOf = (c: RawTreeCollection) => {
    const p = c.parent?.reference?.handle || '';
    return p && p !== c.handle && byHandle.has(p) ? p : '';
  };

  const tree: CollectionTree = {};
  const taken = new Map<string, Set<string>>(); // parent → slugs in use
  const children = collections
    .filter((c) => {
      const p = parentOf(c);
      // The parent must be a main category itself.
      return p && !parentOf(byHandle.get(p)!);
    })
    .sort((a, b) => a.handle.localeCompare(b.handle));

  for (const c of children) {
    const parent = parentOf(c);
    const used = taken.get(parent) || new Set<string>();
    const wanted = String(c.urlName?.value || '').trim().toLowerCase();
    const candidates = [SLUG.test(wanted) ? wanted : '', c.handle].filter(Boolean);
    const slug = candidates.find((s) => !used.has(s));
    if (!slug) continue;
    used.add(slug);
    taken.set(parent, used);
    tree[c.handle] = {title: c.title, parent, slug};
    const p = byHandle.get(parent)!;
    tree[parent] = tree[parent] || {title: p.title};
  }
  return tree;
}

/** «/collections/cake/chocolate», «/collections/cake», with /en when English. */
export function collectionPath(
  handle: string,
  tree: CollectionTree | null | undefined,
  isEn = false,
): string {
  const node = tree?.[handle];
  const path =
    node?.parent && node.slug
      ? `/collections/${node.parent}/${node.slug}`
      : `/collections/${handle}`;
  return `${isEn ? '/en' : ''}${path}`;
}

/** The sub-category handle behind /collections/<parent>/<slug>, or null. */
export function resolveSubCollection(
  parent: string,
  slug: string,
  tree: CollectionTree | null | undefined,
): string | null {
  for (const [handle, node] of Object.entries(tree || {})) {
    if (node.parent === parent && node.slug === slug) return handle;
  }
  return null;
}

/** A main category's sub-categories, by title. */
export function subCollections(
  parent: string,
  tree: CollectionTree | null | undefined,
): Array<{handle: string; title: string; slug: string}> {
  return Object.entries(tree || {})
    .filter(([, n]) => n.parent === parent && n.slug)
    .map(([handle, n]) => ({handle, title: n.title, slug: n.slug!}))
    .sort((a, b) => a.title.localeCompare(b.title, 'ar'));
}

/**
 * The category filter's ticked handles with a main category dropped when one
 * of its own sub-categories is ticked too: «كيك + Small Cake» means small
 * cakes, not every cake. The sidebar already unticks the parent when a child
 * is ticked; this covers hand-typed and old links.
 */
export function narrowCategorySelection(
  handles: string[],
  tree: CollectionTree | null | undefined,
): string[] {
  const ticked = new Set(handles);
  const nodes = Object.entries(tree || {});
  return handles.filter(
    (h) => !nodes.some(([child, n]) => n.parent === h && ticked.has(child)),
  );
}

/** The tree from the root loader. */
export function useCollectionTree(): CollectionTree {
  const rootData = useRouteLoaderData('root') as any;
  return (rootData?.collectionTree || {}) as CollectionTree;
}

/** (handle) → the collection's address on this storefront, language included. */
export function useCollectionHref(): (handle: string) => string {
  const tree = useCollectionTree();
  const {pathname} = useLocation();
  const isEn = pathname === '/en' || pathname.startsWith('/en/');
  return (handle: string) => collectionPath(handle, tree, isEn);
}
