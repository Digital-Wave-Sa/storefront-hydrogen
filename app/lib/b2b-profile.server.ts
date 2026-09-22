/**
 * Company details for B2B accounts.
 *
 * Registration collected the tax number, commercial register, national
 * address and company address, posted them to the CRM once, and kept nothing
 * on this side. Nothing read them back, so /account/profile could not show
 * them and the customer could not correct a typo without phoning the shop.
 *
 * They now live on the Shopify customer as metafields under `b2b`, which is
 * the copy the profile page reads and writes. The CRM still receives them at
 * registration, and receives edits too, but a CRM that ignores the extra keys
 * no longer means the values are lost.
 *
 * The validation rules are the registration rules, kept here so the two
 * places cannot drift: a saved profile has to be as good as a new signup.
 */

/*
  `custom`, not a namespace of our own.

  The store already defines `custom.tax_registration` and
  `custom.company_address` for customers, and those definitions are what the
  admin customer page shows. Writing the same facts to a private `b2b`
  namespace stored them correctly but left the admin card empty and gave the
  shop two places to look. Definitions for the other three keys now exist
  alongside them.

  `type` has to match each definition exactly — company_address is defined as
  multi-line — or Shopify rejects the write.
*/
export const B2B_NAMESPACE = 'custom';

/** The company fields, in the order the profile shows them. */
export const B2B_FIELDS = [
  {
    key: 'company_name',
    form: 'companyName',
    crm: 'companyName',
    type: 'single_line_text_field',
  },
  {
    key: 'tax_registration',
    form: 'taxRegistration',
    crm: 'taxNumber',
    type: 'single_line_text_field',
  },
  {
    key: 'commercial_register',
    form: 'commercialRegister',
    crm: 'commercialRegister',
    type: 'single_line_text_field',
  },
  {
    key: 'national_address',
    form: 'nationalAddress',
    crm: 'nationalAddress',
    type: 'single_line_text_field',
  },
  {
    key: 'company_address',
    form: 'companyAddress',
    crm: 'companyAddress',
    type: 'multi_line_text_field',
  },
] as const;

export type B2BFormKey = (typeof B2B_FIELDS)[number]['form'];
export type CompanyProfile = Partial<Record<B2BFormKey, string>>;

const ADMIN_API_VERSION = '2024-01';

/**
 * A company account, as the rest of the site marks one. The test lives in
 * `~/lib/is-company-account` because the sidebar and the profile page label
 * themselves from it too, and the two must not disagree.
 */
export {isCompanyAccount} from '~/lib/is-company-account';

/** Digits and length rules, identical to the registration form's. */
export function validateCompanyProfile(
  values: CompanyProfile,
  lang: 'en' | 'ar',
): {ok: true} | {ok: false; error: string} {
  const tax = String(values.taxRegistration ?? '').trim();
  const cr = String(values.commercialRegister ?? '').trim();
  const national = String(values.nationalAddress ?? '').trim();
  const name = String(values.companyName ?? '').trim();

  if (values.companyName !== undefined && !name) {
    return {
      ok: false,
      error:
        lang === 'en'
          ? 'Please enter the company name.'
          : 'يرجى إدخال اسم الشركة.',
    };
  }
  if (values.taxRegistration !== undefined && !/^\d{15}$/.test(tax)) {
    return {
      ok: false,
      error:
        lang === 'en'
          ? 'The tax number must be exactly 15 digits.'
          : 'الرقم الضريبي يجب أن يتكون من 15 رقماً.',
    };
  }
  if (values.commercialRegister !== undefined && !/^\d{10}$/.test(cr)) {
    return {
      ok: false,
      error:
        lang === 'en'
          ? 'The commercial register must be exactly 10 digits.'
          : 'السجل التجاري يجب أن يتكون من 10 أرقام.',
    };
  }
  if (values.nationalAddress !== undefined && national.length !== 8) {
    return {
      ok: false,
      error:
        lang === 'en'
          ? 'The national address must be exactly 8 characters.'
          : 'العنوان الوطني يجب أن يتكون من 8 خانات.',
    };
  }
  return {ok: true};
}

async function adminCredentials(env: any) {
  const {getAdminToken, getAdminDomain} = await import(
    '~/lib/shopify-admin.server'
  );
  const token = await getAdminToken(env);
  const domain = getAdminDomain(env);
  return token && domain ? {token, domain} : null;
}

/** The company details held for this customer, or an empty object. */
export async function readCompanyProfile(
  env: any,
  numericId: string | number,
): Promise<CompanyProfile> {
  const creds = await adminCredentials(env);
  if (!creds || !numericId) return {};

  const identifiers = B2B_FIELDS.map(
    (f) => `{namespace: "${B2B_NAMESPACE}", key: "${f.key}"}`,
  ).join(', ');

  try {
    const res = await fetch(
      `https://${creds.domain}/admin/api/${ADMIN_API_VERSION}/graphql.json`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Shopify-Access-Token': creds.token,
        },
        body: JSON.stringify({
          query: `
            query companyProfile($id: ID!) {
              customer(id: $id) {
                metafields(identifiers: [${identifiers}]) { key value }
              }
            }
          `,
          variables: {id: `gid://shopify/Customer/${numericId}`},
        }),
      },
    );
    const json: any = await res.json();
    const rows: any[] = json?.data?.customer?.metafields || [];
    const out: CompanyProfile = {};
    for (const field of B2B_FIELDS) {
      const hit = rows.find((m) => m && m.key === field.key);
      if (hit?.value) out[field.form] = String(hit.value);
    }
    return out;
  } catch (e) {
    console.error('[B2B] Failed to read the company profile:', e);
    return {};
  }
}

/**
 * Write the company details. Only the keys present are written, so a caller
 * that knows about three fields cannot blank the other two.
 */
export async function writeCompanyProfile(
  env: any,
  numericId: string | number,
  values: CompanyProfile,
): Promise<boolean> {
  const creds = await adminCredentials(env);
  if (!creds || !numericId) return false;

  const metafields = B2B_FIELDS.filter(
    (f) => typeof values[f.form] === 'string' && values[f.form] !== undefined,
  ).map((f) => ({
    ownerId: `gid://shopify/Customer/${numericId}`,
    namespace: B2B_NAMESPACE,
    key: f.key,
    type: f.type,
    value: String(values[f.form]).trim(),
  }));
  if (metafields.length === 0) return true;

  try {
    const res = await fetch(
      `https://${creds.domain}/admin/api/${ADMIN_API_VERSION}/graphql.json`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Shopify-Access-Token': creds.token,
        },
        body: JSON.stringify({
          query: `
            mutation setCompanyProfile($metafields: [MetafieldsSetInput!]!) {
              metafieldsSet(metafields: $metafields) {
                userErrors { field message }
              }
            }
          `,
          variables: {metafields},
        }),
      },
    );
    const json: any = await res.json();
    const errors = json?.data?.metafieldsSet?.userErrors || [];
    if (errors.length > 0) {
      console.error('[B2B] metafieldsSet userErrors:', errors);
      return false;
    }
    return true;
  } catch (e) {
    console.error('[B2B] Failed to write the company profile:', e);
    return false;
  }
}

/**
 * Read the company fields out of a posted form.
 *
 * Keys the form did not post are left undefined rather than empty, which is
 * what keeps a partial form from clearing a stored value.
 */
export function companyProfileFromForm(form: FormData): CompanyProfile {
  const out: CompanyProfile = {};
  for (const field of B2B_FIELDS) {
    const raw = form.get(field.form);
    if (typeof raw === 'string') out[field.form] = raw.trim();
  }
  return out;
}

/** The same values under the names the CRM's register payload uses. */
export function companyProfileForCrm(
  values: CompanyProfile,
): Record<string, string> {
  const out: Record<string, string> = {};
  for (const field of B2B_FIELDS) {
    const v = values[field.form];
    if (typeof v === 'string' && v) out[field.crm] = v;
  }
  return out;
}
