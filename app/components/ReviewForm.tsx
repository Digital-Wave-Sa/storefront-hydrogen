import { useFetcher } from 'react-router';
import { useState, useEffect } from 'react';
import { StarRating } from './StarRating';

export function ReviewForm({ 
    productHandle, 
    productTitle, 
    locale,
    selectedLocationId,
    selectedLocationName
}: { 
    productHandle: string, 
    productTitle: string, 
    locale: string,
    selectedLocationId?: string,
    selectedLocationName?: string
}) {
    const fetcher = useFetcher();
    const isEn = locale === 'en';
    const [rating, setRating] = useState(0);
    const [hoverRating, setHoverRating] = useState(0);
    const [submitted, setSubmitted] = useState(false);

    useEffect(() => {
        if (fetcher.data?.success) {
            setSubmitted(true);
        }
    }, [fetcher.data]);

    if (submitted) {
        return (
            <div className="bg-[#295b45]/5 border border-[#295b45]/20 rounded-3xl p-8 text-center animate-fade-in">
                <div className="w-16 h-16 bg-green-50 border border-green-100 rounded-full flex items-center justify-center mx-auto mb-4 text-[#234745]">
                    <svg
                        width="32"
                        height="32"
                        viewBox="0 0 24 24"
                        fill="currentColor"
                    >
                        <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
                    </svg>
                </div>
                <h4 className="text-xl font-black text-[#234745] mb-2">
                    {isEn ? 'Thank you!' : 'شكراً لك!'}
                </h4>
                <p className="text-gray-600 font-bold">
                    {isEn ? 'Your review has been submitted for moderation.' : 'تم إرسال مراجعتك للمراجعة من قبل فريقنا.'}
                </p>
            </div>
        );
    }

    return (
        <fetcher.Form method="POST" action="/api/submit-review" className="w-full text-start flex flex-col">
            <input type="hidden" name="productHandle" value={productHandle} />
            <input type="hidden" name="language" value={locale} />
            <input type="hidden" name="rating" value={rating} />
            {selectedLocationId && <input type="hidden" name="locationId" value={selectedLocationId} />}
            {selectedLocationName && <input type="hidden" name="locationName" value={selectedLocationName} />}

            <div className="mb-6">
                <p className="text-gray-400 font-bold text-sm">
                    {isEn ? `How did you like the ${productTitle}?` : `ما رأيك بمنتج ${productTitle}؟`}
                </p>
            </div>

            {/* Star Picker */}
            <div className="mb-8">
                <label className="block text-xs font-black uppercase tracking-widest text-[#295b45] mb-3">
                    {isEn ? 'Your Rating' : 'تقييمك'}
                </label>
                <div className="flex items-center gap-2">
                    {[1, 2, 3, 4, 5].map((star) => (
                        <button
                            key={star}
                            type="button"
                            onClick={() => setRating(star)}
                            onMouseEnter={() => setHoverRating(star)}
                            onMouseLeave={() => setHoverRating(0)}
                            className="transition-transform active:scale-90 hover:scale-110"
                        >
                            <svg 
                                width="36" 
                                height="36" 
                                viewBox="0 0 24 24" 
                                fill={(hoverRating || rating) >= star ? '#f39c12' : '#e5e7eb'} 
                                className="transition-colors duration-200"
                            >
                                <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" />
                            </svg>
                        </button>
                    ))}
                    {rating > 0 && (
                        <span className="ms-2 text-sm font-black text-[#f39c12]">
                            {rating}/5
                        </span>
                    )}
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-5">
                <div className="flex flex-col gap-2">
                    <label className="text-xs font-black uppercase tracking-widest text-gray-400">
                        {isEn ? 'Your Name' : 'اسمك'}
                    </label>
                    <input 
                        required
                        name="customerName"
                        placeholder={isEn ? 'John Doe' : 'أحمد حسن'}
                        className="bg-[#fafafa] border border-gray-100 rounded-xl px-4 py-3 font-bold text-gray-800 focus:border-[#295b45] outline-none transition-all"
                    />
                </div>
                <div className="flex flex-col gap-2">
                    <label className="text-xs font-black uppercase tracking-widest text-gray-400">
                        {isEn ? 'Review Title' : 'عنوان للمراجعة'}
                    </label>
                    <input 
                        required
                        name="title"
                        placeholder={isEn ? 'Excellent Taste!' : 'مذاق رائع!'}
                        className="bg-[#fafafa] border border-gray-100 rounded-xl px-4 py-3 font-bold text-gray-800 focus:border-[#295b45] outline-none transition-all"
                    />
                </div>
            </div>

            <div className="flex flex-col gap-2 mb-8">
                <label className="text-xs font-black uppercase tracking-widest text-gray-400">
                    {isEn ? 'Your Comment' : 'تعليقك'}
                </label>
                <textarea 
                    required
                    name="comment"
                    rows={4}
                    placeholder={isEn ? 'Write your thoughts here...' : 'اكتب رأيك هنا...'}
                    className="bg-[#fafafa] border border-gray-100 rounded-xl px-4 py-3 font-bold text-gray-800 focus:border-[#295b45] outline-none transition-all resize-none"
                />
            </div>

            <button
                type="submit"
                disabled={fetcher.state !== 'idle' || rating === 0}
                className={`w-full py-4 rounded-2xl font-black text-sm uppercase tracking-widest transition-all ${
                    rating === 0 
                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    : 'bg-[#295b45] text-white shadow-lg shadow-[#295b45]/20 hover:scale-[1.02] active:scale-95'
                }`}
            >
                {fetcher.state !== 'idle' 
                    ? (isEn ? 'SUBMITTING...' : 'جاري الإرسال...') 
                    : (isEn ? 'POST REVIEW' : 'نشر التقييم')}
            </button>
            
            {fetcher.data?.error && (
                <p className="mt-4 text-red-500 text-xs font-bold text-center">
                    {fetcher.data.error}
                </p>
            )}
        </fetcher.Form>
    );
}
