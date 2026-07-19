import { type ActionFunctionArgs, type LoaderFunctionArgs } from 'react-router';
import { adminApiQuery } from '../lib/admin.server';

/**
 * Helper to fetch a product variant ID by SKU from Shopify Admin API
 */
async function getVariantIdBySku(shopDomain: string, token: string, sku: string): Promise<string | null> {
  try {
    const query = `
      query getVariantBySku($query: String!) {
        productVariants(first: 1, query: $query) {
          nodes {
            id
          }
        }
      }
    `;
    const res = await adminApiQuery(shopDomain, token, query, {
      query: `sku:${sku}`
    }) as any;
    return res?.data?.productVariants?.nodes?.[0]?.id || null;
  } catch (err) {
    console.error(`[Custom Cake] Failed to fetch variant ID for SKU ${sku}:`, err);
    return null;
  }
}

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

interface PriceSkuMapping {
  price: number;
  sku: string;
}

const priceSkuMappings: PriceSkuMapping[] = [
  { price: 50, sku: '381747' },
  { price: 55, sku: '381748' },
  { price: 60, sku: '381749' },
  { price: 65, sku: '381750' },
  { price: 70, sku: '381751' },
  { price: 75, sku: '381752' },
  { price: 80, sku: '381753' },
  { price: 85, sku: '381754' },
  { price: 90, sku: '381755' },
  { price: 95, sku: '381756' },
  { price: 100, sku: '381757' },
  { price: 125, sku: '381726' },
  { price: 150, sku: '381681' },
  { price: 175, sku: '381682' },
  { price: 200, sku: '381683' },
  { price: 225, sku: '381684' },
  { price: 250, sku: '381685' },
  { price: 275, sku: '381686' },
  { price: 300, sku: '381687' },
  { price: 325, sku: '381688' },
  { price: 350, sku: '381689' },
  { price: 375, sku: '381690' },
  { price: 400, sku: '381691' },
  { price: 425, sku: '381692' },
  { price: 450, sku: '381693' },
  { price: 475, sku: '381694' },
  { price: 500, sku: '381695' },
  { price: 550, sku: '381696' },
  { price: 600, sku: '381697' },
  { price: 650, sku: '381698' },
  { price: 700, sku: '381699' },
  { price: 750, sku: '381700' },
  { price: 800, sku: '381701' },
  { price: 850, sku: '381702' },
  { price: 900, sku: '381703' },
  { price: 950, sku: '381704' },
  { price: 1000, sku: '381705' },
  { price: 1050, sku: '381706' },
  { price: 1100, sku: '381707' },
  { price: 1150, sku: '381708' },
  { price: 1200, sku: '381709' },
  { price: 1250, sku: '381710' },
  { price: 1300, sku: '381711' },
  { price: 1350, sku: '381712' },
  { price: 1400, sku: '381713' },
  { price: 1450, sku: '381714' },
  { price: 1500, sku: '381715' },
  { price: 1550, sku: '381716' },
  { price: 1600, sku: '381717' },
  { price: 1650, sku: '381718' },
  { price: 1700, sku: '381719' },
  { price: 1750, sku: '381720' },
  { price: 1800, sku: '381721' },
  { price: 1850, sku: '381722' },
  { price: 1900, sku: '381723' },
  { price: 1950, sku: '381724' },
  { price: 2000, sku: '381725' },
  { price: 2100, sku: '381727' },
  { price: 2200, sku: '381728' },
  { price: 2300, sku: '381729' },
  { price: 2400, sku: '381730' },
  { price: 2500, sku: '381731' },
  { price: 2600, sku: '381732' },
  { price: 2700, sku: '381733' },
  { price: 2800, sku: '381734' },
  { price: 2900, sku: '381735' },
  { price: 3000, sku: '381736' },
  { price: 3100, sku: '381737' },
  { price: 3200, sku: '381738' },
  { price: 3300, sku: '381739' },
  { price: 3400, sku: '381740' },
  { price: 3500, sku: '381741' },
  { price: 3600, sku: '381742' },
  { price: 3700, sku: '381743' },
  { price: 3800, sku: '381744' },
  { price: 3900, sku: '381745' },
  { price: 4000, sku: '381746' },
  { price: 4500, sku: '381758' },
  { price: 5000, sku: '381759' },
  { price: 5500, sku: '381760' },
  { price: 6000, sku: '381761' },
  { price: 6500, sku: '381762' },
  { price: 7000, sku: '381763' },
  { price: 12000, sku: '381787' }
];

function getClosestPriceAndSku(targetPrice: number): PriceSkuMapping {
  let closest = priceSkuMappings[0];
  let minDiff = Math.abs(targetPrice - closest.price);

  for (let i = 1; i < priceSkuMappings.length; i++) {
    const diff = Math.abs(targetPrice - priceSkuMappings[i].price);
    if (diff < minDiff) {
      minDiff = diff;
      closest = priceSkuMappings[i];
    }
  }

  return closest;
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

    const { shape, size, flavor, layers, color, topping, message, messageFont, messageColor, uploadedImage, cakePreviewImage, prepTime, subtotal, finalTotal, isEn } = body;

    // Use finalTotal (which already includes 15% VAT) so the checkout matches the builder
    const priceNum = Number(finalTotal || subtotal);
    if (!priceNum || priceNum <= 0) {
      return Response.json({ error: 'Invalid price' }, { status: 400 });
    }

    // Securely retrieve active customer details from the session
    let customerId: string | null = null;
    let customerEmail: string | null = null;

    try {
      const customerAccessToken = await context.session.get('customerAccessToken');
      const loginOtpPhone = await context.session.get('loginOtpPhone');

      if (customerAccessToken?.accessToken) {
        if (customerAccessToken.accessToken === 'dev-bypass-token') {
          // Resolve dev-bypass customer from Admin API search using phone
          if (loginOtpPhone) {
            let cleanPhone = loginOtpPhone.replace(/\D/g, '');
            if (cleanPhone.startsWith('966')) {
              cleanPhone = '+' + cleanPhone;
            } else if (cleanPhone.startsWith('0')) {
              cleanPhone = '+966' + cleanPhone.slice(1);
            } else {
              cleanPhone = '+966' + cleanPhone;
            }

            const searchMutation = `
              query searchCustomer($query: String!) {
                customers(first: 1, query: $query) {
                  nodes {
                    id
                    email
                  }
                }
              }
            `;
            const searchRes = await adminApiQuery(shopDomain, potentialTokens[0], searchMutation, {
              query: `phone:${cleanPhone}`
            }) as any;

            const foundCust = searchRes?.data?.customers?.nodes?.[0];
            if (foundCust?.id) {
              customerId = foundCust.id;
              customerEmail = foundCust.email;
            }
          }
        } else {
          // Resolve real logged-in customer via Storefront API token query
          const storefrontRes = await context.storefront.query(
            `#graphql
              query getCustomerId($customerAccessToken: String!) {
                customer(customerAccessToken: $customerAccessToken) {
                  id
                  email
                }
              }
            `,
            {
              variables: { customerAccessToken: customerAccessToken.accessToken },
              cache: context.storefront.CacheNone(),
            }
          ) as any;
          if (storefrontRes?.customer?.id) {
            customerId = storefrontRes.customer.id;
            customerEmail = storefrontRes.customer.email;
          }
        }
      }
    } catch (sessionErr) {
      console.error('[Custom Cake Order] Error resolving session customer:', sessionErr);
    }

    const description = isEn
      ? `${shape} • ${size} • ${flavor} • ${layers} layers • ${color} • ${topping}${prepTime ? ` • Prep: ${prepTime}` : ''}${message ? ` • "${message}" (${messageFont}, ${messageColor})` : ''}`
      : `${shape} • ${size} • ${flavor} • ${layers} طبقات • ${color} • ${topping}${prepTime ? ` • تجهيز: ${prepTime}` : ''}${message ? ` • "${message}" (${messageFont}, ${messageColor})` : ''}`;

    const customAttributes = [
      { key: '_cake_custom', value: 'true' },
      { key: isEn ? 'Shape' : 'الشكل', value: shape || '-' },
      { key: isEn ? 'Size' : 'الحجم', value: size || '-' },
      { key: isEn ? 'Flavor' : 'النكهة', value: flavor || '-' },
      { key: isEn ? 'Layers' : 'الطبقات', value: String(layers || 1) },
      { key: isEn ? 'Color' : 'اللون', value: color || '-' },
      { key: isEn ? 'Topping' : 'الإضافة', value: topping || '-' },
      { key: isEn ? 'Preparation Option' : 'خيار التحضير', value: prepTime || '-' },
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

        // Get the closest SKU category mapping from the excel sheet definition
        const closestMapping = getClosestPriceAndSku(priceNum);
        const displayPrice = Number.isInteger(priceNum) ? priceNum : priceNum.toFixed(2);
        const resolvedTitle = `طلبية خاصة فئة ${displayPrice} ريال`;

        // Fetch real variant ID by SKU to ensure local pickup options are active at checkout
        const variantId = await getVariantIdBySku(shopDomain, token, closestMapping.sku);
        if (variantId) {
          console.log(`[Custom Cake] Found variant ID ${variantId} for SKU ${closestMapping.sku}`);
        } else {
          console.log(`[Custom Cake] No variant ID found for SKU ${closestMapping.sku}. Falling back to custom line item.`);
        }

        // Update the custom attributes with the final image URL or status
        const draftOrderInput: any = {
          lineItems: [
            {
              ...(variantId ? { variantId } : { title: resolvedTitle, sku: closestMapping.sku, requiresShipping: true }),
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

        if (customerId) {
          draftOrderInput.customerId = customerId;
        }
        if (customerEmail) {
          draftOrderInput.email = customerEmail;
        }

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
