import {type ActionFunctionArgs} from 'react-router';
import {stripCoordsMarker, sameAddressId} from '~/lib/address-coords';
import {mergeCartAttributes} from '~/lib/cart-attributes';

export async function action({request, context}: ActionFunctionArgs) {
  try {
    const formData = await request.formData();
    const locationId = formData.get('locationId');
    const branchName = formData.get('branchName');
    const fulfillmentType = formData.get('fulfillmentType');
    const addressName = formData.get('addressName');
    const addressId = formData.get('addressId');
    const manualLocationSelection = formData.get('manualLocationSelection');
    const attributesStr = formData.get('attributes');
    const buyerIdentityStr = formData.get('buyerIdentity');
    const axStoreId = formData.get('axStoreId') || formData.get('ax_store_id');
    const customBranchId =
      formData.get('customBranchId') || formData.get('branch_id');

    if (typeof fulfillmentType === 'string') {
      context.session.set('fulfillmentType', fulfillmentType);
    }
    if (typeof locationId === 'string') {
      context.session.set('selectedLocationId', locationId);
    }
    if (typeof branchName === 'string') {
      context.session.set('selectedLocationName', branchName);
    }
    if (typeof addressName === 'string') {
      context.session.set('selectedAddressName', addressName);
    }
    if (typeof addressId === 'string' && addressId) {
      context.session.set('selectedAddressId', addressId);
    } else if (typeof addressName === 'string') {
      // A selection with no id must not leave the previous one behind.
      context.session.set('selectedAddressId', '');
    }
    if (typeof manualLocationSelection === 'string') {
      context.session.set('manualLocationSelection', manualLocationSelection);
    }
    if (typeof axStoreId === 'string') {
      context.session.set('selectedAxStoreId', axStoreId);
    }
    if (typeof customBranchId === 'string') {
      context.session.set('selectedCustomBranchId', customBranchId);
    }

    /**
     * Pickup has no delivery address — clear any left by a previous delivery
     * selection.
     *
     * The client sends `addressName` only for delivery, so on a pickup pick the
     * block above never runs and the session kept whichever address the shopper
     * last delivered to. The header pill then read «توصيل: <old address>» on a
     * pickup order, and checkout could resolve that stale address. Cleared
     * explicitly here so switching to pickup actually drops the address.
     */
    if (fulfillmentType === 'pickup') {
      context.session.set('selectedAddressName', '');
      context.session.set('selectedAddressId', '');
    }

    try {
      const customerAccessToken = await context.session.get(
        'customerAccessToken',
      );

      // Sync Cart Attributes if cart exists
      if (context.cart) {
        let attributes = [] as any[];
        if (typeof attributesStr === 'string') {
          try {
            attributes = JSON.parse(attributesStr) as any[];
          } catch (e) {}
        }

        const sessionAxStoreId =
          (typeof axStoreId === 'string'
            ? axStoreId
            : await context.session.get('selectedAxStoreId')) || '';
        const sessionCustomBranchId =
          (typeof customBranchId === 'string'
            ? customBranchId
            : await context.session.get('selectedCustomBranchId')) || '';

        if (attributes.length === 0) {
          attributes = [
            {
              key: 'Branch',
              value:
                (typeof branchName === 'string'
                  ? branchName
                  : await context.session.get('selectedLocationName')) || '',
            },
            {
              key: 'Branch ID',
              value:
                sessionCustomBranchId ||
                (typeof locationId === 'string'
                  ? locationId
                  : await context.session.get('selectedLocationId')) || '',
            },
            {
              key: 'Fulfillment Type',
              value:
                typeof fulfillmentType === 'string'
                  ? fulfillmentType === 'pickup'
                    ? 'Pickup'
                    : 'Delivery'
                  : 'Pickup',
            },
          ];
        } else {
          // If Branch ID exists, replace with sessionCustomBranchId if available
          const bIdx = attributes.findIndex((a: any) => a.key === 'Branch ID');
          if (bIdx >= 0 && sessionCustomBranchId) {
            attributes[bIdx].value = sessionCustomBranchId;
          }
        }

        if (sessionCustomBranchId) {
          if (!attributes.find((a: any) => a.key === 'custom.branch_id')) {
            attributes.push({
              key: 'custom.branch_id',
              value: sessionCustomBranchId,
            });
          }
          if (!attributes.find((a: any) => a.key === 'branch_id')) {
            attributes.push({key: 'branch_id', value: sessionCustomBranchId});
          }
        }

        /**
         * Merged onto what the cart already has, never sent on its own.
         *
         * `cartAttributesUpdate` replaces the attribute list rather than
         * merging into it, so this call used to delete every key it did not
         * mention. The branch set built above names no `delivery_date` and no
         * `Time Slot` — which is exactly how choosing a branch or an address
         * wiped the delivery date the shopper had already picked. Checkout then
         * refused with «يرجى اختيار تاريخ التوصيل», naming a date that had been
         * chosen and silently thrown away.
         *
         * Merging here rather than in each caller covers the header, the cart
         * summary and the cake builder at once — all three post to this route —
         * and means a later caller cannot reintroduce the bug by sending a
         * short list.
         */
        let currentAttributes: any[] = [];
        try {
          const existingCart =
            typeof context.cart.get === 'function'
              ? await context.cart.get()
              : null;
          currentAttributes = existingCart?.attributes || [];
        } catch (e) {
          /**
           * A cart that cannot be read is treated as empty, which leaves the
           * old replace-everything behaviour for that one request rather than
           * dropping the branch the shopper just chose.
           */
          console.warn(
            '[api.location-id] Could not read cart attributes to merge:',
            e,
          );
        }

        /**
         * Pickup carries no delivery address or fee.
         *
         * The merge keeps every key it is not given a new value for, so a
         * «Delivery Address» or «Delivery Fee» left on the cart by an earlier
         * delivery selection would ride along onto a pickup order — the branch
         * would receive a pickup order stamped with a home address and a
         * delivery charge. Overwriting them with empty (omission would not
         * clear them, only an explicit empty value does) drops them on pickup.
         */
        if (fulfillmentType === 'pickup') {
          attributes.push({key: 'Delivery Address', value: ''});
          attributes.push({key: 'Delivery Fee', value: ''});
        }

        attributes = mergeCartAttributes(currentAttributes, attributes);

        // Filter out ax_store_id keys from cart attributes
        attributes = attributes.filter(
          (a: any) =>
            !['custom.ax_store_id', 'ax_store_id', 'ax store id'].includes(
              a.key.toLowerCase().trim(),
            ),
        );

        if (typeof context.cart.updateAttributes === 'function') {
          await context.cart.updateAttributes(attributes);
        }

        /**
         * Sync buyer identity -- and, above all, the delivery address.
         *
         * No customer token travels in THIS mutation — it follows in its own
         * call further down.
         *
         * `cartBuyerIdentityUpdate` is atomic: one rejected field discards the
         * WHOLE input. A refused token therefore threw away the delivery
         * address travelling in the same call, the cart kept whatever address
         * it had before, and checkout priced a Riyadh address for a shopper who
         * picked Al Qurayyat — wrong branch, wrong fee.
         *
         * An earlier fix removed the token altogether, on the claim that the
         * association "never once formed". That claim was never measured and
         * turned out to be wrong: checkout stopped recognising signed-in
         * shoppers, and returning the token as a separate call restored it.
         * Separating the two calls is what actually fixes both.
         */
        const tokenStr =
          typeof customerAccessToken === 'string'
            ? customerAccessToken
            : (customerAccessToken as any)?.accessToken;

        const shopifyToken =
          typeof tokenStr === 'string' &&
          tokenStr &&
          !tokenStr.startsWith('session-')
            ? tokenStr
            : null;

        {
          let buyerIdentity: any = undefined;
          if (typeof buyerIdentityStr === 'string') {
            try {
              buyerIdentity = JSON.parse(buyerIdentityStr);
            } catch (e) {}
          }

          if (
            !buyerIdentity?.deliveryAddressPreferences &&
            shopifyToken &&
            typeof fulfillmentType === 'string' &&
            fulfillmentType === 'delivery' &&
            typeof addressName === 'string'
          ) {
            const CUSTOMER_ADDRESSES_QUERY = `#graphql
                          query CustomerAddressesForLocationId($customerAccessToken: String!) {
                            customer(customerAccessToken: $customerAccessToken) {
                              addresses(first: 250) {
                                nodes {
                                  id
                                  firstName
                                  lastName
                                  address1
                                  address2
                                  city
                                  country
                                  phone
                                }
                              }
                            }
                          }
                        `;
            const res = await context.storefront.query(
              CUSTOMER_ADDRESSES_QUERY,
              {
                variables: {customerAccessToken: shopifyToken},
                cache: context.storefront.CacheNone(),
              },
            );
            const customer = res.customer;

            if (customer) {
              const nodes = customer.addresses?.nodes ?? [];
              // The id first: a customer's addresses all share their name.
              const selectedAddr =
                (typeof addressId === 'string' && addressId
                  ? nodes.find((a: any) => sameAddressId(a.id, addressId))
                  : null) ||
                nodes.find(
                  (a: any) =>
                    `${a.firstName} ${a.lastName}` === addressName ||
                    a.address1 === addressName,
                );

              if (selectedAddr) {
                buyerIdentity = {
                  deliveryAddressPreferences: [
                    {
                      deliveryAddress: {
                        address1: selectedAddr.address1,
                        address2: stripCoordsMarker(selectedAddr.address2),
                        city: selectedAddr.city,
                        country: selectedAddr.country || 'SA',
                        firstName: selectedAddr.firstName,
                        lastName: selectedAddr.lastName,
                        phone: selectedAddr.phone,
                      },
                    },
                  ],
                };
              }
            }
          }

          const payload: any = {...(buyerIdentity || {})};

          /**
           * What this call is about to do to the cart's address.
           *
           * A delivery address preference PERSISTS on a cart. A selection that
           * sends no address therefore does not clear the old one -- it leaves
           * it, and every screen afterwards shows the NEW label over the OLD
           * address. That is indistinguishable, in the logs we had, from a
           * selection that worked: both are silent.
           *
           * Read-only. It names the address being sent, or says plainly that
           * none is.
           */
          const outgoing =
            payload?.deliveryAddressPreferences?.[0]?.deliveryAddress;
          console.log(
            '[LOCATION API] Cart sync —',
            `fulfillment=${typeof fulfillmentType === 'string' ? fulfillmentType : 'unchanged'}`,
            `label=${typeof addressName === 'string' ? addressName : 'none'}`,
            `addressId=${typeof addressId === 'string' && addressId ? addressId : 'NOT SENT'}`,
            `token=${shopifyToken ? 'shopify' : 'session-only'}`,
            `sending=${
              outgoing
                ? `${outgoing.address1 || '?'} / ${outgoing.city || 'NO CITY'}`
                : 'NO ADDRESS — the cart keeps whichever one it already had'
            }`,
          );

          if (
            Object.keys(payload).length > 0 &&
            typeof context.cart.updateBuyerIdentity === 'function'
          ) {
            const result: any = await context.cart.updateBuyerIdentity(payload);

            /**
             * Reported, never retried.
             *
             * `updateBuyerIdentity` resolves with userErrors rather than
             * throwing, so a rejection would otherwise pass silently.
             *
             * There is nothing to retry now that no token is sent: the fields
             * that remain -- address, email, phone, delivery preference -- are
             * all ones Shopify accepts. A userError here means something new,
             * so it is worth seeing in the log rather than swallowing.
             */
            const userErrors =
              result?.cartBuyerIdentityUpdate?.userErrors ||
              result?.userErrors ||
              [];

            if (userErrors.length > 0) {
              console.warn(
                '[LOCATION API] cartBuyerIdentityUpdate userErrors:',
                JSON.stringify(userErrors),
              );
            }
          }

          /**
           * The customer association, separately and last.
           *
           * It cannot travel in the payload above: that call carries the
           * delivery address, and an atomic mutation would discard the address
           * along with a refused token — the wrong-branch, wrong-fee bug. On
           * its own, a refusal costs only the association.
           */
          if (shopifyToken) {
            try {
              const assoc: any = await context.cart.updateBuyerIdentity({
                customerAccessToken: shopifyToken,
              } as any);

              const assocErrors =
                assoc?.cartBuyerIdentityUpdate?.userErrors ||
                assoc?.userErrors ||
                [];

              if (assocErrors.length > 0) {
                console.warn(
                  '[LOCATION API] Customer association refused:',
                  JSON.stringify(assocErrors),
                );
              }
            } catch (assocErr: any) {
              console.error(
                '[LOCATION API] Customer association threw:',
                assocErr?.message || assocErr,
              );
            }
          }
        }
      }
    } catch (e) {
      console.error('[LOCATION API] Cart sync failed:', e);
    }

    const cookieHeader = await context.session.commit();
    return new Response(JSON.stringify({success: true}), {
      headers: {
        'Content-Type': 'application/json',
        'Set-Cookie': cookieHeader,
      },
    });
  } catch (error: any) {
    console.error('[LOCATION API] Global action error:', error);
    return new Response(
      JSON.stringify({success: false, error: error?.message || 'Server error'}),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
        },
      },
    );
  }
}
