import {useRouteLoaderData} from 'react-router';

/**
 * The custom cake builder's on/off switch (Oct 2026: «قريباً» until the
 * client sends the prices).
 *
 *   - Off: /custom-cake shows a «قريباً» page, every link to it carries a
 *     «قريباً» badge, «اطلب مجدداً» on past cake orders is hidden, and
 *     /api/custom-cake-order refuses orders.
 *   - On: everything is back, no code change or deploy needed.
 *
 * The switch is the `builder_enabled` field of the `cake_settings`
 * metaobject — Shopify admin → Content → Metaobjects → Cake Settings →
 * «Custom cake builder open». Read in root (cake-builder.server).
 */
export function useCakeBuilderEnabled(): boolean {
  const root = useRouteLoaderData('root') as any;
  return Boolean(root?.cakeBuilderEnabled);
}

/** Whether a link points at the builder (either language). */
export function isCustomCakeUrl(url: unknown): boolean {
  return /(^|\/)custom-cake(\/|\?|#|$)/.test(String(url || ''));
}
