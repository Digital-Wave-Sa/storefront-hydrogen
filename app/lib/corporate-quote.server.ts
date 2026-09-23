/**
 * Corporate quote requests: durable storage, then email.
 *
 * The B2B forms on /corporate are the highest-value leads the site takes --
 * a company asking to be quoted for 200 boxes or more -- and until now they
 * were the least durable thing on it. The modal never posted anywhere at all,
 * and the inline form's only record was an email to an address that has been
 * unset in production, so a lead existed for exactly as long as one SMTP
 * connection.
 *
 * So the order here is deliberate: write the metaobject FIRST, email second.
 * Shopify is the system of record and the inbox is a notification. If the
 * mail transport is misconfigured, throttled or simply down, the lead is
 * already saved and someone can find it in the admin. The reverse order --
 * which is what the site did -- means an SMTP hiccup silently deletes a
 * customer.
 *
 * The uploads follow the same logic. A logo attached to an email lives only
 * in whoever opened it; the same file in Shopify Files is attached to the
 * metaobject and is still there when the quote is actually prepared weeks
 * later.
 */

import {getAdminToken, getAdminDomain} from '~/lib/shopify-admin.server';

const API_VERSION = '2024-07';

/** The metaobject definition created for this: gid 27211596009. */
export const QUOTE_METAOBJECT_TYPE = 'corporate_quote_request';

/** Matches the client-side cap on both file inputs. Enforced again here
 *  because a client-side check is a courtesy, not a control. */
export const MAX_UPLOAD_BYTES = 3 * 1024 * 1024;

/**
 * `adminApiQuery` in admin.server.ts aborts at 3 seconds, which is right for
 * the lookups it was written for and far too short for a staged upload. This
 * one takes its own budget.
 */
async function adminGraphql(
  domain: string,
  token: string,
  query: string,
  variables?: any,
  timeoutMs = 20000,
): Promise<any> {
  try {
    const res = await fetch(
      `https://${domain}/admin/api/${API_VERSION}/graphql.json`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Shopify-Access-Token': token,
        },
        body: JSON.stringify({query, variables}),
        signal: AbortSignal.timeout(timeoutMs),
      },
    );

    if (!res.ok) {
      const body = await res.text();
      return {errors: [{message: `HTTP ${res.status}: ${body.slice(0, 400)}`}]};
    }

    return await res.json();
  } catch (err: any) {
    return {errors: [{message: err?.message || String(err)}]};
  }
}

const STAGED_UPLOADS = `
  mutation stagedUploads($input: [StagedUploadInput!]!) {
    stagedUploadsCreate(input: $input) {
      stagedTargets {
        url
        resourceUrl
        parameters { name value }
      }
      userErrors { field message }
    }
  }
`;

const FILE_CREATE = `
  mutation fileCreate($files: [FileCreateInput!]!) {
    fileCreate(files: $files) {
      files {
        id
        fileStatus
        alt
        ... on MediaImage { image { url } }
        ... on GenericFile { url }
      }
      userErrors { field message }
    }
  }
`;

const FILE_URL = `
  query fileUrl($id: ID!) {
    node(id: $id) {
      ... on MediaImage { id fileStatus image { url } }
      ... on GenericFile { id fileStatus url }
    }
  }
`;

export type UploadedFile = {id: string; url: string | null; filename: string};

/**
 * Put one browser-supplied file into Shopify Files.
 *
 * Returns null rather than throwing on every failure path. A logo that would
 * not upload must not cost us the lead behind it -- the caller carries on and
 * records the submission without it, and the customer's own email address is
 * in the record either way, so the file can always be asked for again.
 */
export async function uploadToShopifyFiles(
  env: any,
  file: File,
  namePrefix: string,
): Promise<UploadedFile | null> {
  if (!file || typeof file === 'string' || file.size === 0) return null;

  if (file.size > MAX_UPLOAD_BYTES) {
    console.warn(
      `[CORPORATE QUOTE] ${namePrefix}: "${file.name}" is ${file.size} bytes, over the ${MAX_UPLOAD_BYTES} limit — not uploaded.`,
    );
    return null;
  }

  try {
    const token = await getAdminToken(env);
    const domain = getAdminDomain(env);
    if (!token || !domain) return null;

    const safeName = `${namePrefix}-${Date.now()}-${(file.name || 'upload')
      .replace(/[^\w.\-]+/g, '-')
      .slice(-80)}`;
    const mimeType = file.type || 'application/octet-stream';
    const isImage = mimeType.startsWith('image/') && mimeType !== 'image/svg+xml';

    // 1. Ask Shopify for somewhere to put it.
    const staged = await adminGraphql(domain, token, STAGED_UPLOADS, {
      input: [
        {
          filename: safeName,
          mimeType,
          httpMethod: 'POST',
          resource: 'FILE',
          fileSize: String(file.size),
        },
      ],
    });

    const target = staged?.data?.stagedUploadsCreate?.stagedTargets?.[0];
    const stagedErrors = staged?.data?.stagedUploadsCreate?.userErrors || [];
    if (!target?.url || stagedErrors.length) {
      console.warn(
        '[CORPORATE QUOTE] stagedUploadsCreate failed:',
        JSON.stringify(stagedErrors || staged?.errors),
      );
      return null;
    }

    // 2. Push the bytes there. The parameters must be appended before the
    //    file itself -- S3 ignores anything that arrives after it.
    const upload = new FormData();
    for (const p of target.parameters as {name: string; value: string}[]) {
      upload.append(p.name, p.value);
    }
    upload.append('file', file, safeName);

    const putRes = await fetch(target.url, {method: 'POST', body: upload});
    if (!putRes.ok) {
      console.warn(
        `[CORPORATE QUOTE] staged upload POST failed with ${putRes.status}`,
      );
      return null;
    }

    // 3. Turn the staged object into a real File record.
    const created = await adminGraphql(domain, token, FILE_CREATE, {
      files: [
        {
          originalSource: target.resourceUrl,
          contentType: isImage ? 'IMAGE' : 'FILE',
          alt: `${namePrefix}: ${file.name}`,
        },
      ],
    });

    const createErrors = created?.data?.fileCreate?.userErrors || [];
    const node = created?.data?.fileCreate?.files?.[0];
    if (!node?.id || createErrors.length) {
      console.warn(
        '[CORPORATE QUOTE] fileCreate failed:',
        JSON.stringify(createErrors || created?.errors),
      );
      return null;
    }

    let url: string | null = node?.image?.url || node?.url || null;

    /**
     * Shopify processes the upload asynchronously, so fileCreate usually
     * answers UPLOADED with no URL yet. Two short polls is the compromise:
     * enough that the notification email normally carries a working link,
     * and short enough that a slow CDN never holds up the response to a
     * customer. Without a URL the file is still on the metaobject, which is
     * where it actually matters.
     */
    for (let attempt = 0; attempt < 2 && !url; attempt++) {
      await new Promise((r) => setTimeout(r, 900));
      const polled = await adminGraphql(domain, token, FILE_URL, {id: node.id}, 8000);
      const n = polled?.data?.node;
      url = n?.image?.url || n?.url || null;
    }

    return {id: node.id, url, filename: file.name};
  } catch (err: any) {
    console.warn('[CORPORATE QUOTE] upload threw:', err?.message || err);
    return null;
  }
}

const METAOBJECT_CREATE = `
  mutation createQuote($metaobject: MetaobjectCreateInput!) {
    metaobjectCreate(metaobject: $metaobject) {
      metaobject { id handle }
      userErrors { field message code }
    }
  }
`;

export type QuoteRecord = {
  companyName: string;
  contactName: string;
  email: string;
  phone: string;
  taxId?: string;
  occasion?: string;
  quantity?: string;
  budgetPerBox?: string;
  deliveryDate?: string;
  selectedPackage?: string;
  notes?: string;
  logoFileId?: string | null;
  brandGuideFileId?: string | null;
  source: string;
  locale: string;
};

/**
 * Write the submission to Shopify. Returns the metaobject id, or null.
 *
 * Empty fields are dropped rather than sent as '' so the admin shows a blank
 * field instead of an empty string that reads as an answered question.
 */
export async function recordCorporateQuote(
  env: any,
  record: QuoteRecord,
): Promise<{id: string; handle: string} | null> {
  try {
    const token = await getAdminToken(env);
    const domain = getAdminDomain(env);
    if (!token || !domain) {
      console.error(
        '[CORPORATE QUOTE] no Admin API credentials — submission NOT stored for',
        record.companyName,
      );
      return null;
    }

    const candidates: {key: string; value: string | null | undefined}[] = [
      {key: 'company_name', value: record.companyName},
      {key: 'contact_name', value: record.contactName},
      {key: 'email', value: record.email},
      {key: 'phone', value: record.phone},
      {key: 'tax_id', value: record.taxId},
      {key: 'occasion', value: record.occasion},
      {key: 'quantity', value: record.quantity},
      {key: 'budget_per_box', value: record.budgetPerBox},
      {key: 'delivery_date', value: record.deliveryDate},
      {key: 'selected_package', value: record.selectedPackage},
      {key: 'notes', value: record.notes},
      {key: 'logo', value: record.logoFileId},
      {key: 'brand_guide', value: record.brandGuideFileId},
      {key: 'source', value: record.source},
      {key: 'locale', value: record.locale},
      {key: 'submitted_at', value: new Date().toISOString()},
      {key: 'status', value: 'new'},
    ];

    const fields = candidates
      .filter((f) => f.value != null && String(f.value).trim() !== '')
      .map((f) => ({key: f.key, value: String(f.value).trim()}));

    /**
     * An explicit handle, because the generated one is the display name.
     *
     * Left to Shopify the handle comes from `company_name`, so the second
     * request from the same company collides with the first and the create
     * fails -- and a repeat enquiry from an existing customer is exactly the
     * one you least want to drop. Timestamp plus a random tail instead.
     */
    const handle = `quote-${Date.now().toString(36)}-${Math.random()
      .toString(36)
      .slice(2, 8)}`;

    const res = await adminGraphql(domain, token, METAOBJECT_CREATE, {
      metaobject: {type: QUOTE_METAOBJECT_TYPE, handle, fields},
    });

    const errors = res?.data?.metaobjectCreate?.userErrors || [];
    const created = res?.data?.metaobjectCreate?.metaobject;

    if (!created?.id || errors.length) {
      console.error(
        '[CORPORATE QUOTE] metaobjectCreate failed:',
        JSON.stringify(errors.length ? errors : res?.errors),
      );
      return null;
    }

    return created;
  } catch (err: any) {
    console.error('[CORPORATE QUOTE] record threw:', err?.message || err);
    return null;
  }
}

/**
 * The admin URL for a stored request, so the notification email can link
 * straight to the record rather than describing where to look for it.
 */
export function quoteAdminUrl(env: any, metaobjectId: string): string | null {
  const domain = getAdminDomain(env);
  const handle = String(domain || '').split('.')[0];
  const numericId = String(metaobjectId).split('/').pop();
  if (!handle || !numericId) return null;
  return `https://admin.shopify.com/store/${handle}/content/entries/${QUOTE_METAOBJECT_TYPE}/${numericId}`;
}
