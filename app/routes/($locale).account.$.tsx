import type {LoaderFunctionArgs} from 'react-router';
import {localeRedirect} from '~/lib/i18n';
import {redirect} from 'react-router';

export async function loader({context, request}: LoaderFunctionArgs) {
  if (await context.session.get('customerAccessToken')) {
    return localeRedirect(request, '/account');
  }
  return localeRedirect(request, '/account/login');
}
