import { data, type ActionFunctionArgs } from 'react-router';
import { adminApiQuery } from '../lib/admin.server';

export async function action({ request, context }: ActionFunctionArgs) {
    const { env } = context;
    const adminToken = env.SHOPIFY_ADMIN_API_ACCESS_TOKEN;
    const domain = env.PUBLIC_STORE_DOMAIN;

    if (!adminToken) {
        return data({ error: 'Missing Admin API Token' }, { status: 500 });
    }

    const formData = await request.formData();
    const productHandle = formData.get('productHandle');
    const customerName = formData.get('customerName');
    const rating = formData.get('rating');
    const title = formData.get('title');
    const comment = formData.get('comment');
    const language = formData.get('language') || 'en';
    const locationId = formData.get('locationId');
    const locationName = formData.get('locationName');

    if (!productHandle || !rating || !customerName) {
        return data({ error: 'Missing required fields' }, { status: 400 });
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
        { key: "review_title", value: String(title) },
        { key: "review_comment", value: String(comment) },
        { key: "language", value: String(language) },
        { key: "status", value: "Pending" }
    ];

    if (locationId) fields.push({ key: "location_id", value: String(locationId) });
    if (locationName) fields.push({ key: "location_name", value: String(locationName) });

    const result = await adminApiQuery(domain, adminToken, mutation, {
        handle: reviewHandle,
        fields: fields
    });

    if (result.errors || result.data?.metaobjectCreate?.userErrors?.length) {
        const errorMsg = result.errors?.[0]?.message || result.data?.metaobjectCreate?.userErrors?.[0]?.message;
        console.error('Metaobject creation error:', errorMsg);
        return data({ error: errorMsg }, { status: 400 });
    }

    return data({ success: true });
}



