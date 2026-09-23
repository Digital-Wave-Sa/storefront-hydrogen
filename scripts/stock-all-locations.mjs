#!/usr/bin/env node
/**
 * Make every product stockable, stocked and tracked at every branch.
 *
 * ── What this is for ──
 *
 * The storefront decides branch availability from
 * `inventoryItem.inventoryLevels` (see api.branch-availability). A product can
 * only be judged at a branch where its inventory item has been ACTIVATED — an
 * item never activated at a location does not read as zero there, it reads as
 * nothing at all. Almost nothing in this shop is activated anywhere but «Shop
 * location», which is why the ERP's numbers have nowhere to land.
 *
 * ── Three phases, three flags, on purpose ──
 *
 *   --activate   Create the inventory level at every active location.
 *   --stock      Set a starting quantity on levels that have none.
 *   --track      Turn on `tracked`, which is what makes quantities MEAN
 *                anything.
 *
 * They are separate because the order is load-bearing and the last one is the
 * only dangerous step.
 *
 * While an item is untracked, Shopify ignores its quantity completely: the
 * product is available everywhere whatever the numbers say. So activating and
 * stocking change nothing for a shopper — they are invisible, and safe.
 *
 * `--track` is the moment the numbers go live. Every variant here is
 * `inventoryPolicy: DENY`, so from that instant a level of 0 means NOT FOR
 * SALE at that branch. Run it before real quantities exist and the newly
 * created zeros take every product offline at every branch at once: dead
 * product pages, «لم يعد متاحاً في هذا الفرع» on every cart line, blocked
 * checkout, until something writes real numbers.
 *
 * So: activate and stock, let the ERP push, LOOK at the result, and only then
 * track. Untracking again reverses it if something is wrong, but it is better
 * not to need that.
 *
 * ── Existing numbers are never overwritten ──
 *
 * Some branches already hold real counts from the ERP — Abha had 909 of one
 * product, which is a feed writing, not a person typing. `--stock` only fills
 * levels that are at zero or absent. Destroying a real count to write a made-up
 * one would be the worst outcome here, so it takes an explicit --overwrite,
 * and there is no good reason to pass it.
 *
 * ── Running it ──
 *
 * By default it stocks every ACTIVE product at every branch except «Shop
 * location» (Shopify's default warehouse) and any branch whose name says مغلق.
 * `--include-all-locations` and `--include-inactive-products` widen that.
 *
 *   node stock-all-locations.mjs --activate                  # dry run
 *   node stock-all-locations.mjs --activate --apply
 *
 *   node stock-all-locations.mjs --stock --qty 1000          # dry run
 *   node stock-all-locations.mjs --stock --qty 1000 --apply
 *
 *   node stock-all-locations.mjs --track                     # dry run
 *   node stock-all-locations.mjs --track --apply             # ← the live one
 *
 * Nothing is written without --apply. Every phase skips work already done, so
 * a run that stops half way can simply be repeated.
 *
 * Gift cards are excluded throughout: a voucher is not held at a branch.
 *
 * Credentials come from .env the way the app reads them — SHOPIFY_CLIENT_ID
 * and SHOPIFY_CLIENT_SECRET exchanged for a short-lived admin token, as
 * getAdminToken does. Nothing is printed and nothing leaves this machine.
 */

import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';

const argv = process.argv.slice(2);
const has = (f) => argv.includes(f);
const valueOf = (f, fallback) => {
  const i = argv.indexOf(f);
  return i !== -1 && argv[i + 1] ? argv[i + 1] : fallback;
};

const APPLY = has('--apply');
const OVERWRITE = has('--overwrite');
const DO_ACTIVATE = has('--activate');
const DO_STOCK = has('--stock');
const DO_TRACK = has('--track');
const QTY = parseInt(valueOf('--qty', '1000'), 10);
/**
 * Variants per scan page. The query's cost is roughly this times the number
 * of branches, and Shopify's ceiling for one query is 1000.
 */
const SCAN_PAGE = Math.max(1, parseInt(valueOf('--page-size', '5'), 10) || 5);

const API_VERSION = '2024-04';
const SKIP_PRODUCT_TYPE = 'gift card';

/**
 * Branches this deliberately leaves out, unless --include-all-locations.
 *
 *   «Shop location» is Shopify's default warehouse, not a shop. It is where
 *   every item is activated today, and it is not one of the branches a
 *   customer can pick up from.
 *
 *   A branch whose name says مغلق ("closed") is shut. Stocking it would put it
 *   back in front of shoppers as a pickup option.
 */
const SKIP_LOCATION_NAMES = ['shop location'];
const SKIP_LOCATION_PATTERNS = [/مغلق/];
const INCLUDE_ALL_LOCATIONS = has('--include-all-locations');

/** Draft and archived products are not for sale, so they are not stocked. */
const ONLY_ACTIVE = !has('--include-inactive-products');
/** Shopify caps inventorySetQuantities at 250; 200 leaves headroom. */
const QTY_BATCH = 200;

if (!DO_ACTIVATE && !DO_STOCK && !DO_TRACK) {
  console.error(
    'Pick a phase: --activate, --stock (with --qty), or --track.\nAdd --apply to write. See the header of this file for why the order matters.',
  );
  process.exit(1);
}
if (DO_STOCK && (!Number.isFinite(QTY) || QTY < 0)) {
  console.error('--qty must be a non-negative whole number.');
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

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let TOKEN = null;

async function getAdminToken() {
  const res = await fetch(`https://${DOMAIN}/admin/oauth/access_token`, {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({client_id: CLIENT_ID, client_secret: CLIENT_SECRET, grant_type: 'client_credentials'}),
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
  if (res.status === 429 && attempt < 6) {
    await sleep(2000 * (attempt + 1));
    return gql(query, variables, attempt + 1);
  }
  const body = await res.json();
  if ((body.errors || []).some((e) => e?.extensions?.code === 'THROTTLED') && attempt < 6) {
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
 * The scan, variant by variant.
 *
 * This used to ask for 25 products x 100 variants x 150 inventory levels in
 * one query and Shopify refused it: "Query cost is 1856, which exceeds the
 * single query max cost limit (1000)". The cost of a nested query is the
 * product of its page sizes, so the levels — one per branch, and there are
 * 116 — have to sit under a small page.
 *
 * `productVariants` at the top level removes one whole level of nesting, and
 * SCAN_PAGE keeps the cost near (page x levels). Lower it with --page-size if
 * the shop ever grows past the limit again.
 */
const SCAN_QUERY = `
  query Scan($cursor: String, $page: Int!, $levels: Int!) {
    productVariants(first: $page, after: $cursor) {
      pageInfo { hasNextPage endCursor }
      nodes {
        id
        product { id title status productType }
        inventoryItem {
          id
          tracked
          inventoryLevels(first: $levels) {
            nodes {
              location { id }
              quantities(names: ["available"]) { quantity }
            }
          }
        }
      }
    }
  }
`;

const ACTIVATE_MUTATION = `
  mutation Activate($inventoryItemId: ID!, $updates: [InventoryBulkToggleActivationInput!]!) {
    inventoryBulkToggleActivation(inventoryItemId: $inventoryItemId, inventoryItemUpdates: $updates) {
      userErrors { field message }
    }
  }
`;

const SET_QUANTITIES_MUTATION = `
  mutation SetQty($input: InventorySetQuantitiesInput!) {
    inventorySetQuantities(input: $input) {
      userErrors { field message }
    }
  }
`;

const TRACK_MUTATION = `
  mutation Track($productId: ID!, $variants: [ProductVariantsBulkInput!]!) {
    productVariantsBulkUpdate(productId: $productId, variants: $variants) {
      userErrors { field message }
    }
  }
`;

async function main() {
  TOKEN = await getAdminToken();

  const phase = DO_ACTIVATE ? 'ACTIVATE' : DO_STOCK ? 'STOCK' : 'TRACK';
  console.log(
    `${APPLY ? '── APPLYING ──' : '── DRY RUN — nothing will be written ──'}  phase: ${phase}`,
  );
  console.log(`Shop: ${DOMAIN}${DO_STOCK ? `   qty: ${QTY}` : ''}\n`);

  if (DO_TRACK && APPLY) {
    console.log(
      'WARNING: from this point a level of 0 means NOT FOR SALE at that branch.\n' +
        'Only run this after real quantities are in place and you have looked at them.\n',
    );
  }

  // Every active location.
  const locations = new Map();
  const skippedLocations = [];
  let cursor = null;
  do {
    const d = await gql(LOCATIONS_QUERY, {cursor});
    for (const l of d.locations.nodes) {
      const name = String(l.name || '');
      const skip =
        !INCLUDE_ALL_LOCATIONS &&
        (SKIP_LOCATION_NAMES.includes(name.trim().toLowerCase()) ||
          SKIP_LOCATION_PATTERNS.some((re) => re.test(name)));
      if (skip) {
        skippedLocations.push(name);
        continue;
      }
      locations.set(l.id, name);
    }
    cursor = d.locations.pageInfo.hasNextPage ? d.locations.pageInfo.endCursor : null;
  } while (cursor);
  const allLocationIds = [...locations.keys()];
  if (skippedLocations.length) {
    console.log(
      `Branches skipped (${skippedLocations.length}): ${skippedLocations.join(', ')}\n` +
        '(--include-all-locations stocks these too.)\n',
    );
  }

  // Every variant, with where it is activated and what is there.
  const items = [];
  let skippedGiftCards = 0;
  let skippedInactive = 0;
  cursor = null;
  let scanned = 0;

  const levelPage = Math.max(locations.size + 4, 10);

  do {
    const d = await gql(SCAN_QUERY, {
      cursor,
      page: SCAN_PAGE,
      levels: levelPage,
    });
    for (const v of d.productVariants.nodes) {
      scanned++;
      const p = v.product || {};
      if ((p.productType || '').trim().toLowerCase() === SKIP_PRODUCT_TYPE) {
        skippedGiftCards++;
        continue;
      }
      if (ONLY_ACTIVE && p.status !== 'ACTIVE') {
        skippedInactive++;
        continue;
      }
      const inv = v.inventoryItem;
      if (!inv) continue;
      const levels = new Map();
      for (const lvl of inv.inventoryLevels.nodes) {
        levels.set(lvl.location.id, lvl.quantities?.[0]?.quantity ?? 0);
      }
      items.push({
        productId: p.id,
        variantId: v.id,
        title: p.title,
        inventoryItemId: inv.id,
        tracked: inv.tracked,
        levels,
      });
    }
    cursor = d.productVariants.pageInfo.hasNextPage
      ? d.productVariants.pageInfo.endCursor
      : null;
    process.stdout.write(`\rScanned ${scanned} variants…`);
  } while (cursor);

  console.log(
    `\n\nBranches ${locations.size}   variants ${items.length}   ` +
      `gift-card variants skipped ${skippedGiftCards}   ` +
      `draft/archived variants skipped ${skippedInactive}\n`,
  );

  if (DO_ACTIVATE) await phaseActivate(items, allLocationIds, locations);
  if (DO_STOCK) await phaseStock(items, allLocationIds);
  if (DO_TRACK) await phaseTrack(items);
}

async function phaseActivate(items, allLocationIds, locations) {
  const work = items
    .map((it) => ({
      it,
      missing: allLocationIds.filter((id) => !it.levels.has(id)),
    }))
    .filter((w) => w.missing.length > 0);

  const total = work.reduce((n, w) => n + w.missing.length, 0);
  console.log(`Levels to create: ${total} across ${work.length} variant(s).`);
  console.log(
    `(Safe while untracked — Shopify ignores quantities on untracked items, so this is invisible to shoppers.)\n`,
  );

  if (!APPLY || total === 0) {
    if (total > 0) console.log('Dry run complete. Re-run with --apply.');
    return;
  }

  let done = 0;
  let failed = 0;
  for (const {it, missing} of work) {
    try {
      const d = await gql(ACTIVATE_MUTATION, {
        inventoryItemId: it.inventoryItemId,
        updates: missing.map((id) => ({locationId: id, activate: true})),
      });
      const errs = d.inventoryBulkToggleActivation.userErrors;
      if (errs.length) {
        failed++;
        console.error(`\n  ✗ ${it.title}: ${JSON.stringify(errs)}`);
      } else {
        done += missing.length;
      }
    } catch (e) {
      failed++;
      console.error(`\n  ✗ ${it.title}: ${e.message}`);
    }
    process.stdout.write(`\rActivated ${done}/${total} levels (${failed} failures)…`);
    await sleep(120);
  }
  console.log(`\n\nDone. ${done} level(s) created, ${failed} variant(s) failed.`);
}

async function phaseStock(items, allLocationIds) {
  /**
   * Only levels that hold nothing. A branch already carrying a real count from
   * the ERP keeps it — overwriting 909 with a round invented number is the one
   * genuinely destructive thing this script could do.
   */
  const rows = [];
  let preserved = 0;
  for (const it of items) {
    for (const locId of allLocationIds) {
      const current = it.levels.get(locId);
      if (current === undefined) continue; // not activated — run --activate first
      if (current > 0 && !OVERWRITE) {
        preserved++;
        continue;
      }
      if (current === QTY) continue;
      rows.push({inventoryItemId: it.inventoryItemId, locationId: locId, quantity: QTY});
    }
  }

  console.log(`Levels to set to ${QTY}: ${rows.length}`);
  console.log(
    `Existing non-zero levels left alone: ${preserved}${OVERWRITE ? '  (--overwrite given, so none)' : ''}`,
  );
  const notActivated = items.reduce(
    (n, it) => n + allLocationIds.filter((id) => !it.levels.has(id)).length,
    0,
  );
  if (notActivated > 0) {
    console.log(`\nNOTE: ${notActivated} item×location pair(s) are not activated yet — run --activate first.`);
  }
  console.log('');

  if (!APPLY || rows.length === 0) {
    if (rows.length > 0) console.log('Dry run complete. Re-run with --apply.');
    return;
  }

  let done = 0;
  let failed = 0;
  for (let i = 0; i < rows.length; i += QTY_BATCH) {
    const batch = rows.slice(i, i + QTY_BATCH);
    try {
      const d = await gql(SET_QUANTITIES_MUTATION, {
        input: {
          name: 'available',
          reason: 'correction',
          /** Names this script in Shopify's inventory history, so the entries are traceable. */
          referenceDocumentUri: 'gid://saadeddin-storefront/StockSeed/all-locations',
          /*
            Without this Shopify refuses every batch: "The compareQuantity
            argument must be given to each quantity or ignored using
            ignoreCompareQuantity." It is the API's guard against two writers
            racing — you normally send the value you believe is there, and the
            write fails if someone changed it meanwhile.

            We ignore it on purpose. The scan is minutes old by the time the
            last batch goes out, and this phase only ever touches levels that
            read zero or absent, so there is no number here worth protecting.
          */
          ignoreCompareQuantity: true,
          quantities: batch,
        },
      });
      const errs = d.inventorySetQuantities.userErrors;
      if (errs.length) {
        failed += batch.length;
        console.error(`\n  ✗ batch at ${i}: ${JSON.stringify(errs)}`);
      } else {
        done += batch.length;
      }
    } catch (e) {
      failed += batch.length;
      console.error(`\n  ✗ batch at ${i}: ${e.message}`);
    }
    process.stdout.write(`\rSet ${done}/${rows.length} levels (${failed} failed)…`);
    await sleep(200);
  }
  console.log(`\n\nDone. ${done} level(s) set to ${QTY}, ${failed} failed.`);
}

async function phaseTrack(items) {
  const work = items.filter((it) => !it.tracked);

  /** How many would be unsellable the moment tracking goes on. */
  const noStockAnywhere = work.filter(
    (it) => ![...it.levels.values()].some((q) => q > 0),
  );

  console.log(`Variants to track: ${work.length}`);
  console.log(
    `Of those, with NO stock at any location: ${noStockAnywhere.length}`,
  );

  if (noStockAnywhere.length > 0) {
    console.log(
      `\n  These ${noStockAnywhere.length} would become unbuyable EVERYWHERE the moment this runs,\n` +
        `  because tracking makes a zero mean «not for sale» and they have nothing anywhere.\n` +
        `  Stock them, or let the ERP push, before tracking.\n`,
    );
    for (const it of noStockAnywhere.slice(0, 15)) console.log(`    · ${it.title}`);
    if (noStockAnywhere.length > 15) {
      console.log(`    … and ${noStockAnywhere.length - 15} more`);
    }
    console.log('');
  }

  if (!APPLY || work.length === 0) {
    if (work.length > 0) console.log('Dry run complete. Re-run with --apply when the numbers are real.');
    return;
  }

  /** One call per product, so multi-variant products go in a single mutation. */
  const byProduct = new Map();
  for (const it of work) {
    if (!byProduct.has(it.productId)) byProduct.set(it.productId, []);
    byProduct.get(it.productId).push(it);
  }

  let done = 0;
  let failed = 0;
  for (const [productId, list] of byProduct) {
    try {
      const d = await gql(TRACK_MUTATION, {
        productId,
        variants: list.map((it) => ({id: it.variantId, inventoryItem: {tracked: true}})),
      });
      const errs = d.productVariantsBulkUpdate.userErrors;
      if (errs.length) {
        failed++;
        console.error(`\n  ✗ ${list[0].title}: ${JSON.stringify(errs)}`);
      } else {
        done += list.length;
      }
    } catch (e) {
      failed++;
      console.error(`\n  ✗ ${list[0].title}: ${e.message}`);
    }
    process.stdout.write(`\rTracked ${done}/${work.length} variants (${failed} product failures)…`);
    await sleep(120);
  }
  console.log(`\n\nDone. ${done} variant(s) now tracked, ${failed} product(s) failed.`);
  console.log('To reverse: the same mutation with tracked: false.');
}

main().catch((e) => {
  console.error('\nFailed:', e.message);
  process.exit(1);
});
