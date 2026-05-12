import { data, type ActionFunctionArgs } from 'react-router';
import { adminApiQuery } from '../lib/admin.server';

export async function action({ request, context }: ActionFunctionArgs) {
    const { env } = context;
    
    // Standardized shop domain detection for Admin API
    const rawShop = env.SHOPIFY_SHOP || env.PUBLIC_STORE_DOMAIN || '';
    let shopDomain = rawShop;
    if (!shopDomain.includes('myshopify.com')) {
        const handle = shopDomain.replace(/^https?:\/\//, '').split('.')[0];
        shopDomain = `${handle}.myshopify.com`;
    }
    
    console.log(`[REVIEWS] Attempting review submission to: ${shopDomain}`);

    // Collect all potential tokens to try
    const potentialTokens = [
        env.SHOPIFY_ADMIN_API_ACCESS_TOKEN,
        (env as any).SHOPIFY_ADMIN_API_ACCESS_TOKENS,
        env.REVIEWS_ADMIN_API_TOKEN
    ].filter(Boolean) as string[];

    if (potentialTokens.length === 0) {
        console.error('[REVIEWS] No Admin API tokens found in environment');
        return data({ error: 'System configuration error' }, { status: 500 });
    }

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
        { key: "rating", value: String(rating) }, 
        { key: "review_title", value: String(title || '') },
        { key: "review_comment", value: String(comment || '') },
        { key: "language", value: String(language) },
        { key: "status", value: "Pending" }
    ];

    if (orderId) fields.push({ key: "order_id", value: String(orderId) });
    if (branchRating) fields.push({ key: "branch_rating", value: String(branchRating) });
    if (branchName) fields.push({ key: "location_name", value: String(branchName) });

    let lastError = null;
    for (const token of potentialTokens) {
        try {
            console.log(`[REVIEWS] Trying token starting with: ${token.substring(0, 5)}...`);
            const result = await adminApiQuery(shopDomain, token, mutation, {
                handle: reviewHandle,
                fields: fields
            });

            if (result.errors) {
                const errorMsg = result.errors[0].message;
                if (errorMsg.includes('401')) {
                    console.warn(`[REVIEWS] Token starting with ${token.substring(0, 5)} failed with 401. Trying next...`);
                    lastError = errorMsg;
                    continue; // Try next token
                }
                return data({ error: errorMsg }, { status: 400 });
            }

            if (result.data?.metaobjectCreate?.userErrors?.length) {
                const errorMsg = result.data.metaobjectCreate.userErrors[0].message;
                return data({ error: errorMsg }, { status: 400 });
            }

            console.log(`[REVIEWS] Success with token ${token.substring(0, 5)}!`);
            return data({ success: true });

        } catch (err: any) {
            console.error(`[REVIEWS] Loop error with token ${token.substring(0, 5)}:`, err.message);
            lastError = err.message;
        }
    }

    return data({ error: `Auth failed after trying ${potentialTokens.length} tokens. Last error: ${lastError}` }, { status: 401 });
}



