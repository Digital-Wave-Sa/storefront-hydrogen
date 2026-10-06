# Checkout functions — Saadeddin custom app

> **Status (4 Oct 2026):** both functions are deployed in a separate app,
> «Saadeddin Checkout Rules» — see `saadeddin-checkout-rules/README.md`. The
> manual steps below are kept for reference only.


Two Shopify Functions for the custom app **Saad Al Deen Store Access**. Nothing
in this folder is part of the Hydrogen storefront; it is copied into the app
project and deployed with Shopify CLI.

| Function | Type | What it does |
|---|---|---|
| `free-delivery-without-gift-cards` | Delivery customization | Free delivery counts merchandise only. 8 SAR + 1000 SAR gift card → 19 SAR delivery. |
| `pickup-chosen-branch` | Local pickup option generator (Plus) | Checkout offers only the branch chosen on the site, with the chosen date and slot instead of «جاهز عادةً خلال ٢٤ ساعة». |

Each folder holds only the `src/` files that carry the logic. The CLI
generates everything else (toml, schema, package.json) so it matches your CLI
version.

---

## One-time setup

You need Node 20+ and Shopify CLI:

```
npm install -g @shopify/cli@latest
```

### 1. Create the app project, linked to the existing app

Next to the storefront folder (not inside it):

```
cd C:\Users\ASUS\Desktop\saadaldeen-hydrogen
shopify app init
```

- Choose **Build an extension-only app**. Name: `saadeddin-checkout-app`.
- When asked whether to create a new app, choose **No** and pick
  **Saad Al Deen Store Access**.

Then, inside it:

```
cd saadeddin-checkout-app
shopify app config link
```

Pick **Saad Al Deen Store Access** again. This writes `shopify.app.toml`
with the app's current settings.

### 2. Check the scopes before anything else

Open `shopify.app.toml` and find `[access_scopes]`. The `scopes` line must
already list what the storefront uses today (orders, fulfillment orders,
customers, locations, inventory…). **If it is short or empty, stop and send
it to Claude** — deploying a short list would remove permissions the site
depends on.

Add these two to the existing list (comma-separated, nothing removed):

```
read_delivery_customizations,write_delivery_customizations
```

### 3. Generate the two extensions

```
shopify app generate extension --template delivery_customization --name free-delivery-without-gift-cards --flavor vanilla-js
shopify app generate extension --template local_pickup_delivery_option_generator --name pickup-chosen-branch --flavor vanilla-js
```

### 4. Copy the logic in

From the storefront repo's `shopify-functions` folder into the app's
`extensions` folder, replacing the generated files:

```
copy /Y ..\saad-al-deen-storefront\shopify-functions\free-delivery-without-gift-cards\src\* extensions\free-delivery-without-gift-cards\src\
copy /Y ..\saad-al-deen-storefront\shopify-functions\pickup-chosen-branch\src\* extensions\pickup-chosen-branch\src\
```

**Check the delivery customization file names.** Open
`extensions\free-delivery-without-gift-cards\shopify.extension.toml`:

- `target = "cart.delivery-options.transform.run"` — the copied files match.
  Delete any generated `run.js` / `run.graphql` left beside them, and make
  `input_query` point to `src/cart_delivery_options_transform_run.graphql`.
- `target = "purchase.delivery-customization.run"` (older CLI) — tell Claude;
  the output names differ (`hide` instead of `deliveryOptionHide`).

### 5. Generate types (this catches any schema mismatch)

```
cd extensions\free-delivery-without-gift-cards
npm install
npm run typegen
cd ..\pickup-chosen-branch
npm install
npm run typegen
cd ..\..
```

Any error here → send it to Claude before deploying.

### 6. Deploy

```
shopify app deploy
```

Confirm the release. It installs on the store automatically (custom app).

---

## Switching them on

### Free delivery without gift cards

From the **storefront repo** root (it reads the app credentials from `.env`):

```
node scripts/activate-checkout-functions.mjs
node scripts/activate-checkout-functions.mjs --apply
```

The first run only looks. The second creates and enables the customization
with a 299 SAR threshold.

**Then tell Claude.** The Standard Delivery rate still stops at 298.99, so a
big order with a gift card would have no paid option to fall back on. Claude
removes that cap once the function is live. Do not remove it before: without
the function, both rates would show on big orders.

### Pickup at the chosen branch

Shopify admin → **Settings → Shipping and delivery** → local pickup →
activate the pickup service connected to **pickup-chosen-branch**.

Then check one pickup checkout from the site:

- **Only the chosen branch is listed, with «الاستلام: …»** → done.
- **Shopify's own list still appears next to it** → tell Claude before
  leaving it on.

---

## Test carts

| Cart | Expected at checkout |
|---|---|
| 8 SAR product + 1000 SAR gift card, delivery | Standard Delivery **19 SAR** |
| 300 SAR of products, delivery | **Free Delivery** |
| 300 SAR of products + gift card, delivery | **Free Delivery** |
| Pickup at Al Qurayyat, 6 Oct, 2–3 PM | Only Al Qurayyat · «الاستلام: الثلاثاء 6 أكتوبر، 2:00 م - 3:00 م» |

## Turning them off

- Free delivery: Settings → Shipping and delivery → Delivery customizations →
  turn it off, **and** ask Claude to put the 298.99 cap back on Standard.
- Pickup: deactivate the pickup service in the same settings page.
