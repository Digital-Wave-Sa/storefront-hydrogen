import {data, type LoaderFunctionArgs, type MetaFunction} from 'react-router';
import {useLoaderData, Link, useRouteLoaderData} from 'react-router';
import {Image, Pagination, getPaginationVariables} from '@shopify/hydrogen';
import type {ArticleItemFragment} from 'storefrontapi.generated';
import {useState} from 'react';
import {PageHeader} from '~/components/layout/PageHeader';

export const meta: MetaFunction<typeof loader> = ({data}) => {
  const blogTitle = data?.blog?.title || 'News & Articles';
  return [
    {title: `${blogTitle} | Saadeddin Pastry | أخبار مدونة سعد الدين`},
    {
      name: 'description',
      content:
        'Discover the latest news, stories, recipes, and special updates from Saadeddin Pastry. | اكتشف أحدث أخبار ومقالات وتحديثات حلويات سعد الدين.',
    },
  ];
};

export const loader = async ({
  request,
  params,
  context: {storefront},
}: LoaderFunctionArgs) => {
  const paginationVariables = getPaginationVariables(request, {
    pageBy: 12,
  });

  if (!params.blogHandle) {
    throw new Response('Blog not found', {status: 404});
  }

  try {
    const {blog} = await storefront.query(BLOGS_QUERY, {
      variables: {
        blogHandle: params.blogHandle,
        ...paginationVariables,
      },
      cache: storefront.CacheShort(),
    });

    if (!blog) {
      // Return a graceful fallback empty blog structure if blog handle isn't created in Shopify yet
      return data({
        blog: {
          title: params.blogHandle === 'news' ? 'الأخبار والمدونة' : params.blogHandle,
          articles: {nodes: [], pageInfo: {hasNextPage: false, hasPreviousPage: false}},
        },
      });
    }

    return data({blog});
  } catch (err) {
    return data({
      blog: {
        title: params.blogHandle === 'news' ? 'الأخبار والمدونة' : params.blogHandle,
        articles: {nodes: [], pageInfo: {hasNextPage: false, hasPreviousPage: false}},
      },
    });
  }
};

export default function Blog() {
  const {blog} = useLoaderData<typeof loader>();
  const articles = blog?.articles || {nodes: []};
  const rootData = useRouteLoaderData('root') as any;
  const isEn = rootData?.locale === 'en';

  const [searchQuery, setSearchQuery] = useState('');

  const fontFam = isEn
    ? "'Inter', sans-serif"
    : "'EnglishDigits', 'GE Dinar One', sans-serif";
  const headingFontFam = isEn
    ? "'Inter', sans-serif"
    : "'EnglishDigits', 'Bahij Janna', sans-serif";

  // Filter articles by search query if user types in search bar
  const allNodes = (articles?.nodes || []).filter((art: any) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase().trim();
    return (
      art.title?.toLowerCase().includes(q) ||
      art.excerpt?.toLowerCase().includes(q) ||
      art.author?.name?.toLowerCase().includes(q)
    );
  });

  const featuredArticle = allNodes.length > 0 ? allNodes[0] : null;
  const regularArticles = allNodes.length > 1 ? allNodes.slice(1) : (allNodes.length === 1 ? [] : []);

  return (
    <div
      className={`w-full min-h-screen bg-[#FEF8EB] ${isEn ? 'font-en text-left' : 'font-ar text-right'}`}
      dir={isEn ? 'ltr' : 'rtl'}
    >
      {/* ─── 1. HERO HEADER ────────────────────────────────────────────────── */}
      <PageHeader
        title={
          isEn
            ? blog.title || 'News & Stories'
            : blog.title === 'News' || blog.title === 'news'
              ? 'الأخبار والمدونة'
              : blog.title || 'الأخبار والمدونة'
        }
        subtitle={isEn ? 'Latest Updates' : 'أخبار وحكايات سعد الدين'}
        isEn={isEn}
      >
        <p
          className="text-[#BBCFCD] text-[16px] sm:text-[18px] max-w-xl mx-auto mt-3 mb-6 leading-relaxed"
          style={{fontFamily: headingFontFam}}
        >
          {isEn
            ? 'Discover the latest news, heritage stories, featured recipes, and special occasion highlights from Saadeddin Pastry.'
            : 'اكتشف أحدث أخبار حلويات سعد الدين، قصص العراقة، المقالات المميزة وعروض المناسبات.'}
        </p>

        {/* Search Bar */}
        <div className="relative max-w-[480px] w-full mx-auto mt-2">
          <div className="relative flex items-center bg-white rounded-full overflow-hidden shadow-md">
            <div className={`absolute ${isEn ? 'left-4' : 'right-4'} text-gray-400`}>
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
              >
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
            </div>

            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={isEn ? 'Search articles & news...' : 'ابحث في الأخبار والمقالات...'}
              className={`w-full h-[44px] bg-white text-gray-800 text-sm outline-none ${
                isEn ? 'pl-11 pr-24 text-left' : 'pr-11 pl-24 text-right'
              }`}
            />

            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className={`absolute ${isEn ? 'right-20' : 'left-20'} text-gray-400 hover:text-gray-600 p-1`}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            )}

            <button className={`absolute ${isEn ? 'right-1' : 'left-1'} h-[36px] px-6 bg-[#234745] hover:bg-[#1a3533] text-white rounded-full font-bold text-xs transition-colors`}>
              {isEn ? 'Search' : 'بحث'}
            </button>
          </div>
        </div>
      </PageHeader>

      {/* ─── MAIN CONTENT AREA ────────────────────────────────────────────── */}
      <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* ─── 2. EMPTY STATE / COMING SOON BANNER ───────────────────────── */}
        {allNodes.length === 0 && (
          <div className="bg-white rounded-3xl border border-[#234745]/10 shadow-sm p-10 sm:p-16 text-center max-w-[840px] mx-auto">
            <div className="w-20 h-20 bg-[#234745]/5 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#234745" strokeWidth="1.8">
                <path d="M19 20H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h10l5 5v11a2 2 0 0 1-2 2z"></path>
                <polyline points="14 4 14 9 19 9"></polyline>
                <line x1="8" y1="13" x2="16" y2="13"></line>
                <line x1="8" y1="17" x2="14" y2="17"></line>
              </svg>
            </div>

            <h2
              className="text-[28px] sm:text-[34px] font-bold text-[#234745] mb-3"
              style={{fontFamily: headingFontFam}}
            >
              {searchQuery
                ? isEn
                  ? `No articles found for "${searchQuery}"`
                  : `لم يتم العثور على مقالات تطابق "${searchQuery}"`
                : isEn
                  ? 'New Stories & Updates Coming Soon'
                  : 'منشورات وأخبار جديدة قادمة قريباً'}
            </h2>

            <p
              className="text-[#7D7D7D] text-[15px] sm:text-[17px] max-w-[560px] mx-auto mb-8 leading-relaxed"
              style={{fontFamily: fontFam}}
            >
              {searchQuery
                ? isEn
                  ? 'Try searching with different keywords or browse all topics.'
                  : 'جرب البحث باستخدام كلمات أخرى أو تصفح الأقسام المختلفة.'
                : isEn
                  ? 'We are currently preparing inspiring articles, recipe guides, and news about our latest creations. Stay tuned!'
                  : 'نعمل حالياً على تجهيز مقالات ملهمة، وصفات مميزة، وأخبار عن أحدث ابتكارات سعد الدين. خليك بالقرب!'}
            </p>

            {searchQuery ? (
              <button
                onClick={() => setSearchQuery('')}
                className="px-8 py-3 bg-[#234745] hover:bg-[#1a3533] text-white rounded-full font-bold text-sm transition-colors shadow-sm inline-flex items-center gap-2"
                style={{fontFamily: fontFam}}
              >
                <span>{isEn ? 'Show All Articles' : 'عرض كافة المقالات'}</span>
              </button>
            ) : (
              <div className="flex flex-wrap justify-center gap-4">
                <Link
                  to={isEn ? '/en/collections/all' : '/collections/all'}
                  className="px-8 py-3 bg-[#234745] hover:bg-[#1a3533] text-white rounded-full font-bold text-sm transition-colors shadow-sm"
                  style={{fontFamily: fontFam}}
                >
                  {isEn ? 'Browse Our Products' : 'تصفح تشكيلتنا المميزة'}
                </Link>
                <Link
                  to={isEn ? '/en/pages/branches' : '/pages/branches'}
                  className="px-8 py-3 bg-[#BBCFCD] hover:bg-[#a6bdbc] text-[#234745] rounded-full font-bold text-sm transition-colors"
                  style={{fontFamily: fontFam}}
                >
                  {isEn ? 'Find Nearest Branch' : 'ابحث عن أقرب فرع'}
                </Link>
              </div>
            )}
          </div>
        )}

        {/* ─── 3. FEATURED POST HERO CARD ──────────────────────────────────── */}
        {featuredArticle && !searchQuery && (
          <div className="mb-14">
            <FeaturedArticleCard article={featuredArticle} isEn={isEn} />
          </div>
        )}

        {/* ─── 4. ARTICLES GRID ──────────────────────────────────────────────── */}
        {allNodes.length > 0 && (
          <div>
            {!searchQuery && (
              <h3
                className="text-[24px] sm:text-[28px] font-bold text-[#234745] mb-8 pb-3 border-b border-[#234745]/10"
                style={{fontFamily: headingFontFam}}
              >
                {isEn ? 'All Articles' : 'أحدث المقالات'}
              </h3>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {(searchQuery ? allNodes : (featuredArticle ? regularArticles : allNodes)).map(
                (article: any, idx: number) => (
                  <ArticleCard
                    key={article.id || idx}
                    article={article}
                    isEn={isEn}
                    loading={idx < 6 ? 'eager' : 'lazy'}
                  />
                ),
              )}
            </div>

            {/* Pagination Controls */}
            {articles.pageInfo && (
              <div className="mt-12 text-center">
                <Pagination connection={articles}>
                  {({isLoading, PreviousLink, NextLink}) => (
                    <div className="flex items-center justify-center gap-4">
                      <PreviousLink className="px-6 py-2.5 bg-white border border-[#234745]/20 text-[#234745] hover:bg-[#234745] hover:text-white rounded-full font-bold text-sm transition-all shadow-sm">
                        {isLoading
                          ? isEn ? 'Loading...' : 'جاري التحميل...'
                          : isEn ? '← Previous' : '← السابقة'}
                      </PreviousLink>
                      <NextLink className="px-6 py-2.5 bg-[#234745] hover:bg-[#1a3533] text-white rounded-full font-bold text-sm transition-all shadow-sm">
                        {isLoading
                          ? isEn ? 'Loading...' : 'جاري التحميل...'
                          : isEn ? 'Next →' : 'التالية →'}
                      </NextLink>
                    </div>
                  )}
                </Pagination>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── FEATURED ARTICLE CARD ───────────────────────────────────────────────────
function FeaturedArticleCard({
  article,
  isEn,
}: {
  article: ArticleItemFragment;
  isEn: boolean;
}) {
  const publishedDate = article.publishedAt
    ? new Intl.DateTimeFormat(isEn ? 'en-US' : 'ar-SA', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      }).format(new Date(article.publishedAt))
    : '';

  const fontFam = isEn
    ? "'Inter', sans-serif"
    : "'EnglishDigits', 'GE Dinar One', sans-serif";
  const headingFontFam = isEn
    ? "'Inter', sans-serif"
    : "'EnglishDigits', 'Bahij Janna', sans-serif";

  const blogHandle = article.blog?.handle || 'news';
  const articleUrl = `/blogs/${blogHandle}/${article.handle}`;

  return (
    <Link
      to={articleUrl}
      className="group relative block w-full bg-white rounded-3xl border border-[#234745]/10 shadow-lg overflow-hidden transition-all duration-300 hover:shadow-2xl hover:-translate-y-1"
    >
      <div className="grid grid-cols-1 lg:grid-cols-12 min-h-[380px] lg:min-h-[440px]">
        {/* Cover Image */}
        <div className="lg:col-span-7 relative h-[260px] lg:h-full overflow-hidden bg-gray-100">
          {article.image ? (
            <Image
              alt={article.image.altText || article.title}
              data={article.image}
              sizes="(min-width: 1024px) 60vw, 100vw"
              className="w-full h-full object-cover object-center transition-transform duration-700 group-hover:scale-105"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-[#234745] to-[#122826] flex items-center justify-center p-8 text-center text-white">
              <span className="font-bold text-2xl" style={{fontFamily: headingFontFam}}>
                {article.title}
              </span>
            </div>
          )}
          <div className="absolute top-4 left-4 right-4 flex items-center justify-between pointer-events-none">
            <span className="px-4 py-1.5 rounded-full bg-[#234745] text-white font-bold text-xs shadow-md">
              {isEn ? 'Featured Story' : 'مقال مميز'}
            </span>
          </div>
        </div>

        {/* Content */}
        <div className="lg:col-span-5 p-8 lg:p-12 flex flex-col justify-between bg-white text-[#234745]">
          <div>
            {publishedDate && (
              <div
                className="text-xs font-bold text-[#A07A58] mb-3 flex items-center gap-2"
                style={{fontFamily: fontFam}}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                  <line x1="16" y1="2" x2="16" y2="6"></line>
                  <line x1="8" y1="2" x2="8" y2="6"></line>
                  <line x1="3" y1="10" x2="21" y2="10"></line>
                </svg>
                <span>{publishedDate}</span>
                {article.author?.name && (
                  <>
                    <span>•</span>
                    <span>{article.author.name}</span>
                  </>
                )}
              </div>
            )}

            <h2
              className="text-[26px] lg:text-[34px] font-bold text-[#234745] leading-tight mb-4 group-hover:text-[#A07A58] transition-colors"
              style={{fontFamily: headingFontFam}}
            >
              {article.title}
            </h2>

            {article.excerpt && (
              <p
                className="text-[#7D7D7D] text-[15px] lg:text-[16px] leading-relaxed line-clamp-3 mb-6"
                style={{fontFamily: fontFam}}
              >
                {article.excerpt}
              </p>
            )}
          </div>

          <div className="pt-4 border-t border-gray-100 flex items-center text-[#234745] font-bold text-sm group-hover:translate-x-1 rtl:group-hover:-translate-x-1 transition-transform">
            <span>{isEn ? 'Read Full Article' : 'اقرأ المقال كاملاً'}</span>
            <span className={`mx-2 text-lg ${isEn ? '' : 'rotate-180'}`}>→</span>
          </div>
        </div>
      </div>
    </Link>
  );
}

// ─── REGULAR ARTICLE CARD ────────────────────────────────────────────────────
function ArticleCard({
  article,
  isEn,
  loading = 'lazy',
}: {
  article: ArticleItemFragment;
  isEn: boolean;
  loading?: HTMLImageElement['loading'];
}) {
  const publishedDate = article.publishedAt
    ? new Intl.DateTimeFormat(isEn ? 'en-US' : 'ar-SA', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      }).format(new Date(article.publishedAt))
    : '';

  const fontFam = isEn
    ? "'Inter', sans-serif"
    : "'EnglishDigits', 'GE Dinar One', sans-serif";
  const headingFontFam = isEn
    ? "'Inter', sans-serif"
    : "'EnglishDigits', 'Bahij Janna', sans-serif";

  const blogHandle = article.blog?.handle || 'news';
  const articleUrl = `/blogs/${blogHandle}/${article.handle}`;

  return (
    <Link
      to={articleUrl}
      className="group flex flex-col bg-white rounded-2xl border border-[#234745]/10 shadow-sm overflow-hidden transition-all duration-300 hover:shadow-xl hover:-translate-y-1 h-full"
    >
      {/* Article Cover Image */}
      <div className="relative h-[220px] w-full overflow-hidden bg-gray-100 shrink-0">
        {article.image ? (
          <Image
            alt={article.image.altText || article.title}
            data={article.image}
            loading={loading}
            sizes="(min-width: 1024px) 33vw, (min-width: 768px) 50vw, 100vw"
            className="w-full h-full object-cover object-center transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-[#234745] to-[#1a3533] flex items-center justify-center p-6 text-center text-white">
            <span className="font-bold text-lg" style={{fontFamily: headingFontFam}}>
              {article.title}
            </span>
          </div>
        )}
      </div>

      {/* Article Meta & Title */}
      <div className="p-6 flex flex-col justify-between flex-1 bg-white">
        <div>
          {publishedDate && (
            <div
              className="text-xs font-bold text-[#A07A58] mb-2.5 flex items-center gap-2"
              style={{fontFamily: fontFam}}
            >
              <span>{publishedDate}</span>
              {article.author?.name && (
                <>
                  <span>•</span>
                  <span>{article.author.name}</span>
                </>
              )}
            </div>
          )}

          <h3
            className="text-[20px] font-bold text-[#234745] leading-snug mb-3 group-hover:text-[#A07A58] transition-colors line-clamp-2"
            style={{fontFamily: headingFontFam}}
          >
            {article.title}
          </h3>

          {article.excerpt && (
            <p
              className="text-[#7D7D7D] text-[14px] leading-relaxed line-clamp-3 mb-4"
              style={{fontFamily: fontFam}}
            >
              {article.excerpt}
            </p>
          )}
        </div>

        <div className="pt-4 border-t border-gray-100 flex items-center justify-between text-[#234745] font-bold text-xs group-hover:text-[#A07A58]">
          <span>{isEn ? 'Read More' : 'اقرأ المزيد'}</span>
          <span className={`text-sm ${isEn ? '' : 'rotate-180'} transition-transform group-hover:translate-x-1 rtl:group-hover:-translate-x-1`}>
            →
          </span>
        </div>
      </div>
    </Link>
  );
}

// ─── SHOPIFY GRAPHQL QUERY ───────────────────────────────────────────────────
const BLOGS_QUERY = `#graphql
  query Blog(
    $language: LanguageCode
    $blogHandle: String!
    $first: Int
    $last: Int
    $startCursor: String
    $endCursor: String
  ) @inContext(language: $language) {
    blog(handle: $blogHandle) {
      title
      seo {
        title
        description
      }
      articles(
        first: $first,
        last: $last,
        before: $startCursor,
        after: $endCursor
      ) {
        nodes {
          ...ArticleItem
        }
        pageInfo {
          hasPreviousPage
          hasNextPage
          startCursor
          endCursor
        }
      }
    }
  }
  fragment ArticleItem on Article {
    author: authorV2 {
      name
    }
    contentHtml
    excerpt
    handle
    id
    image {
      id
      altText
      url
      width
      height
    }
    publishedAt
    title
    blog {
      handle
      title
    }
  }
` as const;
