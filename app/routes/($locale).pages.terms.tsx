import { data, type LoaderFunctionArgs, type MetaFunction } from 'react-router';
import { useLoaderData, useRouteLoaderData } from 'react-router';
import patternBg from '~/assets/patteren-collection-header.svg';

const PAGE_QUERY = `#graphql
  query Page(
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
      handle: 'terms',
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
    return [{ title: isEn ? 'Terms of Service | Saadeddin' : 'الشروط والأحكام | سعد الدين' }];
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

export default function TermsPage() {
  const { page } = useLoaderData<typeof loader>();
  const rootData = useRouteLoaderData('root') as any;
  const isEn = rootData?.consent?.language?.toLowerCase() === 'en';

  return (
    <div className={`w-full min-h-screen bg-[#FEF8EB] ${isEn ? 'font-en text-left' : 'font-ar text-right'}`} dir={isEn ? 'ltr' : 'rtl'}>
      {/* Hero Section */}
      <div className="relative w-full min-h-[300px] bg-[#234745] overflow-hidden flex flex-col items-center justify-center text-white px-5 md:px-[80px] py-8">
        <div
          className="absolute inset-0 pointer-events-none opacity-100"
          style={{
            backgroundImage: `url(${patternBg})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center'
          }}
        />
        <div className="relative z-10 text-center">
          <h1 className="font-bold !text-[50px]" style={{ fontFamily: "'EnglishDigits', 'Bahij Janna', sans-serif", fontSize: '50px', fontWeight: 700, lineHeight: '100%', color: 'rgb(254, 248, 235)', textAlign: 'center', marginTop: '10px', marginBottom: '1rem' }}>
            {page.title}
          </h1>
        </div>
      </div>

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
