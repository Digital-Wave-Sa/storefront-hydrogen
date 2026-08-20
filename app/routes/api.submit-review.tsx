import {data, type ActionFunctionArgs} from 'react-router';
import {adminApiQuery} from '../lib/admin.server';
import {getAdminToken, getAdminDomain} from '~/lib/shopify-admin.server';
import {SaadeddinApi} from '~/lib/saadeddin-api.server';

/**
 * Helper to create a metaobject entry with automatic definition creation if missing.
 */
async function createMetaobjectWithAutoDef(
  shopDomain: string,
  token: string,
  type: string,
  handle: string,
  fields: {key: string; value: string}[],
  defName?: string,
) {
  const createMutation = `
    mutation CreateMetaobject($metaobject: MetaobjectCreateInput!) {
      metaobjectCreate(metaobject: $metaobject) {
        metaobject {
          id
          handle
        }
        userErrors {
          field
          message
        }
      }
    }
  `;

  const res = (await adminApiQuery(shopDomain, token, createMutation, {
    metaobject: {type, handle, fields},
  })) as any;

  const errors = res?.data?.metaobjectCreate?.userErrors || [];
  const needsDef = errors.some(
    (e: any) =>
      e.message?.toLowerCase().includes('definition') ||
      e.message?.toLowerCase().includes('type'),
  );

  if (needsDef) {
    const defMutation = `
      mutation CreateMetaobjectDefinition($definition: MetaobjectDefinitionCreateInput!) {
        metaobjectDefinitionCreate(definition: $definition) {
          createdDefinition {
            id
            type
          }
          userErrors {
            field
            message
          }
        }
      }
    `;

    const fieldDefinitions = fields.map((f) => ({
      name: f.key
        .replace(/_/g, ' ')
        .replace(/\b\w/g, (l) => l.toUpperCase()),
      key: f.key,
      type:
        f.key === 'comment' ||
        f.key === 'review_comment' ||
        f.key === 'items_rated'
          ? 'multi_line_text_field'
          : 'single_line_text_field',
    }));

    await adminApiQuery(shopDomain, token, defMutation, {
      definition: {
        name: defName || type.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase()),
        type,
        fieldDefinitions,
      },
    });

    // Retry metaobject creation
    return await adminApiQuery(shopDomain, token, createMutation, {
      metaobject: {type, handle, fields},
    });
  }

  return res;
}

export async function action({request, context}: ActionFunctionArgs) {
  const env = context.env as any;
  const shopDomain = getAdminDomain(env);

  const formData = await request.formData();
  const customerName = String(formData.get('customerName') || 'Verified Customer');
  const customerEmail = String(formData.get('customerEmail') || formData.get('email') || '');
  const customerPhone = String(formData.get('customerPhone') || formData.get('phone') || '');
  const orderId = formData.get('orderId');
  const branchRating = formData.get('branchRating') || formData.get('branch_rating');
  const branchName = formData.get('branchName');
  const comment = formData.get('comment');
  const language = String(formData.get('language') || 'en');
  const finalLocationId = formData.get('locationId') || formData.get('location_id');

  // Check if productRatings JSON is provided from order feedback
  const productRatingsRaw = formData.get('productRatings');
  let productRatings: Array<{handle: string; rating: number; title?: string}> = [];

  if (productRatingsRaw) {
    try {
      productRatings = JSON.parse(String(productRatingsRaw));
    } catch (e) {}
  }

  // Fallback if submitted as single product review form
  const productHandle = formData.get('productHandle');
  const singleRating = formData.get('rating');

  if (!productRatingsRaw && productHandle && singleRating) {
    productRatings.push({
      handle: String(productHandle),
      rating: parseInt(String(singleRating), 10) || 0,
    });
  }

  if (productRatings.length === 0 && !branchRating) {
    return data({error: 'Missing rating'}, {status: 400});
  }

  try {
    const token = await getAdminToken(env);
    const timestamp = Date.now();
    const cleanOrdId = orderId ? String(orderId).replace(/^#/, '').trim() : '';

    let foundOrder: any = null;

    // 1. MARK ORDER AS REVIEWED IN SHOPIFY ADMIN (ONCE)
    if (cleanOrdId) {
      try {
        const orderSearchRes = await fetch(
          `https://${shopDomain}/admin/api/2024-01/orders.json?name=%23${cleanOrdId}&status=any`,
          {
            headers: {
              'X-Shopify-Access-Token': token,
              'Content-Type': 'application/json',
            },
          },
        );
        if (orderSearchRes.ok) {
          const {orders} = await orderSearchRes.json();
          const targetOrd = (orders || []).find(
            (ord: any) =>
              String(ord.order_number || '').trim() === cleanOrdId ||
              String(ord.name || '').replace(/^#/, '').trim() === cleanOrdId,
          );

          if (targetOrd?.id) {
            foundOrder = targetOrd;
            const existingTags = targetOrd.tags
              ? targetOrd.tags.split(',').map((t: string) => t.trim())
              : [];
            if (!existingTags.includes('reviewed')) {
              existingTags.push('reviewed');
              await fetch(
                `https://${shopDomain}/admin/api/2024-01/orders/${targetOrd.id}.json`,
                {
                  method: 'PUT',
                  headers: {
                    'X-Shopify-Access-Token': token,
                    'Content-Type': 'application/json',
                  },
                  body: JSON.stringify({
                    order: {
                      id: targetOrd.id,
                      tags: existingTags.join(', '),
                    },
                  }),
                },
              );
            }
          }
        }
      } catch (tagErr) {
        console.warn('[REVIEWS] Failed to tag order as reviewed:', tagErr);
      }
    }

    // 2. CREATE SEPARATE METAOBJECT FOR ORDER REVIEW (if this is an order feedback)
    if (cleanOrdId) {
      const orderReviewHandle = `order-review-${cleanOrdId}-${timestamp}`;
      const orderReviewFields = [
        {key: 'order_id', value: cleanOrdId},
        {key: 'customer_name', value: customerName},
        {key: 'branch_rating', value: String(parseInt(String(branchRating || 5), 10) || 5)},
        {key: 'branch_name', value: String(branchName || '')},
        {key: 'location_id', value: String(finalLocationId || '')},
        {key: 'comment', value: String(comment || '')},
        {key: 'language', value: language},
        {key: 'status', value: 'Approved'},
        {key: 'items_rated', value: JSON.stringify(productRatings)},
      ];

      await createMetaobjectWithAutoDef(
        shopDomain,
        token,
        'order_review',
        orderReviewHandle,
        orderReviewFields,
        'Order Review',
      );
    }

    // 3. CREATE INDIVIDUAL STOREFRONT_REVIEW METAOBJECTS FOR EVERY REVIEWED PRODUCT IN THE ORDER
    // This guarantees that all reviewed products in the order affect the product rating!
    for (const item of productRatings) {
      if (!item.handle || item.handle === 'general-feedback' || item.rating <= 0) continue;

      const randomSuffix = Math.floor(Math.random() * 1000);
      const productReviewHandle = cleanOrdId
        ? `review-${cleanOrdId}-${item.handle}-${timestamp}-${randomSuffix}`
        : `review-${item.handle}-${timestamp}-${randomSuffix}`;

      const productReviewFields = [
        {key: 'product_handle', value: item.handle},
        {key: 'customer_name', value: customerName},
        {key: 'rating', value: String(Math.round(Number(item.rating) || 5))},
        {key: 'review_title', value: String(formData.get('title') || 'Order Feedback')},
        {key: 'review_comment', value: String(comment || '')},
        {key: 'language', value: language},
        {key: 'status', value: 'Approved'},
      ];

      if (finalLocationId) productReviewFields.push({key: 'location_id', value: String(finalLocationId)});
      if (branchName) productReviewFields.push({key: 'location_name', value: String(branchName)});

      await createMetaobjectWithAutoDef(
        shopDomain,
        token,
        'storefront_review',
        productReviewHandle,
        productReviewFields,
        'Storefront Review',
      );
    }

    // 4. UPDATE LOCATION / BRANCH RATING
    if (finalLocationId) {
      let formattedLocId = String(finalLocationId);
      if (!formattedLocId.includes('gid://')) {
        formattedLocId = `gid://shopify/Location/${formattedLocId}`;
      }

      const submittedRating = parseFloat(String(branchRating || singleRating || 0)) || 0;

      if (submittedRating > 0) {
        try {
          const fetchLocationQuery = `
            query GetLocationRating($id: ID!) {
              location(id: $id) {
                rating: metafield(namespace: "custom", key: "rating") { value }
                ratingCount: metafield(namespace: "custom", key: "rating_count") { value }
              }
            }
          `;
          const locResult = (await adminApiQuery(
            shopDomain,
            token,
            fetchLocationQuery,
            {id: formattedLocId},
          )) as any;

          if (locResult.data?.location) {
            const currentRating = parseFloat(
              locResult.data.location.rating?.value || '0',
            );
            const currentCount = parseInt(
              locResult.data.location.ratingCount?.value || '0',
              10,
            );

            const newCount = currentCount + 1;
            const newAverage =
              (currentRating * currentCount + submittedRating) / newCount;

            const updateLocationMutation = `
              mutation UpdateLocationRating($metafields: [MetafieldsSetInput!]!) {
                metafieldsSet(metafields: $metafields) {
                  userErrors { field message }
                }
              }
            `;

            await adminApiQuery(shopDomain, token, updateLocationMutation, {
              metafields: [
                {
                  ownerId: formattedLocId,
                  namespace: 'custom',
                  key: 'rating',
                  type: 'number_decimal',
                  value: newAverage.toFixed(1),
                },
                {
                  ownerId: formattedLocId,
                  namespace: 'custom',
                  key: 'rating_count',
                  type: 'number_integer',
                  value: newCount.toString(),
                },
              ],
            });
          }
        } catch (locErr) {
          console.error('[REVIEWS] Failed to update location rating:', locErr);
        }
      }
    }

    // 4. FORWARD NEGATIVE REVIEWS (1-2 STARS) TO MIDDLEWARE / CRM
    try {
      const bRatingNum = parseInt(String(branchRating || 0), 10);
      const isBranchNegative = bRatingNum > 0 && bRatingNum <= 2;
      const api = new SaadeddinApi(context.env);

      const resolvedEmail =
        customerEmail ||
        foundOrder?.email ||
        foundOrder?.customer?.email ||
        foundOrder?.contact_email ||
        'customer@saadeddin.com';

      const resolvedPhone =
        customerPhone ||
        foundOrder?.phone ||
        foundOrder?.customer?.phone ||
        foundOrder?.shipping_address?.phone ||
        foundOrder?.billing_address?.phone ||
        '+966500000000';

      const resolvedBranch = String(branchName || foundOrder?.location?.name || 'General');

      if (isBranchNegative) {
        await api.sendNegativeReview({
          orderNumber: String(cleanOrdId || 'N/A'),
          rating: bRatingNum,
          comment: String(comment || 'No comment provided'),
          customerEmail: resolvedEmail,
          customerPhone: resolvedPhone,
          branchName: resolvedBranch,
        });
      }

      for (const item of productRatings) {
        const pRatingNum = Math.round(Number(item.rating) || 0);
        if (pRatingNum > 0 && pRatingNum <= 2) {
          await api.sendNegativeReview({
            orderNumber: String(cleanOrdId || 'N/A'),
            rating: pRatingNum,
            comment: String(comment || 'No comment provided'),
            productTitle: String(item.title || item.handle || ''),
            productHandle: String(item.handle || ''),
            customerEmail: resolvedEmail,
            customerPhone: resolvedPhone,
            branchName: resolvedBranch,
          });
        }
      }
    } catch (crmErr) {
      console.warn('[REVIEWS] Negative review sync notice:', crmErr);
    }

    return data({success: true});
  } catch (err: any) {
    console.error('[REVIEWS] Submission failed:', err.message);
    return data(
      {error: 'Auth or Submission failed', details: err.message},
      {status: 401},
    );
  }
}
