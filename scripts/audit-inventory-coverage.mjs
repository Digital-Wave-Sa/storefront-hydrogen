#!/usr/bin/env node
/**
 * Where does inventory actually exist, and where does it not?
 *
 * ── The question this answers ──
 *
 * Products disappear from the storefront when they are tracked and have no
 * stock at the shopper's branch. The per-branch machinery reads
 * `inventoryItem.inventoryLevels` (see api.branch-availability), so a product
 * is only visible at a branch where its inventory item has been ACTIVATED —
 * an item that was never activated at a location does not read as zero there,
 * it reads as nothing at all.
 *
 * Spot checks showed the coverage is partial and uneven: one variant had
 * levels at «Shop location» and Abha only, another at «Shop location» alone,
 * while Abha itself holds levels for a set of products with believable
 * numbers (909 among them — which is a feed writing, not a person typing).
 *
 * So the ERP does reach branches. The open question is how far, and that is
 * not answerable by looking at three products. This counts it.
 *
 * ── What it does NOT do ──
 *
 * Nothing. It writes nothing, activates nothing, changes no quantity. Run it
 * as often as you like.
 *
 * ── Reading the output ──
 *
 * Coverage is (activated item, location) pairs against the total possible.
 * Three numbers matter:
 *
 *   per location   A branch with few activated items is a branch where most
 *                  of the catalogue would vanish the day tracking is turned
 *                  on. A branch with NONE is one the ERP has never written
 *                  to.
 *   per product    A product activated at few branches is one that is
 *                  already invisible at most of them, if it is tracked.
 *   tracked split  Only TRACKED items are affected. Untracked ones are
 *                  available everywhere regardless, which is why the shop
 *                  mostly works today.
 *
 *   node audit-inventory-coverage.mjs             # summary
 *   node audit-inventory-coverage.mjs --full      # every location, every gap
 *
 * Credentials come from .env exactly as the app reads them — SHOPIFY_CLIENT_ID
 * and SHOPIFY_CLIENT_SECRET exchanged for a short-lived admin token, the same
 * thing getAdminToken does. Nothing is printed and nothing leaves the machine.
 */

import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';

const FULL = process.argv.includes('--full');
const API_VERSION = '2024-04';

function loadEnv() {
  const out = {...process.env};
  try {
    const raw = readFileSync(resolve(process.cwd(), '.env'), 'utf8');
    for (const line of raw.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eq = trimmed.indexOf('=');
      if (eq === -1) continue;
      const key = trimmed.slice(0, eq).trim();
      let value = trimmed.slice(eq + 1).trim();
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }
      if (!(key in out)) out[key] = value;
    }
  } catch {
    /* No .env — use the environment. */
  }
  return out;
}

const env = loadEnv();
const CLIENT_ID = env.SHOPIFY_CLIENT_ID || env.SHOPIFY_ADMIN_CLIENT_ID;
const CLIENT_SECRET =
  env.SHOPIFY_CLIENT_SECRET || env.SHOPIFY_ADMIN_CLIENT_SECRET;
const DOMAIN = (
  env.SHOPIFY_ADMIN_DOMAIN ||
  (env.SHOPIFY_SHOP && !String(env.SHOPIFY_SHOP).includes('x21kumcd')
    ? `${String(env.SHOPIFY_SHOP).replace(/^https?:\/\//, '').split('.')[0]}.myshopify.com`
    : '') ||
  env.PUBLIC_STORE_DOMAIN ||
  ''
)
  .replace(/^https?:\/\//, '')
  .replace(/\/$/, '');

if (!CLIENT_ID || !CLIENT_SECRET || !DOMAIN) {
  console.error(
    'Missing admin credentials. Expected SHOPIFY_CLIENT_ID, SHOPIFY_CLIENT_SECRET and a shop domain in .env.',
  );
  process.exit(1);
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let TOKEN = null;

async function getAdminToken() {
  const res = await fetch(`https://${DOMAIN}/admin/oauth/access_token`, {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      grant_type: 'client_credentials',
    }),
  });
  const text = await res.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error(`Non-JSON from the token endpoint — check the domain (${DOMAIN}).`);
  }
  if (data.error) throw new Error(`Token exchange failed: ${data.error_description || data.error}`);
  return data.access_token;
}

async function gql(query, variables, attempt = 0) {
  const res = await fetch(`https://${DOMAIN}/admin/api/${API_VERSION}/graphql.json`, {
    method: 'POST',
    headers: {'X-Shopify-Access-Token': TOKEN, 'Content-Type': 'application/json'},
    body: JSON.stringify({query, variables}),
  });

  if (res.status === 429 && attempt < 5) {
    await sleep(2000 * (attempt + 1));
    return gql(query, variables, attempt + 1);
  }
  const body = await res.json();
  if ((body.errors || []).some((e) => e?.extensions?.code === 'THROTTLED') && attempt < 5) {
    await sleep(2000 * (attempt + 1));
    return gql(query, variables, attempt + 1);
  }
  if (body.errors?.length) throw new Error(JSON.stringify(body.errors));
  return body.data;
}

const LOCATIONS_QUERY = `
  query Locs($cursor: String) {
    locations(first: 100, after: $cursor, includeInactive: false) {
      pageInfo { hasNextPage endCursor }
      nodes { id name }
    }
  }
`;

/**
 * 100 levels per item is the ceiling here. With 118 locations an item that is
 * activated everywhere would be truncated — so the count is reported as "100+"
 * rather than silently understated.
 */
const ITEMS_QUERY = `
  query Items($cursor: String) {
    productVariants(first: 50, after: $cursor) {
      pageInfo { hasNextPage endCursor }
      nodes {
        id
        product { title }
        inventoryItem {
          id
          tracked
          inventoryLevels(first: 100) {
            nodes {
              location { id name }
              quantities(names: ["available"]) { quantity }
            }
          }
        }
      }
    }
  }
`;

async function main() {
  TOKEN = await getAdminToken();
  console.log(`Shop: ${DOMAIN}\nRead-only audit — nothing will be written.\n`);

  // 1. Every active location.
  const locations = new Map();
  let cursor = null;
  do {
    const d = await gql(LOCATIONS_QUERY, {cursor});
    for (const l of d.locations.nodes) locations.set(l.id, l.name);
    cursor = d.locations.pageInfo.hasNextPage ? d.locations.pageInfo.endCursor : null;
  } while (cursor);

  // 2. Every variant, and where its inventory item is activated.
  const perLocation = new Map();      // locationId -> activated item count
  const perLocationStocked = new Map(); // locationId -> items with qty > 0
  const products = [];
  let tracked = 0;
  let untracked = 0;
  let truncated = 0;

  cursor = null;
  let scanned = 0;
  do {
    const d = await gql(ITEMS_QUERY, {cursor});
    for (const v of d.productVariants.nodes) {
      scanned++;
      const item = v.inventoryItem;
      if (!item) continue;
      item.tracked ? tracked++ : untracked++;

      const levels = item.inventoryLevels.nodes;
      if (levels.length >= 100) truncated++;

      let stockedHere = 0;
      for (const lvl of levels) {
        const id = lvl.location.id;
        perLocation.set(id, (perLocation.get(id) || 0) + 1);
        const qty = lvl.quantities?.[0]?.quantity ?? 0;
        if (qty > 0) {
          perLocationStocked.set(id, (perLocationStocked.get(id) || 0) + 1);
          stockedHere++;
        }
      }

      products.push({
        title: v.product?.title || v.id,
        tracked: item.tracked,
        locations: levels.length,
        stocked: stockedHere,
      });
    }
    cursor = d.productVariants.pageInfo.hasNextPage
      ? d.productVariants.pageInfo.endCursor
      : null;
    process.stdout.write(`\rScanned ${scanned} variants…`);
  } while (cursor);

  const L = locations.size;
  const V = products.length;
  const possible = L * V;
  const activated = [...perLocation.values()].reduce((a, b) => a + b, 0);
  const stocked = [...perLocationStocked.values()].reduce((a, b) => a + b, 0);
  const untouched = [...locations.keys()].filter((id) => !perLocation.has(id));

  console.log(`\n
Locations (active)        ${L}
Variants                  ${V}   (${tracked} tracked, ${untracked} untracked)
Possible item×location    ${possible}
Activated                 ${activated}   (${((activated / possible) * 100).toFixed(1)}%)
  …of those, qty > 0      ${stocked}
Locations never written   ${untouched.length}
`);

  if (truncated > 0) {
    console.log(
      `NOTE: ${truncated} item(s) hit the 100-level read cap, so their counts are a floor, not exact.\n`,
    );
  }

  if (untouched.length) {
    console.log('Locations with NO inventory levels at all:');
    for (const id of untouched.slice(0, FULL ? untouched.length : 15)) {
      console.log(`  · ${locations.get(id)}`);
    }
    if (!FULL && untouched.length > 15) {
      console.log(`  … and ${untouched.length - 15} more (--full to list)`);
    }
    console.log('');
  }

  const ranked = [...perLocation.entries()].sort((a, b) => b[1] - a[1]);
  console.log(`Best-covered locations (activated items out of ${V}):`);
  for (const [id, n] of ranked.slice(0, 10)) {
    console.log(
      `  · ${locations.get(id) || id}: ${n}  (${perLocationStocked.get(id) || 0} in stock)`,
    );
  }

  const trackedProducts = products.filter((p) => p.tracked);
  const trackedNowhere = trackedProducts.filter((p) => p.stocked === 0);
  console.log(`
TRACKED variants with stock NOWHERE: ${trackedNowhere.length} of ${trackedProducts.length}
  These are invisible at every branch today.`);
  for (const p of trackedNowhere.slice(0, FULL ? trackedNowhere.length : 15)) {
    console.log(`  · ${p.title}  (activated at ${p.locations} location(s))`);
  }
  if (!FULL && trackedNowhere.length > 15) {
    console.log(`  … and ${trackedNowhere.length - 15} more (--full to list)`);
  }
}

main().catch((e) => {
  console.error('\nFailed:', e.message);
  process.exit(1);
});
