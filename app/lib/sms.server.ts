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
  // Ensure the phone number starts with 966 (Saudi Arabia)
  // If it starts with '5', prefix it with '966'
  // If it starts with '05', replace '0' with '966'
  let formattedPhone = to.replace(/\s+/g, '').replace(/\D/g, '');
  
  // Enforce 00966 format for the SMS provider
  if (formattedPhone.startsWith('00966')) {
     // Already formatted properly
  } else if (formattedPhone.startsWith('966')) {
     formattedPhone = '00' + formattedPhone;
  } else if (formattedPhone.startsWith('05')) {
    formattedPhone = '00966' + formattedPhone.substring(1);
  } else if (formattedPhone.startsWith('5') && formattedPhone.length === 9) {
    formattedPhone = '00966' + formattedPhone;
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

