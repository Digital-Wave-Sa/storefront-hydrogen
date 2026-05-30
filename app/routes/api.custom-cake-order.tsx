import { type ActionFunctionArgs, type LoaderFunctionArgs } from 'react-router';
import { adminApiQuery } from '../lib/admin.server';

/**
 * GET /api/custom-cake-order — Returns 405
 */
export async function loader({}: LoaderFunctionArgs) {
  return Response.json({ error: 'Use POST method' }, { status: 405 });
}

/**
 * Helper to upload a base64 image to Shopify Files via StagedUploads
 */
async function uploadImageToShopify(shopDomain: string, token: string, base64DataUrl: string): Promise<string | null> {
  try {
    // 1. Extract mime type and base64 data
    const matches = base64DataUrl.match(/^data:([a-zA-Z0-9]+\/[a-zA-Z0-9-.+]+);base64,(.+)$/);
    if (!matches || matches.length !== 3) return null;
    
    const mimeType = matches[1];
    
    // Strict MIME type validation on the backend
    const allowedMimes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!allowedMimes.includes(mimeType)) {
      console.error('[Staged Upload Error] Invalid mime type:', mimeType);
      return null;
    }

    const base64Data = matches[2];
    
    // Use Web APIs instead of Node.js Buffer for Oxygen/Cloudflare compatibility
    const byteString = atob(base64Data);
    const ab = new ArrayBuffer(byteString.length);
    const ia = new Uint8Array(ab);
    for (let i = 0; i < byteString.length; i++) {
      ia[i] = byteString.charCodeAt(i);
    }
    const fileSize = ab.byteLength.toString();
    const filename = `custom-cake-print-${Date.now()}.${mimeType.split('/')[1] || 'png'}`;

    // 2. Request Staged Upload URL
    const stagedUploadMutation = `
      mutation stagedUploadsCreate($input: [StagedUploadInput!]!) {
        stagedUploadsCreate(input: $input) {
          stagedTargets {
            url
            resourceUrl
            parameters {
              name
              value
            }
          }
          userErrors { message }
        }
      }
    `;
    
    const stagedUploadRes = await adminApiQuery(shopDomain, token, stagedUploadMutation, {
      input: [{
        filename,
        mimeType,
        resource: 'IMAGE',
        fileSize,
        httpMethod: 'POST'
      }]
    }) as any;

    if (stagedUploadRes.errors || stagedUploadRes.data?.stagedUploadsCreate?.userErrors?.length) {
      console.error('[Staged Upload] GraphQL Error:', JSON.stringify(stagedUploadRes));
    }

    const target = stagedUploadRes?.data?.stagedUploadsCreate?.stagedTargets?.[0];
    if (!target) {
      console.error('[Staged Upload] No target returned from API.');
      return null;
    }

    // 3. POST to the pre-signed URL
    const formData = new FormData();
    target.parameters.forEach((p: any) => formData.append(p.name, p.value));
    
    // Create a File/Blob from the ArrayBuffer
    const blob = new Blob([ab], { type: mimeType });
    formData.append('file', blob, filename);

    const uploadRes = await fetch(target.url, {
      method: 'POST',
      body: formData,
    });

    if (!uploadRes.ok) {
      console.error('[Staged Upload] POST to target.url failed with status:', uploadRes.status, await uploadRes.text());
      return null;
    }

    // 4. Register the File in Shopify
    const fileCreateMutation = `
      mutation fileCreate($files: [FileCreateInput!]!) {
        fileCreate(files: $files) {
          files {
            ... on MediaImage {
              id
              image { url }
            }
            ... on GenericFile {
              id
              url
            }
          }
          userErrors { message }
        }
      }
    `;

    const fileCreateRes = await adminApiQuery(shopDomain, token, fileCreateMutation, {
      files: [{
        alt: 'Custom Cake Print',
        contentType: 'IMAGE',
        originalSource: target.resourceUrl
      }]
    }) as any;

    if (fileCreateRes.errors || fileCreateRes.data?.fileCreate?.userErrors?.length) {
      console.error('[Staged Upload] fileCreate GraphQL Error:', JSON.stringify(fileCreateRes));
    }

    const fileObj = fileCreateRes?.data?.fileCreate?.files?.[0];
    
    // Shopify takes a moment to process the image. The 'image.url' might be null initially.
    // If it's processing, we fallback to the Shopify File ID.
    const finalUrlOrId = fileObj?.image?.url || fileObj?.url || fileObj?.id || null;
    
    if (!finalUrlOrId) {
       console.error('[Staged Upload] fileObj missing url/id:', JSON.stringify(fileObj));
    }
    
    return finalUrlOrId;
  } catch (err) {
    console.error('[Staged Upload Error]', err);
    return null;
  }
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
    console.log('[DEBUG] Potential tokens:', potentialTokens.map(t => t.substring(0, 15) + '...'));

    let body: any;
    try {
      body = await request.json();
    } catch {
      return Response.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const { shape, size, flavor, layers, color, topping, message, messageFont, messageColor, uploadedImage, cakePreviewImage, subtotal, finalTotal, isEn } = body;

    // Use finalTotal (which already includes 15% VAT) so the checkout matches the builder
    const priceNum = Number(finalTotal || subtotal);
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

    const allErrors: any[] = [];

    for (const token of potentialTokens) {
      try {
        let finalImageAttr = uploadedImage ? 'Yes (Processing Upload...)' : null;
        let previewImageAttr = cakePreviewImage ? 'Yes (Processing Upload...)' : null;
        
        // If there's a base64 image payload, upload it to Shopify Files first
        if (uploadedImage && uploadedImage.startsWith('data:image')) {
          const shopifyFileUrl = await uploadImageToShopify(shopDomain, token, uploadedImage);
          if (shopifyFileUrl) {
            finalImageAttr = shopifyFileUrl;
          } else {
            finalImageAttr = 'Yes (Upload Failed - Base64 provided but not saved)';
          }
        }
        
        // Upload the 3D Cake Preview screenshot
        if (cakePreviewImage && cakePreviewImage.startsWith('data:image')) {
          const shopifyPreviewUrl = await uploadImageToShopify(shopDomain, token, cakePreviewImage);
          if (shopifyPreviewUrl) {
            previewImageAttr = shopifyPreviewUrl;
          } else {
            previewImageAttr = 'Yes (Upload Failed - Base64 provided but not saved)';
          }
        }

        // Update the custom attributes with the final image URL or status
        const draftOrderInput = {
          lineItems: [
            {
              title,
              quantity: 1,
              originalUnitPrice: priceNum.toFixed(2),
              customAttributes: [
                ...customAttributes,
                ...(finalImageAttr ? [{ key: isEn ? 'Printed Image URL' : 'رابط صورة الطباعة', value: finalImageAttr }] : []),
                ...(previewImageAttr ? [{ key: isEn ? 'Cake Preview Image' : 'صورة شكل الكيكة ثلاثية الأبعاد', value: previewImageAttr }] : [])
              ],
            },
          ],
          note: description,
          tags: ['custom-cake', 'cake-builder'],
          taxExempt: true,
        };

        const result = await adminApiQuery(shopDomain, token, mutation, {
          input: draftOrderInput,
        }) as any;



        const draftOrder = result?.data?.draftOrderCreate?.draftOrder;
        const userErrors = result?.data?.draftOrderCreate?.userErrors;

        if (result.errors?.length) {
          console.error(`[Custom Cake] API error (${token.substring(0, 10)}):`, JSON.stringify(result.errors));
          allErrors.push({ type: 'graphql_error', errors: result.errors });
          continue;
        }

        if (userErrors?.length) {
          console.error(`[Custom Cake] User errors (${token.substring(0, 10)}):`, JSON.stringify(userErrors));
          allErrors.push({ type: 'user_error', errors: userErrors });
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
        allErrors.push({ type: 'exception', error: e.message || String(e) });
      }
    }

    // console.error('FAILED TO CREATE DRAFT ORDER. ERRORS:', JSON.stringify(allErrors, null, 2));
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
