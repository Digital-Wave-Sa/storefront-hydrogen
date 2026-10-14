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

/**
 * Per-environment override, set in Oxygen (Storefront → Environments →
 * variables): `CAKE_BUILDER=on` opens the builder in that environment whatever
 * the metaobject says, `CAKE_BUILDER=off` closes it. Unset -- as on the live
 * site -- the metaobject decides.
 *
 * Exists because the live site and the preview of `feature/cake-sizes` share
 * one store and so one metaobject: the team needs the builder open on the
 * preview while customers still see «قريباً».
 */
export async function isCakeBuilderEnabled(
  storefront: any,
  env?: {CAKE_BUILDER?: string},
): Promise<boolean> {
  const override = String(env?.CAKE_BUILDER || '').trim().toLowerCase();
  if (override === 'on' || override === 'true') return true;
  if (override === 'off' || override === 'false') return false;
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
