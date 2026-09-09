import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Button } from './layout/Button';

export interface StockNotificationModalProps {
    isOpen: boolean;
    onClose: () => void;
    productTitle: string;
    variantId: string;
    productId?: string;
    isEn: boolean;
    customerEmail?: string;
    locationId?: string;
    locationName?: string;
    country?: string;
    shopifyMarketId?: string;
    customerName?: string;
    acceptsMarketing?: boolean;
}

export function StockNotificationModal({
    isOpen,
    onClose,
    productTitle,
    variantId,
    productId,
    isEn,
    customerEmail,
    locationId,
    locationName,
    country,
    shopifyMarketId,
    customerName,
    acceptsMarketing,
}: StockNotificationModalProps) {
    const [mounted, setMounted] = useState(false);
    const [email, setEmail] = useState(customerEmail || '');
    const [isEditingEmail, setIsEditingEmail] = useState(false);
    const [status, setStatus] = useState<'idle' | 'checking' | 'loading' | 'success' | 'error' | 'subscribed'>('idle');
    const [error, setError] = useState<string | null>(null);
    /**
     * The handle for leaving again.
     *
     * The route answers subscribe with the middleware's id, and for a shopper
     * who gave only an email that id is the ONLY way to be removed -- the
     * middleware cancels on (phone, productCode, locationId) otherwise, and
     * there is no phone to key on. Keeping it here is what lets the success
     * screen offer "cancel" to a guest, who has no account page to visit.
     */
    const [subscriptionId, setSubscriptionId] = useState<string | null>(null);
    const [cancelState, setCancelState] = useState<'idle' | 'loading' | 'done' | 'error'>('idle');

    useEffect(() => {
        setMounted(true);
        if (isOpen) {
            setError(null);
            setSubscriptionId(null);
            setCancelState('idle');
            document.body.style.overflow = 'hidden';
            if (customerEmail && !isEditingEmail) {
                setEmail(customerEmail);
            }
        } else {
            setStatus('idle');
            setError(null);
            setSubscriptionId(null);
            setCancelState('idle');
        }
        return () => {
            document.body.style.overflow = 'unset';
        };
    }, [isOpen, variantId, customerEmail]);

    /**
     * Are they already on this list?
     *
     * Reopening the modal for a product they had already subscribed to showed
     * the join form again, as if nothing had happened -- so the only thing on
     * offer was to subscribe a second time, and there was no way back out.
     *
     * The match is made on the server. A subscription is filed under the SKU,
     * and no product fragment behind these cards selects `sku`; the browser
     * holds a variant id and nothing else, so it cannot compare the two.
     */
    useEffect(() => {
        if (!isOpen) return;

        let cancelled = false;
        setStatus('checking');

        const params = new URLSearchParams({variantId: String(variantId || '')});
        if (locationId) params.set('locationId', String(locationId));

        fetch(`/api/stock-notification?${params.toString()}`)
            .then((res) => (res.ok ? res.json() : null))
            .then((payload: any) => {
                if (cancelled) return;
                if (payload?.subscribed) {
                    setSubscriptionId(payload.subscriptionId || null);
                    setStatus('subscribed');
                } else {
                    setStatus('idle');
                }
            })
            .catch(() => {
                // Not knowing is the state this modal was always in. Show the
                // form rather than block on a lookup that is only a courtesy.
                if (!cancelled) setStatus('idle');
            });

        return () => {
            cancelled = true;
        };
    }, [isOpen, variantId, locationId]);

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
                    productId,
                    productTitle,
                    locationId,
                    locationName,
                    country: country || (isEn ? 'US' : 'SA'),
                    shopifyMarketId,
                    customerName,
                    acceptsMarketing: acceptsMarketing !== undefined ? acceptsMarketing : true,
                }),
            });

            /**
             * The answer is read, not assumed.
             *
             * This used to test `response.ok` alone, back when the route
             * replied `{success: true}` from every path including its own
             * catch -- so a shopper could be promised an email that nothing
             * would ever send. The route now reports a failure as one, and
             * carries a message written for a shopper; showing that message
             * beats replacing it with a generic one.
             */
            const payload: any = await response.json().catch(() => ({}));

            if (!response.ok || payload?.success === false) {
                setStatus('error');
                setError(
                    payload?.error ||
                    (isEn ? 'Something went wrong. Please try again.' : 'حدث خطأ ما. يرجى المحاولة مرة أخرى.'),
                );
                return;
            }

            setSubscriptionId(payload?.subscriptionId || null);
            setStatus('success');
        } catch (err) {
            setStatus('error');
            setError(isEn ? 'Something went wrong. Please try again.' : 'حدث خطأ ما. يرجى المحاولة مرة أخرى.');
        }
    };

    /** Leaving the list from the same screen that joined it. */
    const handleUnsubscribe = async () => {
        setCancelState('loading');
        try {
            const response = await fetch('/api/stock-notification?intent=unsubscribe', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({
                    subscriptionId,
                    // Fallback for a subscription with no id: the server turns
                    // the variant into the SKU and cancels on
                    // (phone, productCode, locationId).
                    variantId,
                    locationId,
                }),
            });
            const payload: any = await response.json().catch(() => ({}));
            setCancelState(response.ok && payload?.success !== false ? 'done' : 'error');
        } catch {
            setCancelState('error');
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
                        {cancelState === 'done' ? '🔕' : status === 'success' ? '✅' : '🔔'}
                    </div>

                    {cancelState === 'done' ? (
                        /**
                          * Left the list -- from either door, the one just
                          * subscribed and the one that was already on it.
                          */
                        <>
                            <h3 className="text-2xl font-black text-[#234745] mb-4">
                                {isEn ? 'Alert cancelled' : 'تم إلغاء التنبيه'}
                            </h3>
                            <p className="text-gray-500 font-bold mb-8 mt-2 leading-relaxed px-2">
                                {isEn
                                    ? `We won't email you about ${productTitle}.`
                                    : `لن نقوم بإبلاغك عن ${productTitle}.`}
                            </p>
                            <div className="w-full mt-4">
                                <Button fullWidth onClick={onClose} size="lg">
                                    {isEn ? 'Got it!' : 'حسناً!'}
                                </Button>
                            </div>
                            {/* Cancelled by mistake is as easy to do as subscribing was. */}
                            <button
                                type="button"
                                onClick={() => {
                                    setCancelState('idle');
                                    setSubscriptionId(null);
                                    setStatus('idle');
                                }}
                                className="mt-4 text-xs text-gray-400 font-bold underline hover:text-[#234745] transition-colors"
                            >
                                {isEn ? 'Notify me after all' : 'أبلغني مرة أخرى'}
                            </button>
                        </>
                    ) : status === 'checking' ? (
                        <>
                            <h3 className="text-2xl font-black text-[#234745] mb-3 leading-tight">
                                {isEn ? 'Notify Me' : 'أبلغني عن التوفر'}
                            </h3>
                            <div className="w-full py-8 flex items-center justify-center">
                                <span className="w-7 h-7 rounded-full border-[3px] border-[#ebdcc5] border-t-[#234745] animate-spin" />
                            </div>
                        </>
                    ) : status === 'subscribed' ? (
                        /**
                          * Already waiting for this one.
                          *
                          * Reopening the modal used to show the join form
                          * again, which said nothing about the alert already
                          * standing and offered no way out of it -- pressing
                          * the button simply subscribed a second time.
                          */
                        <>
                            <h3 className="text-2xl font-black text-[#234745] mb-4">
                                {isEn ? 'You\'re already on the list' : 'أنت مسجّل في القائمة'}
                            </h3>
                            <p className="text-gray-500 font-bold mb-8 mt-2 leading-relaxed px-2">
                                {isEn
                                    ? `We'll email you as soon as ${productTitle} is back in stock${locationName ? ` at ${locationName}` : ''}.`
                                    : `سنقوم بإبلاغك فور توفر ${productTitle}${locationName ? ` في ${locationName}` : ''}.`}
                            </p>
                            <div className="w-full mt-2">
                                <button
                                    type="button"
                                    onClick={handleUnsubscribe}
                                    disabled={cancelState === 'loading'}
                                    className="w-full py-4 rounded-full border-2 border-[#e6e0d8] text-[#234745] font-bold hover:border-red-300 hover:text-red-500 transition-colors disabled:opacity-50"
                                >
                                    {cancelState === 'loading'
                                        ? (isEn ? 'Cancelling…' : 'جارٍ الإلغاء…')
                                        : (isEn ? 'Cancel this alert' : 'إلغاء التنبيه')}
                                </button>
                            </div>
                            {cancelState === 'error' && (
                                <p className="text-red-500 text-xs font-bold mt-3">
                                    {isEn
                                        ? 'Could not cancel. Please try again shortly.'
                                        : 'تعذّر الإلغاء. يرجى المحاولة بعد قليل.'}
                                </p>
                            )}
                            <div className="w-full mt-3">
                                <Button fullWidth onClick={onClose} size="lg">
                                    {isEn ? 'Keep it' : 'إبقاء التنبيه'}
                                </Button>
                            </div>
                            <a
                                href={isEn ? '/en/account/notifications' : '/account/notifications'}
                                className="mt-4 text-xs text-gray-400 font-bold underline hover:text-[#234745] transition-colors"
                            >
                                {isEn ? 'Manage my alerts' : 'إدارة تنبيهاتي'}
                            </a>
                        </>
                    ) : status === 'success' ? (
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

                            {/**
                              * Changing your mind, on the screen where you
                              * decided. Joining the list has always been one
                              * button; leaving it had nothing at all, so a
                              * shopper who misread the branch or tapped the
                              * wrong card could only wait for the email.
                              */}
                            <div className="w-full mt-4 flex flex-col items-center gap-2">
                                <button
                                    type="button"
                                    onClick={handleUnsubscribe}
                                    disabled={cancelState === 'loading'}
                                    className="text-xs text-gray-400 font-bold underline hover:text-red-500 transition-colors disabled:opacity-50"
                                >
                                    {cancelState === 'loading'
                                        ? (isEn ? 'Cancelling…' : 'جارٍ الإلغاء…')
                                        : (isEn ? 'Changed your mind? Cancel this alert' : 'غيّرت رأيك؟ إلغاء هذا التنبيه')}
                                </button>
                                {cancelState === 'error' && (
                                    <p className="text-red-500 text-xs font-bold">
                                        {isEn
                                            ? 'Could not cancel. You can also manage alerts in your account.'
                                            : 'تعذّر الإلغاء. يمكنك أيضاً إدارة التنبيهات من حسابك.'}
                                    </p>
                                )}
                                <a
                                    href={isEn ? '/en/account/notifications' : '/account/notifications'}
                                    className="text-xs text-gray-400 font-bold underline hover:text-[#234745] transition-colors"
                                >
                                    {isEn ? 'Manage my alerts' : 'إدارة تنبيهاتي'}
                                </a>
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
