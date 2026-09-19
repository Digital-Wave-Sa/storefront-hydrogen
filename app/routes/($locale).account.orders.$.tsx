import type {MetaFunction} from 'react-router';
import {pageTitle} from '~/lib/seo';
export {loader, default} from './($locale).track-order.$id';

export const meta: MetaFunction = ({matches}) => {
  return [{title: pageTitle(matches, 'Order Details', 'تفاصيل الطلب')}];
};
