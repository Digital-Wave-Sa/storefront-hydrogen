/**
 * Whether the custom cake builder is open — see ~/lib/cake-builder.
 *
 * Read from the `cake_settings` metaobject (Content → Metaobjects → Cake
 * Settings → «Custom cake builder open»). Closed unless it says true, so a
 * missing entry or a failed read shows «قريباً» rather than a builder whose
 * prices are not in yet.
 */
const CAKE_BUILDER_SWITCH_QUERY = `#graphql
  query CakeBuilderSwitch {
    cakeSettings: metaobjects(type: "cake_settings", first: 1) {
      nodes {
        builderEnabled: field(key: "builder_enabled") { value }
      }
    }
  }
`;

export async function isCakeBuilderEnabled(storefront: any): Promise<boolean> {
  try {
    const res: any = await storefront.query(CAKE_BUILDER_SWITCH_QUERY, {
      cache: storefront.CacheShort(),
    });
    return res?.cakeSettings?.nodes?.[0]?.builderEnabled?.value === 'true';
  } catch (e) {
    console.warn('[cake-builder] Could not read the builder switch:', e);
    return false;
  }
}
