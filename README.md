# Saadeddin Storefront

Headless storefront for Saadeddin Pastry, built on **Shopify Hydrogen** and deployed to
**Shopify Oxygen**. Bilingual (Arabic default, English under `/en`), with branch-aware
inventory, a loyalty programme, a store-credit wallet and a custom-cake builder.

---

## Table of contents

1. [Requirements](#1-requirements)
2. [Versions](#2-versions)
3. [First-time setup](#3-first-time-setup)
4. [Everyday commands](#4-everyday-commands)
5. [Environment variables](#5-environment-variables)
6. [External services](#6-external-services)
7. [Project layout](#7-project-layout)
8. [Documentation](#8-documentation)
9. [Build and deploy](#9-build-and-deploy)
10. [Before you ship](#10-before-you-ship)
11. [Troubleshooting](#11-troubleshooting)

---

## 1. Requirements

| Tool | Version | Notes |
|---|---|---|
| Node.js | **^22 or ^24** | Enforced by `engines` in `package.json`. Node 20 and below will not run this build. |
| npm | 10.x | Ships with Node 22. The repo has a `package-lock.json` and no `yarn.lock`. |
| Shopify CLI | 3.93.2 | Installed as a dev dependency — no global install needed. |
| Git | any recent | |

Check your Node version before anything else:

```bash
node -v      # must print v22.x or v24.x
```

If it prints something else, install Node 22 LTS (via [nvm](https://github.com/nvm-sh/nvm),
[fnm](https://github.com/Schniz/fnm), or the installer from nodejs.org) and re-run.

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

cp .env.example .env       # then fill in the values
npm run dev
```

The dev server starts on **http://localhost:3000**.

`.env.example` lists every variable the code reads, grouped by purpose, with
notes on which ones matter for which feature. It contains **names only** — get
the values from a maintainer or from the Oxygen environment settings in the
Shopify admin.

`.env` is gitignored and holds live credentials. **Never commit it**, and never
paste its contents into a chat, an issue or a pull request. If a secret is
exposed, rotate it in the issuing service rather than only removing it from the
file.

---

## 4. Everyday commands

| Command | What it does |
|---|---|
| `npm run dev` | Dev server on :3000 with GraphQL codegen watching |
| `npm run build` | Production build, runs codegen |
| `npm run preview` | Builds, then serves the production bundle locally |
| `npm run typecheck` | `react-router typegen` then `tsc --noEmit` |
| `npm run lint` | ESLint over the repo |
| `npm run codegen` | Regenerates GraphQL types and route types once |

### Codegen matters here

`storefrontapi.generated.d.ts` and `customer-accountapi.generated.d.ts` are
generated from the `#graphql` tagged template literals in the source. Three
rules follow from that:

- **Every `#graphql` document in the project is validated together.** One
  malformed query fails the whole build, not just its own route.

- **Operation names must be unique across the entire project.** Two routes
  cannot both declare `query GetOrder`. Codegen reports only the first
  collision it finds, so a batch of duplicates surfaces one at a time. Name
  operations after their route — `GetOrderForInvoice`, not `GetOrder`.

- **A backtick inside a `#graphql` template literal terminates the literal.**
  Writing a field name in backticks inside a GraphQL comment produces a
  confusing parse error far from the real cause. Use plain words there.

Note that `npm run build` prints `✓ built` for the client and SSR bundles
**before** codegen runs. A codegen failure appears after those lines, in a box
at the very end. Read to the bottom of the output.

---

## 5. Environment variables

**`.env.example` is the source of truth** — it lists every variable the code
reads, with inline notes. This section covers only what that file cannot say
for itself.

`PUBLIC_*` variables are exposed to the browser. Everything else is server-only
and must never be referenced from a client component.

Oxygen caps a project at **110 custom environment variables**; this project uses
roughly 60.

### Email needs care on Oxygen

`sendEmail` tries three transports in order and returns `false`, silently, if
all three are unavailable:

1. **SMTP via nodemailer** — needs raw TCP sockets, which Oxygen's workerd
   runtime does not provide. **This path can never succeed on Oxygen.** It works
   locally and on Node hosts.
2. **Microsoft Graph** — plain HTTPS. Needs `GRAPH_TENANT_ID`,
   `GRAPH_CLIENT_ID`, `GRAPH_CLIENT_SECRET`.
3. **Resend** — plain HTTPS. Needs `RESEND_API_KEY`.

**On Oxygen, configure Graph or Resend.** SMTP alone will not deliver there, so
without one of the HTTPS transports the contact form, custom request, corporate
enquiry and back-in-stock alerts have no way to send.

---

## 6. External services

Several hosts sit behind the storefront. They serve different purposes and are
not interchangeable:

| Host | Purpose | Configurable via |
|---|---|---|
| `api.saadeddin.top` | Order middleware; gift-card **codes and transaction history**, looked up by phone | `MIDDLEWARE_URL` |
| `sdgc.saadeddin.top` | Store credit — the **authoritative wallet balance**, looked up by customer id | `STORE_CREDIT_API_URL` |
| `sdlp.saadeddin.top` | Loyalty points and tiers | `PUBLIC_SDLP_APP_URL` |
| `saadeddinpastry.com/shopifyAPI` | CRM / ERP order and customer sync | hardcoded |
| `app.stoqapp.com` | Back-in-stock signups | hardcoded |
| `wh.saadeddin.top` | Webhooks | hardcoded |

**The wallet balance comes from `sdgc`, keyed on the Shopify customer id.**
`api.saadeddin.top` supplies the card list and history only. The two services
can disagree; when they do, `fetchWalletData` logs
`[WALLET] Balance sources disagree …` and uses the store-credit figure.

Store credit is read and redeemed through **`/api/store-credit`**, which
resolves the customer from the session. Browser components never send a customer
id.

**Loyalty is the only service with timeouts** — 3s on read, 5s on live balance,
8s on deduct. Nothing else has a timeout or a retry.

---

## 7. Project layout

```
app/
  components/         Shared UI (cart, header, product cards, account)
  routes/             File-based routes; ($locale). prefix = bilingual
  lib/                Server helpers, API clients, domain logic
  styles/             Global CSS (Tailwind v4)
  context/            React context (wishlist, …)
guides/               Client and developer documentation (see §8)
public/               Static assets
server.ts             Oxygen worker entry
vite.config.ts        Vite + Hydrogen + Oxygen + Tailwind + React Router
react-router.config.ts
.graphqlrc.ts         Codegen configuration
.env.example          Every environment variable, with notes
```

Routes named `($locale).*` serve Arabic at the root and English under `/en`.
Routes with `_` before a segment (`account_.login`) opt out of the parent
layout.

### Files worth knowing before you change anything

| File | Why |
|---|---|
| `lib/phone-validation.ts` | `toGiftCardPhone()` — the single canonical phone format for every gift-card/wallet call. Do not add a fourth phone helper. |
| `lib/session-identity.server.ts` | `resolveSelf()` — who is asking. Personal-data routes derive the customer from the session, never from a query parameter. |
| `lib/account-guard.server.ts` | `requireCustomer` / `requireAdmin` for privileged actions. Guarding is a property of the request, not the page — `action` runs on POST and `loader` does not. |
| `lib/account-wallet.server.ts` | Wallet balance resolution and the source-disagreement warning |
| `routes/api.store-credit.tsx` | Session-authenticated store-credit read and redeem |
| `lib/loyalty.server.ts` | SDLP loyalty. Returns `null` when a balance cannot be established, never `0` |
| `lib/stock.ts` + `lib/useBranchAvailability.ts` | Per-branch availability, with batching, retry and a `pending` state |
| `lib/offer-registry.server.ts` | Promotions are content: a `promotion_offer` metaobject per offer |
| `lib/offer-products.server.ts` | Shared offer resolution for `/promotions` and `/promotions/:offer` |
| `lib/offer-tags.ts` | Which product tags belong to which offer — mirrored by the mobile app |
| `lib/digital-lines.ts` | Gift-card / non-shippable line detection |

### Three conventions that are load-bearing

**Customer identity must match exactly.** Phone matching is `===` against a
canonical form — never `endsWith`, never "take the first search result".
Shopify's customer search is fuzzy, so a loose match can return someone else. If
no customer matches exactly, resolve nothing and log it.

**A failed lookup is not a zero.** Balances and loyalty points are
`number | null`. `null` renders as "unavailable"; it must not be coerced to `0`,
which states a false fact about the customer's money. This applies at every
layer — a server route that correctly returns `null` is undone by a component
that renders `balance ?? 0`.

**A swallowed error is a lie to the customer.** Do not catch a failure, log a
warning and return success. If an operation did not happen, the response must
say so — a shopper told their code was sent, or their message delivered, will
act on that.

---

## 8. Documentation

`guides/` holds documentation written for two audiences.

**For whoever runs the store in Shopify admin:**

| Document | Covers |
|---|---|
| `1 - Product Tags Guide` | Every tag the storefront reads, what each does, exact spellings including Arabic, and the matching traps |
| `2 - Product Metafields Guide` | The 16 product metafields that work, what to enter, what empty means — and the 5 that exist but nothing reads |
| `3 - Branch Settings Guide` | Location metafields, verified against live branch data |
| `4 - Metaobjects Guide` | Home page banners, offers pages, cake builder — including how to add a new offer without a deploy |
| `5 - Order Status Tags` | The vocabulary the ERP must write on an order for the tracking timeline to work |

**For the development team:**

| Document | Covers |
|---|---|
| `5 - Configuration Issues (Developer Reference)` | Technical reference: how metafield and tag names in the code map to the Shopify store, where they differ, and a suggested order of work |

These were written from the code, a Shopify product export and live branch
data. When you change how a tag or metafield is read, update the matching
guide — documentation that misdescribes the system is worse than none.

---

## 9. Build and deploy

```bash
npm run build      # builds, then runs codegen
npm run preview    # verify the production bundle locally
```

Deployment is to Shopify Oxygen. Environment variables are configured
per-environment in the Shopify admin, not in the repository.

### Oxygen runtime limits

The build targets the Oxygen worker runtime (Cloudflare workerd). Node built-ins
are not available unless explicitly polyfilled.

| Limit | Value | Current |
|---|---|---|
| Bundle size | 10 MB | ~2.7 MB |
| Worker memory | 128 MB | |
| Startup time | 400 ms | a large bundle is the usual cause of a failed first deploy |
| CPU per request | 30 s | |
| Outbound request | 2 min | |
| Environment variables | 110 | ~60 |

---

## 10. Before you ship

```bash
npm run typecheck
npm run lint
npm run build
```

`npm run typecheck` reports errors that predate any individual change, and they
do not block the build — Vite strips types without checking them. Judge a change
by whether it *adds* errors, not by the total.

Then check by hand:

- **Sign in as two different customers in turn.** Confirm each sees their own
  name, orders, wallet balance and loyalty points. Include two numbers that
  differ only in formatting (`+9665…` and `05…`).
- **Register with a wrong verification code.** It must fail and create nothing.
- **Register with a correct code.** It must still succeed.
- **Place a custom cake order** and confirm the draft order is attributed to
  the signed-in customer. The server logs
  `[Custom Cake Order] Attributing draft order to gid://shopify/Customer/…`.
- **Switch branches** on a product grid and confirm out-of-stock products are
  marked unavailable, and that Add to Cart does not briefly offer them.
- **Check the cart, the account header and the wallet page** all show the same
  balance — and all show "unavailable" together if the service is down.
- **Confirm `/api/store-credit`** returns a balance when signed in and 401 when
  not.
- **Confirm the development-only gift-card routes 404** in a production build.

Log lines worth monitoring. All of these should be absent in a healthy run:

```
[Login] N customers share the phone …
[Login] CRM shopifyId … is not …. Ignoring it.
[Login] OTP send failed: …
[Custom Cake Order] … none matched the signed-in shopper …
[WALLET] Balance sources disagree for …
[WALLET] totalBalance … does not match the sum of … card(s)
[StoreCredit] Lookup returned … / Lookup failed: …
[SDLP Loyalty] GET Fetch aborted/failed …
[Loyalty] ROLLBACK FAILED — unredeemed discount code is live:
[OrderStats] … none matched exactly …
[CRM] ⚠️ Live CRM returned 401 …
[offers] No ACTIVE discount found for /promotions/…
```

`[Loyalty] ROLLBACK FAILED` is the one to alert on — it means a discount code
was created and the points were never deducted.

---

## 11. Troubleshooting

**`Unsupported engine` on install** — you are not on Node 22 or 24. See
section 1.

**Build prints `✓ built` then fails** — that is codegen, which runs after the
bundles. Read the box at the very bottom of the output.

**`Not all operations have an unique name`** — two `#graphql` documents declare
the same operation. Rename one after its route. Codegen reports one collision
at a time, so expect to repeat this if several were introduced together.

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

**A wallet or loyalty figure reads "unavailable"** — that is correct behaviour
for a failed lookup, not a bug. Check the `[WALLET]`, `[StoreCredit]` or
`[SDLP Loyalty]` log lines to find which service did not answer.
