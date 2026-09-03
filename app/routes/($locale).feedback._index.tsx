import {useState, useRef, useEffect} from 'react';
import {
  data,
  type LoaderFunctionArgs,
  type ActionFunctionArgs,
} from 'react-router';
import {useLoaderData, useFetcher, useRouteLoaderData} from 'react-router';

export async function loader({request, params, context}: LoaderFunctionArgs) {
  const url = new URL(request.url);
  const orderId = url.searchParams.get('order');
  const branchNameQuery = url.searchParams.get('branch');

  const sessionLocationId = await context.session.get('selectedLocationId');
  const sessionLocationName = await context.session.get('selectedLocationName');

  const branchName = branchNameQuery || sessionLocationName || 'Olaya Branch';
  const locationId = sessionLocationId || '114186715445';

  return data({orderId, branchName, locationId});
}

export default function GeneralFeedbackPage() {
  const {orderId, branchName, locationId} = useLoaderData<typeof loader>();
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
      window.scrollTo({top: 0, behavior: 'smooth'});
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
      <div
        className={`min-h-screen bg-[#FEF8EB] py-20 px-6 flex items-center justify-center ${isEn ? '' : 'font-ar'}`}
        dir={isEn ? 'ltr' : 'rtl'}
      >
        <div className="max-w-md w-full bg-white rounded-[40px] p-10 text-center shadow-[0_20px_50px_rgba(0,0,0,0.05)] border border-[#f0ece8]">
          <div className="w-24 h-24 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-8 text-green-500">
            <svg
              width="48"
              height="48"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="20 6 9 17 4 12"></polyline>
            </svg>
          </div>
          <h1 className="text-3xl font-black text-[#234745] mb-4">
            {isEn ? 'Thank You!' : 'شكراً لك!'}
          </h1>
          <p className="text-gray-500 font-medium mb-8 leading-relaxed">
            {isEn
              ? 'Your feedback is extremely valuable to us. We use it to improve our sweets and services every day.'
              : 'ملاحظاتك قيمة جداً بالنسبة لنا. نحن نستخدمها لتحسين حلوياتنا وخدماتنا كل يوم.'}
          </p>
          <div className="mt-4 w-full">
            <button
              onClick={() => (window.location.href = isEn ? '/en' : '/')}
              className="w-full bg-[#234745] text-white hover:text-white font-black py-4 rounded-2xl text-base hover:bg-[#1a3533] transition-all shadow-xl active:scale-95 !text-white"
              style={{ color: '#ffffff' }}
            >
              {isEn ? 'Back to Home' : 'العودة للرئيسية'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`min-h-screen bg-[#FAF6F0] py-16 px-4 relative overflow-hidden ${isEn ? '' : 'font-ar'}`}
      dir={isEn ? 'ltr' : 'rtl'}
    >
      <div className="max-w-xl mx-auto relative z-10">
        <div className="bg-white rounded-3xl border border-[#EADFC9] shadow-[0_20px_50px_rgba(35,71,69,0.06)] overflow-hidden">
          <div className="bg-[#234745] px-6 py-12 flex flex-col items-center justify-center text-center relative">
            <span className="inline-block bg-[#d4a06a]/20 text-[#d4a06a] border border-[#d4a06a]/30 text-[10px] font-black tracking-widest px-4 py-1.5 rounded-full mb-3 uppercase">
              {isEn ? 'Customer Feedback' : 'آراء العملاء'}
            </span>
            <h1 className="text-3xl font-black text-white tracking-tight mb-2">
              {isEn ? 'How was your experience?' : 'كيف كانت تجربتك؟'}
            </h1>
            <p className="text-center text-white/70 text-xs font-medium w-full max-w-md mx-auto leading-relaxed">
              {isEn
                ? 'We value your opinion on our products and service. Please take a moment to share your thoughts.'
                : 'نحن نقدر رأيك في منتجاتنا وخدماتنا. يرجى تخصيص لحظة لمشاركة أفكارك معنا.'}
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

            {/* 1. Branch Rating */}
            <div className="space-y-3">
              <label className="block text-[11px] font-black uppercase tracking-wider text-gray-400">
                {isEn ? '1. Branch & Service' : '1. الفرع والخدمة'}
              </label>
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

            {/* 2. Comments */}
            <div className="pt-6 border-t border-[#EADFC9]/30 space-y-3">
              <label className="block text-[11px] font-black uppercase tracking-wider text-gray-400">
                {isEn ? '2. Your Comments' : '2. ملاحظاتك'}
              </label>
              <textarea
                name="comment"
                rows={4}
                required
                placeholder={
                  isEn
                    ? 'Tell us more about your experience...'
                    : 'أخبرنا المزيد عن تجربتك...'
                }
                className="w-full bg-[#FCFAF7] border border-[#EADFC9] rounded-2xl p-4 text-sm font-bold text-[#234745] focus:bg-white focus:border-[#234745] focus:ring-1 focus:ring-[#234745] outline-none transition-all duration-200 resize-none placeholder-gray-400"
              />
            </div>

            {/* Submit Button */}
            <div className="pt-4">
              <button
                type="submit"
                disabled={fetcher.state !== 'idle' || branchRating === 0}
                className={`w-full py-4 rounded-2xl font-black text-sm tracking-wider uppercase transition-all flex items-center justify-center gap-2 active:scale-98 ${
                  branchRating === 0
                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed border border-gray-200 shadow-none'
                    : 'bg-[#234745] text-white hover:bg-[#1a3533] hover:shadow-lg hover:shadow-[#234745]/10'
                }`}
              >
                {fetcher.state !== 'idle' ? (
                  <span>{isEn ? 'Submitting...' : 'جاري الإرسال...'}</span>
                ) : (
                  <span>{isEn ? 'Submit Feedback' : 'إرسال الملاحظات'}</span>
                )}
              </button>
            </div>
          </fetcher.Form>
        </div>
      </div>
    </div>
  );
}

function StarRating({
  value,
  onChange,
  hoverValue,
  onHoverChange,
}: {
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
