import {redirect, type LoaderFunctionArgs} from 'react-router';
import Collection, {
  loader as collectionLoader,
  meta as collectionMeta,
} from './($locale).collections.$handle';
import {collectionPath, resolveSubCollection} from '~/lib/collection-tree';
import {loadCollectionTree} from '~/lib/collection-tree.server';

/**
 * A sub-category page: /collections/<parent>/<url name> (~/lib/collection-tree).
 *
 * The pair is looked up in the tree built from each collection's «Parent
 * category» and «URL name» metafields, then the ordinary collection page
 * renders that collection — same loader, same page, one address.
 *
 * Not a known pair:
 *   /collections/<wrong parent>/<child handle or URL name>  → its real address
 *   anything else                                           → 404
 */
export async function loader(args: LoaderFunctionArgs) {
  const {params, request, context} = args;
  const parent = String(params.parent || '').toLowerCase();
  const child = String(params.child || '').toLowerCase();
  const tree = await loadCollectionTree(context.storefront);

  const handle = resolveSubCollection(parent, child, tree);
  if (!handle) {
    const bySlug = Object.keys(tree).filter(
      (h) => tree[h].parent && tree[h].slug === child,
    );
    const moved =
      (tree[child]?.parent && child) || (bySlug.length === 1 ? bySlug[0] : '');
    if (moved) {
      const prefix = params.locale ? `/${params.locale}` : '';
      throw redirect(
        `${prefix}${collectionPath(moved, tree)}${new URL(request.url).search}`,
        301,
      );
    }
    throw new Response('Not found', {status: 404});
  }

  return collectionLoader({
    ...args,
    params: {...params, handle, __nested: '1'},
  });
}

export const meta = collectionMeta;

export default Collection;
