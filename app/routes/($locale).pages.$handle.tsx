import {data, type LoaderFunctionArgs, type MetaFunction} from 'react-router';
import {useLoaderData, useRouteLoaderData} from 'react-router';

export const meta: MetaFunction<typeof loader> = ({data}) => {
  if (!data?.page) {
    return [{title: 'Saadeddin Page'}];
  }
  const { page } = data;
  const title = page.seo?.title || `${page.title} | Saadeddin`;
  const description = page.seo?.description || (page.body?.replace(/<[^>]*>?/gm, '').substring(0, 155) || `View ${page.title} at Saadeddin.`);
  
  return [
    { title: title.substring(0, 60) },
    { name: 'description', content: description.substring(0, 160) },
    { property: 'og:title', content: title.substring(0, 60) },
    { property: 'og:description', content: description.substring(0, 160) },
  ];
};

export async function loader({params, context}: LoaderFunctionArgs) {
  if (!params.handle) {
    throw new Error('Missing page handle');
  }

  const {page} = await context.storefront.query(PAGE_QUERY, {
    variables: {
      handle: params.handle,
    },
  });

  if (!page) {
    throw new Response('Not Found', {status: 404});
  }

  return data({page});
}

export default function Page() {
  const {page} = useLoaderData<typeof loader>();
  const rootData = useRouteLoaderData('root') as any;
  const isEn = rootData?.locale === 'en';

  const isBranchPage = page.handle.includes('branch') || page.handle.includes('location');

  return (
    <div className="page" dir={isEn ? 'ltr' : 'rtl'}>
      {isBranchPage && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
             __html: JSON.stringify({
                "@context": "https://schema.org",
                "@type": "LocalBusiness",
                "name": "Saadeddin Pastry",
                "image": "https://saadeddin.com/logo.png",
                "url": `https://saadeddin.com/pages/${page.handle}`,
                "telephone": "920017070",
                "priceRange": "$$",
                "address": {
                  "@type": "PostalAddress",
                  "addressCountry": "SA",
                  "addressRegion": "Riyadh"
                }
             })
          }}
        />
      )}
      <header>
        <h1>{page.title}</h1>
      </header>
      <main dangerouslySetInnerHTML={{__html: page.body}} />
    </div>
  );
}

const PAGE_QUERY = `#graphql
  query Page(
    $language: LanguageCode,
    $country: CountryCode,
    $handle: String!
  )
  @inContext(language: $language, country: $country) {
    page(handle: $handle) {
      id
      handle
      title
      body
      seo {
        description
        title
      }
    }
  }
` as const;
