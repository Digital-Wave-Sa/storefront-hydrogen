import { data, type ActionFunctionArgs } from 'react-router';
import { adminApiQuery } from '../lib/admin.server';
import { getAdminToken } from '~/lib/shopify-admin.server';

export async function action({ request, context }: ActionFunctionArgs) {
    const env = context.env as any;
    
    // Standardized shop domain detection for Admin API
    const rawShop = env.SHOPIFY_SHOP || env.PUBLIC_STORE_DOMAIN || 'the-beauty-secrets-ksa';
    const shopDomain = rawShop.includes('myshopify.com') ? rawShop : `${rawShop.split('.')[0]}.myshopify.com`;

    const formData = await request.formData();
    const productHandle = formData.get('productHandle') || 'general-feedback';
    const customerName = formData.get('customerName') || 'Verified Customer';
    const orderId = formData.get('orderId');
    const rating = formData.get('rating');
    const branchRating = formData.get('branchRating');
    const branchName = formData.get('branchName');
    const title = formData.get('title');
    const comment = formData.get('comment');
    const language = formData.get('language') || 'en';

    if (!rating) {
        return data({ error: 'Missing rating' }, { status: 400 });
    }

    const mutation = `
        mutation CreateReview($handle: String!, $fields: [MetaobjectFieldInput!]!) {
            metaobjectCreate(metaobject: {
                type: "storefront_review",
                handle: $handle,
                fields: $fields
            }) {
                metaobject {
                    id
                }
                userErrors {
                    field
                    message
                }
            }
        }
    `;

    // Unique handle for the review
    const reviewHandle = `review-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

    const fields = [
        { key: "product_handle", value: String(productHandle) },
        { key: "customer_name", value: String(customerName) },
        { key: "rating", value: String(parseInt(String(rating)) || 0) }, // Shopify Admin API accepts strings for Integers if they are numeric
        { key: "review_title", value: String(title || '') },
        { key: "review_comment", value: String(comment || '') },
        { key: "language", value: String(language) },
        { key: "status", value: "Pending" }
    ];

    const finalLocationId = formData.get('locationId') || formData.get('location_id');
    if (finalLocationId) {
        fields.push({ key: "location_id", value: String(finalLocationId) });
    }
    if (branchName) fields.push({ key: "location_name", value: String(branchName) });

    try {
        const token = await getAdminToken(env);
        const result = await adminApiQuery(shopDomain, token, mutation, {
            handle: reviewHandle,
            fields: fields
        }) as any;

        if (result.errors) {
            console.error('[REVIEWS] GraphQL Error:', result.errors[0].message);
            return data({ error: result.errors[0].message }, { status: 400 });
        }

        if (result.data?.metaobjectCreate?.userErrors?.length) {
            const errorMsg = result.data.metaobjectCreate.userErrors[0].message;
            console.error('[REVIEWS] User Error:', errorMsg);
            return data({ error: errorMsg }, { status: 400 });
        }

        // --- UPDATE LOCATION RATING ---
        const locId = formData.get('locationId');
        if (locId) {
            let formattedLocId = String(locId);
            if (!formattedLocId.includes('gid://')) {
                formattedLocId = `gid://shopify/Location/${formattedLocId}`;
            }

            // Use branchRating if explicitly provided, otherwise fallback to product rating
            const submittedRating = parseFloat(String(branchRating || rating)) || 0;

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
                    const locResult = await adminApiQuery(shopDomain, token, fetchLocationQuery, { id: formattedLocId }) as any;
                    
                    if (locResult.data?.location) {
                        const currentRating = parseFloat(locResult.data.location.rating?.value || '0');
                        const currentCount = parseInt(locResult.data.location.ratingCount?.value || '0', 10);
                        
                        const newCount = currentCount + 1;
                        const newAverage = ((currentRating * currentCount) + submittedRating) / newCount;
                        
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
                                    namespace: "custom",
                                    key: "rating",
                                    type: "number_decimal",
                                    value: newAverage.toFixed(1)
                                },
                                {
                                    ownerId: formattedLocId,
                                    namespace: "custom",
                                    key: "rating_count",
                                    type: "number_integer",
                                    value: newCount.toString()
                                }
                            ]
                        });
                    }
                } catch (locErr) {
                    console.error('[REVIEWS] Failed to update location rating:', locErr);
                    // Do not block review submission success if branch rating fails
                }
            }
        }

        return data({ success: true });

    } catch (err: any) {
        console.error('[REVIEWS] Submission failed:', err.message);
        return data({ error: 'Auth or Submission failed', details: err.message }, { status: 401 });
    }
}



