# Pushing the cake builder work

Run `git status` first. There may be older uncommitted work from the cart,
delivery and checkout changes — if so, commit that separately and before these,
so a cake regression can never be confused with a delivery one.

## Before committing

Delete these. They are superseded or were only ever scaffolding:

    cake-builder-v5.zip                              # 8 MB of duplicate assets
    app/components/CakeBuilder/CakePreview.tsx       # replaced by CakeRenderer

And these, but grep for each name across `app/` first — if nothing imports it,
it is dead:

    app/components/CakeBuilder/ShapeSizeSelector.tsx     # holds 10 lola.do hotlinks
    app/components/CakeBuilder/ColorSelector.tsx
    app/components/CakeBuilder/FlavorLayerSelector.tsx
    app/components/CakeBuilder/ToppingsSelector.tsx

## Why four commits and not one

The renderer swap touches a 102 KB component that also owns the cart and the
draft order. Keeping the vendored engine, the data layer and the swap itself in
separate commits means that if the builder misbehaves, `git bisect` lands on
commit 3 — the only one that changed existing behaviour. Commits 1 and 2 are
pure additions and cannot have broken anything.

---

## 1 — the engine

    git add app/lib/cake-render/render-core.ts \
            app/lib/cake-render/finishing.ts \
            app/lib/cake-render/asset-loader.ts \
            public/cake/v5 \
            "app/routes/(\$locale).cake-render-test.tsx"

    git commit -F docs/commit-msg-1.txt

## 2 — catalog and pricing

    git add app/lib/cake-render/catalog.ts \
            app/lib/cake-render/compose.ts \
            app/lib/cake-render/builder-options.ts \
            app/lib/cake-pricing.ts \
            app/lib/cake-price-book.server.ts \
            docs/cake-pricing-setup.graphql

    git commit -F docs/commit-msg-2.txt

## 3 — the swap

    git add app/components/CakeBuilder/CakeRenderer.tsx \
            app/components/CakeBuilder/CustomCakeBuilder.tsx \
            "app/routes/(\$locale).custom-cake.tsx"

    git commit -F docs/commit-msg-3.txt

## 4 — removals

    git add -A app/components/CakeBuilder
    git commit -F docs/commit-msg-4.txt

## Push

    git push origin HEAD

If you are on the default branch, branch first:

    git checkout -b feat/cake-builder-v5
    git push -u origin feat/cake-builder-v5

---

## Two things that must not reach production

`app/routes/($locale).cake-render-test.tsx` is a diagnostic. Delete it before
launch.

Every one of the 51 prices in Shopify is currently `provisional: false`, which
means a cake is sellable at a price derived from a curve fit rather than from
Saadeddin. `canCheckout` in `CustomCakeBuilder.tsx` has a comment directly
underneath it naming the condition to re-add. Do that, or replace the prices,
before this goes live.
