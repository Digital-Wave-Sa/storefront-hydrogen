import {data, type LoaderFunctionArgs, type MetaFunction} from 'react-router';
import {useLoaderData, Link, useRouteLoaderData} from 'react-router';
import {Pagination, getPaginationVariables} from '@shopify/hydrogen';

export const meta: MetaFunction = () => {
  return [{title: 'Saadeddin | Blogs'}];
};

export const loader = async ({
  request,
  context: {storefront},
}: LoaderFunctionArgs) => {
  const paginationVariables = getPaginationVariables(request, {
    pageBy: 10,
  });

  const {blogs} = await storefront.query(BLOGS_QUERY, {
    variables: {
      ...paginationVariables,
    },
  });

  return data({blogs});
};

export default function Blogs() {
  const {blogs} = useLoaderData<typeof loader>();
  const rootData = useRouteLoaderData('root') as any;
  const isEn = rootData?.locale === 'en';

  return (
    <div className="blogs" dir={isEn ? 'ltr' : 'rtl'}>
      <h1 className="text-3xl font-black text-[#234745] mb-8">
        {isEn ? 'Blogs' : 'المدونات'}
      </h1>
      <div className="blogs-grid">
        <Pagination connection={blogs}>
          {({nodes, isLoading, PreviousLink, NextLink}) => {
            return (
              <>
                <PreviousLink className="mb-8 block text-[#234745]">
                  {isLoading
                    ? isEn
                      ? 'Loading...'
                      : 'جاري التحميل...'
                    : isEn
                      ? '↑ Load previous'
                      : '↑ تحميل السابقة'}
                </PreviousLink>
                {nodes.map((blog) => {
                  return (
                    <Link
                      className="blog-card mb-6 block p-6 border rounded-2xl hover:shadow-lg transition-shadow"
                      key={blog.handle}
                      prefetch="intent"
                      to={`/blogs/${blog.handle}`}
                    >
                      <h2 className="text-xl font-bold">{blog.title}</h2>
                    </Link>
                  );
                })}
                <NextLink className="mt-8 block text-[#234745]">
                  {isLoading
                    ? isEn
                      ? 'Loading...'
                      : 'جاري التحميل...'
                    : isEn
                      ? 'Load more ↓'
                      : 'تحميل المزيد ↓'}
                </NextLink>
              </>
            );
          }}
        </Pagination>
      </div>
    </div>
  );
}

// NOTE: https://shopify.dev/docs/api/storefront/latest/objects/blog
const BLOGS_QUERY = `#graphql
  query Blogs(
    $country: CountryCode
    $endCursor: String
    $first: Int
    $language: LanguageCode
    $last: Int
    $startCursor: String
  ) @inContext(country: $country, language: $language) {
    blogs(
      first: $first,
      last: $last,
      before: $startCursor,
      after: $endCursor
    ) {
      pageInfo {
        hasNextPage
        hasPreviousPage
        startCursor
        endCursor
      }
      nodes {
        title
        handle
        seo {
          title
          description
        }
      }
    }
  }
` as const;
