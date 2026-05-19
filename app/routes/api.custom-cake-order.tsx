import { type ActionFunctionArgs, type LoaderFunctionArgs } from 'react-router';
import { adminApiQuery } from '../lib/admin.server';

/**
 * GET /api/custom-cake-order — Returns 405
 */
export async function loader({}: LoaderFunctionArgs) {
  return Response.json({ error: 'Use POST method' }, { status: 405 });
}

/**
 * POST /api/custom-cake-order
 * Creates a Shopify Draft Order with the exact calculated price for a custom cake,
 * then returns the invoice (checkout) URL for the customer to complete payment.
 */
export async function action({ request, context }: ActionFunctionArgs) {
  try {
    const env = context.env as any;
    const rawShop = env.SHOPIFY_SHOP || env.PUBLIC_STORE_DOMAIN || 'the-beauty-secrets-ksa';
    const shopDomain = rawShop.includes('myshopify.com') ? rawShop : `${rawShop.split('.')[0]}.myshopify.com`;

    const potentialTokens = [
      env.WISHLIST_ADMIN_TOKEN,
      env.SHOPIFY_ADMIN_API_ACCESS_TOKENS,
      env.SHOPIFY_ADMIN_API_ACCESS_TOKEN,
      env.PRIVATE_STOREFRONT_API_TOKEN,
    ].filter(Boolean) as string[];

    let body: any;
    try {
      body = await request.json();
    } catch {
      return Response.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const { shape, size, flavor, layers, color, topping, message, messageFont, messageColor, uploadedImage, subtotal, isEn } = body;

    const priceNum = Number(subtotal);
    if (!priceNum || priceNum <= 0) {
      return Response.json({ error: 'Invalid price' }, { status: 400 });
    }

    const title = isEn ? 'Custom Cake' : 'كيكة مخصصة';
    const description = isEn
      ? `${shape} • ${size} • ${flavor} • ${layers} layers • ${color} • ${topping}${message ? ` • "${message}" (${messageFont}, ${messageColor})` : ''}`
      : `${shape} • ${size} • ${flavor} • ${layers} طبقات • ${color} • ${topping}${message ? ` • "${message}" (${messageFont}, ${messageColor})` : ''}`;

    const customAttributes = [
      { key: '_cake_custom', value: 'true' },
      { key: isEn ? 'Shape' : 'الشكل', value: shape || '-' },
      { key: isEn ? 'Size' : 'الحجم', value: size || '-' },
      { key: isEn ? 'Flavor' : 'النكهة', value: flavor || '-' },
      { key: isEn ? 'Layers' : 'الطبقات', value: String(layers || 1) },
      { key: isEn ? 'Color' : 'اللون', value: color || '-' },
      { key: isEn ? 'Topping' : 'الإضافة', value: topping || '-' },
      ...(message ? [{ key: isEn ? 'Message' : 'الرسالة', value: message }] : []),
      ...(messageFont ? [{ key: isEn ? 'Message Font' : 'خط الرسالة', value: messageFont }] : []),
      ...(messageColor ? [{ key: isEn ? 'Message Color' : 'لون الرسالة', value: messageColor }] : []),
      ...(uploadedImage ? [{ key: isEn ? 'Printed Image' : 'صورة الطباعة', value: 'Yes (Custom Image Uploaded)' }] : []),
    ];

    const mutation = `
      mutation draftOrderCreate($input: DraftOrderInput!) {
        draftOrderCreate(input: $input) {
          draftOrder {
            id
            invoiceUrl
            status
          }
          userErrors {
            field
            message
          }
        }
      }
    `;

    const draftOrderInput = {
      lineItems: [
        {
          title,
          quantity: 1,
          originalUnitPrice: priceNum.toFixed(2),
          customAttributes,
        },
      ],
      note: description,
      tags: ['custom-cake', 'cake-builder'],
      taxExempt: false,
    };



    for (const token of potentialTokens) {
      try {
        const result = await adminApiQuery(shopDomain, token, mutation, {
          input: draftOrderInput,
        }) as any;



        const draftOrder = result?.data?.draftOrderCreate?.draftOrder;
        const userErrors = result?.data?.draftOrderCreate?.userErrors;

        if (result.errors?.length) {
          console.error(`[Custom Cake] API error (${token.substring(0, 10)}):`, JSON.stringify(result.errors));
          continue;
        }

        if (userErrors?.length) {
          console.error(`[Custom Cake] User errors (${token.substring(0, 10)}):`, JSON.stringify(userErrors));
          continue;
        }

        if (draftOrder?.invoiceUrl) {
          console.log(`[Custom Cake] ✅ Draft order created: ${draftOrder.id}`);
          return Response.json({
            success: true,
            checkoutUrl: draftOrder.invoiceUrl,
            draftOrderId: draftOrder.id,
          });
        }
      } catch (e: any) {
        console.error(`[Custom Cake] Exception (${token.substring(0, 10)}):`, e.message || e);
      }
    }

    return Response.json(
      { error: isEn ? 'Failed to create order. Please try again or contact us.' : 'فشل في إنشاء الطلب. يرجى المحاولة مرة أخرى أو التواصل معنا.' },
      { status: 500 }
    );
  } catch (globalError: any) {
    console.error('[Custom Cake] UNCAUGHT:', globalError?.message || globalError);
    return Response.json(
      { error: `Server error: ${globalError?.message || 'Unknown'}` },
      { status: 500 }
    );
  }
}
