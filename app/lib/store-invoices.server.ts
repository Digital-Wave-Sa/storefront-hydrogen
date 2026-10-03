import {getAdminDomain, getAdminToken} from '~/lib/shopify-admin.server';
import {resolveSelfPhone} from '~/lib/session-identity.server';

/**
 * In-store (POS) purchases for the signed-in customer.
 *
 * Source: the middleware's `GET /orders/purchase-history` (online + offline
 * under `data.orders`; see normalisePurchaseHistory), authenticated with
 * `MOBILE_APP_SECRET_TOKEN`. The older `POST /orders/offline-invoices`
 * response (`data.transactions`) is still parsed if it ever comes back. It
 * returns the customer's whole ERP purchase history for a phone number and a
 * date range.
 *
 * ── Who may be asked about ──
 *
 * The phone comes from the SESSION only (see `resolveSelf`), never from the
 * URL, a form or the browser. This endpoint answers for any number it is
 * given, so a phone taken from the request would let anyone read anyone's
 * in-store purchases, branch by branch, item by item.
 *
 * ── What counts as "in-store" ──
 *
 * The ERP history holds two kinds of transaction:
 *
 *   • `Sales`            — a receipt rung up on a branch POS  (RS-xxxx store)
 *   • `CustomerInvoice`  — an invoice raised against a CRM sales order
 *                          (`CRMSO-…`, store "saad"), which is how online and
 *                          app orders reach the ERP. They carry the delivery
 *                          line «خدمة التوصيل لبرامج التطبيقات».
 *
 * Only the first kind is shown here. The second already appears under the
 * online tab as a Shopify order, and listing it twice, under two different
 * numbers, reads as a double charge. `INCLUDE_CRM_INVOICES` switches it on.
 */

const INCLUDE_CRM_INVOICES = false;

/**
 * How far back to look: the shopper picks one of these on the page
 * (آخر شهر / 3 أشهر / 6 أشهر / آخر سنة); three months unless they choose.
 * The endpoint takes an explicit range, so a shorter window is also a lighter
 * ERP query.
 */
export const STORE_INVOICE_RANGES = {'1m': 1, '3m': 3, '6m': 6, '12m': 12} as const;
export type StoreInvoiceRange = keyof typeof STORE_INVOICE_RANGES;
export const DEFAULT_STORE_INVOICE_RANGE: StoreInvoiceRange = '3m';

export function toStoreInvoiceRange(v: unknown): StoreInvoiceRange {
  return typeof v === 'string' && v in STORE_INVOICE_RANGES
    ? (v as StoreInvoiceRange)
    : DEFAULT_STORE_INVOICE_RANGE;
}

/** A slow ERP must not hold the account page hostage. */
const TIMEOUT_MS = 10_000;

export type StoreInvoiceLine = {
  name: string;
  qty: number;
  unitPrice: number;
  /** Before discount. */
  grossAmount: number;
  discount: number;
  /** What the customer paid for this line, VAT included. */
  amount: number;
  vat: number;
};

export type StoreInvoice = {
  /** Stable key for React; the transaction id. */
  id: string;
  /** The number to show the customer. */
  number: string;
  isReturn: boolean;
  storeCode: string;
  branchAr: string | null;
  branchEn: string | null;
  /** yyyy-mm-dd, as the ERP recorded it (no timezone shifting). */
  date: string | null;
  /** HH:MM, or null when the ERP has none. */
  time: string | null;
  total: number;
  vat: number;
  lines: StoreInvoiceLine[];
};

export type StoreInvoicesResult =
  | {status: 'ok'; invoices: StoreInvoice[]}
  | {status: 'no-phone'}
  | {status: 'unavailable'};

const num = (v: unknown): number => {
  const n = typeof v === 'number' ? v : parseFloat(String(v ?? ''));
  return Number.isFinite(n) ? n : 0;
};
const str = (v: unknown): string => (v == null ? '' : String(v).trim());

/**
 * The phone in international form, which the endpoint accepts.
 *
 * The session holds whatever spelling the login form produced — 05XXXXXXXX,
 * 5XXXXXXXX, +9665XXXXXXXX. Saudi local forms get +966; anything already
 * carrying a country code keeps it.
 */
export function toInvoicePhone(phone?: string | null): string | null {
  const raw = str(phone);
  if (!raw || raw.includes('@') || raw.startsWith('gid://')) return null;
  const digits = raw.replace(/\D/g, '');
  if (digits.length < 8) return null;
  if (digits.startsWith('05') && digits.length === 10)
    return `+966${digits.slice(1)}`;
  if (digits.startsWith('5') && digits.length === 9) return `+966${digits}`;
  if (digits.startsWith('00')) return `+${digits.slice(2)}`;
  return `+${digits}`;
}

/** "24/09/2026" -> "2026-09-24". Anything else -> null. */
function toIsoDate(v: unknown): string | null {
  const m = str(v).match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (m) return `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`;
  const iso = str(v).match(/^(\d{4})-(\d{2})-(\d{2})/);
  return iso ? `${iso[1]}-${iso[2]}-${iso[3]}` : null;
}

function ymd(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/* ── Branch names ─────────────────────────────────────────────────────────── */

/**
 * ERP store code (`custom.ax_store_id`, e.g. RS-0101) -> the branch's names.
 *
 * The endpoint names a branch only by its code — `store_name` is the code
 * again — and «RS-0101» means nothing to a customer. The Shopify Locations
 * carry the mapping. Cached for 30 minutes per isolate; branches are renamed
 * rarely, and a failed read is not cached so the next page load retries.
 */
let branchCache: {
  at: number;
  map: Map<string, {ar: string; en: string}>;
} | null = null;
const BRANCH_TTL_MS = 30 * 60 * 1000;

const BRANCHES_QUERY = `
  query StoreInvoiceBranches($after: String) {
    locations(first: 250, after: $after, includeInactive: true) {
      nodes {
        name
        ax: metafield(namespace: "custom", key: "ax_store_id") { value }
        ar: metafield(namespace: "custom", key: "name_in_arabic") { value }
      }
      pageInfo { hasNextPage endCursor }
    }
  }
`;

async function getBranchNames(env: any) {
  if (branchCache && Date.now() - branchCache.at < BRANCH_TTL_MS) {
    return branchCache.map;
  }
  const map = new Map<string, {ar: string; en: string}>();
  try {
    const domain = getAdminDomain(env);
    const token = domain ? await getAdminToken(env) : '';
    if (!domain || !token) return branchCache?.map ?? map;

    let after: string | null = null;
    for (let page = 0; page < 5; page++) {
      const res: Response = await fetch(
        `https://${domain}/admin/api/2024-04/graphql.json`,
        {
          method: 'POST',
          headers: {
            'X-Shopify-Access-Token': token,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({query: BRANCHES_QUERY, variables: {after}}),
          signal: AbortSignal.timeout(5000),
        },
      );
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json: any = await res.json();
      if (json?.errors?.length) {
        throw new Error(JSON.stringify(json.errors).slice(0, 300));
      }
      const conn = json?.data?.locations;
      for (const loc of conn?.nodes || []) {
        const code = str(loc?.ax?.value).toUpperCase();
        if (!code) continue;
        map.set(code, {
          ar: str(loc?.ar?.value) || str(loc?.name),
          en: str(loc?.name),
        });
      }
      if (!conn?.pageInfo?.hasNextPage) break;
      after = conn.pageInfo.endCursor;
    }
    if (map.size > 0) branchCache = {at: Date.now(), map};
    return map;
  } catch (e: any) {
    console.error(
      '[store-invoices] Branch names lookup failed:',
      e?.message || e,
    );
    return branchCache?.map ?? map;
  }
}

/* ── Normalising the ERP response ─────────────────────────────────────────── */

function isInStore(t: any): boolean {
  const type = str(t?.transaction_type).toLowerCase();
  if (type === 'customerinvoice') return INCLUDE_CRM_INVOICES;
  // Company-code transactions are invoices raised centrally, not at a till.
  if (t?.is_company_code === true) return INCLUDE_CRM_INVOICES;
  return true;
}

function normaliseLine(l: any): StoreInvoiceLine {
  const qty = num(l?.qty);
  const amount = num(l?.final_amount ?? l?.net_amount);
  return {
    name: str(l?.item_name) || str(l?.item_id),
    qty,
    unitPrice: num(l?.selling_unit_price ?? l?.original_unit_price),
    grossAmount: num(l?.original_line_amount ?? amount),
    discount: num(l?.discount_amount),
    amount,
    vat: num(l?.tax_amount),
  };
}

export function normaliseTransactions(
  transactions: any[],
  branches: Map<string, {ar: string; en: string}>,
): StoreInvoice[] {
  return (Array.isArray(transactions) ? transactions : [])
    .filter(isInStore)
    .map((t: any): StoreInvoice => {
      const lines = (Array.isArray(t?.lines) ? t.lines : []).map(normaliseLine);
      const lineTotal = lines.reduce(
        (s: number, l: StoreInvoiceLine) => s + l.amount,
        0,
      );
      const total =
        num(t?.total_amount) || num(t?.header_gross_amount) || lineTotal;
      const type = str(t?.transaction_type).toLowerCase();
      const storeCode = str(t?.store_code).toUpperCase();
      const branch = branches.get(storeCode);
      // POS receipt ids come back with a leading dash ("-240111261-0007502");
      // the transaction id is the one printed on the receipt.
      const number =
        str(t?.invoice_id) ||
        str(t?.transaction_id) ||
        str(t?.receipt_id).replace(/^-/, '');
      const time = str(t?.time).slice(0, 5) || null;
      return {
        id: str(t?.transaction_id) || str(t?.receipt_id) || number,
        number,
        isReturn: type.includes('return') || total < 0,
        storeCode,
        branchAr: branch?.ar ?? null,
        branchEn: branch?.en ?? null,
        date: toIsoDate(t?.date),
        time,
        total,
        vat:
          Math.round(
            lines.reduce((s: number, l: StoreInvoiceLine) => s + l.vat, 0) *
              100,
          ) / 100,
        lines,
      };
    })
    .sort((a, b) =>
      `${b.date ?? ''} ${b.time ?? ''}`.localeCompare(
        `${a.date ?? ''} ${a.time ?? ''}`,
      ),
    );
}

/* ── GET /orders/purchase-history ─────────────────────────────────────────── */

/**
 * The newer endpoint (the backend's choice) answers with every order for the
 * phone, online and in-store, under `data.orders`:
 *
 *   {source: 'offline', id: 'RS-2401-RG-24011-10468', number: '-240111261-0007502',
 *    date: '2026-09-24T11:02:38.000Z', status, channel: 'RS-2401 (RS-2401)',
 *    total_amount, items: [{sku, name, qty, unit_price, total_price}]}
 *
 * Only `offline` rows from a branch till belong here. `online` rows are the
 * Shopify orders the other tab already lists, and offline rows on channel
 * «saad» are CRM invoices for those same online/app orders (they carry the
 * delivery line «خدمة التوصيل لبرامج التطبيقات», sku 900119) -- the same
 * double-listing INCLUDE_CRM_INVOICES guards against below.
 *
 * Dates are real UTC: CRM invoices dated on a Riyadh midnight arrive as
 * 21:00Z the day before. Shown in Riyadh time (UTC+3, no DST).
 *
 * This shape has no VAT or discount per line; the card hides both when zero.
 */
const DELIVERY_SKU = '900119';

function isTillOrder(o: any): boolean {
  if (str(o?.source).toLowerCase() !== 'offline') return false;
  if (INCLUDE_CRM_INVOICES) return true;
  const channel = str(o?.channel).toLowerCase();
  if (channel.startsWith('saad')) return false;
  const items = Array.isArray(o?.items) ? o.items : [];
  return !items.some((i: any) => str(i?.sku) === DELIVERY_SKU);
}

function riyadhDateTime(iso: unknown): {date: string | null; time: string | null} {
  const t = Date.parse(str(iso));
  if (!Number.isFinite(t)) return {date: null, time: null};
  const local = new Date(t + 3 * 60 * 60 * 1000).toISOString();
  const time = local.slice(11, 16);
  // A bare date (midnight) has no real time to show.
  return {date: local.slice(0, 10), time: time === '00:00' ? null : time};
}

export function normalisePurchaseHistory(
  orders: any[],
  branches: Map<string, {ar: string; en: string}>,
): StoreInvoice[] {
  const seen = new Set<string>();
  return (Array.isArray(orders) ? orders : [])
    .filter(isTillOrder)
    .map((o: any): StoreInvoice => {
      const lines: StoreInvoiceLine[] = (Array.isArray(o?.items) ? o.items : []).map(
        (i: any) => {
          const qty = num(i?.qty);
          const unitPrice = num(i?.unit_price);
          const amount = num(i?.total_price) || qty * unitPrice;
          return {
            name: str(i?.name) || str(i?.sku),
            qty,
            unitPrice,
            grossAmount: amount,
            discount: 0,
            amount,
            vat: 0,
          };
        },
      );
      const lineTotal = lines.reduce((sum, l) => sum + l.amount, 0);
      // Seen: a till receipt with total_amount 0 and a 2 SAR line. The lines
      // are what the customer recognises, so they win over a zero total.
      const total = num(o?.total_amount) || lineTotal;
      // "RS-2401 (RS-2401)" -> "RS-2401", the code custom.ax_store_id holds.
      const storeCode = str(o?.channel).split(/[\s(]/)[0].toUpperCase();
      const branch = branches.get(storeCode);
      const {date, time} = riyadhDateTime(o?.date);
      const status = str(o?.status).toLowerCase();
      const number = str(o?.number).replace(/^-/, '') || str(o?.id);
      return {
        id: str(o?.id) || number,
        number,
        isReturn: status.includes('return') || total < 0,
        storeCode,
        branchAr: branch?.ar ?? null,
        branchEn: branch?.en ?? null,
        date,
        time,
        total,
        vat: 0,
        lines,
      };
    })
    .filter((inv) => (seen.has(inv.id) ? false : (seen.add(inv.id), true)))
    .sort((a, b) =>
      `${b.date ?? ''} ${b.time ?? ''}`.localeCompare(`${a.date ?? ''} ${a.time ?? ''}`),
    );
}

/* ── Entry point ──────────────────────────────────────────────────────────── */

/** The session's phone only — see `resolveSelfPhone`. */
const sessionPhone = resolveSelfPhone;

export async function getStoreInvoices(
  context: any,
  range: StoreInvoiceRange = DEFAULT_STORE_INVOICE_RANGE,
): Promise<StoreInvoicesResult> {
  const env = context.env || {};
  const token = str(env.MOBILE_APP_SECRET_TOKEN);
  if (!token) {
    console.error('[store-invoices] MOBILE_APP_SECRET_TOKEN is not set.');
    return {status: 'unavailable'};
  }

  const phone = toInvoicePhone(await sessionPhone(context));
  if (!phone) return {status: 'no-phone'};

  /*
   * Today in Riyadh (UTC+3) as the end, never a future day -- the backend
   * asked us to mind the dates, and the old range ended tomorrow. The start
   * is the same day N months earlier.
   */
  const riyadhToday = new Date(Date.now() + 3 * 60 * 60 * 1000);
  const to = new Date(
    Date.UTC(riyadhToday.getUTCFullYear(), riyadhToday.getUTCMonth(), riyadhToday.getUTCDate()),
  );
  const from = new Date(to);
  from.setUTCMonth(from.getUTCMonth() - STORE_INVOICE_RANGES[range]);

  const base = str(env.CUSTOM_API_URL) || 'https://api.saadeddin.top';

  try {
    const [res, branches] = await Promise.all([
      /*
       * `GET /orders/purchase-history`, the backend's endpoint. The phone goes
       * through URLSearchParams so its + is sent as %2B -- a bare + in a query
       * string is read as a space and finds nobody.
       */
      fetch(
        `${base}/orders/purchase-history?${new URLSearchParams({
          phone,
          from_date: ymd(from),
          to_date: ymd(to),
        })}`,
        {
          method: 'GET',
          headers: {Authorization: `Bearer ${token}`, Accept: 'application/json'},
          signal: AbortSignal.timeout(TIMEOUT_MS),
        },
      ),
      getBranchNames(env),
    ]);

    const json: any = await res.json().catch(() => null);

    // A customer who has never bought in a branch is not an error: they have
    // no in-store purchases, and the page should say exactly that.
    const message = `${json?.error ?? ''} ${json?.message ?? ''}`.toLowerCase();
    if (
      res.status === 404 ||
      /not\s*found|no\s+(customer|invoice|transaction)/.test(message)
    ) {
      return {status: 'ok', invoices: []};
    }

    if (!res.ok || json?.success === false) {
      // The phone is deliberately kept out of the log.
      console.error(
        `[store-invoices] HTTP ${res.status}:`,
        JSON.stringify(json?.error ?? json?.message ?? '').slice(0, 200),
      );
      return {status: 'unavailable'};
    }

    // purchase-history: online + offline under data.orders.
    if (Array.isArray(json?.data?.orders)) {
      const invoices = normalisePurchaseHistory(json.data.orders, branches);
      /*
       * The ERP half can fail while the online half still answers ("offline
       * history unavailable: ERP returned unsuccessful response"). With no
       * in-store rows that is "couldn't load", not "you bought nothing".
       */
      const erpDown = (Array.isArray(json?.data?.warnings) ? json.data.warnings : []).some(
        (w: unknown) => /offline/i.test(str(w)),
      );
      if (erpDown && invoices.length === 0) {
        console.error('[store-invoices] ERP side unavailable:', JSON.stringify(json.data.warnings).slice(0, 200));
        return {status: 'unavailable'};
      }
      return {status: 'ok', invoices};
    }

    // offline-invoices (older endpoint): data.transactions.
    return {
      status: 'ok',
      invoices: normaliseTransactions(json?.data?.transactions, branches),
    };
  } catch (e: any) {
    console.error(
      '[store-invoices] Request failed:',
      e?.name === 'TimeoutError' ? 'timed out' : e?.message || e,
    );
    return {status: 'unavailable'};
  }
}
