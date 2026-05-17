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

    if (orderId || formData.get('locationId')) fields.push({ key: "location_id", value: String(orderId || formData.get('locationId')) });
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

        return data({ success: true });

    } catch (err: any) {
        console.error('[REVIEWS] Submission failed:', err.message);
        return data({ error: 'Auth or Submission failed', details: err.message }, { status: 401 });
    }
}



