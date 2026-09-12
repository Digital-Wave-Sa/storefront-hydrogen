# Delivery customization — keep the branch's fee

A Shopify Function that hides the standard shipping rate at checkout whenever
the branch's own local delivery option is available, so the shopper is charged
the fee their branch actually charges.

Two files here go into a Shopify app; nothing in this folder is part of the
Hydrogen storefront and nothing imports it.

---

## Why it exists

Branch delivery fees are Shopify **Local delivery**, set per location. When a
shopper's address falls inside a branch's delivery area, checkout offers both
that branch's local delivery AND the shop-wide standard rate:

    Local delivery   40.00 ر.س     <- Al Qurayyat
    قياسي            25.00 ر.س     <- the standard rate

The shopper picks 25. The branch fee never applies, and the cart — which shows
40, because it reads the local delivery quote — disagrees with what they pay.

This function removes the cheaper option so only the branch's fee is offered.

## How it decides which to keep

It reads the **`Delivery Fee` cart attribute**, which the storefront already
writes when a shopper picks a branch (`CartSummary.tsx`, `Header.tsx`). The
delivery option costing that amount is kept; the rest of that group is hidden.

Deliberately NOT by option title — titles are localised, merchant-editable and
differ between the Arabic and English checkouts.

It never empties a delivery group: if no option matches the branch fee, the
group is left exactly as Shopify built it.

---

## Install

Requires a custom Shopify app on the store and Shopify CLI logged in to it.

**1. Scaffold the extension** — in the app directory:

```
shopify app generate extension --template delivery_customization --name keep-branch-delivery-fee
```

Choose **JavaScript**. Let the CLI generate the scaffold; its file names and
target follow the CLI version, which is why this folder ships only the two
files that carry the logic rather than a whole extension.

**2. Copy both files in**, over the generated ones:

```
cart_delivery_options_transform_run.graphql  ->  extensions/keep-branch-delivery-fee/src/
cart_delivery_options_transform_run.js       ->  extensions/keep-branch-delivery-fee/src/
```

If the CLI generated `run.graphql` / `run.js` instead, rename these to match
and change the exported function name to whatever the generated file used.

**3. Regenerate types:**

```
shopify app function typegen
```

This is the step that tells you whether `cart.attribute(key:)` is available in
your API version. If it errors on that field, stop and say so — the input query
needs adjusting rather than working around.

**4. Deploy and activate:**

```
shopify app deploy
```

Then install the app on the store and switch the customization on in Shopify
admin under **Settings → Shipping and delivery**.

---

## Before this is worth deploying

**Confirm the problem exists.** Enable local delivery on ONE branch
(Al Qurayyat) and reach checkout with an address inside its area.

- **Both options appear** → deploy this.
- **Only local delivery appears** → Shopify already suppresses the standard
  rate and this function is unnecessary. Delete this folder.

Ten minutes, and it decides whether any of the above is needed.

## One setting this depends on

Put the **free-over-320 condition on each branch's local delivery price** as
well as on the standard rate. Without it, an order over 320 gets free standard
shipping (0.00) while the branch's local delivery stays at 40 — the function
sees no match, leaves both, and the shopper takes the free one.

Not a bug in the function; a gap between two settings that have to agree.
