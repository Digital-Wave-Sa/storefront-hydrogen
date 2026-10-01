import {useEffect, useState} from 'react';
import {
  addressNumericId,
  type AddressType,
  type AddressTypeMap,
} from '~/lib/address-types';

/**
 * The signed-in customer's address types, in the browser.
 *
 * One request per page load, shared by every component that lists addresses
 * (the addresses page, the delivery modal, the address form), and updated in
 * place when an address is saved so the new type shows without a reload.
 */
let cache: AddressTypeMap | null = null;
let inflight: Promise<AddressTypeMap> | null = null;
const listeners = new Set<(types: AddressTypeMap) => void>();

function publish(next: AddressTypeMap) {
  cache = next;
  for (const fn of listeners) fn(next);
}

function load(): Promise<AddressTypeMap> {
  if (cache) return Promise.resolve(cache);
  if (!inflight) {
    inflight = fetch('/api/address-types', {headers: {Accept: 'application/json'}})
      .then((r) => (r.ok ? r.json() : {types: {}}))
      .then((d: any) => {
        publish({...(d?.types || {}), ...(cache || {})});
        return cache!;
      })
      .catch(() => {
        publish(cache || {});
        return cache!;
      })
      .finally(() => {
        inflight = null;
      });
  }
  return inflight;
}

/** Record a type the moment its address is saved (or clear it with null). */
export function rememberAddressType(addressId: unknown, type: AddressType | null) {
  const id = addressNumericId(addressId);
  if (!id) return;
  const next = {...(cache || {})};
  if (type) next[id] = type;
  else delete next[id];
  publish(next);
}

/** Forget everything — on sign-out or a different customer signing in. */
export function resetAddressTypes() {
  cache = null;
}

export function useAddressTypes(enabled = true): AddressTypeMap {
  const [types, setTypes] = useState<AddressTypeMap>(() => cache || {});
  useEffect(() => {
    if (!enabled) return;
    listeners.add(setTypes);
    load().then(setTypes);
    return () => {
      listeners.delete(setTypes);
    };
  }, [enabled]);
  return types;
}
