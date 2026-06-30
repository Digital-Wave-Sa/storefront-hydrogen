import { useState, useRef, useEffect } from 'react';
import { data, type LoaderFunctionArgs, type ActionFunctionArgs } from 'react-router';
import { useLoaderData, useFetcher, useRouteLoaderData } from 'react-router';
import { Image, Money } from '@shopify/hydrogen';
import { Price } from '~/components/Price';

export async function loader({ request, params, context }: LoaderFunctionArgs) {
  const url = new URL(request.url);
  const orderId = url.searchParams.get('order');
  const branchNameQuery = url.searchParams.get('branch');
  
  const sessionLocationId = await context.session.get('selectedLocationId');
  const sessionLocationName = await context.session.get('selectedLocationName');

  // Fallback branch mapping to Shopify Location IDs
  const branchMap: Record<string, string> = {
    'Olaya Branch': '114186715445',
    'فرع العليا': '114186715445',
    'Al Olaya': '114186715445',
    'Abha': '114219352373',
    'فرع أبها': '114219352373',
    'Dubai, UAE': '107332763957',
    'فرع دبي': '107332763957'
  };

  const branchName = branchNameQuery || sessionLocationName || 'Olaya Branch';
  const locationId = sessionLocationId || branchMap[branchName] || '114186715445'; // default to Olaya if unmapped
  
  return data({ orderId, branchName, locationId });
}

export default function FeedbackPage() {
  const { orderId, branchName, locationId } = useLoaderData<typeof loader>();
  const rootData = useRouteLoaderData('root') as any;
  const isEn = rootData?.consent?.language?.toLowerCase() === 'en';
  
  const fetcher = useFetcher();
  const formRef = useRef<HTMLFormElement>(null);
  
  const [productRating, setProductRating] = useState(0);
  const [branchRating, setBranchRating] = useState(0);
  const [hoverProductRating, setHoverProductRating] = useState(0);
  const [hoverBranchRating, setHoverBranchRating] = useState(0);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  useEffect(() => {
    if (fetcher.data && (fetcher.data as any).success) {
      setIsSubmitted(true);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [fetcher.data]);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setSelectedImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  if (isSubmitted) {
    return (
      <div className={`min-h-screen bg-[#FEF8EB] py-20 px-6 flex items-center justify-center ${isEn ? '' : 'font-ar'}`} dir={isEn ? 'ltr' : 'rtl'}>
        <div className="max-w-md w-full bg-white rounded-[40px] p-10 text-center shadow-[0_20px_50px_rgba(0,0,0,0.05)] border border-[#f0ece8] animate-fade-in">
          <div className="w-24 h-24 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-8 text-green-500">
             <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
          </div>
          <h1 className="text-3xl font-black text-[#234745] mb-4">
            {isEn ? 'Thank You!' : 'شكراً لك!'}
          </h1>
          <p className="text-gray-500 font-medium mb-10 leading-relaxed">
            {isEn 
              ? 'Your feedback is extremely valuable to us. We use it to improve our sweets and services every day.' 
              : 'ملاحظاتك قيمة جداً بالنسبة لنا. نحن نستخدمها لتحسين حلوياتنا وخدماتنا كل يوم.'
            }
          </p>
          <button 
            onClick={() => window.location.href = isEn ? '/en' : '/'}
            className="w-full bg-[#234745] text-white py-5 rounded-[20px] font-black text-lg hover:bg-[#d4a06a] transition-all shadow-xl active:scale-95"
          >
            {isEn ? 'Back to Home' : 'العودة للرئيسية'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen bg-[#FAF6F0] py-16 px-4 relative overflow-hidden ${isEn ? '' : 'font-ar'}`} dir={isEn ? 'ltr' : 'rtl'}>
      {/* Decorative background shapes */}
      <div className="absolute top-0 right-0 w-80 h-80 bg-[#d4a06a]/10 rounded-full filter blur-[100px] pointer-events-none"></div>
      <div className="absolute bottom-0 left-0 w-80 h-80 bg-[#234745]/5 rounded-full filter blur-[100px] pointer-events-none"></div>

      <div className="max-w-xl mx-auto relative z-10">
        
        {/* Main Card */}
        <div className="bg-white rounded-3xl border border-[#EADFC9] shadow-[0_20px_50px_rgba(35,71,69,0.06)] overflow-hidden">
          
          {/* Header Banner */}
          <div className="bg-[#234745] px-6 py-12 flex flex-col items-center justify-center text-center relative">
            <div className="absolute inset-0 bg-[radial-gradient(#d4a06a_1px,transparent_1.5px)] [background-size:16px_16px] opacity-10"></div>
            <span className="inline-block bg-[#d4a06a]/20 text-[#d4a06a] border border-[#d4a06a]/30 text-[10px] font-black tracking-widest px-4 py-1.5 rounded-full mb-3 uppercase tracking-[0.15em]">
              {isEn ? 'Customer Feedback' : 'آراء العملاء'}
            </span>
            <h1 className="text-3xl font-black text-white tracking-tight mb-2">
              {isEn ? 'How was your experience?' : 'كيف كانت تجربتك؟'}
            </h1>
            <p className="text-center text-white/70 text-xs font-medium w-full max-w-md mx-auto leading-relaxed">
              {isEn 
                ? 'We value your opinion on our products and service. Please take a moment to share your thoughts.'
                : 'نحن نقدر رأيك في منتجاتنا وخدماتنا. يرجى تخصيص لحظة لمشاركة أفكارك معنا.'
              }
            </p>
          </div>

          <fetcher.Form 
            ref={formRef}
            method="post" 
            action="/api/submit-review"
            className="p-6 md:p-10 space-y-8"
          >
            <input type="hidden" name="orderId" value={orderId || ''} />
            <input type="hidden" name="branchName" value={branchName || ''} />
            <input type="hidden" name="locationId" value={locationId || ''} />
            <input type="hidden" name="language" value={isEn ? 'en' : 'ar'} />

            {/* 1. Product Rating */}
            <div className="space-y-3">
              <label className="block text-[11px] font-black uppercase tracking-wider text-gray-400">
                {isEn ? '1. Rate the Product' : '١. تقييم المنتج'}
              </label>
              <p className="text-gray-500 text-xs font-medium leading-relaxed">
                {isEn ? 'How would you rate the quality and taste?' : 'ما هو تقييمك لجودة وطعم المنتج؟'}
              </p>
              <div className="mt-5 p-4 rounded-2xl bg-[#FCFAF7] border border-[#EADFC9]/40 flex justify-center">
                <StarRating 
                  value={productRating} 
                  onChange={setProductRating} 
                  hoverValue={hoverProductRating} 
                  onHoverChange={setHoverProductRating} 
                />
                <input type="hidden" name="rating" value={productRating} />
              </div>
            </div>

            {/* 2. Branch Rating */}
            <div className="pt-6 border-t border-[#EADFC9]/30 space-y-3">
              <div className="flex justify-between items-baseline">
                <label className="block text-[11px] font-black uppercase tracking-wider text-gray-400">
                  {isEn ? '2. Branch & Service' : '٢. الفرع والخدمة'}
                </label>
                {branchName && (
                  <span className="text-xs font-extrabold text-[#d4a06a] bg-[#d4a06a]/10 px-2 py-0.5 rounded">
                    {branchName}
                  </span>
                )}
              </div>
              <p className="text-gray-500 text-xs font-medium leading-relaxed">
                {isEn 
                  ? `How was your experience at ${branchName || 'the branch'}?` 
                  : `كيف كانت تجربتك في ${branchName || 'الفرع'}؟`
                }
              </p>
              <div className="mt-5 p-4 rounded-2xl bg-[#FCFAF7] border border-[#EADFC9]/40 flex justify-center">
                <StarRating 
                  value={branchRating} 
                  onChange={setBranchRating} 
                  hoverValue={hoverBranchRating} 
                  onHoverChange={setHoverBranchRating} 
                />
                <input type="hidden" name="branchRating" value={branchRating} />
              </div>
            </div>

            {/* 3. Comments */}
            <div className="pt-6 border-t border-[#EADFC9]/30 space-y-3">
              <label className="block text-[11px] font-black uppercase tracking-wider text-gray-400">
                {isEn ? '3. Your Comments' : '٣. ملاحظاتك'}
              </label>
              <textarea 
                name="comment"
                rows={4}
                required
                placeholder={isEn ? "Tell us more about your experience..." : "أخبرنا المزيد عن تجربتك..."}
                className="w-full bg-[#FCFAF7] border border-[#EADFC9] rounded-2xl p-4 text-sm font-bold text-[#234745] focus:bg-white focus:border-[#234745] focus:ring-1 focus:ring-[#234745] outline-none transition-all duration-200 resize-none placeholder-gray-400"
              />
            </div>

            {/* 4. Photo Upload */}
            <div className="pt-6 border-t border-[#EADFC9]/30 space-y-3">
              <label className="block text-[11px] font-black uppercase tracking-wider text-gray-400">
                {isEn ? '4. Photo (Optional)' : '٤. صورة (اختياري)'}
              </label>
              <div className="relative group">
                <input 
                  type="file" 
                  accept="image/*" 
                  onChange={handleImageChange}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                />
                <div className={`w-full h-32 border-2 border-dashed ${selectedImage ? 'border-[#234745]' : 'border-[#EADFC9]'} rounded-2xl flex flex-col items-center justify-center gap-2 bg-[#FCFAF7] group-hover:bg-[#FCFAF7]/80 transition-all overflow-hidden`}>
                  {selectedImage ? (
                    <img src={selectedImage} alt="Preview" className="w-full h-full object-cover" />
                  ) : (
                    <>
                      <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center text-[#d4a06a] shadow-sm border border-[#EADFC9]/20">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path><circle cx="12" cy="13" r="4"></circle></svg>
                      </div>
                      <p className="text-gray-400 font-bold text-xs">{isEn ? 'Click to upload a photo' : 'اضغط لرفع صورة'}</p>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Submit Button */}
            <div className="pt-4">
              <button 
                type="submit"
                disabled={fetcher.state !== 'idle' || productRating === 0}
                className={`w-full py-4 rounded-2xl font-black text-sm tracking-wider uppercase transition-all flex items-center justify-center gap-2 active:scale-98 ${
                  productRating === 0 
                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed border border-gray-200 shadow-none' 
                    : 'bg-[#234745] text-white hover:bg-[#1a3533] hover:shadow-lg hover:shadow-[#234745]/10'
                }`}
              >
                {fetcher.state !== 'idle' ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    <span>{isEn ? 'Submitting...' : 'جاري الإرسال...'}</span>
                  </>
                ) : (
                  <>
                    <span>{isEn ? 'Submit Feedback' : 'إرسال الملاحظات'}</span>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className={isEn ? '' : 'rotate-180'}>
                      <line x1="5" y1="12" x2="19" y2="12"></line>
                      <polyline points="12 5 19 12 12 19"></polyline>
                    </svg>
                  </>
                )}
              </button>
              {productRating === 0 && (
                <p className="text-center text-red-400 text-xs font-bold mt-3 animate-pulse">
                  {isEn ? 'Please provide a star rating to continue' : 'يرجى تقديم تقييم بالنجوم للمتابعة'}
                </p>
              )}
            </div>

          </fetcher.Form>
        </div>

      </div>
    </div>
  );
}

function StarRating({ value, onChange, hoverValue, onHoverChange }: { 
  value: number; 
  onChange: (v: number) => void; 
  hoverValue: number;
  onHoverChange: (v: number) => void;
}) {
  return (
    <div className="flex items-center gap-1.5">
      {[1, 2, 3, 4, 5].map((star) => {
        const isActive = (hoverValue || value) >= star;
        return (
          <button
            key={star}
            type="button"
            onClick={() => onChange(star)}
            onMouseEnter={() => onHoverChange(star)}
            onMouseLeave={() => onHoverChange(0)}
            className="w-10 h-10 flex items-center justify-center transition-transform duration-150 active:scale-75 hover:scale-110 focus:outline-none"
          >
            <svg 
              width="28" 
              height="28" 
              viewBox="0 0 24 24" 
              fill={isActive ? '#d4a06a' : '#EADFC9'} 
              className="transition-colors duration-150"
            >
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
            </svg>
          </button>
        );
      })}
    </div>
  );
}
