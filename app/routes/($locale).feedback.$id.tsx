import { useState, useRef, useEffect } from 'react';
import { useLoaderData, useFetcher, useLocation, Link } from 'react-router';
import type { Route } from './+types/feedback.$id';
import { PageLayout } from '~/components/PageLayout';
import { useI18n } from '~/lib/i18n';

export async function loader({ params, context }: Route.LoaderArgs) {
  const { id } = params;
  const locale = params.locale || 'ar';
  
  // In a real scenario, we would fetch order details here using the Admin API
  // For now, we'll mock the order data
  return {
    orderId: id,
    locale,
    order: {
      name: `#${id?.substring(0, 4) || '1234'}`,
      items: [
        {
          id: '1',
          title: locale === 'en' ? 'Pistachio Chocolate Box' : 'بوكس شوكولاتة الفستق',
          image: 'https://cdn.shopify.com/s/files/1/0664/1151/2053/products/pistachio.jpg?v=1664115120',
          handle: 'pistachio-chocolate'
        }
      ],
      branchName: locale === 'en' ? 'Olaya Branch' : 'فرع العليا'
    }
  };
}

export default function FeedbackPage() {
  const { orderId, locale, order } = useLoaderData<typeof loader>();
  const i18n = useI18n(locale);
  const isEn = locale === 'en';
  const fetcher = useFetcher();
  const [submitted, setSubmitted] = useState(false);
  
  // Form State
  const [productRatings, setProductRatings] = useState<Record<string, number>>({});
  const [branchRating, setBranchRating] = useState(0);
  const [images, setImages] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (fetcher.data?.success) {
      setSubmitted(true);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [fetcher.data]);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      setImages(prev => [...prev, ...files]);
      const newPreviews = files.map(file => URL.createObjectURL(file));
      setPreviews(prev => [...prev, ...newPreviews]);
    }
  };

  const removeImage = (index: number) => {
    setImages(prev => prev.filter((_, i) => i !== index));
    setPreviews(prev => prev.filter((_, i) => i !== index));
  };

  if (submitted) {
    return (
      <PageLayout>
        <div className="min-h-[70vh] flex items-center justify-center px-4 py-20 bg-[#fdfaf6]">
          <div className="max-w-md w-full bg-white rounded-[40px] p-10 text-center shadow-2xl shadow-[#234745]/10 border border-gray-100">
            <div className="w-24 h-24 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-8">
              <span className="text-5xl">💚</span>
            </div>
            <h1 className="text-3xl font-black text-[#234745] mb-4">{i18n.common.feedbackSuccess}</h1>
            <p className="text-gray-500 font-bold mb-10 leading-relaxed">
              {i18n.common.feedbackSuccessMessage}
            </p>
            <Link 
              to={isEn ? '/en' : '/'}
              className="inline-block bg-[#234745] text-white font-black px-10 py-4 rounded-2xl hover:bg-[#d4a06a] transition-all shadow-lg hover:shadow-[#d4a06a]/20"
            >
              {i18n.common.backToHome}
            </Link>
          </div>
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout>
      <div className="bg-[#fdfaf6] min-h-screen py-12 md:py-20 px-4" dir={isEn ? 'ltr' : 'rtl'}>
        <div className="max-w-3xl mx-auto">
          {/* Header */}
          <div className="text-center mb-12">
            <span className="inline-block bg-[#234745] text-white text-[10px] font-black uppercase tracking-[0.2em] px-4 py-1.5 rounded-full mb-4">
              Order {order.name}
            </span>
            <h1 className="text-4xl md:text-5xl font-black text-[#234745] mb-4 tracking-tight">
              {i18n.common.feedbackTitle}
            </h1>
            <p className="text-gray-400 font-bold max-w-md mx-auto leading-relaxed">
              {i18n.common.feedbackSubtitle}
            </p>
          </div>

          <fetcher.Form method="POST" className="space-y-8">
            <input type="hidden" name="orderId" value={orderId} />
            <input type="hidden" name="branchName" value={order.branchName} />

            {/* Product Ratings */}
            <div className="bg-white rounded-[40px] p-8 md:p-12 shadow-xl shadow-[#234745]/5 border border-gray-50 overflow-hidden relative">
               <div className="absolute top-0 left-0 w-2 h-full bg-[#234745]"></div>
               <h2 className="text-xl font-black text-[#234745] mb-8 flex items-center gap-3">
                 <span className="w-8 h-8 rounded-full bg-[#f5eeea] flex items-center justify-center text-sm">🛍️</span>
                 {i18n.common.rateProduct}
               </h2>
               
               {order.items.map((item) => (
                 <div key={item.id} className="flex flex-col md:flex-row items-center gap-6 p-6 rounded-3xl bg-[#fafafa] border border-gray-100">
                    <div className="w-24 h-24 rounded-2xl overflow-hidden bg-gray-200 shrink-0 shadow-sm">
                      <img src={item.image} alt={item.title} className="w-full h-full object-cover" />
                    </div>
                    <div className="flex-1 text-center md:text-start">
                      <h3 className="font-black text-[#234745] mb-2">{item.title}</h3>
                      <InteractiveStarRating 
                        value={productRatings[item.id] || 0} 
                        onChange={(v) => setProductRatings(prev => ({...prev, [item.id]: v}))}
                        isEn={isEn}
                      />
                      <input type="hidden" name={`product_${item.id}_rating`} value={productRatings[item.id] || 0} />
                    </div>
                 </div>
               ))}
            </div>

            {/* Branch Rating */}
            <div className="bg-white rounded-[40px] p-8 md:p-12 shadow-xl shadow-[#234745]/5 border border-gray-50 relative overflow-hidden">
               <div className="absolute top-0 left-0 w-2 h-full bg-[#d4a06a]"></div>
               <h2 className="text-xl font-black text-[#234745] mb-2 flex items-center gap-3">
                 <span className="w-8 h-8 rounded-full bg-[#f5eeea] flex items-center justify-center text-sm">🏪</span>
                 {i18n.common.rateBranch}
               </h2>
               <p className="text-gray-400 font-bold text-sm mb-8 ms-11">{order.branchName}</p>
               
               <div className="ms-11">
                 <InteractiveStarRating 
                    value={branchRating} 
                    onChange={setBranchRating}
                    isEn={isEn}
                    size="lg"
                 />
                 <input type="hidden" name="branch_rating" value={branchRating} />
               </div>
            </div>

            {/* Comments & Images */}
            <div className="bg-white rounded-[40px] p-8 md:p-12 shadow-xl shadow-[#234745]/5 border border-gray-50 relative overflow-hidden">
               <div className="absolute top-0 left-0 w-2 h-full bg-[#ab8e78]"></div>
               
               {/* Comments */}
               <div>
                 <h2 className="text-xl font-black text-[#234745] mb-6 flex items-center gap-3">
                   <span className="w-8 h-8 rounded-full bg-[#f5eeea] flex items-center justify-center text-sm">✍️</span>
                   {i18n.common.yourComments}
                 </h2>
                 <textarea 
                   name="comment"
                   rows={5}
                   placeholder={i18n.common.commentsPlaceholder}
                   className="w-full bg-[#fafafa] border border-gray-100 rounded-[24px] p-6 font-bold text-[#234745] focus:border-[#d4a06a] focus:ring-1 focus:ring-[#d4a06a] outline-none transition-all resize-none placeholder-gray-300"
                 />
               </div>
            </div>

            {/* Submit Button */}
            <div className="pt-8 text-center">
              <button
                type="submit"
                disabled={fetcher.state !== 'idle'}
                className="w-full md:w-auto min-w-[300px] bg-[#234745] text-white font-black py-5 px-12 rounded-[24px] text-lg shadow-xl shadow-[#234745]/20 hover:bg-[#d4a06a] hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50"
              >
                {fetcher.state !== 'idle' ? (
                  <div className="flex items-center justify-center gap-3">
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    {isEn ? 'SUBMITTING...' : 'جاري الإرسال...'}
                  </div>
                ) : (
                  i18n.common.submitFeedback
                )}
              </button>
            </div>
          </fetcher.Form>
        </div>
      </div>
    </PageLayout>
  );
}

function InteractiveStarRating({ 
  value, 
  onChange, 
  isEn, 
  size = 'md' 
}: { 
  value: number, 
  onChange: (v: number) => void, 
  isEn: boolean,
  size?: 'md' | 'lg'
}) {
  const [hover, setHover] = useState(0);
  const activeValue = hover || value;
  
  const iconSize = size === 'lg' ? 44 : 32;

  return (
    <div className={`flex items-center gap-2 ${!isEn && 'flex-row-reverse justify-end'}`}>
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          onClick={() => onChange(star)}
          onMouseEnter={() => setHover(star)}
          onMouseLeave={() => setHover(0)}
          className="transition-transform active:scale-90 hover:scale-110"
        >
          <svg 
            width={iconSize} 
            height={iconSize} 
            viewBox="0 0 24 24" 
            fill={activeValue >= star ? '#f39c12' : '#e5e7eb'} 
            className="transition-colors duration-200 drop-shadow-sm"
          >
            <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" />
          </svg>
        </button>
      ))}
      {value > 0 && (
        <span className={`mx-2 font-black text-[#f39c12] ${size === 'lg' ? 'text-xl' : 'text-sm'}`}>
          {value}/5
        </span>
      )}
    </div>
  );
}

export async function action({ request, context }: Route.ActionArgs) {
  const formData = await request.formData();
  
  // Logic to save to Shopify Metaobjects would go here
  await new Promise(resolve => setTimeout(resolve, 1500));
  
  return { success: true };
}
