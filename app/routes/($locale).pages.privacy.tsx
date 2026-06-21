import { data, type LoaderFunctionArgs, type MetaFunction } from 'react-router';
import { useLoaderData, useRouteLoaderData } from 'react-router';
import { PageHeader } from '~/components/layout/PageHeader';

const PAGE_QUERY = `#graphql
  query PrivacyPage(
    $language: LanguageCode,
    $country: CountryCode,
    $handle: String!
  )
  @inContext(language: $language, country: $country) {
    page(handle: $handle) {
      id
      title
      body
      seo {
        description
        title
      }
    }
  }
` as const;

export async function loader({ context }: LoaderFunctionArgs) {
  const { page } = await context.storefront.query(PAGE_QUERY, {
    variables: { 
      handle: 'privacy',
      language: context.storefront.i18n.language,
      country: context.storefront.i18n.country,
    },
  });

  if (!page) {
    throw new Response('Not Found', { status: 404 });
  }

  return data({ page });
}

export const meta: MetaFunction<typeof loader> = ({ data, parentsData }) => {
  const rootData = parentsData?.root as any;
  const isEn = rootData?.consent?.language?.toLowerCase() === 'en';
  
  if (!data?.page) {
    return [{ title: isEn ? 'Privacy Policy | Saadeddin' : 'سياسة الخصوصية | سعد الدين' }];
  }

  const { page } = data;
  const title = page.seo?.title || `${page.title} | Saadeddin`;
  const description = page.seo?.description || (page.body?.replace(/<[^>]*>?/gm, '').substring(0, 155) || '');

  return [
    { title: title.substring(0, 60) },
    { name: 'description', content: description.substring(0, 160) },
    { property: 'og:title', content: title.substring(0, 60) },
    { property: 'og:description', content: description.substring(0, 160) },
  ];
};

export default function PrivacyPage() {
  const { page } = useLoaderData<typeof loader>();
  const rootData = useRouteLoaderData('root') as any;
  const isEn = rootData?.consent?.language?.toLowerCase() === 'en';

  return (
    <div className={`w-full min-h-screen bg-[#FEF8EB] ${isEn ? 'font-en text-left' : 'font-ar text-right'}`} dir={isEn ? 'ltr' : 'rtl'}>
      {/* Hero Section */}
      <PageHeader 
        title={page.title} 
        isEn={isEn} 
      />

      <div className="max-w-[800px] mx-auto px-4 md:px-6 mt-10 md:mt-16 relative z-20 pb-20">
        <div className="bg-white rounded-3xl p-8 md:p-12 border border-gray-100 shadow-sm">
          {/* Dynamic Content from Shopify */}
          <div 
            className="text-[#234745]/80 prose prose-lg max-w-none"
            style={{ fontFamily: isEn ? 'inherit' : "'GE Dinar One', sans-serif", lineHeight: '1.8' }}
            dangerouslySetInnerHTML={{ __html: page.body }} 
          />
        </div>
      </div>
    </div>
  );
}
