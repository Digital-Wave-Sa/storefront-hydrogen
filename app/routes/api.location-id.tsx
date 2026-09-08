import {type ActionFunctionArgs} from 'react-router';
import {stripCoordsMarker} from '~/lib/address-coords';

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
         * This used to attach `customerAccessToken` to the mutation whatever
         * the token was. A customer who signed in by OTP holds one of this
         * storefront's own `session-...` tokens, which Shopify does not
         * recognise: `cartBuyerIdentityUpdate` answers with a userError and
         * applies NONE of the input -- so the delivery address Header had just
         * built travelled all the way here and was thrown away with it. The
         * cart then had no address, and checkout fell back to whichever
         * address the customer account happened to have on file. That is the
         * Riyadh address appearing on an order whose shopper picked a
         * different one. Every other file in this flow already guards against
         * the `session-` prefix; this one did not.
         *
         * The address no longer depends on the token at all. A real Shopify
         * token is attached when there is one, and a rejection is retried
         * without it so the address still lands.
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
                  ? nodes.find((a: any) => a.id === addressId)
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
          if (shopifyToken) payload.customerAccessToken = shopifyToken;

          if (
            Object.keys(payload).length > 0 &&
            typeof context.cart.updateBuyerIdentity === 'function'
          ) {
            const result: any = await context.cart.updateBuyerIdentity(payload);

            /**
             * Reported, never retried.
             *
             * `updateBuyerIdentity` resolves with userErrors rather than
             * throwing, so a rejection used to pass silently -- worth logging.
             * But it must not be answered by resending without the token.
             * `cartBuyerIdentityUpdate` REPLACES the buyer identity rather than
             * patching it: a call that omits `customerAccessToken` succeeds and
             * takes the customer association off the cart, and the shopper
             * arrives at Shopify Checkout signed out. A failed address pre-fill
             * costs a shopper some typing; a dropped association costs them
             * their account, their saved addresses and their loyalty.
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
