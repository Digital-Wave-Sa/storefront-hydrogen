/**
 * One product-URL builder, not two.
 *
 * This file used to hold its own copy of `getVariantUrl`, straight from the
 * Hydrogen template, matching an `/en-us/` style prefix:
 *
 *   const match = /(\/[a-zA-Z]{2}-[a-zA-Z]{2}\/)/g.exec(pathname);
 *
 * This storefront localizes on a bare `/en`, so that pattern never matched
 * and every link it built came out as `/products/<handle>` -- the Arabic
 * route -- however English the page around it was. `~/utils` holds the same
 * function with the right pattern, so the two disagreed depending on which
 * one a component happened to import.
 *
 * `CartLineItem` imported this one. A shopper on /en/cart clicking a product
 * name landed on the Arabic side, and every cart request after that went to
 * `/cart` rather than `/en/cart`.
 *
 * Re-exported rather than deleted, so any import of this path keeps working
 * and gets the correct behaviour.
 */
export {useVariantUrl, getVariantUrl} from '~/utils';
