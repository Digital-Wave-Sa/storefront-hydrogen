import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Button } from './layout/Button';

export interface StockNotificationModalProps {
    isOpen: boolean;
    onClose: () => void;
    productTitle: string;
    variantId: string;
    isEn: boolean;
    customerEmail?: string;
    locationId?: string;
    locationName?: string;
}

export function StockNotificationModal({
    isOpen,
    onClose,
    productTitle,
    variantId,
    isEn,
    customerEmail,
    locationId,
    locationName
}: StockNotificationModalProps) {
    const [mounted, setMounted] = useState(false);
    const [email, setEmail] = useState(customerEmail || '');
    const [isEditingEmail, setIsEditingEmail] = useState(false);
    const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        setMounted(true);
        if (isOpen) {
            setStatus('idle');
            setError(null);
            document.body.style.overflow = 'hidden';
            if (customerEmail && !isEditingEmail) {
                setEmail(customerEmail);
            }
        } else {
            setStatus('idle');
            setError(null);
        }
        return () => {
            document.body.style.overflow = 'unset';
        };
    }, [isOpen, variantId, customerEmail]);

    if (!mounted || !isOpen) return null;

    const handleSubmit = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        setStatus('loading');
        setError(null);

        try {
            const response = await fetch('/api/stock-notification', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    email,
                    variantId,
                    productTitle,
                    locationId,
                    locationName,
                }),
            });

            if (!response.ok) throw new Error('Failed to subscribe');

            setStatus('success');
        } catch (err) {
            setStatus('error');
            setError(isEn ? 'Something went wrong. Please try again.' : 'حدث خطأ ما. يرجى المحاولة مرة أخرى.');
        }
    };

    const showEmailForm = !customerEmail || isEditingEmail;

    return createPortal(
        <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/60 p-4 transition-all animate-fade-in" onClick={onClose} dir={isEn ? 'ltr' : 'rtl'}>
            <div 
                className="relative w-full max-w-md bg-white rounded-[2.5rem] p-8 shadow-2xl transition-all animate-scale-in" 
                onClick={e => e.stopPropagation()}
            >
                {/* Close Button */}
                <button 
                    onClick={onClose}
                    className="absolute top-6 right-6 w-10 h-10 flex items-center justify-center rounded-full bg-gray-50 text-gray-400 hover:bg-red-50 hover:text-red-500 transition-all text-2xl font-light"
                >
                    &times;
                </button>

                <div className="flex flex-col items-center text-center">
                    <div className="w-20 h-20 bg-[#FEF8EB] rounded-full flex items-center justify-center text-3xl mb-6">
                        {status === 'success' ? '✅' : '🔔'}
                    </div>

                    {status === 'success' ? (
                        <>
                            <h3 className="text-2xl font-black text-[#234745] mb-4">
                                {isEn ? 'You\'re on the list!' : 'تمت إضافتك للقائمة!'}
                            </h3>
                            <p className="text-gray-500 font-bold mb-8 mt-2 leading-relaxed px-2">
                                {isEn 
                                    ? `We'll email you at ${email} as soon as ${productTitle} is back in stock.` 
                                    : `سنقوم بإرسال بريد إلكتروني إلى ${email} بمجرد توفر ${productTitle} مرة أخرى.`}
                            </p>
                            <div className="w-full mt-4">
                                <Button fullWidth onClick={onClose} size="lg">
                                    {isEn ? 'Got it!' : 'حسناً!'}
                                </Button>
                            </div>
                        </>
                    ) : (
                        <>
                            <h3 className="text-2xl font-black text-[#234745] mb-3 leading-tight">
                                {isEn ? 'Notify Me' : 'أبلغني عن التوفر'}
                            </h3>
                            <p className="text-[#A2A491] font-bold text-sm mb-6 leading-relaxed px-2">
                                {isEn 
                                    ? `We'll let you know when ${productTitle} is available again.` 
                                    : `سنقوم بإبلاغك فور توفر ${productTitle} من جديد.`}
                            </p>

                            <form onSubmit={handleSubmit} className="w-full mt-4">
                                {showEmailForm ? (
                                    <div className="mb-6 relative group">
                                        <input 
                                            type="email" 
                                            required
                                            placeholder={isEn ? "yourname@example.com" : "بريدك الإلكتروني..."}
                                            value={email}
                                            onChange={e => setEmail(e.target.value)}
                                            className="w-full bg-gray-50 border-2 border-gray-100 rounded-2xl px-6 py-4 text-[15px] font-bold focus:outline-none focus:border-[#234745] focus:bg-white transition-all pl-14"
                                        />
                                        <div className="absolute left-6 top-1/2 -translate-y-1/2 text-gray-300 group-focus-within:text-[#234745] transition-colors pointer-events-none">
                                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="mb-8 p-6 bg-gray-50 rounded-2xl border-2 border-dashed border-gray-200">
                                        <p className="text-[#1a1a1a] font-bold text-sm mb-2">{isEn ? 'We will notify you at:' : 'سنقوم بإبلاغك على:'}</p>
                                        <p className="text-[#234745] font-black text-lg mb-3 break-all">{customerEmail}</p>
                                        <button 
                                            type="button" 
                                            onClick={() => setIsEditingEmail(true)}
                                            className="text-xs text-gray-400 font-bold underline hover:text-amber-600 transition-colors"
                                        >
                                            {isEn ? 'Not your email? Change it' : 'ليس بريدك؟ قم بتغييره'}
                                        </button>
                                    </div>
                                )}

                                {error && <p className="text-red-500 text-xs font-bold mb-4">{error}</p>}

                                <Button 
                                    type="submit" 
                                    fullWidth 
                                    size="lg" 
                                    isLoading={status === 'loading'}
                                >
                                    {isEn ? 'Confirm Notification' : 'تأكيد التنبيه'}
                                </Button>
                            </form>
                        </>
                    )}
                </div>
            </div>
        </div>,
        document.body
    );
}
