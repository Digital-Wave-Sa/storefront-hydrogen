import '@shopify/ui-extensions/preact';
import {render} from 'preact';
import {useEffect, useState} from 'preact/hooks';

/**
 * Thank you page: «رقم الطلب SDN-1580» under «شكرًا لك».
 *
 * Shopify shows its own random confirmation code (e.g. PMFZLHRQM); the
 * branches and the CRM know orders by name (SDN-…). The extension only has
 * the order id, so it asks the storefront for the name:
 *   GET https://saadeddin.com/api/order-name?id=<order gid>
 * with this extension's session token. The order can take a moment to exist
 * after payment, so a 404 is retried a few times. If the name never comes,
 * nothing is shown — Shopify's own confirmation code is still on the page.
 */
const ENDPOINT = 'https://saadeddin.com/api/order-name';
const RETRY_DELAYS_MS = [0, 1500, 3000, 5000, 8000, 12000];

export default async () => {
  render(<Extension />, document.body);
};

function Extension() {
  const orderId = shopify.orderConfirmation.value?.order?.id;
  const [name, setName] = useState('');

  useEffect(() => {
    if (!orderId) return undefined;
    let cancelled = false;

    (async () => {
      for (const delay of RETRY_DELAYS_MS) {
        if (delay) await new Promise((r) => setTimeout(r, delay));
        if (cancelled) return;
        try {
          const token = await shopify.sessionToken.get();
          const res = await fetch(`${ENDPOINT}?id=${encodeURIComponent(orderId)}`, {
            headers: {Authorization: `Bearer ${token}`},
          });
          if (res.ok) {
            const body = await res.json();
            if (!cancelled && body?.name) setName(String(body.name));
            return;
          }
          // Only "not created yet" is worth asking again.
          if (res.status !== 404) return;
        } catch {
          // Network hiccup: try again on the next delay.
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [orderId]);

  if (!name) return null;

  return (
    <s-stack direction="inline" gap="small-200" alignItems="center">
      <s-text color="subdued">{shopify.i18n.translate('orderNumber')}</s-text>
      <s-text type="strong">{name}</s-text>
    </s-stack>
  );
}
