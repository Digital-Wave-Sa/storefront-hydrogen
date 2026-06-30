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
    // Missing API URL Bypass
    if (!env.SMS_API_URL) {
      console.log(`[SMS BYPASS] Missing API URL. Pretending to send SMS to ${formattedPhone}.`);
      console.log(`[SMS BYPASS] Message content: ${message}`);
      return { success: true, result: 'dev-bypass' };
    }

    // The current SMS API (saadeddinpastry) strictly rejects non-966 numbers.
    // For international numbers, bypass the API so the user can use '0000' to login/register.
    if (!formattedPhone.startsWith('966')) {
      console.log(`[SMS BYPASS] International number detected (${formattedPhone}). Pretending to send SMS.`);
      console.log(`[SMS BYPASS] Message content: ${message}`);
      return { success: true, result: 'intl-bypass' };
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
      const result = JSON.parse(responseText);
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

