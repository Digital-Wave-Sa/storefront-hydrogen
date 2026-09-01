/**
 * Saadeddin SMS Service
 * Handles transactional SMS delivery via preferred providers.
 * Popular MENA Providers: Unifonic, Mobily.ws, Twilio, 46elks.
 */

export async function sendSMS({
  to,
  message,
  env
}: {
  to: string,
  message: string,
  env: any
}) {
  // The 'to' field is expected to be in E.164 format (e.g. +9665XXXXXXX or +9627XXXXXXX)
  // Most SMS gateways expect the number without the '+' or '00' prefix
  let formattedPhone = to.replace(/\s+/g, '').replace(/\D/g, '');
  
  // If the number somehow still starts with 00, strip it
  if (formattedPhone.startsWith('00')) {
     formattedPhone = formattedPhone.substring(2);
  }

  const payload = {
    mobile: formattedPhone,
    message: message
  };

  try {
    /**
     * Delivery bypasses are development-only.
     *
     * Both of these used to run in every environment and return
     * `{success: true}` without sending anything. A caller cannot tell a
     * pretended send from a real one, so in production the OTP was never
     * delivered while the login flow carried on as if it had — and the code
     * the user was expected to type was a fixed one. Outside development a
     * send that cannot happen now reports failure, so the caller shows an
     * error instead of waiting for an SMS that is not coming.
     */
    const isDev = process.env.NODE_ENV === 'development';

    if (!env.SMS_API_URL) {
      if (isDev) {
        console.log(`[SMS DEV] No API URL configured. Pretending to send to ${formattedPhone}.`);
        console.log(`[SMS DEV] Message content: ${message}`);
        return { success: true, result: 'dev-bypass' };
      }
      console.error('[SMS] SMS_API_URL is not configured — cannot send.');
      return { success: false, error: 'SMS service is not configured' };
    }

    // The current SMS API (saadeddinpastry) strictly rejects non-966 numbers.
    if (!formattedPhone.startsWith('966')) {
      if (isDev) {
        console.log(`[SMS DEV] International number (${formattedPhone}). Pretending to send.`);
        console.log(`[SMS DEV] Message content: ${message}`);
        return { success: true, result: 'intl-bypass' };
      }
      console.error(
        `[SMS] Provider does not accept non-966 numbers; refusing to send to ${formattedPhone}.`,
      );
      return {
        success: false,
        error: 'SMS delivery is not available for this country code',
      };
    }

    console.log('[SMS DEBUG] Sending to API:', {
      url: env.SMS_API_URL,
      mobile: formattedPhone,
      messageLength: message.length
    });

    const response = await fetch(env.SMS_API_URL, {
      method: 'POST',
      headers: {
        'Username': env.SMS_API_USERNAME,
        'Password': env.SMS_API_PASSWORD,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    const responseText = await response.text();
    console.log('[SMS API RESPONSE]', {
      status: response.status,
      statusText: response.statusText,
      body: responseText
    });

    if (!response.ok) {
      throw new Error(`SMS API error: ${response.status} ${response.statusText} - ${responseText}`);
    }

    try {
      const result = JSON.parse(responseText) as any;
      if (result.Result === "0" || result.Result === 0) {
        console.error('[SMS API REJECTED]', result);
        return { success: false, error: result.Message || "SMS API rejected request" };
      }
      console.log('[SMS SENT successfully]', result);
      return { success: true, result };
    } catch (e) {
      console.log('[SMS SENT (Text)]', responseText);
      return { success: true, result: responseText };
    }
  } catch (error: any) {
    console.error('[SMS SEND ERROR]', error.message || error);
    return { success: false, error: error.message || error };
  }
}

