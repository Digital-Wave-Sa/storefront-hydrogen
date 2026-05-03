import { useState, useRef, useEffect } from 'react';
import { data, type LoaderFunctionArgs, type ActionFunctionArgs } from 'react-router';
import { useLoaderData, useFetcher, useRouteLoaderData } from 'react-router';
import { Image, Money } from '@shopify/hydrogen';
import { Price } from '~/components/Price';

export async function loader({ request, params, context }: LoaderFunctionArgs) {
  const url = new URL(request.url);
  const orderId = url.searchParams.get('order');
  const branchName = url.searchParams.get('branch');
  
  // We can optionally fetch order data here if orderId is provided to show the products
  // For now, let's assume a generic feedback form with an optional product selection
  
  return data({ orderId, branchName });
}

export default function FeedbackPage() {
  const { orderId, branchName } = useLoaderData<typeof loader>();
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
          <h1 className="text-3xl font-black text-[#1b3d2e] mb-4">
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
            className="w-full bg-[#1b3d2e] text-white py-5 rounded-[20px] font-black text-lg hover:bg-[#d4a06a] transition-all shadow-xl active:scale-95"
          >
            {isEn ? 'Back to Home' : 'العودة للرئيسية'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen bg-[#FEF8EB] py-12 lg:py-24 px-6 ${isEn ? '' : 'font-ar'}`} dir={isEn ? 'ltr' : 'rtl'}>
      <div className="max-w-2xl mx-auto">
        
        {/* Header Section */}
        <header className="text-center mb-16">
          <div className="inline-block px-4 py-1.5 bg-[#1b3d2e] text-[#d4a06a] rounded-full text-[12px] font-black uppercase tracking-widest mb-6">
             {isEn ? 'Customer Feedback' : 'آراء العملاء'}
          </div>
          <h1 className="text-4xl lg:text-5xl font-black text-[#1b3d2e] mb-6 leading-tight">
            {isEn ? 'How was your experience?' : 'كيف كانت تجربتك؟'}
          </h1>
          <p className="text-gray-500 font-bold max-w-lg mx-auto leading-relaxed">
            {isEn 
              ? 'We value your opinion on our products and service. Please take a moment to share your thoughts.'
              : 'نحن نقدر رأيك في منتجاتنا وخدماتنا. يرجى تخصيص لحظة لمشاركة أفكارك معنا.'
            }
          </p>
        </header>

        {/* Feedback Form */}
        <fetcher.Form 
          ref={formRef}
          method="post" 
          action="/api/submit-review"
          className="bg-white rounded-[40px] p-8 lg:p-12 shadow-[0_30px_70px_rgba(35,71,69,0.08)] border border-white"
        >
          <input type="hidden" name="orderId" value={orderId || ''} />
          <input type="hidden" name="branchName" value={branchName || ''} />
          <input type="hidden" name="language" value={isEn ? 'en' : 'ar'} />

          <div className="space-y-12">
            
            {/* 1. Product Rating */}
            <section className="space-y-6">
              <div className="flex items-center gap-4 mb-2">
                <span className="w-8 h-8 rounded-full bg-[#f8f5f2] flex items-center justify-center text-[#d4a06a] font-black text-sm">1</span>
                <h3 className="text-xl font-black text-[#1b3d2e]">{isEn ? 'Rate the Product' : 'تقييم المنتج'}</h3>
              </div>
              <p className="text-gray-400 text-sm font-medium px-12">
                {isEn ? 'How would you rate the quality and taste?' : 'ما هو تقييمك لجودة وطعم المنتج؟'}
              </p>
              <div className="flex justify-center py-4">
                <StarRating 
                  value={productRating} 
                  onChange={setProductRating} 
                  hoverValue={hoverProductRating} 
                  onHoverChange={setHoverProductRating} 
                />
                <input type="hidden" name="rating" value={productRating} />
              </div>
            </section>

            <div className="h-px bg-gray-100 w-full" />

            {/* 2. Branch/Service Rating */}
            <section className="space-y-6">
              <div className="flex items-center gap-4 mb-2">
                <span className="w-8 h-8 rounded-full bg-[#f8f5f2] flex items-center justify-center text-[#d4a06a] font-black text-sm">2</span>
                <h3 className="text-xl font-black text-[#1b3d2e]">{isEn ? 'Branch & Service' : 'الفرع والخدمة'}</h3>
              </div>
              <p className="text-gray-400 text-sm font-medium px-12">
                {isEn 
                  ? `How was your experience at ${branchName || 'the branch'}?` 
                  : `كيف كانت تجربتك في ${branchName || 'الفرع'}؟`
                }
              </p>
              <div className="flex justify-center py-4">
                <StarRating 
                  value={branchRating} 
                  onChange={setBranchRating} 
                  hoverValue={hoverBranchRating} 
                  onHoverChange={setHoverBranchRating} 
                />
                <input type="hidden" name="branchRating" value={branchRating} />
              </div>
            </section>

            <div className="h-px bg-gray-100 w-full" />

            {/* 3. Detailed Comments */}
            <section className="space-y-6">
              <div className="flex items-center gap-4 mb-2">
                <span className="w-8 h-8 rounded-full bg-[#f8f5f2] flex items-center justify-center text-[#d4a06a] font-black text-sm">3</span>
                <h3 className="text-xl font-black text-[#1b3d2e]">{isEn ? 'Your Comments' : 'ملاحظاتك'}</h3>
              </div>
              <div className="px-12">
                <textarea 
                  name="comment"
                  rows={4}
                  required
                  placeholder={isEn ? "Tell us more about your experience..." : "أخبرنا المزيد عن تجربتك..."}
                  className="w-full bg-[#fcfaf8] border-2 border-[#f0ece8] rounded-[24px] p-6 text-[#1b3d2e] font-medium placeholder-gray-300 focus:outline-none focus:border-[#d4a06a] transition-all resize-none"
                />
              </div>
            </section>

            <div className="h-px bg-gray-100 w-full" />

            {/* 4. Image Upload */}
            <section className="space-y-6">
              <div className="flex items-center gap-4 mb-2">
                <span className="w-8 h-8 rounded-full bg-[#f8f5f2] flex items-center justify-center text-[#d4a06a] font-black text-sm">4</span>
                <h3 className="text-xl font-black text-[#1b3d2e]">{isEn ? 'Photo (Optional)' : 'صورة (اختياري)'}</h3>
              </div>
              <div className="px-12">
                <div className="relative group">
                  <input 
                    type="file" 
                    accept="image/*" 
                    onChange={handleImageChange}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                  />
                  <div className={`w-full h-48 border-2 border-dashed ${selectedImage ? 'border-[#1b3d2e]' : 'border-[#f0ece8]'} rounded-[24px] flex flex-col items-center justify-center gap-4 bg-[#fcfaf8] group-hover:bg-[#f8f5f2] transition-all overflow-hidden`}>
                    {selectedImage ? (
                      <img src={selectedImage} alt="Preview" className="w-full h-full object-cover" />
                    ) : (
                      <>
                        <div className="w-14 h-14 rounded-full bg-white flex items-center justify-center text-[#d4a06a] shadow-sm">
                          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path><circle cx="12" cy="13" r="4"></circle></svg>
                        </div>
                        <p className="text-gray-400 font-bold text-sm">{isEn ? 'Click to upload a photo' : 'اضغط لرفع صورة'}</p>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </section>

            {/* Submit Button */}
            <div className="pt-8">
              <button 
                type="submit"
                disabled={fetcher.state !== 'idle' || productRating === 0}
                className={`w-full py-6 rounded-[24px] font-black text-xl shadow-[0_20px_40px_rgba(27,61,46,0.15)] transition-all flex items-center justify-center gap-3 active:scale-95 ${
                  productRating === 0 
                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
                    : 'bg-[#1b3d2e] text-white hover:bg-[#d4a06a] hover:shadow-[0_25px_50px_rgba(27,61,46,0.25)]'
                }`}
              >
                {fetcher.state !== 'idle' ? (
                  <span className="animate-pulse">{isEn ? 'Submitting...' : 'جاري الإرسال...'}</span>
                ) : (
                  <>
                    <span>{isEn ? 'Submit Feedback' : 'إرسال الملاحظات'}</span>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className={isEn ? '' : 'rotate-180'}>
                      <line x1="5" y1="12" x2="19" y2="12"></line>
                      <polyline points="12 5 19 12 12 19"></polyline>
                    </svg>
                  </>
                )}
              </button>
              {productRating === 0 && (
                <p className="text-center text-red-400 text-xs font-bold mt-4 animate-bounce">
                  {isEn ? 'Please provide a star rating to continue' : 'يرجى تقديم تقييم بالنجوم للمتابعة'}
                </p>
              )}
            </div>

          </div>
        </fetcher.Form>

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
    <div className="flex items-center gap-2 lg:gap-4">
      {[1, 2, 3, 4, 5].map((star) => {
        const isActive = (hoverValue || value) >= star;
        return (
          <button
            key={star}
            type="button"
            onClick={() => onChange(star)}
            onMouseEnter={() => onHoverChange(star)}
            onMouseLeave={() => onHoverChange(0)}
            className={`w-12 h-12 lg:w-16 lg:h-16 flex items-center justify-center transition-all duration-300 transform ${isActive ? 'scale-110' : 'scale-100'}`}
          >
            <svg 
              width="100%" 
              height="100%" 
              viewBox="0 0 24 24" 
              fill={isActive ? '#d4a06a' : 'none'} 
              stroke={isActive ? '#d4a06a' : '#f0ece8'} 
              strokeWidth="2" 
              strokeLinecap="round" 
              strokeLinejoin="round"
              className="drop-shadow-sm"
            >
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
            </svg>
          </button>
        );
      })}
    </div>
  );
}
