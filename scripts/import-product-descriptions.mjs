#!/usr/bin/env node
/**
 * Write the bilingual product descriptions from the catalogue review into
 * Shopify — English onto the product, Arabic as its `ar` translation.
 *
 * ── Why two different places ──
 *
 * This shop's primary locale is English and Arabic is a published secondary
 * locale (`shopLocales`: en primary, ar published). Shopify only stores ONE
 * body_html per product: the primary-language one. Everything Arabic lives in
 * the translation layer, keyed to the English it was translated from.
 *
 * So one product needs two writes:
 *
 *   productUpdate(descriptionHtml)        → the English, on the product
 *   translationsRegister(key: body_html)  → the Arabic, against that English
 *
 * and the order matters. A registered translation carries the `digest` of the
 * English content it was made from. Change the English afterwards and the
 * digest changes, Shopify marks the Arabic `outdated: true` and stops serving
 * it rather than showing stale Arabic beside new English. That is exactly the
 * state the shop is in right now — every product's Arabic body_html is a
 * leftover one-liner flagged outdated.
 *
 * Hence: English first, then RE-READ the digests, then Arabic. Never the
 * other way round, and never from a digest cached before the English write.
 *
 * ── Running it ──
 *
 *   node scripts/import-product-descriptions.mjs                  # dry run, both phases
 *   node scripts/import-product-descriptions.mjs --apply          # write both, in order
 *
 *   node scripts/import-product-descriptions.mjs --english --apply
 *   node scripts/import-product-descriptions.mjs --arabic  --apply
 *
 * Nothing is written without --apply. The run is idempotent: a product whose
 * English already matches the file is not rewritten, and an Arabic
 * translation that is already correct AND not outdated is left alone. So a
 * run that dies half way can simply be repeated.
 *
 * Useful flags:
 *   --only <sku|handle>   Do a single product. Good for a first live test.
 *   --limit <n>           Stop after n products.
 *   --verbose             Print each product, not just the ones that changed.
 *
 * ── Where the content comes from ──
 *
 * `product-descriptions/descriptions.json`, generated from the client's
 * review workbook (sheet «منتجات متطابقة»), which reconciled the internal
 * catalogue against this store. 323 rows matched; 292 of them are here.
 *
 * The other 31 are in `skipped.json` with a reason, because they need a
 * person and not an import:
 *
 *   23  flagged حذف/إيقاف — the client marked them for removal, so writing a
 *       polished description onto them is work in the wrong direction.
 *    8  one SKU standing for several Shopify products. The workbook merged
 *       them into one row with `|` between the values (six empanada flavours
 *       under 332372, two cookie types under 329060, and so on) and the
 *       description was written for only ONE of them. Picking one would put
 *       the wrong copy on the others.
 *
 * Prices are deliberately not touched. The workbook disagrees with Shopify on
 * 49 of them, in both directions, and that is a separate decision.
 *
 * The JSON is the source of truth for the text — this script never edits,
 * reflows or re-encodes it. Arabic that has been retyped by hand somewhere in
 * the chain is Arabic you cannot trust, so it is carried byte for byte.
 *
 * ── Matching ──
 *
 * By `handle` first, because handles are unique and the workbook carries
 * Shopify's own. Anything that does not match by handle is looked up by SKU.
 * Anything still unmatched is REPORTED AND SKIPPED, never guessed at — the
 * workbook contains real name collisions, so a fuzzy match here would write
 * one product's description onto another.
 *
 * Credentials come from .env the way the app reads them: a static
 * SHOPIFY_ADMIN_API_ACCESS_TOKEN if there is one, otherwise the
 * client-credentials exchange from app/lib/shopify-admin.server.ts. Nothing
 * is printed and nothing leaves this machine.
 */

import {readFile} from 'node:fs/promises';
import {dirname, join} from 'node:path';
import {fileURLToPath} from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const DATA = join(HERE, 'product-descriptions', 'descriptions.json');
const API_VERSION = '2024-07';
const LOCALE = 'ar';

const argv = process.argv.slice(2);
const has = (f) => argv.includes(f);
const valueOf = (f, fallback) => {
  const i = argv.indexOf(f);
  return i !== -1 && argv[i + 1] ? argv[i + 1] : fallback;
};

const APPLY = has('--apply');
const VERBOSE = has('--verbose');
const ONLY = valueOf('--only', '');
const LIMIT = parseInt(valueOf('--limit', '0'), 10) || 0;

/** No phase flag means both, in the order the digests require. */
const wantEnglish = has('--english') || !has('--arabic');
const wantArabic = has('--arabic') || !has('--english');

/* ────────────────────────────── credentials ────────────────────────────── */

async function loadEnv() {
  const env = {...process.env};
  try {
    const raw = await readFile(join(HERE, '..', '.env'), 'utf8');
    for (const line of raw.split('\n')) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
      if (!m) continue;
      const [, key, rawVal] = m;
      if (env[key]) continue;
      env[key] = rawVal.replace(/^["']|["']$/g, '');
    }
  } catch {
    // No .env is fine when the values are already exported.
  }
  return env;
}

function adminDomain(env) {
  const d = env.SHOPIFY_ADMIN_DOMAIN || env.SHOPIFY_SHOP || '';
  if (!d) return '';
  const bare = d.replace(/^https?:\/\//, '').replace(/\/$/, '');
  return bare.includes('myshopify.com') ? bare : `${bare.split('.')[0]}.myshopify.com`;
}

async function getToken(env, domain) {
  const direct =
    env.SHOPIFY_ADMIN_API_ACCESS_TOKEN || env.SHOPIFY_ADMIN_API_ACCESS_TOKENS;
  if (direct) return direct;

  const clientId = env.SHOPIFY_CLIENT_ID || env.SHOPIFY_ADMIN_CLIENT_ID;
  const clientSecret =
    env.SHOPIFY_CLIENT_SECRET || env.SHOPIFY_ADMIN_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error(
      'No admin credentials. Set SHOPIFY_ADMIN_API_ACCESS_TOKEN, or SHOPIFY_CLIENT_ID + SHOPIFY_CLIENT_SECRET, in .env',
    );
  }
  const res = await fetch(`https://${domain}/admin/oauth/access_token`, {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: 'client_credentials',
    }),
  });
  const data = await res.json();
  if (!data.access_token) {
    throw new Error(
      `Token exchange failed: ${data.error_description || data.error || res.status}`,
    );
  }
  return data.access_token;
}

/**
 * What the token can actually do.
 *
 * Ticking a scope in the app's Configuration tab does NOT upgrade a token
 * that was already issued — the grant is fixed at install time. So a freshly
 * ticked write_translations still fails until the app is re-installed and,
 * for a static token, the new token is copied into .env.
 */
async function grantedScopes(domain, token) {
  try {
    const res = await fetch(`https://${domain}/admin/oauth/access_scopes.json`, {
      headers: {'X-Shopify-Access-Token': token},
    });
    if (!res.ok) return null;
    const json = await res.json();
    return (json.access_scopes || []).map((s) => s.handle).sort();
  } catch {
    return null;
  }
}

/* ─────────────────────────────── transport ─────────────────────────────── */

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/**
 * One GraphQL call, with the two things that make a 600-request run survive:
 * it waits when the cost bucket is nearly empty, and it retries a 429 or a
 * THROTTLED error instead of dropping the product on the floor.
 */
async function graphql(domain, token, query, variables, attempt = 0) {
  const res = await fetch(
    `https://${domain}/admin/api/${API_VERSION}/graphql.json`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Access-Token': token,
      },
      body: JSON.stringify({query, variables}),
    },
  );

  if (res.status === 429 || res.status >= 500) {
    if (attempt >= 5) throw new Error(`HTTP ${res.status} after 5 attempts`);
    await sleep(1000 * 2 ** attempt);
    return graphql(domain, token, query, variables, attempt + 1);
  }
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text()}`);

  const json = await res.json();

  const throttled = json.errors?.some(
    (e) => e.extensions?.code === 'THROTTLED' || /throttl/i.test(e.message || ''),
  );
  if (throttled) {
    if (attempt >= 5) throw new Error('Throttled after 5 attempts');
    await sleep(1000 * 2 ** attempt);
    return graphql(domain, token, query, variables, attempt + 1);
  }
  if (json.errors?.length) {
    throw new Error(json.errors.map((e) => e.message).join('; '));
  }

  // Give the bucket room to refill before the next call rather than racing it.
  const t = json.extensions?.cost?.throttleStatus;
  if (t && t.currentlyAvailable < 200) {
    await sleep(Math.ceil((250 - t.currentlyAvailable) / (t.restoreRate || 50)) * 1000);
  }

  return json.data;
}

/* ──────────────────────────────── queries ──────────────────────────────── */

const BY_HANDLE = `
  query byHandle($q: String!) {
    products(first: 50, query: $q) {
      nodes { id handle descriptionHtml }
    }
  }
`;

const BY_SKU = `
  query bySku($q: String!) {
    productVariants(first: 10, query: $q) {
      nodes { sku product { id handle descriptionHtml } }
    }
  }
`;

const SET_DESCRIPTION = `
  mutation setDescription($input: ProductInput!) {
    productUpdate(input: $input) {
      product { id }
      userErrors { field message }
    }
  }
`;

const DIGESTS = `
  query digests($ids: [ID!]!) {
    translatableResourcesByIds(first: 50, resourceIds: $ids) {
      nodes {
        resourceId
        translatableContent { key digest }
        translations(locale: "${LOCALE}") { key value outdated }
      }
    }
  }
`;

const REGISTER = `
  mutation register($resourceId: ID!, $translations: [TranslationInput!]!) {
    translationsRegister(resourceId: $resourceId, translations: $translations) {
      translations { key locale }
      userErrors { field message }
    }
  }
`;

/* ──────────────────────────────── helpers ──────────────────────────────── */

const chunk = (arr, n) =>
  Array.from({length: Math.ceil(arr.length / n)}, (_, i) =>
    arr.slice(i * n, i * n + n),
  );

/** Shopify's search syntax needs the value quoted; handles never contain quotes. */
const orHandles = (handles) => handles.map((h) => `handle:'${h}'`).join(' OR ');

/* ───────────────────────────────── main ────────────────────────────────── */

async function main() {
  const env = await loadEnv();
  const domain = adminDomain(env);
  if (!domain) throw new Error('Set SHOPIFY_ADMIN_DOMAIN in .env');

  let items = JSON.parse(await readFile(DATA, 'utf8'));
  if (ONLY) {
    items = items.filter((i) => i.sku === ONLY || i.handle === ONLY);
    if (!items.length) throw new Error(`--only ${ONLY} matched nothing in the file`);
  }
  if (LIMIT) items = items.slice(0, LIMIT);

  const token = await getToken(env, domain);

  console.log(`Shop:    ${domain}`);
  console.log(`Locale:  ${LOCALE} (secondary; en is primary)`);
  console.log(`Phases:  ${[wantEnglish && 'english', wantArabic && 'arabic'].filter(Boolean).join(' then ')}`);
  console.log(`Mode:    ${APPLY ? 'APPLY' : 'dry run (pass --apply to write)'}`);
  console.log(`Records: ${items.length}\n`);

  const scopes = await grantedScopes(domain, token);
  if (scopes) {
    const need = ['write_products'];
    if (wantArabic) need.push('read_translations', 'write_translations');
    const missing = need.filter((n) => !scopes.includes(n));
    if (missing.length) {
      console.error(
        `This token is missing: ${missing.join(', ')}\n\n` +
          `Ticking the box in the app's Configuration tab is not enough — the\n` +
          `grant is fixed at install time. In Shopify admin:\n` +
          `  Settings → Apps and sales channels → Develop apps → <your app>\n` +
          `  → Configuration → confirm the scopes are saved\n` +
          `  → then click "Install app" / "Update app" at the top right\n` +
          `  → API credentials tab → copy the Admin API access token\n` +
          `  → paste it into .env as SHOPIFY_ADMIN_API_ACCESS_TOKEN\n`,
      );
      process.exitCode = 1;
      return;
    }
  }

  /* ── resolve every record to a product id ─────────────────────────────── */

  const byHandle = new Map();
  for (const group of chunk(items, 40)) {
    const data = await graphql(domain, token, BY_HANDLE, {
      q: orHandles(group.map((g) => g.handle)),
    });
    for (const n of data.products.nodes) byHandle.set(n.handle, n);
  }

  const resolved = [];
  const unmatched = [];
  for (const item of items) {
    let node = byHandle.get(item.handle);
    if (!node && item.sku) {
      const data = await graphql(domain, token, BY_SKU, {q: `sku:'${item.sku}'`});
      const hit = data.productVariants.nodes.find((v) => v.sku === item.sku);
      if (hit) node = hit.product;
    }
    if (node) resolved.push({...item, id: node.id, liveHtml: node.descriptionHtml || ''});
    else unmatched.push(item);
  }

  console.log(`Matched: ${resolved.length}   unmatched: ${unmatched.length}`);
  if (unmatched.length) {
    console.log('\nNot found in Shopify by handle or SKU — skipped:');
    for (const u of unmatched) console.log(`  ${u.sku}  ${u.handle}  ${u.nameAr}`);
    console.log('');
  }
  if (!resolved.length) return;

  /* ── phase 1: English onto the product ────────────────────────────────── */

  let enWritten = 0;
  let enSame = 0;
  let enFailed = 0;

  if (wantEnglish) {
    console.log('\n── English descriptions ──');
    for (const item of resolved) {
      if (item.liveHtml.trim() === item.descriptionHtmlEn.trim()) {
        enSame++;
        if (VERBOSE) console.log(`  = ${item.handle}`);
        continue;
      }
      if (!APPLY) {
        enWritten++;
        console.log(
          `  ~ ${item.handle}  (${item.liveHtml.length} → ${item.descriptionHtmlEn.length} chars)`,
        );
        continue;
      }
      try {
        const data = await graphql(domain, token, SET_DESCRIPTION, {
          input: {id: item.id, descriptionHtml: item.descriptionHtmlEn},
        });
        const errs = data.productUpdate.userErrors;
        if (errs.length) {
          enFailed++;
          console.error(`  ! ${item.handle}: ${errs.map((e) => e.message).join('; ')}`);
        } else {
          enWritten++;
          if (VERBOSE) console.log(`  ✓ ${item.handle}`);
        }
      } catch (e) {
        enFailed++;
        console.error(`  ! ${item.handle}: ${e.message}`);
      }
    }
    console.log(
      `English: ${enWritten} ${APPLY ? 'written' : 'would change'}, ${enSame} already correct, ${enFailed} failed`,
    );
  }

  /* ── phase 2: Arabic, against the digest the English now has ──────────── */

  let arWritten = 0;
  let arSame = 0;
  let arFailed = 0;

  if (wantArabic) {
    console.log('\n── Arabic translations ──');

    // Read digests NOW, after the English write, never before it.
    const digest = new Map();
    const existing = new Map();
    for (const group of chunk(resolved, 50)) {
      const data = await graphql(domain, token, DIGESTS, {
        ids: group.map((g) => g.id),
      });
      for (const n of data.translatableResourcesByIds.nodes) {
        const body = n.translatableContent.find((c) => c.key === 'body_html');
        if (body) digest.set(n.resourceId, body.digest);
        const tr = n.translations.find((t) => t.key === 'body_html');
        if (tr) existing.set(n.resourceId, tr);
      }
    }

    for (const item of resolved) {
      const d = digest.get(item.id);
      if (!d) {
        arFailed++;
        console.error(`  ! ${item.handle}: no body_html digest returned`);
        continue;
      }
      const cur = existing.get(item.id);
      if (cur && !cur.outdated && cur.value.trim() === item.descriptionHtmlAr.trim()) {
        arSame++;
        if (VERBOSE) console.log(`  = ${item.handle}`);
        continue;
      }
      if (!APPLY) {
        arWritten++;
        console.log(
          `  ~ ${item.handle}  (${cur ? `${cur.value.length} chars${cur.outdated ? ', outdated' : ''}` : 'none'} → ${item.descriptionHtmlAr.length} chars)`,
        );
        continue;
      }
      try {
        const data = await graphql(domain, token, REGISTER, {
          resourceId: item.id,
          translations: [
            {
              locale: LOCALE,
              key: 'body_html',
              value: item.descriptionHtmlAr,
              translatableContentDigest: d,
            },
          ],
        });
        const errs = data.translationsRegister.userErrors;
        if (errs.length) {
          arFailed++;
          console.error(`  ! ${item.handle}: ${errs.map((e) => e.message).join('; ')}`);
        } else {
          arWritten++;
          if (VERBOSE) console.log(`  ✓ ${item.handle}`);
        }
      } catch (e) {
        arFailed++;
        console.error(`  ! ${item.handle}: ${e.message}`);
      }
    }
    console.log(
      `Arabic: ${arWritten} ${APPLY ? 'written' : 'would change'}, ${arSame} already correct, ${arFailed} failed`,
    );
  }

  console.log(
    `\nDone.${APPLY ? '' : ' Nothing was written — add --apply.'}${
      enFailed + arFailed ? ` ${enFailed + arFailed} failures above.` : ''
    }`,
  );
  if (enFailed + arFailed) process.exitCode = 1;
}

main().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
