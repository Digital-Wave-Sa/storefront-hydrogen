/**
 * Derives a consistent, secure password from a user's phone number + a server secret.
 * This ensures passwordless logins can generate reliable Shopify customer access tokens.
 */
export async function derivePassword(phoneOrId: string, secret: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(`otp-auth:${phoneOrId}:${secret}`);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  // Return a secure 24-character string matching Shopify's password requirements (needs upper, lower, number, special)
  return hashHex.slice(0, 24) + 'Aa1!';
}
