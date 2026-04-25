import {useLoaderData, Link, useRouteLoaderData, data} from 'react-router';
import {type LoaderFunctionArgs} from 'react-router';
import {Pagination, getPaginationVariables, Image} from '@shopify/hydrogen';
import type {CollectionFragment} from 'storefrontapi.generated';

export async function loader({context, request}: LoaderFunctionArgs) {
  const paginationVariables = getPaginationVariables(request, {
    pageBy: 12,
  });

  const {collections} = await context.storefront.query(COLLECTIONS_QUERY, {
    variables: paginationVariables as any,
  });

  return data({collections});
}

export default function Collections() {
  const {collections} = useLoaderData<typeof loader>();
  const rootData = useRouteLoaderData('root') as any;
  const menu = rootData?.header?.menu;
  const isEn = rootData?.locale === 'en';

  return (
    <div className="collection-page" dir={isEn ? 'ltr' : 'rtl'}>
      <div className={`px-4 md:px-8 lg:px-12 py-12 max-w-[1440px] mx-auto ${isEn ? 'text-left' : 'text-right'}`}>
        
        {/* Horizontal Category Navigation */}
        {menu?.items && menu.items.length > 0 && (
          <div className="mb-12 overflow-x-auto hide-scrollbars">
            <div className="flex gap-4 pb-2 w-max">
              {menu.items.map((item: any) => {
                const getHandle = (url?: string) => {
                  if (!url) return '';
                  try {
                    const u = new URL(url);
                    const parts = u.pathname.split('/').filter(Boolean);
                    return parts[parts.length - 1] || '';
                  } catch {
                    const parts = url.split('/').filter(Boolean);
                    return parts[parts.length - 1] || '';
                  }
                };
                
                const itemHandle = getHandle(item.url);

                return (
                  <Link
                    key={item.id}
                    to={`/collections/${itemHandle}`}
                    className="px-8 py-4 rounded-[1.5rem] font-bold text-center transition-all duration-300 shadow-sm border bg-white text-gray-600 border-gray-100 hover:border-[#1b3d2e]/30 hover:shadow-md"
                  >
                    {item.title}
                  </Link>
                );
              })}
            </div>
          </div>
        )}

        {/* Main Content */}
        <div className="flex-1 min-w-0">
          <h1 className={`text-4xl font-black text-[#1b3d2e] mb-8 ${isEn ? 'text-left' : 'text-right'}`}>
            {isEn ? 'All Collections' : 'كل التصنيفات'}
          </h1>
          <Pagination connection={collections}>
            {({nodes, isLoading, PreviousLink, NextLink}) => (
              <div>
                <div className="flex justify-center mb-10">
                  <PreviousLink className="text-[#1b3d2e] font-black border-2 border-[#1b3d2e]/10 px-8 py-2.5 rounded-full hover:bg-gray-50 transition-all">
                    {isLoading ? (isEn ? 'Loading...' : 'جاري التحميل...') : (isEn ? '↑ Load Previous' : '↑ تحميل المنتجات السابقة')}
                  </PreviousLink>
                </div>
                
                <CollectionsGrid collections={nodes} />
                
                <div className="flex justify-center mt-16">
                  <NextLink className="bg-[#1b3d2e] text-white px-16 py-4 rounded-full font-black shadow-[0_10px_30px_rgba(27,61,46,0.3)] hover:shadow-[0_15px_40px_rgba(27,61,46,0.4)] hover:-translate-y-1 transition-all duration-300">
                    {isLoading ? (isEn ? 'Loading...' : 'جاري التحميل...') : (isEn ? 'Load More ↓' : 'تصفح المزيد ↓')}
                  </NextLink>
                </div>
              </div>
            )}
          </Pagination>
        </div>
      </div>
    </div>
  );
}

function CollectionsGrid({collections}: {collections: CollectionFragment[]}) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 lg:gap-8">
      {collections.map((collection, index) => (
        <CollectionItem
          key={collection.id}
          collection={collection}
          index={index}
        />
      ))}
    </div>
  );
}

function CollectionItem({
  collection,
  index,
}: {
  collection: CollectionFragment;
  index: number;
}) {
  return (
    <Link
      className="flex flex-col group h-full"
      key={collection.id}
      to={`/collections/${collection.handle}`}
      prefetch="intent"
    >
      <div className="relative aspect-square bg-gray-50 rounded-[2.5rem] overflow-hidden mb-4 border border-gray-100 hover:shadow-2xl transition-all duration-500">
        {collection.image && (
          <Image
            alt={collection.image.altText || collection.title}
            aspectRatio="1/1"
            data={collection.image}
            loading={index < 3 ? 'eager' : undefined}
            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
          />
        )}
        <div className="absolute inset-x-0 bottom-0 p-4 translate-y-full group-hover:translate-y-0 transition-transform duration-300 hidden md:block">
            <div className="w-full bg-[#1b3d2e] text-white py-3.5 rounded-[1.5rem] font-bold text-[13px] shadow-xl hover:bg-[#2d5e4a] transition-all text-center">
                {isEn ? 'View Products' : 'تصفح المنتجات'}
            </div>
        </div>
      </div>
      <h5 className="text-[17px] font-black text-gray-800 line-clamp-1 group-hover:text-[#1b3d2e] transition-colors duration-300 text-center">{collection.title}</h5>
    </Link>
  );
}

const COLLECTIONS_QUERY = `#graphql
  fragment Collection on Collection {
    id
    title
    handle
    image {
      id
      url
      altText
      width
      height
    }
  }
  query StoreCollections(
    $country: CountryCode
    $endCursor: String
    $first: Int
    $language: LanguageCode
    $last: Int
    $startCursor: String
  ) @inContext(country: $country, language: $language) {
    collections(
      first: $first,
      last: $last,
      before: $startCursor,
      after: $endCursor
    ) {
      nodes {
        ...Collection
      }
      pageInfo {
        hasNextPage
        hasPreviousPage
        startCursor
        endCursor
      }
    }
  }
` as const;

