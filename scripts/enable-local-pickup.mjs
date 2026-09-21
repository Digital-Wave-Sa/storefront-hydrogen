#!/usr/bin/env node
/**
 * Turn on local pickup at every branch.
 *
 * ── Why ──
 *
 * The storefront asks the shopper to choose delivery or pickup, and
 * checkout.initiate sends that choice on to Shopify as
 * `deliveryMethod: ['PICK_UP']` with the branch's location id. Shopify only
 * honours it where local pickup is enabled on that location. It is enabled on
 * a handful — Abha and Abhor branch — and null on the rest, so the same
 * checkout behaves two different ways depending on which branch the shopper
 * picked:
 *
 *   enabled   the «Pick up» tab exists, and the preference selects it
 *   null      the preference is silently dropped, and a shopper who chose
 *             «استلام من الفرع» lands on a shipping form asking for an address
 *
 * The comment at checkout.initiate:336 already says as much: «a branch with
 * local pickup switched off in Shopify admin simply will not offer the
 * option, which is a setting rather than something code can force.» This is
 * that setting.
 *
 * ── What this does NOT do ──
 *
 * It adds no shipping rate. Local pickup is a delivery METHOD, not a rate —
 * it puts a «Pick up» tab beside «Ship», it does not appear in the list next
 * to Standard Delivery and Free Delivery. The shop has exactly two rate
 * definitions and this changes neither. Local DELIVERY, which would add a
 * rate, is not configured anywhere and is not touched here.
 *
 * ── The pickup time ──
 *
 * TWENTY_FOUR_HOURS by default, because that is what a human chose on the two
 * branches that are already configured, and propagating a real decision beats
 * inventing one.
 *
 * Be aware it contradicts the storefront, which tells shoppers «جاهز خلال ١٥
 * دقيقة» on the product page. Both cannot be right. Shopify's shortest option
 * is ONE_HOUR — there is no fifteen-minute value — so the site's promise
 * cannot be expressed at checkout at all. Pass --time ONE_HOUR to use the
 * closest available instead.
 *
 *   ONE_HOUR  TWO_HOURS  FOUR_HOURS  TWENTY_FOUR_HOURS
 *   TWO_TO_FOUR_DAYS  FIVE_OR_MORE_DAYS
 *
 * ── Running it ──
 *
 *   node enable-local-pickup.mjs                          # dry run
 *   node enable-local-pickup.mjs --apply
 *   node enable-local-pickup.mjs --time ONE_HOUR --apply
 *
 * Locations already enabled are left exactly as they are, including their own
 * pickup time and instructions — this only fills gaps. Pass --overwrite to
 * force every branch onto the same value.
 *
 * Credentials come from .env the way the app reads them: SHOPIFY_CLIENT_ID and
 * SHOPIFY_CLIENT_SECRET exchanged for a short-lived admin token, as
 * getAdminToken does. Nothing is printed and nothing leaves this machine.
 */

import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';

const argv = process.argv.slice(2);
const has = (f) => argv.includes(f);
const valueOf = (f, d) => {
  const i = argv.indexOf(f);
  return i !== -1 && argv[i + 1] ? argv[i + 1] : d;
};

const APPLY = has('--apply');
const OVERWRITE = has('--overwrite');
const PICKUP_TIME = valueOf('--time', 'TWENTY_FOUR_HOURS');
const API_VERSION = '2024-04';

const VALID_TIMES = [
  'ONE_HOUR',
  'TWO_HOURS',
  'FOUR_HOURS',
  'TWENTY_FOUR_HOURS',
  'TWO_TO_FOUR_DAYS',
  'FIVE_OR_MORE_DAYS',
];

if (!VALID_TIMES.includes(PICKUP_TIME)) {
  console.error(`--time must be one of: ${VALID_TIMES.join(', ')}`);
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
      nodes {
        id
        name
        fulfillsOnlineOrders
        localPickupSettingsV2 { pickupTime instructions }
      }
    }
  }
`;

const ENABLE_MUTATION = `
  mutation EnablePickup($localPickupSettings: DeliveryLocationLocalPickupEnableInput!) {
    locationLocalPickupEnable(localPickupSettings: $localPickupSettings) {
      localPickupSettings { pickupTime }
      userErrors { field message }
    }
  }
`;

async function main() {
  TOKEN = await getAdminToken();

  console.log(
    APPLY
      ? '── APPLYING ──'
      : '── DRY RUN — nothing will be written. Re-run with --apply. ──',
  );
  console.log(`Shop: ${DOMAIN}   pickup time: ${PICKUP_TIME}\n`);

  const locations = [];
  let cursor = null;
  do {
    const d = await gql(LOCATIONS_QUERY, {cursor});
    locations.push(...d.locations.nodes);
    cursor = d.locations.pageInfo.hasNextPage ? d.locations.pageInfo.endCursor : null;
  } while (cursor);

  const alreadyOn = locations.filter((l) => l.localPickupSettingsV2);
  const needsIt = OVERWRITE ? locations : locations.filter((l) => !l.localPickupSettingsV2);

  /**
   * A location that does not fulfil online orders cannot be a pickup point in
   * checkout, so enabling pickup on it would be a setting with no effect.
   * Reported rather than silently included.
   */
  const notFulfilling = needsIt.filter((l) => !l.fulfillsOnlineOrders);
  const work = needsIt.filter((l) => l.fulfillsOnlineOrders);

  console.log(`Active locations            ${locations.length}`);
  console.log(`Already have local pickup   ${alreadyOn.length}`);
  console.log(`To enable                   ${work.length}`);
  if (notFulfilling.length) {
    console.log(`Skipped (not fulfilling online orders) ${notFulfilling.length}`);
  }

  if (alreadyOn.length && !OVERWRITE) {
    console.log('\nLeft as they are:');
    for (const l of alreadyOn.slice(0, 10)) {
      console.log(`  · ${l.name} — ${l.localPickupSettingsV2.pickupTime}`);
    }
    if (alreadyOn.length > 10) console.log(`  … and ${alreadyOn.length - 10} more`);
  }

  const distinct = new Set(alreadyOn.map((l) => l.localPickupSettingsV2.pickupTime));
  if (distinct.size > 0 && !distinct.has(PICKUP_TIME)) {
    console.log(
      `\nNOTE: branches already configured use ${[...distinct].join(', ')}, and this run would write ${PICKUP_TIME}.\n` +
        `      That leaves the shop inconsistent. Use --overwrite to bring them all onto one value.`,
    );
  }
  console.log('');

  if (!APPLY || work.length === 0) {
    if (work.length > 0) console.log('Dry run complete. Re-run with --apply.');
    else console.log('Nothing to do.');
    return;
  }

  let done = 0;
  let failed = 0;
  for (const loc of work) {
    try {
      const d = await gql(ENABLE_MUTATION, {
        localPickupSettings: {
          locationId: loc.id,
          pickupTime: PICKUP_TIME,
        },
      });
      const errs = d.locationLocalPickupEnable.userErrors;
      if (errs.length) {
        failed++;
        console.error(`\n  ✗ ${loc.name}: ${JSON.stringify(errs)}`);
      } else {
        done++;
      }
    } catch (e) {
      failed++;
      console.error(`\n  ✗ ${loc.name}: ${e.message}`);
    }
    process.stdout.write(`\rEnabled ${done}/${work.length} (${failed} failed)…`);
    await sleep(150);
  }

  console.log(`\n\nDone. Local pickup enabled at ${done} location(s), ${failed} failed.`);
  console.log('To reverse a location: locationLocalPickupDisable with its id.');
}

main().catch((e) => {
  console.error('\nFailed:', e.message);
  process.exit(1);
});
