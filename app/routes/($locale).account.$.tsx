import type {LoaderFunctionArgs} from 'react-router';
import {redirect} from 'react-router';

export async function loader({context}: LoaderFunctionArgs) {
  if (await context.session.get('customerAccessToken')) {
    return redirect('/account');
  }
  return redirect('/account/login');
}





