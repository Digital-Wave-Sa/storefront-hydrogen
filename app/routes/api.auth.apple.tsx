import {redirect, type LoaderFunctionArgs} from 'react-router';

export async function loader({context, request}: LoaderFunctionArgs) {
  const {env} = context;
  const url = new URL(request.url);
  const baseUrl = `${url.protocol}//${url.host}`;
  const redirectUri = `${baseUrl}/api/auth/callback/apple`;

  const appleAuthUrl = new URL('https://appleid.apple.com/auth/authorize');
  appleAuthUrl.searchParams.set(
    'client_id',
    env.APPLE_CLIENT_ID || 'com.saadeddin.storefront',
  );
  appleAuthUrl.searchParams.set('redirect_uri', redirectUri);
  appleAuthUrl.searchParams.set('response_type', 'code id_token');
  appleAuthUrl.searchParams.set('scope', 'name email');
  appleAuthUrl.searchParams.set('response_mode', 'form_post');

  return redirect(appleAuthUrl.toString());
}
