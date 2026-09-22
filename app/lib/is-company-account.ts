/**
 * Is this account a company (B2B) one?
 *
 * Registration writes both signals — the `B2B` tag on the Shopify customer
 * and the `(Company)` last name — and either is enough here, so a tag edited
 * away in admin does not turn a company's account back into a personal one.
 *
 * Client-safe on purpose: the account sidebar and the profile page label
 * themselves from it, and `b2b-profile.server.ts` uses the same function so
 * the server and the screen can never disagree about who is a company.
 */
export function isCompanyAccount(customer: any): boolean {
  if (!customer) return false;
  const raw = customer.tags;
  const tags: string[] = Array.isArray(raw)
    ? raw.map((t: unknown) => String(t))
    : typeof raw === 'string'
      ? raw.split(',')
      : [];
  if (tags.some((t) => t.trim().toLowerCase() === 'b2b')) return true;
  return String(customer.lastName || '').trim() === '(Company)';
}

/** What the account calls its own details page. */
export function accountDetailsLabel(isCompany: boolean, isEn: boolean): string {
  if (isCompany) return isEn ? 'Company Information' : 'معلومات الشركة';
  return isEn ? 'Personal Information' : 'المعلومات الشخصية';
}
