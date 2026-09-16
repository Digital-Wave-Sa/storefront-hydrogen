/**
 * Which notifications an order has already had.
 *
 * `orders/updated` fires on every change Shopify records against an order --
 * a tag edit, a note, an address correction, payment capture, a risk check.
 * The "ready" email is triggered by a tag appearing, and a tag stays on the
 * order forever, so without a record of what has been sent the shopper gets
 * the same «طلبك جاهز» email every single time anyone touches their order.
 *
 * The record lives in a metafield on the order rather than in memory, because
 * the Oxygen worker is not one long-lived process: it is recycled constantly
 * and runs in several regions at once, so an in-memory set would forget
 * within minutes and would never have been shared between instances anyway.
 *
 * The metafield is `custom.notified_stages`, a JSON array of stage names.
 * It is written after a successful send, so a send that fails can be retried
 * by the next webhook rather than being silently marked done.
 */
import {getAdminDomain, getAdminToken} from './shopify-admin.server';

const ADMIN_API_VERSION = '2024-07';
const NAMESPACE = 'custom';
const KEY = 'notified_stages';

async function adminGraphql(env: any, query: string, variables?: any) {
  const domain = getAdminDomain(env);
  const token = await getAdminToken(env);
  if (!domain || !token) throw new Error('Admin API credentials unavailable');

  const res = await fetch(
    `https://${domain}/admin/api/${ADMIN_API_VERSION}/graphql.json`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Access-Token': token,
      },
      body: JSON.stringify({query, variables}),
      signal: AbortSignal.timeout(10000),
    },
  );
  if (!res.ok) throw new Error(`Admin API HTTP ${res.status}`);
  const json: any = await res.json();
  if (json?.errors?.length) {
    throw new Error(json.errors.map((e: any) => e.message).join('; '));
  }
  return json?.data;
}

function orderGid(order: any): string | null {
  const raw = String(order?.admin_graphql_api_id || order?.id || '');
  if (!raw) return null;
  if (raw.startsWith('gid://')) return raw;
  const numeric = raw.split('/').pop();
  return numeric ? `gid://shopify/Order/${numeric}` : null;
}

/**
 * What has already gone out, plus the order_status metafield in the same call.
 *
 * Both are read together on purpose: the webhook needs the ERP status to
 * decide whether the order is ready, and the webhook body does not carry
 * metafields at all. One round trip rather than two.
 */
export async function readOrderNotificationState(
  env: any,
  order: any,
): Promise<{sent: string[]; orderStatus: string}> {
  const gid = orderGid(order);
  if (!gid) return {sent: [], orderStatus: ''};

  const data = await adminGraphql(
    env,
    `query OrderNotificationState($id: ID!) {
      order(id: $id) {
        notified: metafield(namespace: "${NAMESPACE}", key: "${KEY}") { value }
        orderStatus: metafield(namespace: "${NAMESPACE}", key: "order_status") { value }
      }
    }`,
    {id: gid},
  );

  let sent: string[] = [];
  const raw = data?.order?.notified?.value;
  if (raw) {
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) sent = parsed.map(String);
    } catch {
      // A hand-edited or legacy comma list rather than JSON.
      sent = String(raw).split(',').map((s) => s.trim()).filter(Boolean);
    }
  }

  return {sent, orderStatus: String(data?.order?.orderStatus?.value ?? '')};
}

/**
 * Add a stage to the record. Takes the list that was just read rather than
 * re-reading, so two stages sent in one webhook run cannot lose each other.
 */
export async function markStageNotified(
  env: any,
  order: any,
  stage: string,
  alreadySent: string[],
): Promise<void> {
  const gid = orderGid(order);
  if (!gid) return;
  if (alreadySent.includes(stage)) return;

  const next = [...alreadySent, stage];
  const data = await adminGraphql(
    env,
    `mutation RecordNotifiedStage($metafields: [MetafieldsSetInput!]!) {
      metafieldsSet(metafields: $metafields) {
        userErrors { field message }
      }
    }`,
    {
      metafields: [
        {
          ownerId: gid,
          namespace: NAMESPACE,
          key: KEY,
          type: 'json',
          value: JSON.stringify(next),
        },
      ],
    },
  );

  const errs = data?.metafieldsSet?.userErrors || [];
  if (errs.length) {
    throw new Error(errs.map((e: any) => e.message).join('; '));
  }
}
