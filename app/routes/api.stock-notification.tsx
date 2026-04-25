import { data, type ActionFunctionArgs } from 'react-router';

export async function action({ request, context }: ActionFunctionArgs) {
    if (request.method !== 'POST') {
        return data({ error: 'Method not allowed' }, { status: 405 });
    }

    try {
        const body = await request.json();
        const { email, variantId, productTitle, locationId, locationName } = body;

        if (!email || !variantId) {
            return data({ error: 'Email and variant ID are required' }, { status: 400 });
        }

        const { SHOPIFY_ADMIN_API_ACCESS_TOKEN, PUBLIC_STORE_DOMAIN } = context.env as any;

        // --- NATIVE SHOPIFY INTEGRATION ---
        // We push this as a Metaobject to Shopify. 
        // This allows the user to use "Shopify Flow" to send the email when stock returns.
        
        if (SHOPIFY_ADMIN_API_ACCESS_TOKEN) {
            const adminApiUrl = `https://${PUBLIC_STORE_DOMAIN}/admin/api/2024-04/graphql.json`;
            const query = `
                mutation MetaobjectCreate($metaobject: MetaobjectCreateInput!) {
                    metaobjectCreate(metaobject: $metaobject) {
                        metaobject {
                            handle
                        }
                        userErrors {
                            field
                            message
                        }
                    }
                }
            `;

            const variables = {
                metaobject: {
                    type: "stock_notification",
                    fields: [
                        { key: "email", value: email },
                        { key: "variant_id", value: variantId },
                        { key: "product_title", value: productTitle },
                        { key: "location_id", value: locationId || "global" },
                        { key: "location_name", value: locationName || "All Locations" }
                    ]
                }
            };

            const response = await fetch(adminApiUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Shopify-Access-Token': SHOPIFY_ADMIN_API_ACCESS_TOKEN,
                },
                body: JSON.stringify({ query, variables }),
            });

            const result = await response.json();
            
            if (result.errors || result.data?.metaobjectCreate?.userErrors?.length) {
                console.error('[STOCK NOTIFICATION ERROR] Shopify Admin Error:', JSON.stringify(result, null, 2));
            } else {
                console.log('[STOCK NOTIFICATION SUCCESS] Saved to Shopify Admin:', result.data?.metaobjectCreate?.metaobject?.handle);
            }
        }

        console.log(`[STOK NOTIFICATION] Subscription Sync to Shopify Admin:
            Email: ${email}
            Product: ${productTitle}
            Variant: ${variantId}
            Location: ${locationName} (${locationId})
        `);

        return data({ success: true });
    } catch (error: any) {
        return data({ error: error.message }, { status: 500 });
    }
}



