/**
 * Reading a Shopify metaobject's fields.
 *
 * Metaobjects come back as a flat `fields: [{key, value, reference}]` array,
 * which every consumer was unpacking for itself — CorporateGifting, the hero
 * slides and the offer cards each had their own copy of the same `getField`,
 * each with slightly different handling of images and of the `gid://` values
 * Shopify returns for file references.
 *
 * Two rules that copy kept getting wrong, and that live here now:
 *
 *   1. A file or image field's `value` is a raw `gid://shopify/MediaImage/…`.
 *      Rendering it as text puts a gid on the page; the URL is on
 *      `reference.image.url` instead.
 *   2. An empty string is not a value. A metaobject entry the merchant has
 *      created but not filled in returns `""` for the untouched fields, and
 *      `??` happily accepts that — so the page renders a blank heading rather
 *      than falling back to the built-in copy.
 */

export interface MetaobjectNode {
  id?: string;
  fields?: Array<{
    key: string;
    value?: string | null;
    reference?: any;
  }> | null;
}

export interface MetaobjectReader {
  /** Text for `key`, or '' when absent, empty, or a bare gid. */
  text: (key: string) => string;
  /** Image URL for `key`, following the reference rather than the value. */
  image: (key: string) => string;
  /**
   * Text for the current language only — `title` in Arabic, `title_en` in
   * English — and deliberately NOT the other language when it is missing.
   *
   * Cross-language fallback is the obvious thing to write here and it is
   * wrong. A merchant filling only the Arabic fields (the likely case on an
   * Arabic-first team) would have every English visitor served Arabic
   * headings, which is the exact fault this storefront has been clearing out
   * of its error messages.
   *
   * Returning '' instead lets the caller fall through to its own built-in
   * copy, so an untranslated field shows text that is stale but in the right
   * language — better than fresh text in the wrong one.
   */
  localized: (key: string, isEn: boolean) => string;
}

const isGid = (value: string) => value.startsWith('gid://');

export function readMetaobject(node?: MetaobjectNode | null): MetaobjectReader {
  const find = (key: string) => node?.fields?.find((f) => f?.key === key);

  const text = (key: string): string => {
    const field = find(key);
    const value = field?.value;
    if (typeof value !== 'string') return '';
    const trimmed = value.trim();
    // A gid is a reference, not something to show a customer.
    if (!trimmed || isGid(trimmed)) return '';
    return trimmed;
  };

  const image = (key: string): string => {
    const field = find(key);
    return (
      field?.reference?.image?.url ||
      // Some field types put the URL straight on the value.
      (typeof field?.value === 'string' &&
      !isGid(field.value) &&
      /^https?:\/\//.test(field.value)
        ? field.value
        : '')
    );
  };

  const localized = (key: string, isEn: boolean): string =>
    isEn ? text(`${key}_en`) : text(key);

  return {text, image, localized};
}

/** The first entry of a `metaobjects(type: …)` result, if there is one. */
export function firstMetaobject(result?: {nodes?: MetaobjectNode[]} | null) {
  return result?.nodes?.[0] ?? null;
}
