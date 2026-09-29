// @ts-ignore - route types generated during build
import type {Route} from './+types/sitemap.$type.$page[.xml]';
import {getSitemap} from '@shopify/hydrogen';

export async function loader({
  request,
  params,
  context: {storefront},
}: Route.LoaderArgs) {
  const response = await getSitemap({
    storefront,
    request,
    params,
    /**
     * The site's two languages: Arabic at the root, English under /en.
     *
     * This used to be the Hydrogen template's ['EN-US', 'EN-CA', 'FR-CA'],
     * which told Google every page also lived at /EN-US/..., /EN-CA/... and
     * /FR-CA/... -- addresses that 404 here. Each <url> now lists its Arabic
     * address as the main one, with hreflang alternates for ar and en.
     */
    locales: ['ar', 'en'],
    getLink: ({type, baseUrl, handle, locale}) => {
      if (locale === 'en') return `${baseUrl}/en/${type}/${handle}`;
      return `${baseUrl}/${type}/${handle}`;
    },
  });

  response.headers.set('Cache-Control', `max-age=${60 * 60 * 24}`);

  return response;
}
