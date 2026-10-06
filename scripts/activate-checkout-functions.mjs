#!/usr/bin/env node
/**
 * Switch on the «free delivery without gift cards» delivery customization.
 *
 * Shopify only lets the app that owns a function activate it, and our custom
 * app has no admin screen for that, so this does it through the Admin API with
 * the same credentials the storefront uses (SHOPIFY_CLIENT_ID /
 * SHOPIFY_CLIENT_SECRET in .env, exchanged for a short-lived token). Nothing
 * is printed except names and ids, and nothing leaves this machine.
 *
 * Needs, on the custom app:
 *   - the function deployed (`shopify app deploy` in the app folder);
 *   - the scopes read_delivery_customizations, write_delivery_customizations.
 *
 *   node scripts/activate-checkout-functions.mjs            # look only
 *   node scripts/activate-checkout-functions.mjs --apply    # create + enable
 *   node scripts/activate-checkout-functions.mjs --apply --threshold 299
 *
 * Safe to repeat: an existing customization for the same function is updated
 * (threshold, enabled) instead of a second one being created.
 *
 * The pickup function is NOT activated here — Shopify switches that on in
 * Settings → Shipping and delivery (see shopify-functions/README.md).
 */

import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';

const API_VERSION = '2026-01';
const TITLE = 'Free delivery without gift cards';
const args = process.argv.slice(2);
const APPLY = args.includes('--apply');
const tIndex = args.indexOf('--threshold');
const THRESHOLD = tIndex >= 0 ? Number(args[tIndex + 1]) : 299;

if (!Number.isFinite(THRESHOLD) || THRESHOLD <= 0) {
  console.error('--threshold must be a positive number.');
  process.exit(1);
}

function loadEnv() {
  const out = {...process.env};
  try {
    const raw = readFileSync(resolve(process.cwd(), '.env'), 'utf8');
    for (const line of raw.split('\n')) {
      const t = line.trim();
      if (!t || t.startsWith('#')) continue;
      const eq = t.indexOf('=');
      if (eq === -1) continue;
      const k = t.slice(0, eq).trim();
      let v = t.slice(eq + 1).trim();
      if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
        v = v.slice(1, -1);
      }
      if (!(k in out)) out[k] = v;
    }
  } catch {
    /* No .env — use the environment. */
  }
  return out;
}

const env = loadEnv();
const CLIENT_ID = env.SHOPIFY_CLIENT_ID || env.SHOPIFY_ADMIN_CLIENT_ID;
const CLIENT_SECRET = env.SHOPIFY_CLIENT_SECRET || env.SHOPIFY_ADMIN_CLIENT_SECRET;
const DOMAIN = (env.SHOPIFY_ADMIN_DOMAIN || 'saadeldeenshop-x21xumcd.myshopify.com')
  .replace(/^https?:\/\//, '')
  .replace(/\/$/, '');

if (!CLIENT_ID || !CLIENT_SECRET) {
  console.error('Missing SHOPIFY_CLIENT_ID / SHOPIFY_CLIENT_SECRET in .env (run from the repo root).');
  process.exit(1);
}

let TOKEN = null;

async function getAdminToken() {
  const res = await fetch(`https://${DOMAIN}/admin/oauth/access_token`, {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({client_id: CLIENT_ID, client_secret: CLIENT_SECRET, grant_type: 'client_credentials'}),
  });
  const data = await res.json().catch(() => ({}));
  if (!data.access_token) {
    throw new Error(`Token exchange failed: ${data.error_description || data.error || res.status}`);
  }
  return data.access_token;
}

async function gql(query, variables) {
  const res = await fetch(`https://${DOMAIN}/admin/api/${API_VERSION}/graphql.json`, {
    method: 'POST',
    headers: {'X-Shopify-Access-Token': TOKEN, 'Content-Type': 'application/json'},
    body: JSON.stringify({query, variables}),
  });
  const body = await res.json();
  if (body.errors?.length) {
    const msg = body.errors.map((e) => e.message).join('; ');
    if (/access denied|scope/i.test(msg)) {
      throw new Error(
        `${msg}\n→ Add read_delivery_customizations and write_delivery_customizations to the app's scopes, deploy, and run again.`,
      );
    }
    throw new Error(msg);
  }
  return body.data;
}

async function main() {
  TOKEN = await getAdminToken();

  const data = await gql(`{
    shopifyFunctions(first: 50) { nodes { id title apiType } }
    deliveryCustomizations(first: 50) { nodes { id title enabled functionId } }
  }`);

  const functions = data.shopifyFunctions.nodes;
  console.log('Functions owned by this app:');
  for (const f of functions) console.log(`  - ${f.title}  [${f.apiType}]  ${f.id}`);

  const fn = functions.find(
    (f) => /delivery/i.test(f.apiType) && /gift/i.test(f.title || ''),
  );
  if (!fn) {
    console.error('\nNo delivery customization function with "gift" in its title. Deploy the app first.');
    process.exit(1);
  }

  const existing = data.deliveryCustomizations.nodes.find((c) => c.functionId === fn.id);
  const metafields = [
    {
      namespace: '$app:free-delivery',
      key: 'config',
      type: 'json',
      value: JSON.stringify({threshold: THRESHOLD}),
    },
  ];

  console.log(`\nFunction: ${fn.title} (${fn.id})`);
  console.log(existing
    ? `Existing customization: ${existing.title} — ${existing.enabled ? 'enabled' : 'DISABLED'}`
    : 'No customization yet.');
  console.log(`Threshold: ${THRESHOLD} SAR (gift card excluded)`);

  if (!APPLY) {
    console.log('\nLook-only run. Add --apply to create / enable it.');
    return;
  }

  if (existing) {
    const r = await gql(
      `mutation U($id: ID!, $input: DeliveryCustomizationInput!) {
        deliveryCustomizationUpdate(id: $id, deliveryCustomization: $input) {
          deliveryCustomization { id title enabled } userErrors { field message }
        }
      }`,
      {id: existing.id, input: {enabled: true, metafields}},
    );
    const out = r.deliveryCustomizationUpdate;
    if (out.userErrors.length) throw new Error(out.userErrors.map((e) => e.message).join('; '));
    console.log(`\nUpdated and enabled: ${out.deliveryCustomization.title}`);
  } else {
    const r = await gql(
      `mutation C($input: DeliveryCustomizationInput!) {
        deliveryCustomizationCreate(deliveryCustomization: $input) {
          deliveryCustomization { id title enabled } userErrors { field message }
        }
      }`,
      {input: {functionId: fn.id, title: TITLE, enabled: true, metafields}},
    );
    const out = r.deliveryCustomizationCreate;
    if (out.userErrors.length) throw new Error(out.userErrors.map((e) => e.message).join('; '));
    console.log(`\nCreated and enabled: ${out.deliveryCustomization.title}`);
  }
  console.log('Now tell Claude, so the Standard Delivery 298.99 cap can be removed.');
}

main().catch((e) => {
  console.error(`\n${e.message}`);
  process.exit(1);
});
