import {useFetchers} from 'react-router';
import {CartForm} from '@shopify/hydrogen';

/**
 * Which cart mutations are in flight right now.
 *
 * Hydrogen's `useOptimisticCart` already moves the visible quantity the moment
 * a shopper taps + or -, but it does two things this has to work around.
 *
 * It marks a line `isOptimistic` only for LinesAdd -- read its LinesUpdate
 * branch: it assigns the new quantity and never sets the flag. So a quantity
 * change was invisible to every piece of code that keyed off `isOptimistic`,
 * which is why the buttons never disabled and the prices sat still.
 *
 * And it never touches `cost`. An updated line keeps the total Shopify last
 * confirmed, so during the round trip the line reads "2" beside the price of
 * one. That is the 1-2 second lag: not the quantity, the money.
 *
 * Reading the fetchers directly, the way Hydrogen does, gives both back --
 * which lines are changing and what they are changing to -- so the prices can
 * follow the quantity instead of trailing it.
 */
export type PendingCartMutations = {
  /** Line ids with an update or a removal in flight. */
  lineIds: Set<string>;
  /** The quantity each pending line is being moved to. */
  quantities: Map<string, number>;
  /** Line ids being removed. */
  removingLineIds: Set<string>;
  /** Any cart mutation at all is in flight. */
  busy: boolean;
};

export function usePendingCartMutations(): PendingCartMutations {
  const fetchers = useFetchers();

  const lineIds = new Set<string>();
  const quantities = new Map<string, number>();
  const removingLineIds = new Set<string>();
  let busy = false;

  for (const {formData} of fetchers) {
    if (!formData) continue;

    let input: any;
    try {
      input = CartForm.getFormInput(formData);
    } catch {
      // Not a cart form -- a search, a newsletter sign-up, anything else.
      continue;
    }
    if (!input?.action) continue;

    busy = true;

    if (input.action === CartForm.ACTIONS.LinesUpdate) {
      for (const line of input.inputs?.lines ?? []) {
        if (!line?.id) continue;
        lineIds.add(line.id);
        if (typeof line.quantity === 'number') {
          quantities.set(line.id, line.quantity);
        }
      }
    } else if (input.action === CartForm.ACTIONS.LinesRemove) {
      for (const id of input.inputs?.lineIds ?? []) {
        if (!id) continue;
        lineIds.add(id);
        removingLineIds.add(id);
      }
    }
  }

  return {lineIds, quantities, removingLineIds, busy};
}

/** The unit price of a line, after any per-unit adjustment Shopify applied. */
export function unitPriceOf(line: any): number {
  const perQuantity = parseFloat(line?.cost?.amountPerQuantity?.amount ?? '');
  if (Number.isFinite(perQuantity)) return perQuantity;
  const listed = parseFloat(line?.merchandise?.price?.amount ?? '');
  return Number.isFinite(listed) ? listed : 0;
}

/**
 * What a line costs on screen: Shopify's confirmed total once it has one, and
 * unit price x quantity while a change is still in the air.
 */
export function lineTotalOf(line: any, isPending: boolean): number {
  // A Buy X Get Y gift costs nothing, and must keep saying so rather than
  // flashing the variant's full price for the length of a round trip.
  const isFree = line?.attributes?.some(
    (a: any) => a?.key === '_is_free' && a?.value === 'true',
  );
  if (isFree) return 0;

  if (!isPending) {
    const confirmed = parseFloat(line?.cost?.totalAmount?.amount ?? '');
    if (Number.isFinite(confirmed)) return confirmed;
  }
  return unitPriceOf(line) * (line?.quantity ?? 1);
}
