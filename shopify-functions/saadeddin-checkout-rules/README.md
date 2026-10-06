# Saadeddin Checkout Rules (deployed app)

Separate Shopify app, owned by the **Modern advanced services** organization,
installed on Saadeddin Pastry by custom distribution (4 Oct 2026). It holds only
two Shopify Functions; it does not touch the storefront or the
«Saad Al Deen Store Access» app.

| Extension | Status |
|---|---|
| free-delivery-without-gift-cards | Live. Delivery customization «Free delivery without gift cards», threshold 299 SAR (config metafield `$app:free-delivery/config`). Standard Delivery's 298.99 cap was removed so the function picks between Standard (19) and Free. |
| pickup-chosen-branch | Deployed. Activated from Settings → Shipping and delivery → pickup service. Uses `api_version = "unstable"` — no stable version accepted it on 4 Oct 2026. |

- Client ID: `34c05e9b07b44a0aaa29748f90f13180`
- Dev Dashboard: https://dev.shopify.com/dashboard/131014413/apps/431358148609

## Turning things off

- Delivery rule: Settings → Shipping and delivery → Delivery customizations →
  turn off **and** put the "up to 298.99" condition back on Standard Delivery
  (otherwise big orders see both Standard and Free).
- Pickup: deactivate the pickup service on the same page.

## Redeploying after a change

```
npm install
shopify app function schema   # in each extension folder, regenerates schema.graphql
shopify app deploy
```
