// import nodemailer from 'nodemailer';

/**
 * Premium Email Service for Saadeddin
 * Uses Office 365 SMTP to send transactional emails
 */
export async function sendEmail({ 
  to, 
  subject, 
  html, 
  text, 
  env 
}: { 
  to: string, 
  subject: string, 
  html: string, 
  text: string,
  env: any 
}) {
  console.log('--- [EMAIL DRAFT MODE] ---');
  console.log(`To: ${to}`);
  console.log(`Subject: ${subject}`);
  console.log('--- [LOGGING TO CONSOLE INSTEAD OF SENDING] ---');
  console.log('Note: To send real emails locally, run "npm install nodemailer"');
  
  return { success: true, messageId: 'console-log-mode' };

  /* 
  // Production Logic (Requires nodemailer)
  const transporter = nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: Number(env.SMTP_PORT),
    secure: false, 
    auth: {
      user: env.SMTP_USER,
      pass: env.SMTP_PASS,
    },
    tls: {
      ciphers: 'SSLv3',
      rejectUnauthorized: false,
    },
  });

  const mailOptions = {
    from: `"${env.SMTP_FROM_NAME}" <${env.SMTP_USER}>`,
    to,
    subject,
    text,
    html,
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('[EMAIL ERROR]', error);
    return { success: false, error };
  }
  */
}

/**
 * Branded Template for Back-in-Stock Notifications
 */
export function getBackInStockTemplate(productTitle: string, variantTitle: string, branchName: string, storeDomain: string) {
  const isEn = true; // Hardcoded to English for now or pass as param
  
  return {
    subject: `Back in Stock: ${productTitle} is now available!`,
    text: `Good news! Your requested item "${productTitle}${variantTitle !== 'Default Title' ? ` (${variantTitle})` : ''}" is back in stock at Saadeddin ${branchName}. Visit our shop to order now!`,
    html: `
      <div dir="ltr" style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; padding: 0; border: 1px solid #f0f0f0; border-radius: 16px; overflow: hidden; background-color: #ffffff; color: #1a1a1a;">
        <div style="background-color: #1b3d2e; padding: 40px 20px; text-align: center;">
          <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 900; letter-spacing: 1px;">SAADEDDIN</h1>
          <p style="color: #ffffff; opacity: 0.8; margin-top: 5px; font-size: 12px; font-weight: bold; text-transform: uppercase; letter-spacing: 2px;">Premium Quality Since 1979</p>
        </div>
        
        <div style="padding: 40px 30px; text-align: center;">
          <div style="font-size: 48px; margin-bottom: 20px;">✨</div>
          <h2 style="color: #1b3d2e; margin: 0 0 10px 0; font-size: 28px; font-weight: 900;">It's Back!</h2>
          <p style="color: #666666; font-size: 16px; margin-bottom: 30px; line-height: 1.6;">Good news! Your requested item is now back in stock and ready for delivery from your preferred branch.</p>
          
          <div style="background-color: #fdfaf6; border: 2px dashed #e8dfd3; border-radius: 20px; padding: 30px; margin-bottom: 30px;">
            <h3 style="margin: 0; color: #1b3d2e; font-size: 20px; font-weight: 800;">${productTitle}</h3>
            ${variantTitle && variantTitle !== 'Default Title' ? `<p style="margin: 5px 0 0 0; color: #8c7e6a; font-weight: bold;">${variantTitle}</p>` : ''}
            <div style="height: 1px; background-color: #e8dfd3; margin: 15px 0;"></div>
            <p style="margin: 0; color: #1b3d2e; font-size: 13px; font-weight: 700;"> BRANCH: <span style="color: #c0392b;">${branchName}</span></p>
          </div>
          
          <a href="https://${storeDomain}" style="background-color: #1b3d2e; color: #ffffff; padding: 18px 40px; text-decoration: none; border-radius: 14px; font-weight: 900; display: inline-block; font-size: 16px; box-shadow: 0 10px 20px rgba(27, 61, 46, 0.2); transition: transform 0.2s ease;">
            ORDER NOW
          </a>
        </div>
        
        <div style="background-color: #f9f9f9; padding: 30px; text-align: center; border-top: 1px solid #f0f0f0;">
          <p style="color: #999999; font-size: 12px; margin: 0;">You received this because you asked to be notified when this item is available.</p>
          <div style="margin-top: 20px; font-weight: bold; color: #1b3d2e; font-size: 14px;">Saadeddin Pastry</div>
        </div>
      </div>
    `
  };
}

