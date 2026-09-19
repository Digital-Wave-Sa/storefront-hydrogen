import {
  redirect,
  type LoaderFunctionArgs,
  type MetaFunction,
} from 'react-router';
import {pageTitle} from '~/lib/seo';
export {default} from './($locale).track-order.$id';

export async function loader({params, request}: LoaderFunctionArgs) {
  const isEn = new URL(request.url).pathname.startsWith('/en');
  const localePrefix = isEn ? '/en' : '';
  let rawId = params.id || '';

  if (rawId.includes('%3A') || rawId.includes('%2F')) {
    try {
      rawId = decodeURIComponent(rawId);
    } catch (e) {}
  }

  if (rawId.includes('/')) {
    rawId = rawId.split('/').pop() || rawId;
  }

  return redirect(`${localePrefix}/track-order/${rawId}`);
}

export const meta: MetaFunction = ({matches}) => {
  return [{title: pageTitle(matches, 'Order Details', 'تفاصيل الطلب')}];
};
