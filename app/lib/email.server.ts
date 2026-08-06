import { getAdminToken } from '~/lib/shopify-admin.server';

export interface FormSubmissionPayload {
  formType: 'contact' | 'export' | 'corporate' | 'custom_request';
  formTitle: string;
  fullName: string;
  email: string;
  phone: string;
  companyName?: string;
  destinationCountry?: string;
  budget?: string;
  quantity?: string;
  subject?: string;
  message?: string;
  customDetails?: Record<string, any>;
}

export async function sendEmail({
  to,
  subject,
  html,
  env,
}: {
  to: string | string[];
  subject: string;
  html: string;
  env: any;
}) {
  const resendApiKey = env?.RESEND_API_KEY;
  const fromEmail = env?.FORM_EMAIL_FROM || 'Saadeddin Pastry <noreply@saadeddin.com>';
  const recipients = Array.isArray(to) ? to : [to];

  // 1. Try Resend API if key is present
  if (resendApiKey) {
    try {
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${resendApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: fromEmail,
          to: recipients,
          subject,
          html,
        }),
      });
      if (res.ok) return true;
    } catch (e) {
      console.error('Failed to send email via Resend:', e);
    }
  }

  // 2. Try Saadeddin Middleware API (api.saadeddin.top)
  const middlewareUrl = env?.SAADEDDIN_API_URL || 'https://api.saadeddin.top';
  try {
    const res = await fetch(`${middlewareUrl}/api/send-email`, {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({
        to: recipients,
        subject,
        html,
      }),
    });
    if (res.ok) return true;
  } catch (e) {
    console.warn('[SEND_EMAIL MW WARN]', e);
  }

  // 3. Try Microsoft Graph API
  const graphTenantId = env?.GRAPH_TENANT_ID;
  const graphClientId = env?.GRAPH_CLIENT_ID;
  const graphClientSecret = env?.GRAPH_CLIENT_SECRET;
  const graphSenderEmail = env?.GRAPH_SENDER_EMAIL || env?.SMTP_USER || 'crm@saadeddin.com';

  if (graphTenantId && graphClientId && graphClientSecret) {
    try {
      const tokenRes = await fetch(
        `https://login.microsoftonline.com/${graphTenantId}/oauth2/v2.0/token`,
        {
          method: 'POST',
          headers: {'Content-Type': 'application/x-www-form-urlencoded'},
          body: new URLSearchParams({
            grant_type: 'client_credentials',
            client_id: graphClientId,
            client_secret: graphClientSecret,
            scope: 'https://graph.microsoft.com/.default',
          }),
        },
      );
      const tokenData = (await tokenRes.json()) as any;
      if (tokenData?.access_token) {
        const mailRes = await fetch(
          `https://graph.microsoft.com/v1.0/users/${graphSenderEmail}/sendMail`,
          {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${tokenData.access_token}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              message: {
                subject,
                body: {contentType: 'HTML', content: html},
                toRecipients: recipients.map((addr) => ({
                  emailAddress: {address: addr},
                })),
              },
            }),
          },
        );
        if (mailRes.status === 202 || mailRes.ok) return true;
      }
    } catch (e) {
      console.error('Failed to send email via Microsoft Graph:', e);
    }
  }

  return false;
}

export function getBackInStockTemplate({
  productTitle,
  variantTitle,
  productUrl,
  language = 'AR',
}: {
  productTitle: string;
  variantTitle?: string;
  productUrl: string;
  language?: 'AR' | 'EN';
}) {
  const isEn = language === 'EN';
  const subject = isEn
    ? `${productTitle} is back in stock!`
    : `منتج ${productTitle} متوفر الآن لدى سعد الدين!`;
  const body = isEn
    ? `Great news! ${productTitle} ${variantTitle ? `(${variantTitle})` : ''} is now back in stock at Saadeddin Pastry. Click below to order now!`
    : `بشرى سارة! منتج ${productTitle} ${variantTitle ? `(${variantTitle})` : ''} متوفر الآن لدى حلويات سعد الدين. اضغط أدناه للطلب الآن!`;
  const buttonText = isEn ? 'Shop Now' : 'تسوق الآن';

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e0e0e0; border-radius: 12px; background-color: #FEF8EB; color: #234745;">
      <h2 style="color: #234745; margin-top: 0;">${subject}</h2>
      <p style="font-size: 16px; line-height: 1.6;">${body}</p>
      <div style="text-align: center; margin-top: 24px;">
        <a href="${productUrl}" style="background-color: #234745; color: #ffffff; padding: 12px 28px; text-decoration: none; border-radius: 999px; font-weight: bold; display: inline-block;">${buttonText}</a>
      </div>
    </div>
  `;

  return {subject, text: body, html};
}

export async function sendFormEmailNotification(
  payload: FormSubmissionPayload,
  env: any,
) {
  const recipientEmail = env?.FORM_EMAIL_RECIPIENT || 'motasem.udeh@gmail.com';
  const webhookUrl = env?.FORM_WEBHOOK_URL;

  const emailSubject = `[Saadeddin Website] New ${payload.formTitle} submission from ${payload.fullName}`;

  const emailHtml = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e0e0e0; border-radius: 12px; overflow: hidden; background-color: #FEF8EB;">
      <div style="background-color: #234745; padding: 24px; text-align: center; color: #ffffff;">
        <h2 style="margin: 0; font-size: 22px;">Saadeddin Pastry — Form Submission</h2>
        <p style="margin: 6px 0 0 0; font-size: 14px; opacity: 0.8;">${payload.formTitle}</p>
      </div>
      <div style="padding: 24px; color: #234745; line-height: 1.6;">
        <table style="width: 100%; border-collapse: collapse; font-size: 15px;">
          <tr>
            <td style="padding: 10px 0; border-bottom: 1px solid #e5e5e5; font-weight: bold; width: 150px;">Name:</td>
            <td style="padding: 10px 0; border-bottom: 1px solid #e5e5e5;">${payload.fullName}</td>
          </tr>
          <tr>
            <td style="padding: 10px 0; border-bottom: 1px solid #e5e5e5; font-weight: bold;">Email:</td>
            <td style="padding: 10px 0; border-bottom: 1px solid #e5e5e5;"><a href="mailto:${payload.email}" style="color: #234745; font-weight: bold;">${payload.email}</a></td>
          </tr>
          <tr>
            <td style="padding: 10px 0; border-bottom: 1px solid #e5e5e5; font-weight: bold;">Phone / Mobile:</td>
            <td style="padding: 10px 0; border-bottom: 1px solid #e5e5e5;"><a href="tel:${payload.phone}" style="color: #234745; font-weight: bold;">${payload.phone}</a></td>
          </tr>
          ${
            payload.companyName
              ? `<tr>
            <td style="padding: 10px 0; border-bottom: 1px solid #e5e5e5; font-weight: bold;">Company:</td>
            <td style="padding: 10px 0; border-bottom: 1px solid #e5e5e5;">${payload.companyName}</td>
          </tr>`
              : ''
          }
          ${
            payload.destinationCountry
              ? `<tr>
            <td style="padding: 10px 0; border-bottom: 1px solid #e5e5e5; font-weight: bold;">Country / Region:</td>
            <td style="padding: 10px 0; border-bottom: 1px solid #e5e5e5;">${payload.destinationCountry}</td>
          </tr>`
              : ''
          }
          ${
            payload.quantity
              ? `<tr>
            <td style="padding: 10px 0; border-bottom: 1px solid #e5e5e5; font-weight: bold;">Quantity:</td>
            <td style="padding: 10px 0; border-bottom: 1px solid #e5e5e5;">${payload.quantity}</td>
          </tr>`
              : ''
          }
          ${
            payload.budget
              ? `<tr>
            <td style="padding: 10px 0; border-bottom: 1px solid #e5e5e5; font-weight: bold;">Budget per item:</td>
            <td style="padding: 10px 0; border-bottom: 1px solid #e5e5e5;">${payload.budget}</td>
          </tr>`
              : ''
          }
          ${
            payload.subject
              ? `<tr>
            <td style="padding: 10px 0; border-bottom: 1px solid #e5e5e5; font-weight: bold;">Subject:</td>
            <td style="padding: 10px 0; border-bottom: 1px solid #e5e5e5;">${payload.subject}</td>
          </tr>`
              : ''
          }
        </table>
        ${
          payload.message
            ? `<div style="margin-top: 20px; padding: 16px; background-color: #ffffff; border-radius: 8px; border: 1px solid #e5e5e5;">
            <p style="margin: 0 0 8px 0; font-weight: bold; color: #234745;">Message / Notes:</p>
            <p style="margin: 0; white-space: pre-wrap; font-size: 14px; color: #555555;">${payload.message}</p>
          </div>`
            : ''
        }
      </div>
      <div style="background-color: #f4ece0; padding: 16px; text-align: center; font-size: 12px; color: #777777;">
        Submitted via Saadeddin Storefront &bull; ${new Date().toUTCString()}
      </div>
    </div>
  `;

  // 1. Send admin notification email to recipientEmail
  await sendEmail({
    to: recipientEmail,
    subject: emailSubject,
    html: emailHtml,
    env,
  });

  // 2. Send customer confirmation receipt email directly to payload.email (if valid)
  if (payload.email && payload.email.includes('@') && payload.email !== recipientEmail) {
    const confirmationSubject = `[Saadeddin Pastry] Confirmation: We received your ${payload.formTitle}`;
    const confirmationHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e0e0e0; border-radius: 12px; overflow: hidden; background-color: #FEF8EB;">
        <div style="background-color: #234745; padding: 24px; text-align: center; color: #ffffff;">
          <h2 style="margin: 0; font-size: 22px;">Saadeddin Pastry — حلويات سعد الدين</h2>
          <p style="margin: 6px 0 0 0; font-size: 14px; opacity: 0.9;">Thank you for reaching out | شكراً لتواصلك معنا</p>
        </div>
        <div style="padding: 24px; color: #234745; line-height: 1.6;">
          <p style="font-size: 16px; font-weight: bold; margin-top: 0;">Dear ${payload.fullName},</p>
          <p style="font-size: 15px;">We have received your submission for <strong>${payload.formTitle}</strong>. Our team is reviewing your request and will get back to you shortly.</p>
          <hr style="border: none; border-top: 1px solid #e5e5e5; margin: 20px 0;" />
          <p style="font-size: 15px; font-weight: bold;">عزيزي/عزيزتي ${payload.fullName}،</p>
          <p style="font-size: 15px;">تم استلام طلبك (<strong>${payload.formTitle}</strong>) بنجاح. سيقوم فريقنا بمراجعة التفاصيل والتواصل معك في أقرب وقت.</p>
        </div>
        <div style="background-color: #f4ece0; padding: 16px; text-align: center; font-size: 12px; color: #777777;">
          Saadeddin Pastry &bull; حلويات سعد الدين
        </div>
      </div>
    `;

    await sendEmail({
      to: payload.email,
      subject: confirmationSubject,
      html: confirmationHtml,
      env,
    });
  }

  // 2. Dispatch to custom Webhook endpoint if set
  if (webhookUrl) {
    try {
      await fetch(webhookUrl, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({
          subject: emailSubject,
          recipient: recipientEmail,
          payload,
          timestamp: new Date().toISOString(),
        }),
      });
    } catch (err) {
      console.error('Failed to send webhook notification:', err);
    }
  }

  // 3. Backup entry creation in Shopify Admin Metaobjects
  try {
    const {getAdminToken, getAdminDomain} = await import('~/lib/shopify-admin.server');
    const adminToken = await getAdminToken(env);
    const adminDomain = getAdminDomain(env);
    if (adminDomain && adminToken) {
      const messageContent = `${payload.companyName ? `Company: ${payload.companyName}\n` : ''}${payload.destinationCountry ? `Country: ${payload.destinationCountry}\n` : ''}${payload.quantity ? `Quantity: ${payload.quantity}\n` : ''}${payload.budget ? `Budget: ${payload.budget}\n` : ''}${payload.message || ''}`;
      
      const createRes = await fetch(`https://${adminDomain}/admin/api/2024-01/graphql.json`, {
        method: 'POST',
        headers: {
          'X-Shopify-Access-Token': adminToken,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: `
            mutation metaobjectCreate($metaobject: MetaobjectCreateInput!) {
              metaobjectCreate(metaobject: $metaobject) {
                metaobject { id handle }
                userErrors { field message }
              }
            }
          `,
          variables: {
            metaobject: {
              type: 'contact_submission',
              fields: [
                {key: 'full_name', value: payload.fullName || 'Customer Lead'},
                {key: 'mobile_phone', value: payload.phone || ''},
                {key: 'email_address', value: payload.email || ''},
                {key: 'subject_form', value: payload.subject || payload.formTitle},
                {key: 'message_details', value: messageContent},
              ],
            },
          },
        }),
      });

      const resData = await createRes.json();
      if (resData?.data?.metaobjectCreate?.userErrors?.length) {
        // Fallback for custom or single-field metaobject definition
        await fetch(`https://${adminDomain}/admin/api/2024-01/graphql.json`, {
          method: 'POST',
          headers: {
            'X-Shopify-Access-Token': adminToken,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            query: `
              mutation metaobjectCreate($metaobject: MetaobjectCreateInput!) {
                metaobjectCreate(metaobject: $metaobject) {
                  metaobject { id handle }
                  userErrors { field message }
                }
              }
            `,
            variables: {
              metaobject: {
                type: 'contact_submission',
                fields: [
                  {
                    key: 'full_name',
                    value: `Lead: ${payload.fullName} | Phone: ${payload.phone} | Email: ${payload.email} | Subject: ${payload.subject || payload.formTitle} | Details: ${messageContent}`,
                  },
                ],
              },
            },
          }),
        });
      }
    }
  } catch (err) {
    console.error('Failed to store submission metaobject in Shopify Admin:', err);
  }

  return {success: true};
}
