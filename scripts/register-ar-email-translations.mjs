/**
 * Register the Arabic notification-email translations with Shopify.
 *
 *   node scripts/register-ar-email-translations.mjs            # dry run
 *   node scripts/register-ar-email-translations.mjs --apply    # write
 *
 * Why a script rather than the admin UI: the order-confirmation body is 285KB
 * of Liquid, and a translation has to be registered against the exact digest of
 * the English source. Both are things a machine should carry, not a person.
 *
 * Why a script rather than something run remotely: it needs the Admin API
 * token, which lives in your .env and should stay there.
 *
 * Each translation carries the `digest` of the English content it was made
 * from. If someone later edits the English template, the digest changes and
 * Shopify drops the translation rather than showing stale Arabic next to new
 * English — so a failed match here means "re-translate", not "force it".
 */
import {readFile} from 'node:fs/promises';
import {dirname, join} from 'node:path';
import {fileURLToPath} from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const TRANSLATIONS_DIR = join(HERE, 'translations');
const API_VERSION = '2024-07';
const LOCALE = 'ar';
const APPLY = process.argv.includes('--apply');

/** Minimal .env reader — no dependency, and it ignores anything exported already. */
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

/**
 * A direct token if there is one, otherwise the same client-credentials
 * exchange app/lib/shopify-admin.server.ts uses.
 */
async function getToken(env, domain) {
  const direct =
    env.SHOPIFY_ADMIN_API_ACCESS_TOKEN || env.SHOPIFY_ADMIN_API_ACCESS_TOKENS;
  if (direct) return direct;

  const clientId = env.SHOPIFY_CLIENT_ID || env.SHOPIFY_ADMIN_CLIENT_ID;
  const clientSecret = env.SHOPIFY_CLIENT_SECRET || env.SHOPIFY_ADMIN_CLIENT_SECRET;
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
    throw new Error(`Token exchange failed: ${data.error_description || data.error || res.status}`);
  }
  return data.access_token;
}

/**
 * What the token can actually do.
 *
 * Adding a scope in the app's Configuration tab does NOT upgrade a token that
 * was already issued: the grant is baked in when the app is installed. So a
 * freshly ticked `read_translations` still fails until the app is re-installed
 * (Configuration -> Install/Update app) and, for a static token, the NEW token
 * is copied into .env. Printing the granted list turns that from a guess into
 * a fact.
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

async function graphql(domain, token, query, variables) {
  const res = await fetch(`https://${domain}/admin/api/${API_VERSION}/graphql.json`, {
    method: 'POST',
    headers: {'Content-Type': 'application/json', 'X-Shopify-Access-Token': token},
    body: JSON.stringify({query, variables}),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text()}`);
  const json = await res.json();
  if (json.errors?.length) throw new Error(json.errors.map((e) => e.message).join('; '));
  return json.data;
}

const REGISTER = `
  mutation RegisterTranslations($resourceId: ID!, $translations: [TranslationInput!]!) {
    translationsRegister(resourceId: $resourceId, translations: $translations) {
      translations { key locale }
      userErrors { field message }
    }
  }
`;

/**
 * The digest recorded in the manifest, checked against what Shopify holds now.
 * A mismatch means the English template changed after the Arabic was written:
 * registering anyway would attach a translation Shopify then refuses to use.
 */
const DIGESTS = `
  query Digests($ids: [ID!]!) {
    translatableResourcesByIds(first: 50, resourceIds: $ids) {
      nodes { resourceId translatableContent { key digest } }
    }
  }
`;

async function main() {
  const env = await loadEnv();
  const domain = adminDomain(env);
  if (!domain) throw new Error('Set SHOPIFY_ADMIN_DOMAIN in .env');

  const manifest = JSON.parse(
    await readFile(join(TRANSLATIONS_DIR, 'manifest.json'), 'utf8'),
  );
  const token = await getToken(env, domain);

  console.log(`Shop:   ${domain}`);
  console.log(`Locale: ${LOCALE}`);
  console.log(`Mode:   ${APPLY ? 'APPLY' : 'dry run (pass --apply to write)'}`);
  console.log(
    `Token:  ${
      env.SHOPIFY_ADMIN_API_ACCESS_TOKEN || env.SHOPIFY_ADMIN_API_ACCESS_TOKENS
        ? 'static, from .env'
        : 'exchanged via client credentials'
    }\n`,
  );

  const scopes = await grantedScopes(domain, token);
  if (scopes) {
    const need = ['read_translations', 'write_translations'];
    const missing = need.filter((n) => !scopes.includes(n));
    console.log(`Granted scopes (${scopes.length}): ${scopes.join(', ')}\n`);
    if (missing.length) {
      console.error(
        `This token is missing: ${missing.join(', ')}\n\n` +
          `Ticking the box in the app's Configuration tab is not enough -- the\n` +
          `grant is fixed at install time. In Shopify admin:\n` +
          `  Settings -> Apps and sales channels -> Develop apps -> <your app>\n` +
          `  -> Configuration -> confirm both scopes are saved\n` +
          `  -> then click "Install app" / "Update app" at the top right\n` +
          `  -> API credentials tab -> copy the Admin API access token\n` +
          `  -> paste it into .env as SHOPIFY_ADMIN_API_ACCESS_TOKEN\n`,
      );
      process.exitCode = 1;
      return;
    }
  } else {
    console.log('Could not read granted scopes (continuing anyway).\n');
  }

  const live = await graphql(domain, token, DIGESTS, {
    ids: manifest.map((m) => m.resourceId),
  });
  const liveDigests = new Map();
  for (const node of live.translatableResourcesByIds.nodes) {
    for (const c of node.translatableContent) {
      liveDigests.set(`${node.resourceId}|${c.key}`, c.digest);
    }
  }

  let failures = 0;
  for (const entry of manifest) {
    console.log(`── ${entry.template}`);
    const payload = [];

    for (const t of entry.translations) {
      const current = liveDigests.get(`${entry.resourceId}|${t.key}`);
      if (current !== t.digest) {
        console.log(
          `   ✗ ${t.key}: the English source has changed since this was translated.\n` +
            `     manifest ${t.digest?.slice(0, 12)}…  live ${current?.slice(0, 12)}…\n` +
            `     Re-translate from the current English before registering.`,
        );
        failures++;
        continue;
      }
      const value = t.file
        ? await readFile(join(TRANSLATIONS_DIR, t.file), 'utf8')
        : t.value;
      console.log(`   ✓ ${t.key}  (${value.length.toLocaleString()} chars)`);
      payload.push({
        key: t.key,
        locale: LOCALE,
        value,
        translatableContentDigest: t.digest,
      });
    }

    if (!payload.length) {
      console.log('   nothing to send\n');
      continue;
    }
    if (!APPLY) {
      console.log('   (dry run — not sent)\n');
      continue;
    }

    const data = await graphql(domain, token, REGISTER, {
      resourceId: entry.resourceId,
      translations: payload,
    });
    const errs = data.translationsRegister.userErrors;
    if (errs.length) {
      console.log(`   ✗ ${errs.map((e) => e.message).join('; ')}\n`);
      failures++;
    } else {
      console.log(`   registered ${data.translationsRegister.translations.length} translation(s)\n`);
    }
  }

  if (failures) {
    console.error(`Finished with ${failures} problem(s).`);
    process.exitCode = 1;
  } else {
    console.log(APPLY ? 'Done.' : 'Dry run clean — re-run with --apply to write.');
  }
}

main().catch((err) => {
  console.error(err.message);
  process.exitCode = 1;
});
