import {redirect, type LoaderFunctionArgs} from 'react-router';

export async function loader({context, request}: LoaderFunctionArgs) {
  const {env} = context;
  const url = new URL(request.url);
  const baseUrl = `${url.protocol}//${url.host}`;
  const redirectUri = `${baseUrl}/api/auth/callback/facebook`;

  const facebookAuthUrl = new URL(
    'https://www.facebook.com/v12.0/dialog/oauth',
  );
  facebookAuthUrl.searchParams.set(
    'client_id',
    env.FACEBOOK_CLIENT_ID || '1234567890',
  );
  facebookAuthUrl.searchParams.set('redirect_uri', redirectUri);
  facebookAuthUrl.searchParams.set('response_type', 'code');
  facebookAuthUrl.searchParams.set('scope', 'email,public_profile');

  return redirect(facebookAuthUrl.toString());
}
