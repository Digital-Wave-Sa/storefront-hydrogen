/**
 * Fixes UTF-8 Mojibake (text double-encoded as ISO-8859-1 / Windows-1252 instead of UTF-8).
 * Example: "Ø¹ØµÙŠØ±" -> "عصير"
 */
export function fixMojibake(str: string): string {
  if (!str || typeof str !== 'string') return str;
  // Quick check for latin-1 extended characters commonly produced by Mojibake
  if (!/[\u00C0-\u00FF]/.test(str)) return str;

  try {
    const bytes = new Uint8Array(
      Array.from(str, (char) => char.charCodeAt(0) & 0xff)
    );
    const decoded = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
    // If the decoded string contains Arabic or standard readable characters, return it
    if (decoded && decoded !== str) {
      return decoded;
    }
  } catch (e) {
    // If decoding fails, return original string safely
  }
  return str;
}
