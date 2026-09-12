import {redirect, type ActionFunctionArgs, type LoaderFunctionArgs} from 'react-router';
import {SaadeddinApi} from '~/lib/saadeddin-api.server';
import {extractMinTime} from '~/lib/time-utils';
import {stripCoordsMarker, sameAddressId, baseAddressId} from '~/lib/address-coords';
import {isSignedIn, loginUrlFor} from '~/lib/checkout-gate.server';
import {logCheckoutError, type CheckoutErrorStage} from '~/lib/error-log.server';

export async function loader({request, context}: LoaderFunctionArgs) {
  return processCheckoutInitiate({request, context});
}

export async function action({request, context}: ActionFunctionArgs) {
  return processCheckoutInitiate({request, context});
}

async function processCheckoutInitiate({request, context}: ActionFunctionArgs) {
  const {storefront, session, env} = context;
  const lang = storefront.i18n.language === 'EN' ? 'en' : 'ar';

  /**
   * Report a failure on THIS side of the handover.
   *
   * Declared here, above the try below, so the outer catch can reach it too --
   * the failure that matters most is the one nobody anticipated.
   *
   * Never awaited by its callers: a shopper's checkout must not wait on a
   * logging service, nor fail because one is down. Each call site marks it
   * `void` to say that discarding the promise is deliberate.
   *
   * The context is gathered here rather than at each call site so every report
   * carries the same fields, and so adding a fifth call site cannot produce a
   * report with nothing in it to identify the shopper.
   */
  const reportCheckoutError = async (
    stage: CheckoutErrorStage,
    message: string,
    userErrors?: unknown,
  ) => {
    try {
      await logCheckoutError(env, {
        stage,
        message,
        userErrors,
        phone: (await session.get('loginOtpPhone')) || null,
        cartId: (await context.cart.getCartId()) || null,
        branchName: (await session.get('selectedLocationName')) || null,
        locationId: (await session.get('selectedLocationId')) || null,
        fulfillmentType: (await session.get('fulfillmentType')) || null,
        locale: lang,
      });
    } catch {
      // logCheckoutError already swallows its own failures; this guards the
      // session reads above it.
    }
  };

  // 1. Ensure user is logged in via Custom API or Shopify Customer Access Token
  const loggedIn = await isSignedIn(session);

  // Both are read again below -- the Saadeddin API token and the Shopify
  // customer token identify the shopper to the two systems this route talks
  // to. The gate above only asks whether any of the four ways to be signed in
  // is present; these are the two it goes on to use.
  const customToken = await session.get('saadeddinToken');
  const customerAccessToken = await session.get('customerAccessToken');

  if (!loggedIn) {
    const checkoutInitiateUrl = lang === 'en' ? '/en/checkout/initiate' : '/checkout/initiate';
    const loginUrl = loginUrlFor(lang, checkoutInitiateUrl);

    const existingCartId = await context.cart.getCartId();
    if (existingCartId) {
      try {
        const currentCart = await context.cart.get();
        if (currentCart?.lines?.nodes?.length) {
          const backupLines = currentCart.lines.nodes.map((line: any) => ({
            merchandiseId: line.merchandise.id,
            quantity: line.quantity,
          }));
          session.set('backupCartLines', JSON.stringify(backupLines));
          console.log('[CHECKOUT BACKUP] Saved backupCartLines before login redirect:', backupLines);
        }
      } catch (e) {
        console.error('[CHECKOUT BACKUP ERROR]', e);
      }
    }

    const headers = existingCartId ? context.cart.setCartId(existingCartId) : new Headers();
    headers.append('Set-Cookie', await session.commit());

    return redirect(loginUrl, { headers });
  }

  // 2. Fetch current Cart from Hydrogen
  let cartId = await context.cart.getCartId();
  console.log('[CHECKOUT DIAGNOSTIC] cartId:', cartId);

  let cartResult: any = null;
  if (cartId) {
    const res = await storefront.query(
      `#graphql
      query checkoutCart($cartId: ID!, $language: LanguageCode, $country: CountryCode)
        @inContext(language: $language, country: $country) {
        cart(id: $cartId) {
          id
          checkoutUrl
          note
          cost {
            subtotalAmount { amount currencyCode }
            totalAmount { amount currencyCode }
          }
          lines(first: 100) {
            nodes {
              id
              quantity
              merchandise {
                ... on ProductVariant {
                  id
                  title
                  sku
                  price { amount }
                  product { title id }
                }
              }
            }
          }
          attributes {
            key
            value
          }
        }
      }
    `,
      {
        variables: {
          cartId,
          language: storefront.i18n.language,
          country: storefront.i18n.country,
        },
        cache: storefront.CacheNone(),
      },
    );
    cartResult = res?.cart;
  }

  // Fallback Auto-Restoration: If cart is empty or missing, but backup lines exist in session (from pre-login step)
  const backupLinesStr = await session.get('backupCartLines');
  if ((!cartResult || !cartResult.lines?.nodes?.length) && backupLinesStr) {
    try {
      const backupLines = JSON.parse(backupLinesStr);
      if (Array.isArray(backupLines) && backupLines.length > 0) {
        console.log('[CHECKOUT RESTORE] Restoring cart from backup lines before checkout:', backupLines);
        const restoreRes = await context.cart.create({ lines: backupLines });
        if (restoreRes?.cart?.id) {
          cartId = restoreRes.cart.id;
          const reQuery = await storefront.query(
            `#graphql
            query checkoutCartRestored($cartId: ID!, $language: LanguageCode, $country: CountryCode)
              @inContext(language: $language, country: $country) {
              cart(id: $cartId) {
                id
                checkoutUrl
                note
                cost {
                  subtotalAmount { amount currencyCode }
                  totalAmount { amount currencyCode }
                }
                lines(first: 100) {
                  nodes {
                    id
                    quantity
                    merchandise {
                      ... on ProductVariant {
                        id
                        title
                        sku
                        price { amount }
                        product { title id }
                      }
                    }
                  }
                }
                attributes {
                  key
                  value
                }
              }
            }
          `,
            {
              variables: {
                cartId,
                language: storefront.i18n.language,
                country: storefront.i18n.country,
              },
              cache: storefront.CacheNone(),
            },
          );
          cartResult = reQuery?.cart;
        }
      }
    } catch (restoreErr) {
      console.error('[CHECKOUT RESTORE ERROR]', restoreErr);
    }
  }

  const cart = cartResult;

  if (!cart || !cart.lines?.nodes?.length) {
    console.log(
      '[CHECKOUT DIAGNOSTIC] Redirecting to cart: cart is null or empty',
    );
    return redirect(lang === 'en' ? '/en/cart' : '/cart');
  }

  /**
   * Email & phone onto the Cart Buyer Identity, so Shopify Checkout opens with
   * the shopper's contact details already filled in.
   *
   * No customer token goes in THIS payload. `cartBuyerIdentityUpdate` is
   * atomic, so a token Shopify refuses discards the email, the phone, the
   * delivery-method preference and the address alongside it — which is how
   * shoppers ended up at checkout with a stale address and the wrong fee.
   *
   * The token is still sent, further down, in a call of its own where a
   * refusal costs nothing but itself. An earlier version of this comment
   * claimed the association "never once succeeded" and used that to justify
   * dropping the token entirely. That claim was never measured, and removing
   * the token coincided with checkout ceasing to recognise signed-in
   * shoppers — so it is not repeated here.
   */
  const loginEmail = await session.get('loginCustomerEmail');
  const loginPhone = await session.get('loginOtpPhone');
  const tokenString = typeof customerAccessToken === 'string'
    ? customerAccessToken
    : (customerAccessToken as any)?.accessToken;

  const buyerIdentity: any = {};

  if (loginEmail && typeof loginEmail === 'string' && !loginEmail.endsWith('@saadeddin.placeholder')) {
    buyerIdentity.email = loginEmail;
  }

  if (loginPhone) {
    const formattedPhone = String(loginPhone).startsWith('+')
      ? String(loginPhone)
      : `+${loginPhone}`;
    buyerIdentity.phone = formattedPhone;
  }

  // Attach delivery address preferences so Shopify Checkout pre-selects the address chosen in the storefront
  const selectedAddressName = await session.get('selectedAddressName');
  const selectedAddressId = await session.get('selectedAddressId');
  const sessionFulfillment = await session.get('fulfillmentType');
  const sessionLocationId = await session.get('selectedLocationId');

  /**
   * Tell Shopify Checkout which delivery method the shopper actually chose.
   *
   * Until this existed, the choice travelled only as cart attributes and a
   * note — `attributes[Fulfillment Type]=Pickup` and friends, appended to the
   * checkout URL. Checkout shows those on the order and ignores them when
   * picking a delivery method, so a shopper who selected «استلام من الفرع» at
   * Al Olaya arrived at a checkout opened on شحن, asking for a shipping
   * address. Nothing in the storefront was wrong; nothing in it was heard.
   *
   * `pickupHandle` wants the Shopify Location id, which is exactly what the
   * session holds — `gid://shopify/Location/91178074345` for Al Olaya. The
   * ERP's own `Branch ID` (70) means nothing to Shopify and is not it.
   *
   * Both fields are lists in the Storefront API schema, hence the arrays. A
   * branch with local pickup switched off in Shopify admin simply will not
   * offer the option, which is a setting rather than something code can force.
   */
  const pickupLocationId =
    typeof sessionLocationId === 'string'
      ? sessionLocationId.split('/').pop() || ''
      : '';

  if (sessionFulfillment === 'pickup' && pickupLocationId) {
    buyerIdentity.preferences = {
      delivery: {
        deliveryMethod: ['PICK_UP'],
        pickupHandle: [pickupLocationId],
      },
    };
  } else if (sessionFulfillment === 'delivery') {
    buyerIdentity.preferences = {
      delivery: {
        deliveryMethod: ['SHIPPING'],
      },
    };
  }

  /**
   * Sent on its own, after the identity update, never bundled into it.
   *
   * `deliveryAddressPreferences` is not a field on CartBuyerIdentityInput in
   * Storefront API 2026-04, which is the version this storefront runs — so
   * including it can fail the whole mutation and take the customer token, the
   * email, the phone and the delivery-method preference above down with it.
   * Isolated here, a rejection costs only the address pre-fill.
   */
  let addressPreference: any = null;

  /**
   * Rebuilt only when it can be rebuilt properly, and never invented.
   *
   * `selectedAddressName` is a label, not an address, so this has to look the
   * real one up again. Two things went wrong when it could not.
   *
   * The lookup is skipped entirely unless there is a genuine Shopify token,
   * and anyone who signed in by OTP holds a `session-...` one. The fallback
   * below it then hardcoded `city: 'Riyadh'`, with no province and no
   * postcode. An Abha customer was handed to checkout as a Riyadh one, which
   * is a different shipping zone and a different rate -- 33.00 quoted in the
   * cart against 20.00 charged at checkout, or 0.00 when the invented address
   * matched no zone at all.
   *
   * Header has already written the real, complete address onto the cart, and
   * it is what the cart's delivery groups were priced from. So when the lookup
   * cannot produce something at least as good, nothing is sent and that
   * address stands, rather than being replaced by a guess.
   */
  if (sessionFulfillment === 'delivery' && selectedAddressName) {
    try {
      if (tokenString && !tokenString.startsWith('session-')) {
        const {customer} = await context.storefront.query(
          `#graphql
          query GetCustomerAddressesForCheckout($customerAccessToken: String!) {
            customer(customerAccessToken: $customerAccessToken) {
              addresses(first: 50) {
                nodes {
                  id
                  firstName
                  lastName
                  address1
                  address2
                  city
                  province
                  zip
                  country
                  phone
                }
              }
            }
          }`,
          {
            variables: {customerAccessToken: tokenString},
            cache: context.storefront.CacheNone(),
          },
        );

        const nodes = customer?.addresses?.nodes ?? [];

        /**
         * The id first. `selectedAddressName` is the customer's own name, so
         * it matches every address they have saved equally and `find` returned
         * whichever Shopify listed first -- the wrong one, for anybody with
         * more than one address.
         */
        const match =
          (typeof selectedAddressId === 'string' && selectedAddressId
            ? nodes.find((a: any) => sameAddressId(a.id, selectedAddressId))
            : null) ||
          nodes.find(
            (a: any) =>
              `${a.firstName || ''} ${a.lastName || ''}`.trim() === selectedAddressName ||
              a.address1 === selectedAddressName ||
              (a.address1 && selectedAddressName.includes(a.address1)),
          );

        /**
         * A city is what places an address in a delivery zone, so a record
         * without one is no more usable here than no record at all. Every
         * other field is omitted when absent rather than defaulted: sending
         * `province: ''` tells Shopify the address has no province, which
         * drops it out of any province-scoped zone -- and Saudi zones are
         * normally scoped that way.
         */
        if (match?.address1 && match?.city) {
          const deliveryAddress: Record<string, string> = {
            address1: match.address1,
            city: match.city,
          };

          const address2 = stripCoordsMarker(match.address2);
          if (address2) deliveryAddress.address2 = address2;
          if (match.province) deliveryAddress.province = match.province;
          if (match.zip) deliveryAddress.zip = match.zip;
          if (match.country) deliveryAddress.country = match.country;
          if (match.firstName) deliveryAddress.firstName = match.firstName;
          if (match.lastName) deliveryAddress.lastName = match.lastName;

          const phone = match.phone || buyerIdentity.phone;
          if (phone) deliveryAddress.phone = phone;

          addressPreference = [{deliveryAddress}];
        }
      }
    } catch (e: any) {
      console.error(
        '[CHECKOUT DIAGNOSTIC] Address lookup failed; keeping the address the cart already carries:',
        e?.message || e,
      );
    }

    /**
     * The same lookup again, without the token this time.
     *
     * The block above only runs for a real Shopify token, and an OTP shopper
     * holds a `session-...` one -- so for almost everybody it produced nothing
     * and this route simply hoped the cart already carried the address from
     * `api.location-id`. When anything had cleared it since, checkout opened
     * with empty address fields and no delivery rate, which is what a shopper
     * sees as «it forgot everything».
     *
     * Hope is not a mechanism. The Admin API can read the customer's addresses
     * without any customer token at all -- it is how `root.tsx` loads them
     * already -- so the address is rebuilt here from the id the session kept,
     * and checkout stops depending on the cart having survived intact.
     *
     * Only when the block above found nothing, so a real token still wins and
     * this costs those sessions nothing.
     */
    if (!addressPreference && selectedAddressId) {
      try {
        const {getAdminToken, getAdminDomain} = await import(
          '~/lib/shopify-admin.server'
        );
        const adminToken = await getAdminToken(context.env);
        const adminDomain = getAdminDomain(context.env);
        const customerId = await session.get('loginCustomerId');

        if (adminToken && adminDomain && customerId) {
          const numericCustomer = String(customerId).split('/').pop();
          const res = await fetch(
            `https://${adminDomain}/admin/api/2024-01/customers/${numericCustomer}/addresses.json`,
            {headers: {'X-Shopify-Access-Token': adminToken}},
          );

          if (res.ok) {
            const body = (await res.json()) as any;
            const wanted = baseAddressId(String(selectedAddressId)).split('/').pop();

            const match = (body.addresses || []).find(
              (a: any) => String(a.id) === String(wanted),
            );

            /**
             * A city is what places an address in a delivery zone, so a record
             * without one is no more usable than none at all. Absent fields are
             * omitted rather than sent empty: `province: ''` tells Shopify the
             * address has no province and drops it out of province-scoped zones.
             */
            if (match?.address1 && match?.city) {
              const deliveryAddress: Record<string, string> = {
                address1: match.address1,
                city: match.city,
              };

              const address2 = stripCoordsMarker(match.address2);
              if (address2) deliveryAddress.address2 = address2;
              if (match.province) deliveryAddress.province = match.province;
              if (match.zip) deliveryAddress.zip = match.zip;
              if (match.country) deliveryAddress.country = match.country;
              if (match.first_name) deliveryAddress.firstName = match.first_name;
              if (match.last_name) deliveryAddress.lastName = match.last_name;

              const phone = match.phone || buyerIdentity.phone;
              if (phone) deliveryAddress.phone = String(phone);

              addressPreference = [{deliveryAddress}];
              console.log(
                '[CHECKOUT DIAGNOSTIC] Address rebuilt from the Admin API:',
                `${deliveryAddress.address1} / ${deliveryAddress.city}`,
              );
            }
          }
        }
      } catch (adminErr: any) {
        console.error(
          '[CHECKOUT DIAGNOSTIC] Admin address rebuild failed:',
          adminErr?.message || adminErr,
        );
      }
    }
  }

  if (Object.keys(buyerIdentity).length > 0) {
    try {
      const updateResult: any = await context.cart.updateBuyerIdentity(buyerIdentity);
      console.log(
        '[CHECKOUT DIAGNOSTIC] cartBuyerIdentityUpdate result:',
        JSON.stringify(updateResult, null, 2),
      );

      /**
       * Nothing to retry here any more.
       *
       * This used to resend the call without the customer token once Shopify
       * refused it. No token is sent in the first place now, so every field in
       * this payload is one Shopify accepts -- a userError would mean something
       * genuinely new, and is surfaced rather than worked around.
       */
      const userErrors = (updateResult as any)?.cartBuyerIdentityUpdate?.userErrors || (updateResult as any)?.userErrors || [];
      if (userErrors.length > 0) {
        console.warn(
          '[CHECKOUT DIAGNOSTIC] cartBuyerIdentityUpdate userErrors:',
          JSON.stringify(userErrors),
        );
        void reportCheckoutError('buyer_identity', 'cartBuyerIdentityUpdate returned userErrors', userErrors);
      }
    } catch (err: any) {
      console.error(
        '[CHECKOUT DIAGNOSTIC] Failed to update cart buyer identity:',
        err?.message || err,
      );
    }
  }

  /**
   * The address pre-fill, on its own so it cannot take anything else with it.
   * A failure here means the shopper types their address at checkout, which is
   * a worse checkout rather than a broken one.
   *
   * Clearing is deliberate; overwriting is not. Anything that is not a
   * delivery still sends an empty list, because a preference is stored on the
   * cart and nothing else removes one -- that is what clears the placeholder
   * «Address, City, Guest User» Header used to write for pickup, from a branch
   * object with no address fields, which outranked the real address the
   * customer had saved. Emptying a cart clears its lines, not its buyer
   * identity, so those carts would otherwise pre-fill nonsense until they
   * expired. An empty list on a cart that has no preference is a no-op.
   *
   * A delivery with nothing to send skips the call instead. Overwriting is how
   * the fee moved between the cart and checkout: the address the cart was
   * priced with is better than anything reconstructed from a label, so it is
   * left alone.
   */
  /**
   * Cleared only for a pickup, never for an unknown.
   *
   * This read `sessionFulfillment !== 'delivery'`, so a session whose
   * fulfilment type was missing or empty -- not pickup, just absent -- sent an
   * empty list and WIPED whatever delivery address the cart was carrying. The
   * clearing is meant for pickup, where a stale address preference would
   * otherwise pre-fill checkout with somewhere the shopper is not going. An
   * unknown value is not a pickup, and should leave the cart alone.
   */
  const isPickupSession =
    String(sessionFulfillment || '').toLowerCase() === 'pickup';

  if (addressPreference || isPickupSession) {
    try {
      await context.cart.updateBuyerIdentity({
        deliveryAddressPreferences: addressPreference ?? [],
      } as any);
    } catch (err: any) {
      console.error(
        '[CHECKOUT DIAGNOSTIC] Delivery address preference rejected:',
        err?.message || err,
      );
      void reportCheckoutError('delivery_address', err?.message || String(err));
    }
  } else {
    console.log(
      '[CHECKOUT DIAGNOSTIC] No usable address to pre-fill; keeping the one the cart was priced with.',
    );
  }

  /**
   * --- The customer association, last and entirely on its own ---
   *
   * This used to ride along inside the buyer-identity payload above. Because
   * `cartBuyerIdentityUpdate` is atomic, a token Shopify refused discarded the
   * email, the phone, the delivery preference and the address with it, and the
   * shopper reached checkout with a stale address and the wrong fee. The fix
   * applied at the time was to stop sending the token at all, on the reasoning
   * that the association had never worked anyway.
   *
   * That reasoning was an assumption, not a measurement, and it may well have
   * been wrong: checkout is reported to have recognised signed-in customers
   * until this token was removed.
   *
   * So it goes back — but in a call of its own, where it can only ever cost
   * itself. By this point the contact details, preferences and address are
   * already committed by the two calls above. If Shopify refuses the token the
   * refusal is logged and checkout opens exactly as it does today: a guest
   * with every detail correct. If Shopify accepts it, the shopper is
   * recognised, which is the behaviour being restored.
   *
   * `session-` tokens are never sent. They are this storefront's own
   * placeholder for an OTP sign-in that never minted a real Shopify token, and
   * mean nothing to Shopify.
   */
  if (tokenString && !tokenString.startsWith('session-')) {
    try {
      const assocResult: any = await context.cart.updateBuyerIdentity({
        customerAccessToken: tokenString,
      } as any);

      const assocErrors =
        assocResult?.cartBuyerIdentityUpdate?.userErrors ||
        assocResult?.userErrors ||
        [];

      if (assocErrors.length > 0) {
        console.warn(
          '[CHECKOUT DIAGNOSTIC] Customer association REFUSED by Shopify:',
          JSON.stringify(assocErrors),
        );

        /**
         * A refused token is usually a STALE token, not a wrong one.
         *
         * Signing in sets a derived password on the Shopify customer, and
         * setting a password invalidates every token issued before it — so the
         * next login kills the token an older open session is still holding.
         * Classic tokens expire on their own too. Either way Shopify answers
         * «Customer غير صالح» / INVALID, and a shopper who is demonstrably
         * signed in reaches checkout as a guest.
         *
         * The password is derived rather than stored, so a fresh token can be
         * minted here without involving the shopper. One retry only: if the
         * new token is refused as well, the token is not the problem and
         * hammering Shopify will not discover what is.
         */
        const isInvalidToken = assocErrors.some(
          (e: any) =>
            e?.code === 'INVALID' ||
            String(e?.field || '').includes('customerAccessToken'),
        );

        if (isInvalidToken) {
          const {remintCustomerAccessToken} = await import('~/lib/auth.server');
          const freshToken = await remintCustomerAccessToken(context);

          if (freshToken) {
            try {
              const retry: any = await context.cart.updateBuyerIdentity({
                customerAccessToken: freshToken,
              } as any);

              const retryErrors =
                retry?.cartBuyerIdentityUpdate?.userErrors ||
                retry?.userErrors ||
                [];

              if (retryErrors.length > 0) {
                console.warn(
                  '[CHECKOUT DIAGNOSTIC] Fresh token ALSO refused:',
                  JSON.stringify(retryErrors),
                );
              } else {
                console.log(
                  '[CHECKOUT DIAGNOSTIC] Customer association ACCEPTED after re-minting a fresh token.',
                );
              }
            } catch (retryErr: any) {
              console.error(
                '[CHECKOUT DIAGNOSTIC] Association retry threw:',
                retryErr?.message || retryErr,
              );
            }
          }
        }
      } else {
        console.log(
          '[CHECKOUT DIAGNOSTIC] Customer association ACCEPTED — checkout should recognise this shopper.',
        );
      }
    } catch (err: any) {
      // Never fatal: a shopper who cannot be associated still checks out.
      console.error(
        '[CHECKOUT DIAGNOSTIC] Customer association threw:',
        err?.message || err,
      );
    }
  } else {
    console.log(
      '[CHECKOUT DIAGNOSTIC] No real customer token to associate:',
      tokenString
        ? `placeholder (${String(tokenString).slice(0, 12)}…)`
        : 'none in session',
    );
  }

  // 3. Build payload for Saadeddin API and restore location properties
  let rawAttributes = cart.attributes || [];

  // Reconstruct missing attributes from the session if Shopify cleared them during login/identity update
  const sessionFulfillmentType = await session.get('fulfillmentType');
  const sessionBranch = await session.get('selectedLocationName');
  const sessionBranchId = await session.get('selectedLocationId');
  const sessionCustomBranchId = await session.get('selectedCustomBranchId');
  const sessionAxStoreId = await session.get('selectedAxStoreId');
  const sessionDate = await session.get('delivery_date');
  const sessionTimeSlot = await session.get('Time Slot');

  // Helper: check if attribute already exists and has a value, otherwise fall back to session
  const getAttr = (key: string, sessionVal: any) => {
    const existing = rawAttributes.find((a: any) => a.key === key)?.value;
    return existing || sessionVal || '';
  };

  let customBranchVal =
    sessionCustomBranchId ||
    getAttr('custom.branch_id', '') ||
    getAttr('branch_id', '') ||
    (sessionBranchId && !sessionBranchId.includes('gid://') ? sessionBranchId : '');

  const rawLocId = sessionBranchId || getAttr('Branch ID', '');
  if (!customBranchVal && rawLocId && rawLocId.includes('gid://shopify/Location/')) {
    try {
      const locRes = await context.storefront.query(
        `#graphql
        query GetLocationsBranchMeta {
          locations(first: 250) {
            nodes {
              id
              branch_id: metafield(namespace: "custom", key: "branch_id") {
                value
              }
            }
          }
        }`,
        {
          cache: context.storefront.CacheNone(),
        },
      );
      const matchedNode = locRes?.locations?.nodes?.find((n: any) => n.id === rawLocId);
      if (matchedNode?.branch_id?.value) {
        customBranchVal = matchedNode.branch_id.value;
      }
    } catch (e) {}
  }

  // `Branch ID` above resolves SESSION FIRST (sessionCustomBranchId, then
  // sessionBranchId). `Branch` used to resolve ATTRIBUTE first, so when the
  // session and the cart attribute disagreed an order could be created naming
  // one branch while carrying another branch's routing id -- the customer sees
  // one shop, the kitchen gets another. Both now resolve session first, so the
  // name and the id can no longer come from different branches. Where the two
  // sources agree, which is every healthy session, this is unchanged.
  const branchNameForOrder = sessionBranch || getAttr('Branch', '');

  // Same rule for the fulfillment type, and for the same reason: it is chosen
  // in the same picker, in the same click, as the branch. Resolving it from the
  // attribute while the branch came from the session could put Pickup on an
  // order whose branch was chosen for delivery. The session stores it lower
  // case ('pickup'/'delivery'); the order attribute is capitalised. Falls back
  // to the attribute, then to Delivery, exactly as before.
  const fulfillmentForOrder = sessionFulfillmentType
    ? String(sessionFulfillmentType).toLowerCase() === 'pickup'
      ? 'Pickup'
      : 'Delivery'
    : getAttr('Fulfillment Type', '') || 'Delivery';

  const finalAttributes = [
    {key: 'Branch', value: branchNameForOrder},
    {key: 'Branch ID', value: customBranchVal || getAttr('Branch ID', sessionBranchId)},
    {key: 'Fulfillment Type', value: fulfillmentForOrder},
  ];

  if (customBranchVal) {
    finalAttributes.push({key: 'custom.branch_id', value: customBranchVal});
    finalAttributes.push({key: 'branch_id', value: customBranchVal});
  }

  const deliveryDateVal = getAttr('delivery_date', sessionDate);
  if (deliveryDateVal) {
    finalAttributes.push({key: 'delivery_date', value: deliveryDateVal});
  }

  const timeSlotVal = getAttr('Time Slot', sessionTimeSlot);
  if (timeSlotVal) {
    finalAttributes.push({key: 'Time Slot', value: timeSlotVal});
  }

  /**
   * Carry the Storefront cart id into the order.
   *
   * The CRM's abandoned-cart record is keyed on the `cartId` the browser sent
   * while the shopper was still shopping --
   * `gid://shopify/Cart/<token>?key=...`. The `orders/create` webhook, which is
   * where that record gets closed, never sees it: a Shopify order carries
   * `cart_token` and `checkout_token`, which are different values. Closing on
   * those would open a SECOND record rather than close the first, and the
   * shopper would still be chased over a cart they had already paid for.
   *
   * Attributes set here arrive on the order as `note_attributes`, so this is
   * what lets the webhook name the same cart the CRM opened.
   */
  if (cart?.id) {
    finalAttributes.push({key: 'cart_id', value: String(cart.id)});
  }

  // Preserve other attributes (like loyalty_points, gift_card_codes), but EXCLUDE ax_store_id keys
  rawAttributes.forEach((attr: any) => {
    const isAxKey = ['custom.ax_store_id', 'ax_store_id', 'ax store id'].includes(
      attr.key.toLowerCase().trim(),
    );
    if (!isAxKey && !finalAttributes.find((f) => f.key === attr.key)) {
      finalAttributes.push({key: attr.key, value: attr.value || ''});
    }
  });

  // 4. Update the cart attributes and cart note on Shopify server
  try {
    await context.cart.updateAttributes(finalAttributes);
  } catch (err) {
    console.error('[CHECKOUT] Attributes update failed:', err);
  }

  // Format plaintext note block for fallback — used only in URL query params, NOT written to Shopify cart note
  const branchName = finalAttributes.find(
    (a: any) => a.key === 'Branch',
  )?.value;
  const branchId = finalAttributes.find(
    (a: any) => a.key === 'Branch ID',
  )?.value;
  const fulfillmentType = finalAttributes.find(
    (a: any) => a.key === 'Fulfillment Type',
  )?.value;
  const isPickup = fulfillmentType?.toLowerCase() === 'pickup';
  const branchNoteBlock = `[Fulfillment: ${fulfillmentType || 'Delivery'}, Branch: ${branchName || 'N/A'}, Branch ID: ${branchId || 'N/A'}, custom.branch_id: ${customBranchVal || 'N/A'}, delivery_date: ${deliveryDateVal || 'N/A'}, Time Slot: ${timeSlotVal || 'N/A'}]`;

  // Only pass the customer-written note — do NOT modify the Shopify cart note with internal metadata
  const customerNote = (cart.note || '')
    .replace(/\[Fulfillment:[^\]]*\]/g, '')
    .trim();

  const isBypassToken = customToken === 'dev-bypass-token';

  let profile: {name?: string; phone?: string} = {};
  if (isBypassToken) {
    profile = {name: 'Dev Bypass User', phone: '966501111111'};
  } else if (customToken) {
    const api = new SaadeddinApi(env, customToken);
    try {
      profile = await api.getProfile();
    } catch (e) {
      console.warn(
        '[CHECKOUT] getProfile failed, continuing checkout gracefully:',
        e,
      );
    }
  }

  const pointsAttr = finalAttributes.find(
    (a: any) => a.key === 'loyalty_points',
  )?.value;
  const pointsToRedeem = pointsAttr ? parseInt(pointsAttr) : undefined;

  const payload = {
    cart: {
      subtotal: parseFloat(cart.cost.subtotalAmount.amount),
      items: cart.lines.nodes.map((line: any) => ({
        id: line.merchandise.sku || line.merchandise.id,
        name: line.merchandise.product.title,
        price: parseFloat(line.merchandise.price.amount),
        quantity: line.quantity,
      })),
    },
    phone: profile.phone,
    customerName: profile.name,
    pointsToRedeem,
    deliveryType: isPickup ? 'Pick Up' : 'Delivery',
    branchId: customBranchVal || branchId || '',
    axStoreId: sessionAxStoreId || '',
    noteAttributes: finalAttributes.map((a: any) => ({
      name: a.key,
      value: a.key === 'Time Slot' ? extractMinTime(a.value) : a.value,
    })),
    attributes: finalAttributes.map((a: any) => ({
      key: a.key,
      value: a.key === 'Time Slot' ? extractMinTime(a.value) : a.value,
    })),
    timeSlotMin: extractMinTime(timeSlotVal),
    idempotencyKey: `order-${Date.now()}`,
  };

  try {
    let checkoutUrl = cart.checkoutUrl;
    if (checkoutUrl) {
      const urlObj = new URL(checkoutUrl);
      urlObj.searchParams.set('locale', lang);
      if (finalAttributes.length > 0) {
        finalAttributes.forEach((attr: any) => {
          if (attr.key && attr.value) {
            urlObj.searchParams.set(`attributes[${attr.key}]`, attr.value);
            urlObj.searchParams.set(`note_attributes[${attr.key}]`, attr.value);
          }
        });
      }

      // Check if current branch & selected delivery time slot qualify for promo free delivery
      let isPromoFreeDelivery = false;
      try {
        const {getAdminToken, getAdminDomain} = await import('~/lib/shopify-admin.server');
        const shopDomain = getAdminDomain(env);
        const adminToken = await getAdminToken(env);
        if (shopDomain && adminToken) {
          const locRes = await fetch(`https://${shopDomain}/admin/api/2024-10/graphql.json`, {
            method: 'POST',
            headers: {
              'X-Shopify-Access-Token': adminToken,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              query: `{
                locations(first: 250) {
                  nodes {
                    id
                    name
                    metafields(first: 50) {
                      nodes { key namespace value }
                    }
                  }
                }
              }`
            }),
          });
          const locData = (await locRes.json()) as any;
          const adminLocs = locData?.data?.locations?.nodes || [];
          const matchedLoc = adminLocs.find((l: any) => {
            const locNumId = String(l.id || '').split('/').pop();
            const targetNumId = String(branchId || '').split('/').pop();
            return (targetNumId && locNumId === targetNumId) || (branchName && l.name?.toLowerCase().trim() === branchName.toLowerCase().trim());
          });
          if (matchedLoc) {
            const {checkBranchFreeDeliveryInterval} = await import('~/lib/promo-delivery');
            const promoResult = checkBranchFreeDeliveryInterval(matchedLoc, timeSlotVal);
            isPromoFreeDelivery = promoResult.isPromoFreeDelivery;
          }
        }
      } catch (promoErr) {
        console.error('[CHECKOUT INITIATE] Promo check error:', promoErr);
      }

      const knownPromoCodes = ['freeshipping', 'branch free delivery promo'];
      const hasFreeShippingCode = cart?.discountCodes?.some((d: any) =>
        knownPromoCodes.includes(String(d.code || '').toLowerCase().trim())
      ) || false;

      if (isPromoFreeDelivery || hasFreeShippingCode) {
        urlObj.searchParams.set('discount', 'freeshipping');
        try {
          const existingCodes = cart?.discountCodes?.map((d: any) => d.code)?.filter((c: string) => c !== 'Branch Free Delivery Promo') || [];
          const newCodes = Array.from(new Set([...existingCodes, 'freeshipping']));
          await context.cart.updateDiscountCodes(newCodes);
        } catch (discErr) {
          console.error('[CHECKOUT INITIATE] Failed to update cart discount codes:', discErr);
        }
      }

      // Build the order note: customer's written note + internal metadata block
      // The metadata block is only passed via the URL — it is NOT stored in the Shopify cart note
      const urlNote = customerNote
        ? `${customerNote}\n\n${branchNoteBlock}`
        : branchNoteBlock;
      urlObj.searchParams.set('note', urlNote);
      checkoutUrl = urlObj.toString();
    }

    /**
     * --- Pre-select the branch's own delivery option ---
     *
     * Branch delivery fees are Shopify LOCAL DELIVERY, set per location. An
     * address inside a branch's delivery area is therefore quoted twice:
     *
     *     قياسي        25.00   <- the shop-wide standard rate
     *     توصيل محلي    40.00   <- the branch's own fee
     *
     * Shopify pre-selects the cheaper one, so a shopper in Al Qurayyat lands
     * on 25 and pays 25 -- while the cart, which reads the local delivery
     * quote, told them 40. Neither number is wrong on its own; they simply
     * disagree, which is the fault this whole handover exists to prevent.
     *
     * Selecting the local option here makes checkout OPEN on the branch's fee,
     * and the cart's figure is then the one Shopify charges.
     *
     * This sets the default, it does not enforce it: the shopper can still
     * switch back to قياسي. Removing that choice needs a Delivery
     * Customization function -- see `shopify-delivery-function/` -- which is a
     * separate decision. Fixing the default is the part that needs no app.
     *
     * `deliveryMethodType` is LOCAL for local delivery. Best effort
     * throughout: a cart with no local option, a group already on the right
     * one, or a failed mutation all leave checkout exactly as it would have
     * been.
     */
    if (!isPickupSession) {
      try {
        const quoted: any = await context.storefront.query(
          `#graphql
          query CheckoutLocalDeliveryOptions($cartId: ID!) {
            cart(id: $cartId) {
              deliveryGroups(first: 10) {
                nodes {
                  id
                  selectedDeliveryOption { handle }
                  deliveryOptions {
                    handle
                    title
                    deliveryMethodType
                    estimatedCost { amount }
                  }
                }
              }
            }
          }`,
          {variables: {cartId: cart.id}, cache: context.storefront.CacheNone()},
        );

        const selections: Array<{
          deliveryGroupId: string;
          deliveryOptionHandle: string;
        }> = [];

        const quotedGroups = quoted?.cart?.deliveryGroups?.nodes ?? [];

        /**
         * Every option the CART was quoted, printed whether or not a local one
         * turns up.
         *
         * Without this the "no local option" case was silent and looked
         * identical to the block never running. Checkout offers «توصيل محلي»
         * for this address; if the cart is not offered the same thing, that
         * difference is the fact worth knowing, and no amount of storefront
         * code will conjure an option Shopify has not quoted.
         */
        console.log(
          '[CHECKOUT DIAGNOSTIC] Cart was quoted:',
          quotedGroups.length === 0
            ? 'NO DELIVERY GROUPS AT ALL'
            : quotedGroups
                .map(
                  (g: any, i: number) =>
                    `group${i}[${(g?.deliveryOptions ?? [])
                      .map(
                        (o: any) =>
                          `${o?.title}=${o?.estimatedCost?.amount}(${o?.deliveryMethodType})`,
                      )
                      .join(', ') || 'no options'}]`,
                )
                .join(' '),
        );

        for (const group of quotedGroups) {
          const local = (group?.deliveryOptions ?? []).find(
            (o: any) => String(o?.deliveryMethodType).toUpperCase() === 'LOCAL',
          );
          if (!local?.handle) continue;
          // Already on it; selecting again would be a wasted round trip.
          if (group?.selectedDeliveryOption?.handle === local.handle) continue;
          if (!group?.id) continue;

          selections.push({
            deliveryGroupId: group.id,
            deliveryOptionHandle: local.handle,
          });
          console.log(
            '[CHECKOUT DIAGNOSTIC] Selecting local delivery:',
            `${local.title} ${local.estimatedCost?.amount}`,
          );
        }

        if (selections.length > 0) {
          const selResult: any = await (context.cart as any)
            .updateSelectedDeliveryOption(selections);
          const selErrors =
            selResult?.cartSelectedDeliveryOptionsUpdate?.userErrors ||
            selResult?.userErrors ||
            [];
          if (selErrors.length > 0) {
            console.warn(
              '[CHECKOUT DIAGNOSTIC] Local delivery selection refused:',
              JSON.stringify(selErrors),
            );
          }
        }
      } catch (selErr: any) {
        // Never fatal: the shopper simply picks the option themselves.
        console.warn(
          '[CHECKOUT DIAGNOSTIC] Could not pre-select local delivery:',
          selErr?.message || selErr,
        );
      }
    }

    /**
     * What the cart actually holds at the moment of handover.
     *
     * Everything logged above this point is what we TRIED to set. Nothing read
     * back the result, so two different faults produced the same silence: a
     * cart with no customer association, and a cart with no delivery address.
     * The first shows up at checkout as «تسجيل الدخول» on a shopper who is
     * signed in; the second as «أدخل عنوان الشحن» -- and from the storefront
     * logs alone the two were indistinguishable from a normal handover.
     *
     * `deliveryGroups.deliveryAddress` is the address the cart was PRICED
     * with, which is the one that decides the fee -- more useful here than the
     * preference we asked for, because it is what Shopify agreed to.
     *
     * Read-only, best effort, and never allowed to hold up the redirect.
     */
    try {
      const diag: any = await context.storefront.query(
        `#graphql
        query CheckoutCartDiagnostic($cartId: ID!) {
          cart(id: $cartId) {
            id
            buyerIdentity {
              email
              phone
              customer { id }
            }
            deliveryGroups(first: 5) {
              nodes {
                deliveryAddress {
                  address1
                  address2
                  city
                  province
                  zip
                }
                selectedDeliveryOption {
                  title
                  estimatedCost { amount currencyCode }
                }
              }
            }
          }
        }`,
        {
          variables: {cartId: cart.id},
          cache: context.storefront.CacheNone(),
        },
      );

      const dc = diag?.cart;
      const group = dc?.deliveryGroups?.nodes?.[0];
      console.log(
        '[CHECKOUT DIAGNOSTIC] Cart at handover —',
        `customer=${dc?.buyerIdentity?.customer?.id || 'NONE (checkout will treat this shopper as a guest)'}`,
        `email=${dc?.buyerIdentity?.email || 'none'}`,
        `phone=${dc?.buyerIdentity?.phone || 'none'}`,
        `address=${
          group?.deliveryAddress
            ? `${group.deliveryAddress.address1 || '?'} / ${group.deliveryAddress.city || 'NO CITY'} / ${group.deliveryAddress.province || 'no province'}`
            : 'NONE (checkout will ask for one)'
        }`,
        `rate=${
          group?.selectedDeliveryOption
            ? `${group.selectedDeliveryOption.title} ${group.selectedDeliveryOption.estimatedCost?.amount} ${group.selectedDeliveryOption.estimatedCost?.currencyCode}`
            : 'none selected'
        }`,
      );
    } catch (diagErr: any) {
      console.warn(
        '[CHECKOUT DIAGNOSTIC] Could not read the cart back:',
        diagErr?.message || diagErr,
      );
    }

    if (checkoutUrl) {
      console.log('[CHECKOUT DIAGNOSTIC SUCCESS] Redirecting to Shopify Checkout URL:', checkoutUrl);
      console.log('====================================================\n');
      // Store backup of cart lines in session in case Shopify locks/clears cart on checkout
      const backupLines = cart.lines.nodes.map((line: any) => ({
        merchandiseId: line.merchandise.id,
        quantity: line.quantity,
      }));
      session.set('backupCartLines', JSON.stringify(backupLines));

      const existingCartId = cart.id || (await context.cart.getCartId());
      const headers = existingCartId ? context.cart.setCartId(existingCartId) : new Headers();
      headers.append('Set-Cookie', await session.commit());

      return redirect(checkoutUrl, { headers });
    }
    console.log('[CHECKOUT DIAGNOSTIC FAIL] No checkoutUrl available, redirecting back to cart');
    console.log('====================================================\n');
    /** The worst of them: the shopper cannot check out at all. */
    void reportCheckoutError('no_checkout_url', 'Cart produced no checkoutUrl; shopper returned to cart');
    return redirect(lang === 'en' ? '/en/cart' : '/cart');
  } catch (error: any) {
    console.error('[CHECKOUT DIAGNOSTIC CATCH ERROR]', error);
    void reportCheckoutError('unhandled', error?.message || String(error));
    console.log('====================================================\n');
    return redirect(lang === 'en' ? `/en/cart` : `/cart`);
  }
}
