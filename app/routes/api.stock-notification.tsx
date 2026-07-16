import { data, type ActionFunctionArgs } from 'react-router';

/**
 * POST /api/stock-notification
 * Proxies the back-in-stock subscription to STOQ app.
 * No private API key needed — STOQ authenticates via X-Shopify-Shop-Domain.
 * Install STOQ from: https://apps.shopify.com/stoq
 * Docs: https://docs.stoqapp.com/back-in-stock-api
 */
export async function action({ request, context }: ActionFunctionArgs) {
    if (request.method !== 'POST') {
        return data({ error: 'Method not allowed' }, { status: 405 });
    }

    try {
        const body = await request.json() as any;
        const { email, variantId, productTitle, locationId, locationName } = body;

        if (!email || !variantId) {
            return data({ error: 'Email and variant ID are required' }, { status: 400 });
        }

        // Extract numeric variant ID from GID (e.g. "gid://shopify/ProductVariant/123456" → 123456)
        const numericVariantId = variantId.includes('/')
            ? Number(variantId.split('/').pop())
            : Number(variantId);

        // Resolve the myshopify.com domain
        const rawShop = (context.env as any).SHOPIFY_SHOP || (context.env as any).PUBLIC_STORE_DOMAIN || '';
        const shopDomain = rawShop.includes('myshopify.com')
            ? rawShop
            : `${rawShop.split('.')[0]}.myshopify.com`;

        // Submit intent to STOQ — no API key required
        const stoqRes = await fetch('https://app.stoqapp.com/api/v1/intents.json', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Shopify-Shop-Domain': shopDomain,
            },
            body: JSON.stringify({
                intent: {
                    email,
                    variant_id: numericVariantId,
                },
            }),
        });

        if (!stoqRes.ok) {
            const errText = await stoqRes.text();
            console.error('[STOQ] Back-in-stock subscription failed:', stoqRes.status, errText);
            return data({ error: 'Failed to register notification' }, { status: 502 });
        }

        console.log(`[STOQ] Back-in-stock intent registered: email=${email}, variant=${numericVariantId}, product="${productTitle}", location=${locationName || 'N/A'} (${locationId || 'N/A'})`);

        return data({ success: true });
    } catch (error: any) {
        console.error('[STOQ] Unexpected error:', error);
        return data({ error: error.message }, { status: 500 });
    }
}
