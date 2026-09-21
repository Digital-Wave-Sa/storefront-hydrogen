#!/usr/bin/env node
/**
 * Subscribe `discounts/create` and `discounts/update` to the storefront's
 * /api/webhooks/discounts route.
 *
 * That route moves any discount targeting "all items" onto the Discountable
 * collection — every product except gift cards — whoever created it: staff,
 * the CRM's CREDIT codes, SDLP's loyalty rewards. See
 * app/lib/discount-scope.server.ts.
 *
 * Created through the API with this app's own credentials, so Shopify signs
 * the deliveries with SHOPIFY_CLIENT_SECRET, which the route already accepts.
 * No new secret to configure.
 *
 *   node scripts/subscribe-discount-webhooks.mjs --url https://YOUR-STOREFRONT          # dry run
 *   node scripts/subscribe-discount-webhooks.mjs --url https://YOUR-STOREFRONT --apply
 *
 * The URL is the PRODUCTION storefront origin, the same one the order webhook
 * points at. Safe to re-run: an existing subscription to the same address is
 * left alone.
 */

import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';

const argv = process.argv.slice(2);
const APPLY = argv.includes('--apply');
const urlIdx = argv.indexOf('--url');
const ORIGIN = (urlIdx !== -1 ? argv[urlIdx + 1] : '').replace(/\/$/, '');

if (!/^https:\/\/[^/]+$/.test(ORIGIN)) {
  console.error('Pass the production storefront origin: --url https://example.com (https, no path).');
  process.exit(1);
}
const CALLBACK = `${ORIGIN}/api/webhooks/discounts`;
const TOPICS = ['DISCOUNTS_CREATE', 'DISCOUNTS_UPDATE'];

function loadEnv() {
  const out = {...process.env};
  try {
    for (const line of readFileSync(resolve(process.cwd(), '.env'), 'utf8').split('\n')) {
      const t = line.trim();
      if (!t || t.startsWith('#')) continue;
      const eq = t.indexOf('=');
      if (eq === -1) continue;
      const k = t.slice(0, eq).trim();
      let v = t.slice(eq + 1).trim();
      if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
      if (!(k in out)) out[k] = v;
    }
  } catch {
    /* no .env — use the environment */
  }
  return out;
}

const env = loadEnv();
const CLIENT_ID = env.SHOPIFY_CLIENT_ID || env.SHOPIFY_ADMIN_CLIENT_ID;
const CLIENT_SECRET = env.SHOPIFY_CLIENT_SECRET || env.SHOPIFY_ADMIN_CLIENT_SECRET;
const DOMAIN = (
  env.SHOPIFY_ADMIN_DOMAIN ||
  (env.SHOPIFY_SHOP && !String(env.SHOPIFY_SHOP).includes('x21kumcd')
    ? `${String(env.SHOPIFY_SHOP).replace(/^https?:\/\//, '').split('.')[0]}.myshopify.com`
    : '') ||
  env.PUBLIC_STORE_DOMAIN ||
  ''
).replace(/^https?:\/\//, '').replace(/\/$/, '');

if (!CLIENT_ID || !CLIENT_SECRET || !DOMAIN) {
  console.error('Missing admin credentials. Expected SHOPIFY_CLIENT_ID, SHOPIFY_CLIENT_SECRET and a shop domain in .env.');
  process.exit(1);
}

async function token() {
  const res = await fetch(`https://${DOMAIN}/admin/oauth/access_token`, {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({client_id: CLIENT_ID, client_secret: CLIENT_SECRET, grant_type: 'client_credentials'}),
  });
  const data = await res.json().catch(() => ({}));
  if (!data.access_token) throw new Error(`Token exchange failed: ${data.error_description || data.error || res.status}`);
  return data.access_token;
}

async function gql(tok, query, variables) {
  const res = await fetch(`https://${DOMAIN}/admin/api/2024-07/graphql.json`, {
    method: 'POST',
    headers: {'X-Shopify-Access-Token': tok, 'Content-Type': 'application/json'},
    body: JSON.stringify({query, variables}),
  });
  const body = await res.json();
  if (body.errors?.length) throw new Error(JSON.stringify(body.errors));
  return body.data;
}

async function main() {
  const tok = await token();
  console.log(APPLY ? '── APPLYING ──' : '── DRY RUN — nothing will be written. Re-run with --apply. ──');
  console.log(`Shop: ${DOMAIN}\nCallback: ${CALLBACK}\n`);

  for (const topic of TOPICS) {
    const existing = await gql(
      tok,
      `query Existing($topic: WebhookSubscriptionTopic!) {
        webhookSubscriptions(first: 20, topics: [$topic]) {
          nodes { id endpoint { __typename ... on WebhookHttpEndpoint { callbackUrl } } }
        }
      }`,
      {topic},
    );
    const nodes = existing?.webhookSubscriptions?.nodes || [];
    const same = nodes.find((n) => n?.endpoint?.callbackUrl === CALLBACK);
    if (same) {
      console.log(`  ${topic}: already subscribed (${same.id})`);
      continue;
    }
    for (const n of nodes) {
      console.log(`  ${topic}: note — also delivered to ${n?.endpoint?.callbackUrl}`);
    }
    if (!APPLY) {
      console.log(`  ${topic}: would subscribe`);
      continue;
    }
    const created = await gql(
      tok,
      `mutation Sub($topic: WebhookSubscriptionTopic!, $sub: WebhookSubscriptionInput!) {
        webhookSubscriptionCreate(topic: $topic, webhookSubscription: $sub) {
          webhookSubscription { id }
          userErrors { field message }
        }
      }`,
      {topic, sub: {callbackUrl: CALLBACK, format: 'JSON'}},
    );
    const r = created?.webhookSubscriptionCreate;
    if (r?.userErrors?.length) console.error(`  ${topic}: FAILED ${JSON.stringify(r.userErrors)}`);
    else console.log(`  ${topic}: subscribed (${r?.webhookSubscription?.id})`);
  }
}

main().catch((e) => {
  console.error('\nFailed:', e.message);
  process.exit(1);
});
