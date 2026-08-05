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
  to: string;
  subject: string;
  html: string;
  env: any;
}) {
  const resendApiKey = env?.RESEND_API_KEY;
  const fromEmail = env?.FORM_EMAIL_FROM || 'Saadeddin Pastry <noreply@saadeddin.com>';

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
          to: [to],
          subject,
          html,
        }),
      });
      return res.ok;
    } catch (e) {
      console.error('Failed to send email via Resend:', e);
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
  const title = isEn ? `${productTitle} is back in stock!` : `منتج ${productTitle} متوفر الآن!`;
  const body = isEn
    ? `Great news! ${productTitle} ${variantTitle ? `(${variantTitle})` : ''} is now back in stock at Saadeddin Pastry. Click below to order now!`
    : `بشرى سارة! منتج ${productTitle} ${variantTitle ? `(${variantTitle})` : ''} متوفر الآن لدى حلويات سعد الدين. اضغط أدناه للطلب الآن!`;
  const buttonText = isEn ? 'Shop Now' : 'تسوق الآن';

  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e0e0e0; border-radius: 12px; background-color: #FEF8EB; color: #234745;">
      <h2 style="color: #234745; margin-top: 0;">${title}</h2>
      <p style="font-size: 16px; line-height: 1.6;">${body}</p>
      <div style="text-align: center; margin-top: 24px;">
        <a href="${productUrl}" style="background-color: #234745; color: #ffffff; padding: 12px 28px; text-decoration: none; border-radius: 999px; font-weight: bold; display: inline-block;">${buttonText}</a>
      </div>
    </div>
  `;
}

export async function sendFormEmailNotification(
  payload: FormSubmissionPayload,
  env: any,
) {
  const recipientEmail = env?.FORM_EMAIL_RECIPIENT || 'motasem.udeh@gmail.com';
  const resendApiKey = env?.RESEND_API_KEY;
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

  // 1. Dispatch via Office 365 SMTP if configured
  const smtpHost = env?.SMTP_HOST || 'smtp.office365.com';
  const smtpPort = parseInt(env?.SMTP_PORT || '587', 10);
  const smtpUser = env?.SMTP_USER || 'crm@saadeddin.com';
  const smtpPass = env?.SMTP_PASS || 'npzqzfwgtqphvjdq';

  if (smtpHost && smtpUser && smtpPass) {
    try {
      const nodemailer = (await import('nodemailer')).default || (await import('nodemailer'));
      const transporter = nodemailer.createTransport({
        host: smtpHost,
        port: smtpPort,
        secure: false, // port 587 STARTTLS
        auth: { user: smtpUser, pass: smtpPass },
        tls: { ciphers: 'SSLv3', rejectUnauthorized: false },
      });

      await transporter.sendMail({
        from: `"Saadeddin Pastry" <${smtpUser}>`,
        to: recipientEmail,
        subject: emailSubject,
        html: emailHtml,
      });
      console.log(`[FormEmail] Successfully sent email to ${recipientEmail} via Office 365 SMTP`);
    } catch (err) {
      console.error('Failed to send email via SMTP:', err);
    }
  }

  // 2. Dispatch via Resend API if API Key is set
  if (resendApiKey) {
    try {
      await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${resendApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: env?.FORM_EMAIL_FROM || 'Saadeddin Storefront <noreply@saadeddin.com>',
          to: [recipientEmail],
          subject: emailSubject,
          html: emailHtml,
        }),
      });
    } catch (err) {
      console.error('Failed to send email via Resend API:', err);
    }
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
