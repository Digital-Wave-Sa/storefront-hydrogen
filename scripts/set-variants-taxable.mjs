#!/usr/bin/env node
/**
 * Mark every product variant taxable, except gift cards.
 *
 * ── Why this exists ──
 *
 * Every variant in this shop is `taxable: false` (50 of 50 sampled), so no
 * order Shopify has ever written carries VAT — normal orders as well as
 * custom cakes. The shop is `taxesIncluded: true` and bills from Saudi
 * Arabia, so the price a customer pays already contains 15%; the flag does
 * not make anything cheaper, it stops the tax being declared. Meanwhile the
 * storefront cart shows a VAT line it computes itself, so the shopper is told
 * one thing and the invoice says another.
 *
 * ── What it skips, and why that is by product type ──
 *
 * Gift cards stay non-taxable: a gift card is a payment instrument, not a
 * supply, and VAT is due when it is SPENT. Both gift-card products on this
 * shop carry `productType: "Gift Card"`, which is why that is the test —
 * tags are inconsistent between them (one has three, the other none) and
 * titles are not a category.
 *
 * ── Safety ──
 *
 * Dry run unless you pass --apply. The dry run makes no writes at all and
 * prints exactly what would change, so read it before you commit to anything.
 * Variants already `taxable: true` are skipped rather than rewritten, so the
 * run is idempotent and safe to repeat if it stops half way.
 *
 * ── Running it ──
 *
 *   node set-variants-taxable.mjs              # dry run, writes nothing
 *   node set-variants-taxable.mjs --apply      # do it
 *
 * Reads SHOPIFY_ADMIN_API_TOKEN (or SHOPIFY_ADMIN_TOKEN / ADMIN_API_TOKEN)
 * and PUBLIC_STORE_DOMAIN from .env in the current directory, or from the
 * environment. The token never leaves your machine.
 */

import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';

const APPLY = process.argv.includes('--apply');
const API_VERSION = '2024-04';
const SKIP_PRODUCT_TYPE = 'gift card';

/** Read .env without a dependency, and without printing anything from it. */
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
    /* No .env — fall back to the real environment. */
  }
  return out;
}

const env = loadEnv();

const TOKEN =
  env.SHOPIFY_ADMIN_API_TOKEN ||
  env.SHOPIFY_ADMIN_TOKEN ||
  env.ADMIN_API_TOKEN ||
  env.PRIVATE_ADMIN_API_TOKEN;

const DOMAIN = (
  env.SHOPIFY_ADMIN_DOMAIN ||
  env.PUBLIC_STORE_DOMAIN ||
  ''
).replace(/^https?:\/\//, '');

if (!TOKEN || !DOMAIN) {
  console.error(
    'Missing admin credentials. Expected SHOPIFY_ADMIN_API_TOKEN and PUBLIC_STORE_DOMAIN in .env or the environment.',
  );
  process.exit(1);
}

const ENDPOINT = `https://${DOMAIN}/admin/api/${API_VERSION}/graphql.json`;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/**
 * One GraphQL call, with a retry for Shopify's leaky bucket.
 *
 * THROTTLED is the expected failure here, not an exceptional one: this makes
 * hundreds of calls in a row. Backing off and continuing is the normal path.
 */
async function gql(query, variables, attempt = 0) {
  const res = await fetch(ENDPOINT, {
    method: 'POST',
    headers: {
      'X-Shopify-Access-Token': TOKEN,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({query, variables}),
  });

  if (res.status === 429 && attempt < 5) {
    const wait = 2000 * (attempt + 1);
    console.warn(`  rate limited, waiting ${wait}ms…`);
    await sleep(wait);
    return gql(query, variables, attempt + 1);
  }

  const body = await res.json();

  const throttled = (body.errors || []).some(
    (e) => e?.extensions?.code === 'THROTTLED',
  );
  if (throttled && attempt < 5) {
    const wait = 2000 * (attempt + 1);
    console.warn(`  throttled, waiting ${wait}ms…`);
    await sleep(wait);
    return gql(query, variables, attempt + 1);
  }

  if (body.errors?.length) {
    throw new Error(JSON.stringify(body.errors));
  }
  return body.data;
}

const PRODUCTS_QUERY = `
  query TaxAudit($cursor: String) {
    products(first: 50, after: $cursor) {
      pageInfo { hasNextPage endCursor }
      nodes {
        id
        title
        productType
        variants(first: 100) {
          nodes { id title taxable }
        }
      }
    }
  }
`;

const UPDATE_MUTATION = `
  mutation SetTaxable($productId: ID!, $variants: [ProductVariantsBulkInput!]!) {
    productVariantsBulkUpdate(productId: $productId, variants: $variants) {
      userErrors { field message }
    }
  }
`;

async function main() {
  console.log(
    APPLY
      ? '── APPLYING changes ──'
      : '── DRY RUN — nothing will be written. Re-run with --apply to commit. ──',
  );
  console.log(`Shop: ${DOMAIN}\n`);

  let cursor = null;
  let scannedProducts = 0;
  let scannedVariants = 0;
  let alreadyTaxable = 0;
  const skipped = [];
  const toChange = [];

  do {
    const data = await gql(PRODUCTS_QUERY, {cursor});
    const page = data.products;

    for (const product of page.nodes) {
      scannedProducts++;
      const variants = product.variants.nodes;
      scannedVariants += variants.length;

      if ((product.productType || '').trim().toLowerCase() === SKIP_PRODUCT_TYPE) {
        skipped.push({
          title: product.title,
          variants: variants.length,
          taxableNow: variants.filter((v) => v.taxable).length,
        });
        continue;
      }

      const needs = variants.filter((v) => !v.taxable);
      alreadyTaxable += variants.length - needs.length;
      if (needs.length > 0) {
        toChange.push({
          id: product.id,
          title: product.title,
          variants: needs,
        });
      }
    }

    cursor = page.pageInfo.hasNextPage ? page.pageInfo.endCursor : null;
    process.stdout.write(`\rScanned ${scannedProducts} products…`);
  } while (cursor);

  const changeCount = toChange.reduce((n, p) => n + p.variants.length, 0);

  console.log(`\n
Products scanned      ${scannedProducts}
Variants scanned      ${scannedVariants}
Already taxable       ${alreadyTaxable}
Gift-card products    ${skipped.length} (left untouched)
To set taxable        ${changeCount} variant(s) across ${toChange.length} product(s)
`);

  if (skipped.length) {
    console.log('Skipped as gift cards:');
    for (const s of skipped) {
      console.log(
        `  · ${s.title} — ${s.variants} variant(s), ${s.taxableNow} currently taxable`,
      );
    }
    console.log('');
  }

  if (changeCount === 0) {
    console.log('Nothing to do.');
    return;
  }

  if (!APPLY) {
    console.log('First 20 that would change:');
    let shown = 0;
    for (const p of toChange) {
      if (shown >= 20) break;
      console.log(`  · ${p.title} (${p.variants.length})`);
      shown++;
    }
    console.log('\nDry run complete. Re-run with --apply to write these.');
    return;
  }

  let done = 0;
  let failed = 0;

  for (const product of toChange) {
    try {
      const data = await gql(UPDATE_MUTATION, {
        productId: product.id,
        variants: product.variants.map((v) => ({id: v.id, taxable: true})),
      });
      const errors = data.productVariantsBulkUpdate.userErrors;
      if (errors.length) {
        failed++;
        console.error(`\n  ✗ ${product.title}: ${JSON.stringify(errors)}`);
      } else {
        done += product.variants.length;
      }
    } catch (e) {
      failed++;
      console.error(`\n  ✗ ${product.title}: ${e.message}`);
    }

    process.stdout.write(
      `\rUpdated ${done}/${changeCount} variants (${failed} product failures)…`,
    );
    /** Gentle on the bucket; the retry above handles the rest. */
    await sleep(120);
  }

  console.log(`\n\nDone. ${done} variant(s) set taxable. ${failed} product(s) failed.`);
  if (failed > 0) {
    console.log('Re-run the script — it skips variants that are already taxable.');
  }
}

main().catch((e) => {
  console.error('\nFailed:', e.message);
  process.exit(1);
});
