/**
 * What kind of place a saved address is — شقة / منزل / مكتب.
 *
 * Shopify addresses have no such field, so a customer with two addresses in
 * the same city saw them told apart only by street name, and the header pill
 * read «توصيل: الرياض». The type is kept beside the address instead, in one
 * JSON metafield on the customer, `custom.address_types`:
 * { "<numeric address id>": "apartment" | "house" | "office" } — the same
 * pattern as the map pins (~/lib/address-pins.server). Read through
 * /api/address-types (~/lib/use-address-types), written by the address
 * save in /account/addresses.
 *
 * Shared by server and browser; nothing here touches the network.
 */

export const ADDRESS_TYPES = ['apartment', 'house', 'office'] as const;
export type AddressType = (typeof ADDRESS_TYPES)[number];
export type AddressTypeMap = Record<string, AddressType>;

const LABELS: Record<AddressType, {ar: string; en: string}> = {
  apartment: {ar: 'شقة', en: 'Apartment'},
  house: {ar: 'منزل', en: 'House'},
  office: {ar: 'مكتب', en: 'Office'},
};

export function addressTypeLabel(type: AddressType, isEn: boolean): string {
  return isEn ? LABELS[type].en : LABELS[type].ar;
}

/** A known type, or null for anything else (old data, a typo, nothing). */
export function normalizeAddressType(value: unknown): AddressType | null {
  const v = String(value ?? '').trim().toLowerCase();
  return (ADDRESS_TYPES as readonly string[]).includes(v) ? (v as AddressType) : null;
}

/**
 * The numeric part of an address id. A MailingAddress id carries a per-query
 * `?model_name=…&customer_access_token=…`, so the same address read twice has
 * two different gids; only the number identifies it.
 */
export function addressNumericId(id: unknown): string {
  return (
    String(id ?? '')
      .split('?')[0]
      .split('/')
      .pop()
      ?.replace(/\D/g, '') || ''
  );
}

export function parseAddressTypes(raw: unknown): AddressTypeMap {
  if (!raw) return {};
  try {
    const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
    const out: AddressTypeMap = {};
    for (const [id, value] of Object.entries(parsed as Record<string, unknown>)) {
      const t = normalizeAddressType(value);
      if (t && /^\d+$/.test(id)) out[id] = t;
    }
    return out;
  } catch {
    return {};
  }
}

export function addressTypeFor(
  types: AddressTypeMap | null | undefined,
  addressId: unknown,
): AddressType | null {
  if (!types) return null;
  return types[addressNumericId(addressId)] || null;
}
