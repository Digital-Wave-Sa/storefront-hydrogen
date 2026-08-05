import {data, type LoaderFunctionArgs, type MetaFunction} from 'react-router';
import {useLoaderData, useRouteLoaderData, Link} from 'react-router';
import {Image} from '@shopify/hydrogen';
import {useState} from 'react';

export const meta: MetaFunction<typeof loader> = ({data}) => {
  const title = data?.article?.seo?.title || data?.article?.title || 'Article';
  const description =
    data?.article?.seo?.description ||
    'Read the full story on Saadeddin Pastry.';
  return [
    {title: `${title} | Saadeddin Pastry | سعد الدين`},
    {name: 'description', content: description},
  ];
};

export async function loader({params, context}: LoaderFunctionArgs) {
  const {blogHandle, articleHandle} = params;

  if (!articleHandle || !blogHandle) {
    throw new Response('Not found', {status: 404});
  }

  const {blog} = await context.storefront.query(ARTICLE_QUERY, {
    variables: {blogHandle, articleHandle},
    cache: context.storefront.CacheShort(),
  });

  if (!blog?.articleByHandle) {
    throw new Response('Article not found', {status: 404});
  }

  const article = blog.articleByHandle;

  return data({article, blogHandle});
}

export default function Article() {
  const {article, blogHandle} = useLoaderData<typeof loader>();
  const {title, image, contentHtml, author, publishedAt} = article;
  const rootData = useRouteLoaderData('root') as any;
  const isEn = rootData?.locale === 'en';
  const [copied, setCopied] = useState(false);

  const publishedDate = publishedAt
    ? new Intl.DateTimeFormat(isEn ? 'en-US' : 'ar-SA', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      }).format(new Date(publishedAt))
    : '';

  const fontFam = isEn
    ? "'Inter', sans-serif"
    : "'EnglishDigits', 'GE Dinar One', sans-serif";
  const headingFontFam = isEn
    ? "'Inter', sans-serif"
    : "'EnglishDigits', 'Bahij Janna', sans-serif";

  const handleCopyLink = () => {
    if (typeof window !== 'undefined') {
      navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div
      className={`w-full min-h-screen bg-[#FEF8EB] py-10 lg:py-16 ${
        isEn ? 'font-en text-left' : 'font-ar text-right'
      }`}
      dir={isEn ? 'ltr' : 'rtl'}
    >
      <article className="max-w-[880px] mx-auto px-4 sm:px-6 lg:px-8">
        {/* Breadcrumbs & Back Link */}
        <div className="mb-8 flex items-center justify-between">
          <Link
            to={`/blogs/${blogHandle}`}
            className="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-white border border-[#234745]/15 text-[#234745] font-bold text-xs sm:text-sm hover:bg-[#234745] hover:text-white transition-all shadow-sm"
            style={{fontFamily: fontFam}}
          >
            <span className={`text-base ${isEn ? '' : 'rotate-180'}`}>←</span>
            <span>{isEn ? 'Back to News & Articles' : 'العودة للمدونة والأخبار'}</span>
          </Link>
        </div>

        {/* Header Section */}
        <header className="mb-10 text-center">
          <div
            className="inline-flex items-center gap-2 px-4 py-1 rounded-full bg-[#234745]/10 text-[#234745] font-bold text-xs mb-4"
            style={{fontFamily: fontFam}}
          >
            <span>{isEn ? 'News & Stories' : 'أخبار وحكايات'}</span>
          </div>

          <h1
            className="text-[32px] sm:text-[44px] lg:text-[52px] font-bold text-[#234745] leading-tight mb-6"
            style={{fontFamily: headingFontFam}}
          >
            {title}
          </h1>

          <div
            className="flex items-center justify-center flex-wrap gap-4 text-sm text-[#7D7D7D] font-medium"
            style={{fontFamily: fontFam}}
          >
            {publishedDate && (
              <span className="flex items-center gap-1.5">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                  <line x1="16" y1="2" x2="16" y2="6"></line>
                  <line x1="8" y1="2" x2="8" y2="6"></line>
                  <line x1="3" y1="10" x2="21" y2="10"></line>
                </svg>
                {publishedDate}
              </span>
            )}

            {author?.name && (
              <>
                <span>•</span>
                <span className="flex items-center gap-1.5">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                    <circle cx="12" cy="7" r="4"></circle>
                  </svg>
                  {author.name}
                </span>
              </>
            )}
          </div>
        </header>

        {/* Featured Image */}
        {image && (
          <div className="mb-12 rounded-3xl overflow-hidden shadow-xl border border-[#234745]/10 max-h-[520px] bg-gray-100">
            <Image
              data={image}
              sizes="(min-width: 1024px) 880px, 100vw"
              loading="eager"
              className="w-full h-full object-cover object-center"
            />
          </div>
        )}

        {/* Main Content Body */}
        <div className="bg-white rounded-3xl p-8 sm:p-12 lg:p-16 border border-[#234745]/10 shadow-sm mb-12">
          <div
            dangerouslySetInnerHTML={{__html: contentHtml}}
            className="prose prose-lg max-w-none text-[#234745] leading-relaxed text-[17px] sm:text-[18px] space-y-6"
            style={{
              fontFamily: fontFam,
              lineHeight: '1.8',
            }}
          />

          {/* Social Share Bar */}
          <div className="mt-12 pt-8 border-t border-gray-100 flex flex-wrap items-center justify-between gap-4">
            <span className="font-bold text-sm text-[#234745]" style={{fontFamily: fontFam}}>
              {isEn ? 'Share this article:' : 'مشاركة المقال:'}
            </span>

            <div className="flex items-center gap-3">
              <button
                onClick={handleCopyLink}
                className="px-4 py-2 bg-[#FEF8EB] text-[#234745] hover:bg-[#234745] hover:text-white rounded-full font-bold text-xs transition-all flex items-center gap-1.5 shadow-sm"
                style={{fontFamily: fontFam}}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path>
                  <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path>
                </svg>
                <span>{copied ? (isEn ? 'Copied!' : 'تم النسخ!') : (isEn ? 'Copy Link' : 'نسخ الرابط')}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Footer Back Button */}
        <div className="text-center">
          <Link
            to={`/blogs/${blogHandle}`}
            className="inline-flex items-center gap-2 px-8 py-3.5 rounded-full bg-[#234745] text-white font-bold text-sm hover:bg-[#1a3533] transition-all shadow-md"
            style={{fontFamily: fontFam}}
          >
            <span className={`text-base ${isEn ? '' : 'rotate-180'}`}>←</span>
            <span>{isEn ? 'Back to News & Articles' : 'العودة لكافة المقالات والأخبار'}</span>
          </Link>
        </div>
      </article>
    </div>
  );
}

const ARTICLE_QUERY = `#graphql
  query Article(
    $articleHandle: String!
    $blogHandle: String!
    $country: CountryCode
    $language: LanguageCode
  ) @inContext(language: $language, country: $country) {
    blog(handle: $blogHandle) {
      articleByHandle(handle: $articleHandle) {
        title
        contentHtml
        publishedAt
        author: authorV2 {
          name
        }
        image {
          id
          altText
          url
          width
          height
        }
        seo {
          description
          title
        }
      }
    }
  }
` as const;
