/**
 * Simulate a Shopify `inventory_levels/update` webhook against the local dev
 * server — including the real HMAC signature, so it exercises the same code
 * path a live Shopify delivery would.
 *
 * Why this exists: on a free/development Shopify plan the storefront is
 * password-protected, so Shopify cannot deliver webhooks to it. This lets you
 * test the back-in-stock feature end to end anyway.
 *
 * Usage (dev server must be running):
 *
 *   # by product id — resolves the variant's inventory item for you
 *   node scripts/test-inventory-webhook.mjs --product 9395378225385 --location 91180990697
 *
 *   # or straight from an inventory item id, if you already have it
 *   node scripts/test-inventory-webhook.mjs --item 48123456789 --location 91180990697
 *
 * Options:
 *   --available N   stock level to report (default 5; 0 means "still empty")
 *   --url URL       target (default http://localhost:3000/api/inventory-webhook)
 *
 * Reads SHOPIFY_WEBHOOK_SECRET, SHOPIFY_ADMIN_DOMAIN, SHOPIFY_CLIENT_ID and
 * SHOPIFY_CLIENT_SECRET from .env. Nothing is written anywhere.
 */

import {createHmac} from 'node:crypto';
import {readFileSync} from 'node:fs';

// ---------------------------------------------------------------- args ----
const args = process.argv.slice(2);
const flag = (name) => {
  const i = args.indexOf(`--${name}`);
  return i !== -1 && args[i + 1] ? args[i + 1] : undefined;
};

const productId = flag('product');
const itemFlag = flag('item');
const locationId = flag('location') || args.find((a) => /^\d{6,}$/.test(a) && a !== productId);
const available = Number(flag('available') ?? 5);
const url = flag('url') || 'http://localhost:3000/api/inventory-webhook';

if ((!productId && !itemFlag) || !locationId) {
  console.error(
    'Usage:\n' +
      '  node scripts/test-inventory-webhook.mjs --product <product_id> --location <location_id>\n' +
      '  node scripts/test-inventory-webhook.mjs --item <inventory_item_id> --location <location_id>',
  );
  process.exit(1);
}

// ---------------------------------------------------------------- env -----
const env = {};
try {
  const raw = readFileSync(new URL('../.env', import.meta.url), 'utf8');
  for (const line of raw.split('\n')) {
    if (!line.includes('=') || line.trim().startsWith('#')) continue;
    const i = line.indexOf('=');
    env[line.slice(0, i).trim()] = line
      .slice(i + 1)
      .trim()
      .replace(/^["']|["']$/g, '');
  }
} catch {
  console.error('Could not read .env — run this from the project root.');
  process.exit(1);
}

const secret = process.env.SHOPIFY_WEBHOOK_SECRET || env.SHOPIFY_WEBHOOK_SECRET;
if (!secret) {
  console.error(
    'No SHOPIFY_WEBHOOK_SECRET in .env. Add one, e.g.\n  SHOPIFY_WEBHOOK_SECRET=local-test-secret\n' +
      'then restart the dev server so it picks it up.',
  );
  process.exit(1);
}

// ------------------------------------------- resolve the inventory item ---
async function adminToken(domain) {
  const res = await fetch(`https://${domain}/admin/oauth/access_token`, {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({
      client_id: env.SHOPIFY_CLIENT_ID || env.SHOPIFY_ADMIN_CLIENT_ID,
      client_secret: env.SHOPIFY_CLIENT_SECRET || env.SHOPIFY_ADMIN_CLIENT_SECRET,
      grant_type: 'client_credentials',
    }),
  });
  const json = await res.json();
  if (!json.access_token) {
    throw new Error(`Admin token exchange failed: ${JSON.stringify(json).slice(0, 200)}`);
  }
  return json.access_token;
}

async function resolveInventoryItem(product) {
  const domain = (env.SHOPIFY_ADMIN_DOMAIN || '')
    .replace(/^https?:\/\//, '')
    .replace(/\/$/, '');
  if (!domain) throw new Error('SHOPIFY_ADMIN_DOMAIN missing from .env');

  const token = await adminToken(domain);
  const gid = String(product).includes('gid://')
    ? product
    : `gid://shopify/Product/${product}`;

  const res = await fetch(`https://${domain}/admin/api/2024-01/graphql.json`, {
    method: 'POST',
    headers: {'X-Shopify-Access-Token': token, 'Content-Type': 'application/json'},
    body: JSON.stringify({
      query: `query($id: ID!) {
        product(id: $id) {
          title
          variants(first: 10) {
            nodes { id title inventoryItem { id } }
          }
        }
      }`,
      variables: {id: gid},
    }),
  });
  const json = await res.json();
  const prod = json?.data?.product;
  if (!prod) throw new Error(`Product not found: ${JSON.stringify(json).slice(0, 300)}`);

  const variants = prod.variants?.nodes || [];
  if (variants.length === 0) throw new Error('Product has no variants');

  console.log(`Product: ${prod.title}`);
  variants.forEach((v, i) => {
    const num = String(v.inventoryItem?.id || '').split('/').pop();
    console.log(`  ${i === 0 ? '→' : ' '} variant "${v.title}"  inventory_item_id=${num}`);
  });
  if (variants.length > 1) {
    console.log('  (using the first variant — pass --item to choose another)');
  }

  const first = String(variants[0].inventoryItem?.id || '').split('/').pop();
  if (!first) throw new Error('Variant has no inventory item');
  return first;
}

const inventoryItemId = itemFlag || (await resolveInventoryItem(productId));

// ------------------------------------------------------------ the POST ----
const payload = JSON.stringify({
  inventory_item_id: Number(inventoryItemId),
  location_id: Number(locationId),
  available,
  updated_at: new Date().toISOString(),
});

const signature = createHmac('sha256', secret).update(payload, 'utf8').digest('base64');

console.log(`\nPOST ${url}`);
console.log(`  item=${inventoryItemId} location=${locationId} available=${available}`);

const res = await fetch(url, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-Shopify-Topic': 'inventory_levels/update',
    'X-Shopify-Hmac-Sha256': signature,
    'X-Shopify-Shop-Domain': env.SHOPIFY_ADMIN_DOMAIN || '',
  },
  body: payload,
});

const text = await res.text();
console.log(`\n← ${res.status} ${res.statusText}`);
console.log(text.slice(0, 1000));

if (res.status === 401) {
  console.log(
    '\n401 = the signature was rejected. The dev server and .env must hold the\n' +
      'same SHOPIFY_WEBHOOK_SECRET — restart the server after editing .env.',
  );
}
