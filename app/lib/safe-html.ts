/**
 * Staff-entered HTML from a Shopify metafield, made safe to render.
 *
 * Used for product metafields such as `custom.nutrition`, which staff fill
 * in by hand (often pasting a nutrition table). Shopify stores the text as
 * is, so before it reaches `dangerouslySetInnerHTML` this removes anything
 * that could run code: script-like elements, inline event handlers
 * (onclick=…) and javascript:/data: links. Ordinary formatting — tables,
 * bold, lists, line breaks, inline styles — is kept.
 *
 * Works the same on the server and in the browser (no DOM needed), so the
 * first render and hydration match.
 */

/** True when the text contains at least one HTML tag. */
export function looksLikeHtml(value: string | null | undefined): boolean {
  return /<\/?[a-z][a-z0-9-]*(\s[^>]*)?>/i.test(String(value ?? ''));
}

const BLOCKED_ELEMENTS =
  'script|style|iframe|frame|frameset|object|embed|applet|link|meta|base|form|input|button|textarea|select|svg|math|template|noscript';

export function sanitizeHtml(value: string | null | undefined): string {
  let html = String(value ?? '');

  // Elements removed together with their content.
  html = html.replace(
    new RegExp(`<(${BLOCKED_ELEMENTS})\\b[\\s\\S]*?<\\/\\1\\s*>`, 'gi'),
    '',
  );
  // Any leftover opening/closing or self-closing tag of those elements.
  html = html.replace(new RegExp(`<\\/?(${BLOCKED_ELEMENTS})\\b[^>]*>`, 'gi'), '');
  // HTML comments (can hide conditional markup).
  html = html.replace(/<!--[\s\S]*?-->/g, '');
  // Inline event handlers: onclick="…", onload='…', onerror=…
  html = html.replace(/\s+on[a-z]+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, '');
  // javascript:, vbscript: and data: in links and sources.
  html = html.replace(
    /\s+(href|src|xlink:href|action|formaction)\s*=\s*("|')?\s*(javascript|vbscript|data):[^"'\s>]*\2?/gi,
    '',
  );
  // CSS expressions / javascript urls inside style attributes.
  html = html.replace(
    /\s+style\s*=\s*("[^"]*(expression|javascript:)[^"]*"|'[^']*(expression|javascript:)[^']*')/gi,
    '',
  );

  return html.trim();
}
