import {
  data,
  type ActionFunctionArgs,
  type LoaderFunctionArgs,
} from 'react-router';

/**
 * GET /api/stock-notification
 *
 * What this shopper is waiting for. The middleware can only list by phone --
 * it is the key it deduplicates and cancels on -- and the phone comes from the
 * SESSION, never from a query parameter: `?phone=` would otherwise be an open
 * read of anybody's waiting list, the same hole `resolveSelf` was written to
 * close for loyalty and wallet.
 *
 * With `?variantId=` (and optionally `?locationId=`) it also answers the one
 * question the modal needs: is this shopper already on the list for THIS
 * product at THIS branch? The modal cannot work that out for itself -- the
 * middleware files a subscription under the SKU, and no product fragment on
 * the storefront selects `sku`, so the browser only ever holds a variant id.
 * The match is therefore made here, where the SKU can be looked up.
 *
 * A guest gets a plain "no" rather than a 401. The modal probes this on every
 * open, and an error in the console for the ordinary case of not being signed
 * in is noise that hides real ones.
 */
export async function loader({request, context}: LoaderFunctionArgs) {
  const {resolveSelf} = await import('~/lib/session-identity.server');
  const {listNotifySubscriptions, resolveProductCode, normalizeLocationId} =
    await import('~/lib/notify-me.server');

  const self = await resolveSelf(context);
  if (!self) {
    return data({
      success: true,
      signedIn: false,
      hasPhone: false,
      subscriptions: [],
      subscribed: false,
      subscriptionId: null,
    });
  }

  const {ok, subscriptions} = await listNotifySubscriptions({
    env: context.env,
    phone: self.phone,
  });

  const url = new URL(request.url);
  const variantId = url.searchParams.get('variantId');
  const locationId = url.searchParams.get('locationId');

  let match: any = null;
  if (variantId && subscriptions.length > 0) {
    const productCode = await resolveProductCode(context.storefront, variantId);
    const wantedLocation = normalizeLocationId(locationId);

    match =
      subscriptions.find(
        (s) =>
          s.productCode &&
          productCode &&
          s.productCode === productCode &&
          // No branch in the query means "anywhere" -- better to say "you are
          // already on the list" than to offer a second identical alert.
          (!wantedLocation ||
            normalizeLocationId(s.locationId) === wantedLocation),
      ) || null;
  }

  return data({
    success: ok,
    signedIn: true,
    hasPhone: Boolean(self.phone),
    subscriptions,
    subscribed: Boolean(match),
    subscriptionId: match?.id || null,
  });
}

/**
 * A single Admin GraphQL call.
 *
 * Kept when the STOQ integration was removed: the manager-notification step
 * still uses it to read `custom.product_manager` and `custom.regional_manager`
 * off the product. Deleting it broke that step with a ReferenceError --
 * swallowed by its own catch, so subscriptions carried on working while nobody
 * was emailed.
 */
async function executeAdminQuery(
  query: string,
  variables: Record<string, any>,
  adminToken: string,
  shopDomain: string,
) {
  const res = await fetch(
    `https://${shopDomain}/admin/api/2024-04/graphql.json`,
    {
      method: 'POST',
      headers: {
        'X-Shopify-Access-Token': adminToken,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({query, variables}),
    },
  );
  return (await res.json()) as any;
}

/**
 * POST /api/stock-notification
 *
 * Registers a shopper on the waiting list for a product that is out of stock
 * at their branch, by forwarding to the middleware's `/notify-me/subscribe`.
 * The middleware owns the list and forwards to the ERP itself, so this is the
 * only copy; it used to also write to the STOQ app and a `stock_alerts`
 * metafield, which meant three records that could disagree.
 *
 * Managers are still emailed separately, which is a different job: telling the
 * business a product is being asked for, rather than remembering who asked.
 */
export async function action({request, context}: ActionFunctionArgs) {
  if (request.method !== 'POST') {
    return data({error: 'Method not allowed'}, {status: 405});
  }

  /**
   * Leaving the waiting list.
   *
   * The middleware cancels by (phone, productCode, locationId) or by the id it
   * handed back at subscribe time. Phone is the reliable one -- it is also the
   * key it deduplicates on -- so an email-only subscriber can only be removed
   * with the id, which is why the subscribe response's id is worth keeping.
   */
  {
    const url = new URL(request.url);
    if (url.searchParams.get('intent') === 'unsubscribe') {
      const isEnRequest = context.storefront.i18n.language === 'EN';
      const failure = {
        success: false,
        error: isEnRequest
          ? 'We could not remove you from the list right now. Please try again shortly.'
          : 'تعذّر إلغاء التنبيه حالياً. يرجى المحاولة بعد قليل.',
      };

      let payload: any = {};
      try {
        payload = (await request.json()) as any;
      } catch {
        return data({success: false, error: 'Invalid JSON body'}, {status: 400});
      }

      const {resolveSelf, identifierMatchesSession} = await import(
        '~/lib/session-identity.server'
      );
      const {cancelNotifySubscription, resolveProductCode} = await import(
        '~/lib/notify-me.server'
      );

      /**
       * Whose subscription is this?
       *
       * The phone comes from the session. A phone in the request body is only
       * honoured when it is the signed-in shopper's own -- otherwise
       * `{"phone": "05XXXXXXXX", "productCode": ...}` would cancel a stranger's
       * alert, which is the same open-lookup shape `resolveSelf` exists to
       * close on the loyalty and wallet endpoints.
       *
       * An id is accepted on its own: it was handed to this browser at
       * subscribe time and is the only handle an email-only subscriber has.
       */
      const self = await resolveSelf(context);
      const supplied = payload.phone ? String(payload.phone).trim() : '';
      const phone = self?.phone
        ? String(self.phone)
        : supplied && self && identifierMatchesSession(self, supplied)
          ? supplied
          : null;

      const subscriptionId = payload.subscriptionId
        ? String(payload.subscriptionId)
        : null;

      if (!subscriptionId && !phone) {
        return data(
          {
            success: false,
            error: isEnRequest
              ? 'Please sign in to manage your stock alerts.'
              : 'يرجى تسجيل الدخول لإدارة تنبيهات التوفر.',
          },
          {status: 401},
        );
      }

      /**
       * The modal knows the variant, never the SKU -- so the code is resolved
       * here, the same way subscribe resolves it.
       *
       * Resolved even when an id was sent, because the id is no longer trusted
       * on its own: a `DELETE /notify-me/:id` that answers "not found" falls
       * back to cancelling by (phone, productCode, locationId), and that
       * fallback only exists if the code was looked up first.
       */
      const productCode =
        (payload.productCode && String(payload.productCode)) ||
        (payload.variantId
          ? await resolveProductCode(context.storefront, payload.variantId)
          : null);

      const {ok} = await cancelNotifySubscription({
        env: context.env,
        subscriptionId,
        phone,
        productCode,
        locationId: payload.locationId,
      });

      return ok ? data({success: true}) : data(failure, {status: 503});
    }
  }

  const {env} = context;
  const {PUBLIC_STORE_DOMAIN} = (env || {}) as any;

  try {
    const body = (await request.json()) as any;
    const {
      email,
      phone,
      variantId,
      productId,
      productHandle,
      imageUrl,
      productTitle,
      locationId,
      locationName,
      branchName,
      country = 'SA',
      shopifyMarketId,
      customerName,
      acceptsMarketing = true,
      quantity = 1,
    } = body;

    const isEnRequest = context.storefront.i18n.language === 'EN';

    /** Used by the manager-notification step's Admin API call, below. */
    const shopDomain =
      (env as any)?.PUBLIC_STORE_DOMAIN ||
      (env as any)?.SHOPIFY_STORE_DOMAIN ||
      'saadeldeenshop-x21xumcd.myshopify.com';

    if (!email || !variantId) {
      /**
       * Was 'Email and variant ID are required' — our field names, shown to
       * a shopper who can only do anything about one of them.
       */
      return data(
        {
          error:
            context.storefront.i18n.language === 'EN'
              ? 'Please enter a valid email address.'
              : 'يرجى إدخال بريد إلكتروني صحيح.',
        },
        {status: 400},
      );
    }

    const numericLocationId =
      locationId && String(locationId).includes('/')
        ? String(locationId).split('/').pop()
        : (locationId && String(locationId).trim()) || '80198500503';

    /**
     * The waiting list lives in the middleware, and only there.
     *
     * This used to write the subscription to three places at once: the
     * middleware, the STOQ app, and a `stock_alerts` metafield on the shop.
     * Three copies, three chances to disagree, and a hardcoded STOQ key in the
     * repository. The middleware now forwards to the ERP itself (`/logNotifyMe`),
     * so it is the record.
     */
    const middlewareUrl =
      (env as any)?.SAADEDDIN_API_URL ||
      (env as any)?.CUSTOM_API_URL ||
      'https://api.saadeddin.top';

    /**
     * `productCode` is the SKU. Resolved by the shared helper, so that the
     * subscribe, unsubscribe and "are you already subscribed?" paths all file
     * the shopper under the SAME code -- three spellings of it is exactly how
     * an existing subscription would read as absent.
     */
    const {resolveProductCode} = await import('~/lib/notify-me.server');
    const productCode = await resolveProductCode(context.storefront, variantId);

    /**
     * The phone matters more than it looks. The middleware deduplicates on
     * (phone, productCode, locationId) and can only cancel by phone -- an
     * email-only subscription creates a new row every time somebody presses
     * the button and can be cancelled by id alone. So a signed-in shopper's
     * phone is sent whenever the session has one.
     */
    const sessionPhone = await context.session.get('loginOtpPhone');
    const resolvedPhone =
      (phone && String(phone).trim()) ||
      (sessionPhone ? String(sessionPhone) : '') ||
      null;

    let subscribed = false;
    let subscriptionId: string | null = null;

    try {
      const res = await fetch(`${middlewareUrl}/notify-me/subscribe`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-client-source': 'web',
        },
        body: JSON.stringify({
          ...(resolvedPhone ? {phone: resolvedPhone} : {}),
          email,
          productCode,
          locationId: String(numericLocationId),
          productTitle: productTitle || 'Product',
          ...(branchName || locationName
            ? {branchName: branchName || locationName}
            : {}),
          ...(productId ? {productId: String(productId)} : {}),
          ...(variantId ? {variantId: String(variantId)} : {}),
          ...(productHandle ? {productHandle: String(productHandle)} : {}),
          ...(imageUrl ? {imageUrl: String(imageUrl)} : {}),
          source: 'web',
        }),
      });

      const payload = (await res.json().catch(() => ({}))) as any;
      subscribed = res.ok && payload?.success === true;
      subscriptionId = payload?.data?.id || null;

      if (!subscribed) {
        console.error(
          `[NOTIFY_ME] Subscribe rejected (HTTP ${res.status}):`,
          JSON.stringify(payload).slice(0, 300),
        );
      }
    } catch (mwErr) {
      console.error('[NOTIFY_ME] Subscribe failed:', mwErr);
    }

    /**
     * A failure is reported as one.
     *
     * This route used to answer `{success: true}` from every path, including
     * its own outermost catch, "so customer experience is smooth" -- so with
     * the middleware down a shopper was promised an email that nothing would
     * ever send. Being told to try again is better than being told a lie.
     */
    if (!subscribed) {
      return data(
        {
          success: false,
          error:
            (isEnRequest
              ? 'We could not add you to the waiting list right now. Please try again shortly.'
              : 'تعذّر تسجيلك في قائمة الانتظار حالياً. يرجى المحاولة بعد قليل.'),
        },
        {status: 503},
      );
    }

    // 4. Send email notification to Product Manager & Regional Manager from Product Metafields (custom.product_manager, custom.regional_manager)
    try {
      const {getAdminToken} = await import('~/lib/shopify-admin.server');
      const {sendEmail, sendFormEmailNotification} = await import('~/lib/email.server');
      const adminToken = await getAdminToken(env || {}).catch(() => null);

      let pmEmail: string | null = null;
      let rmEmail: string | null = null;
      let resolvedProductTitle = productTitle || 'Product';

      if (adminToken && variantId) {
        const fullVariantId = String(variantId).includes('/')
          ? String(variantId)
          : `gid://shopify/ProductVariant/${variantId}`;

        const managerQuery = `
          query GetProductManagersFromVariant($variantId: ID!) {
            productVariant(id: $variantId) {
              title
              product {
                title
                productManager: metafield(namespace: "custom", key: "product_manager") {
                  value
                }
                regionalManager: metafield(namespace: "custom", key: "regional_manager") {
                  value
                }
              }
            }
          }
        `;

        const managerRes = await executeAdminQuery(
          managerQuery,
          {variantId: fullVariantId},
          adminToken,
          shopDomain,
        );

        const variantObj = managerRes?.data?.productVariant;
        const productObj = variantObj?.product;

        if (productObj) {
          if (productObj.title) resolvedProductTitle = productObj.title;
          pmEmail = productObj.productManager?.value || null;
          rmEmail = productObj.regionalManager?.value || null;
        }
      }

      // Collect manager emails
      const managerRecipients: string[] = [];
      if (pmEmail && String(pmEmail).includes('@')) managerRecipients.push(String(pmEmail).trim());
      if (rmEmail && String(rmEmail).includes('@')) managerRecipients.push(String(rmEmail).trim());

      console.log(`[STOCK_NOTIFICATION MANAGERS RESOLVED] Product: "${resolvedProductTitle}", Managers: ${managerRecipients.length > 0 ? managerRecipients.join(', ') : 'None'}`);

      if (managerRecipients.length > 0) {
        const emailSubject = `[Saadeddin Alert] Back in Stock Request: ${resolvedProductTitle}`;
        const emailHtml = `
          <div style="font-family: 'Cairo', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e0e0e0; border-radius: 12px; background-color: #FEF8EB; color: #234745; text-align: right; direction: rtl;">
            <div style="text-align: center; margin-bottom: 16px; background-color: #234745; padding: 12px; border-radius: 8px;">
              <img src="https://cdn.shopify.com/s/files/1/0821/1752/5737/files/logo.png" alt="Saadeddin Pastry" style="height: 40px; object-fit: contain;" />
            </div>
            <h3 style="color: #234745; margin-top: 0;">📦 تنبيه طلب إشعار بتوفر المنتج (Back in Stock Alert)</h3>
            <p>عزيزي مدير المنتج / مدير المنطقة،</p>
            <p>قام أحد العملاء بطلب إشعار فور توفر المنتج التالي في المخزون:</p>
            <div style="background: #ffffff; padding: 16px; border-radius: 8px; border: 1px solid #ebdcc5; margin: 16px 0;">
              <p style="margin: 6px 0;"><strong>اسم المنتج:</strong> ${resolvedProductTitle}</p>
              <p style="margin: 6px 0;"><strong>رمز المعرّف (Variant ID):</strong> ${variantId}</p>
              <p style="margin: 6px 0;"><strong>الفرع / الموقع:</strong> ${locationName || 'Global'}</p>
              <p style="margin: 6px 0;"><strong>بريد العميل المطلوب إشعاره:</strong> ${email}</p>
            </div>
            <p style="font-size: 12px; color: #888888; text-align: center; border-top: 1px solid #ebdcc5; padding-top: 12px;">
              تم إرسال هذا التنبيه آلياً بناءً على الحقول المخصصة لمدير المنتج ومدير المنطقة 
              (<code>custom.product_manager</code>, <code>custom.regional_manager</code>).
            </p>
          </div>
        `;

        await sendEmail({
          to: managerRecipients,
          subject: emailSubject,
          html: emailHtml,
          env,
        });
        console.log(`[STOCK_NOTIFICATION MANAGER EMAILS OK] Sent alert to managers: ${managerRecipients.join(', ')}`);
      }

      // Also send general admin notification
      await sendFormEmailNotification(
        {
          formType: 'contact',
          formTitle: 'Back in Stock Request (طلب التنبيه بتوفر المنتج)',
          fullName: customerName || email.split('@')[0],
          email,
          phone: '',
          subject: `Back in Stock Alert Request - ${resolvedProductTitle}`,
          message: `Customer requested back in stock notification for: ${resolvedProductTitle} (Variant ID: ${variantId}, Location: ${locationName || 'N/A'})`,
        },
        env,
      );
    } catch (mgrErr) {
      console.warn('[STOCK_NOTIFICATION MANAGER EMAILS WARN]', mgrErr);
    }

    console.log(
      `[STOCK_NOTIFICATION SUCCESS] Registered: email=${email}, variant=${variantId}, location=${locationName || 'N/A'}`,
    );

    /**
     * The id comes back to the caller, because for an email-only subscriber it
     * is the only way to cancel: the middleware deduplicates and unsubscribes
     * on (phone, productCode, locationId), and a subscription with no phone
     * can only be removed by id.
     */
    return data({success: true, subscriptionId});
  } catch (error: any) {
    console.error('[STOCK_NOTIFICATION ERROR]', error);
    /**
     * An unexpected failure is still a failure.
     *
     * This answered `{success: true}` "so customer experience is smooth",
     * which meant every fault in this route -- an outage, a bad payload, a
     * thrown lookup -- ended with the shopper being told they would be
     * emailed when the item returned. Nothing was recorded and nobody was
     * ever going to write to them.
     */
    return data(
      {
        success: false,
        error:
          context.storefront.i18n.language === 'EN'
            ? 'We could not add you to the waiting list right now. Please try again shortly.'
            : 'تعذّر تسجيلك في قائمة الانتظار حالياً. يرجى المحاولة بعد قليل.',
      },
      {status: 500},
    );
  }
}
