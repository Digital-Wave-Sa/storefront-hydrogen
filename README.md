# Saadeddin Storefront

Headless storefront for Saadeddin Pastry, built on **Shopify Hydrogen** and deployed to
**Shopify Oxygen**. Bilingual (Arabic default, English under `/en`), with branch-aware
inventory, a loyalty programme, a store-credit wallet and a custom-cake builder.

This replaces the stock Hydrogen skeleton README, which described a Remix-based
template and Node 18 — neither of which matches this project.

---

## Table of contents

1. [Requirements](#1-requirements)
2. [Versions](#2-versions)
3. [First-time setup](#3-first-time-setup)
4. [Everyday commands](#4-everyday-commands)
5. [Environment variables](#5-environment-variables)
6. [External services](#6-external-services)
7. [Project layout](#7-project-layout)
8. [Build and deploy](#8-build-and-deploy)
9. [Before you ship](#9-before-you-ship)
10. [Troubleshooting](#10-troubleshooting)

---

## 1. Requirements

| Tool | Version | Notes |
|---|---|---|
| Node.js | **^22 or ^24** | Enforced by `engines` in `package.json`. Node 20 and below will not run this build. |
| npm | 10.x | Ships with Node 22. |
| Shopify CLI | 3.93.2 | Installed as a dev dependency — no global install needed. |
| Git | any recent | |

Check your Node version before anything else:

```bash
node -v      # must print v22.x or v24.x
```

If it prints something else, install Node 22 LTS (via [nvm](https://github.com/nvm-sh/nvm),
[fnm](https://github.com/Schniz/fnm), or the installer from nodejs.org) and re-run.

> **Package manager note.** `package.json` declares
> `"packageManager": "yarn@4.16.0"`, but the repository contains a
> **`package-lock.json` and no `yarn.lock`** — the project is actually
> installed and built with **npm**. Use npm. The `packageManager` field is
> stale and should be removed or corrected so tooling like Corepack doesn't
> try to force Yarn.

---

## 2. Versions

Pinned exactly (no `^`) — these are the versions the project is known to build with:

| Package | Version |
|---|---|
| `@shopify/hydrogen` | 2026.4.2 |
| `react-router` / `react-router-dom` | 7.14.0 |
| `@react-router/dev` / `@react-router/fs-routes` | 7.14.0 |
| `@shopify/cli` | 3.93.2 |
| `@shopify/hydrogen-codegen` | 0.3.3 |
| `@shopify/mini-oxygen` | 4.1.0 |
| `@graphql-codegen/cli` | 5.0.2 |

Range-pinned (`^`) — the notable ones:

| Package | Range |
|---|---|
| `react` / `react-dom` | ^18.3.1 |
| `vite` | ^8.0.1 |
| `tailwindcss` + `@tailwindcss/vite` | ^4.1.6 |
| `typescript` | ^5.9.2 |
| `graphql` | ^16.10.0 |
| `three` / `@react-three/fiber` / `@react-three/drei` | ^0.184.0 / ^8.17.10 / ^9.114.3 |
| `nodemailer` | ^9.0.5 |
| `@playwright/test` | ^1.60.0 |

**Tailwind is v4**, configured through the Vite plugin — there is no
`tailwind.config.js`. Theme customisation lives in CSS.

**React Router 7 in framework mode**, not Remix. Route modules export
`loader` / `action` / `default`. Anything in older docs referring to
`@remix-run/*` does not apply here.

**Three.js** is present for the 3D cake builder; it is a large dependency and
the reason `node_modules` is heavy.

---

## 3. First-time setup

```bash
git clone <repository-url>
cd saad-al-deen-storefront

npm install                # installs from package-lock.json

# .env is not committed — get the values from a maintainer
# or from the Oxygen environment settings (see section 5)

npm run dev
```

The dev server starts on **http://localhost:3000**.

`.env` is gitignored and holds live credentials. **Never commit it**, and never
paste its contents into a chat, an issue or a pull request. If a secret is
exposed, rotate it in the issuing service rather than only removing it from the
file.

---

## 4. Everyday commands

| Command | What it does |
|---|---|
| `npm run dev` | Dev server on :3000 with GraphQL codegen watching |
| `npm run build` | Production build, runs codegen first |
| `npm run preview` | Builds, then serves the production bundle locally |
| `npm run typecheck` | `react-router typegen` then `tsc --noEmit` |
| `npm run lint` | ESLint over the repo |
| `npm run codegen` | Regenerates GraphQL types and route types once |

### Codegen matters here

`storefrontapi.generated.d.ts` and `customer-accountapi.generated.d.ts` are
generated from the `#graphql` tagged template literals in the source. Two
consequences worth knowing:

- **Every `#graphql` document in the project is validated together.** One
  malformed query fails the whole build, not just its own route.
- **A backtick inside a `#graphql` template literal terminates the literal.**
  Writing a field name in backticks inside a GraphQL comment produces a
  confusing parse error far from the real cause. Use plain words there.

---

## 5. Environment variables

No `.env.example` is committed. The names below are every variable the code
reads — get the values from a maintainer or from the Oxygen environment
settings.

`PUBLIC_*` variables are exposed to the browser. Everything else is
server-only and must never be referenced from client components.

### Shopify — required

```
PUBLIC_STORE_DOMAIN
PUBLIC_STOREFRONT_API_TOKEN
PUBLIC_STOREFRONT_ID
PUBLIC_CHECKOUT_DOMAIN
PUBLIC_SHOPIFY_STORE_DOMAIN
SESSION_SECRET
SHOPIFY_CLIENT_ID
SHOPIFY_CLIENT_SECRET
SHOPIFY_ADMIN_DOMAIN
SHOPIFY_ADMIN_CLIENT_ID
SHOPIFY_ADMIN_CLIENT_SECRET
SHOPIFY_ADMIN_API_ACCESS_TOKENS
SHOPIFY_STORE_DOMAIN
SHOPIFY_STOREFRONT_ACCESS_TOKEN
SHOPIFY_SHOP
SHOPIFY_MARKET_ID
```

The Admin API is used for per-location inventory, order history, discounts and
draft orders — the Storefront API cannot answer those. Admin credentials are
strictly server-side.

### Saadeddin backend services

```
MIDDLEWARE_URL              # default https://api.saadeddin.top
STORE_CREDIT_API_URL        # default https://sdgc.saadeddin.top
PUBLIC_SDLP_APP_URL         # loyalty, default https://sdlp.saadeddin.top
SDLP_APP_URL                # server-side alias of the above
CRM_API_URL
CRM_API_KEY
SAADEDDIN_CRM_API_URL
SAADEDDIN_CRM_API_KEY
CUSTOM_API_URL
```

### Messaging

```
SMS_API_URL
SMS_API_USERNAME
SMS_API_PASSWORD
SMTP_HOST
SMTP_PORT
SMTP_USER
SMTP_PASS
CONTACT_RECEIVER_EMAIL
```

### Social sign-in

```
GOOGLE_CLIENT_ID
GOOGLE_CLIENT_SECRET
FACEBOOK_CLIENT_ID
FACEBOOK_CLIENT_SECRET
APPLE_CLIENT_ID
```

### Maps and analytics

```
PUBLIC_GOOGLE_MAPS_KEY
PUBLIC_GOOGLE_PLACES_KEY
PUBLIC_GOOGLE_GEOCODING_KEY
PUBLIC_GOOGLE_DISTANCE_MATRIX_KEY
PUBLIC_GA4_MEASUREMENT_ID
PUBLIC_GTM_ID
PUBLIC_SMILE_CHANNEL_KEY
```

### Shipping and other

```
ARAMEX_USERNAME
ARAMEX_PASSWORD
ARAMEX_ACCOUNT_NUMBER
ARAMEX_ACCOUNT_PIN
ARAMEX_ACCOUNT_ENTITY
ARAMEX_ACCOUNT_COUNTRY_CODE
STOQ_MARKET_ID
NODE_ENV
```

---

## 6. External services

Four Saadeddin hosts sit behind the storefront. Confusing them has caused real
production bugs, so they are worth stating plainly:

| Host | Purpose | Configurable via |
|---|---|---|
| `api.saadeddin.top` | Order middleware; gift-card **codes and transaction history**, looked up by phone | `MIDDLEWARE_URL` |
| `sdgc.saadeddin.top` | Store credit — the **authoritative wallet balance**, looked up by customer id | `STORE_CREDIT_API_URL` |
| `sdlp.saadeddin.top` | Loyalty points and tiers | `PUBLIC_SDLP_APP_URL` |
| `wh.saadeddin.top` | Webhooks | hardcoded |

**The wallet balance comes from `sdgc`, keyed on the Shopify customer id.**
`api.saadeddin.top` supplies the card list and history only. The two services
can disagree; when they do, `fetchWalletData` logs
`[WALLET] Balance sources disagree …` and uses the store-credit figure.

`sdgc.saadeddin.top` is still hardcoded in `StoreCreditBalance.tsx`,
`GiftCardActivation.tsx`, `account.wallet.tsx` and the CSP in
`entry.server.tsx`. Only the server-side lookup honours
`STORE_CREDIT_API_URL`.

---

## 7. Project layout

```
app/
  components/         Shared UI (cart, header, product cards, account)
  routes/             File-based routes; ($locale). prefix = bilingual
  lib/                Server helpers, API clients, domain logic
  styles/             Global CSS (Tailwind v4)
  context/            React context (wishlist, …)
public/               Static assets
server.ts             Oxygen worker entry
vite.config.ts        Vite + Hydrogen + Oxygen + Tailwind + React Router
react-router.config.ts
.graphqlrc.ts         Codegen configuration
```

Routes named `($locale).*` serve Arabic at the root and English under `/en`.
Routes with `_` before a segment (`account_.login`) opt out of the parent
layout.

### Files worth knowing before you change anything

| File | Why |
|---|---|
| `lib/phone-validation.ts` | `toGiftCardPhone()` — the single canonical phone format for every gift-card/wallet call. Do not add a fourth phone helper. |
| `lib/account-wallet.server.ts` | Wallet balance resolution and the source-disagreement warning |
| `lib/loyalty.server.ts` | SDLP loyalty; returns `null`, never a fabricated `0` |
| `lib/stock.ts` + `lib/useBranchAvailability.ts` | Per-branch availability |
| `lib/offer-registry.server.ts` | Promotions are content: a `promotion_offer` metaobject per offer |
| `lib/offer-products.server.ts` | Shared offer resolution for `/promotions` and `/promotions/:offer` |
| `lib/digital-lines.ts` | Gift-card / non-shippable line detection |
| `lib/account-guard.server.ts` | `requireCustomer` / `requireAdmin` for privileged actions |

### Two conventions that are load-bearing

**Customer identity must match exactly.** Phone matching is `===` against a
canonical form — never `endsWith`, never "take the first search result".
Resolving the wrong customer has previously shown one shopper another's orders
and attributed draft orders to the wrong account. If no customer matches
exactly, the correct behaviour is to resolve nothing and log it.

**A failed lookup is not a zero.** Balances and loyalty points are
`number | null`. `null` renders as "unavailable"; it must not be coerced to `0`,
which states a false fact about the customer's money.

---

## 8. Build and deploy

```bash
npm run build      # runs codegen, then builds
npm run preview    # verify the production bundle locally
```

Deployment is to Shopify Oxygen, normally via the Hydrogen GitHub integration
on push to `main`. Environment variables are configured per-environment in the
Shopify admin, not in the repository.

The build output targets the Oxygen worker runtime (Cloudflare Workers-like) —
Node built-ins are not available at runtime unless explicitly polyfilled.

---

## 9. Before you ship

```bash
npm run typecheck
npm run lint
npm run build
```

Then check by hand:

- **Sign in as two different customers in turn.** Confirm each sees their own
  name, orders, wallet balance and loyalty points. Include one Saudi number
  (`+9665…` or `05…`) and one international number.
- **Place a custom cake order** and confirm the draft order is attributed to
  the signed-in customer. The server logs
  `[Custom Cake Order] Attributing draft order to gid://shopify/Customer/…`.
- **Switch branches** on a product grid and confirm out-of-stock products are
  marked unavailable.
- **Check the cart** shows the same wallet balance as `/account`.

Server log lines that indicate a problem — all of these should be absent in a
healthy run:

```
[Login] N customers share the phone …
[Login] CRM shopifyId … is not …. Ignoring it.
[Custom Cake Order] … none matched the signed-in shopper …
[WALLET] Balance sources disagree for …
[WALLET] totalBalance … does not match the sum of … card(s)
[OrderStats] … none matched exactly …
[offers] No ACTIVE discount found for /promotions/…
```

### Known items still outstanding

- `routes/gift-cards.$.tsx` is a **mock gift-card backend**, gated behind
  `import.meta.env.DEV`. Verify it 404s in a production build.
- Untracked inventory (`inventoryItem.tracked === false`) currently reads as
  available at every branch. Whether that is intended is a question for
  whoever manages the catalogue.
- `account_.recover.tsx` still takes `customers[0]` from an email search.
- International numbers cannot receive OTP — the SMS provider rejects
  non-`+966`.

---

## 10. Troubleshooting

**`Unsupported engine` on install** — you are not on Node 22 or 24. See
section 1.

**Corepack tries to use Yarn** — the stale `packageManager` field. Use
`npm install` regardless; consider removing that field.

**Codegen fails with a parse error in a file you didn't touch** — all
`#graphql` documents validate together. Check for an unbalanced brace, or a
backtick inside a GraphQL comment, in your own changes.

**A route renders blank with no error** — check the browser console for
`Rendered more hooks than during the previous render`. A hook placed after an
early return crashes the whole section, and the error boundary hides it.

**Windows line endings** — the working tree uses CRLF. Configure your editor to
preserve them, or diffs become unreadable.

**Changes to promotions don't appear** — offers are cached for five minutes.
Wait, or restart the dev server.
