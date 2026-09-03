import { useEffect, useState } from 'react';
import { SaudiRiyalSymbol } from '~/components/Price';

export interface StoreCreditBalanceProps {
  customerId?: string;
  isEn?: boolean;
  initialBalance?: number | null;
}

/**
 * StoreCreditBalance
 *
 * Displays the signed-in customer's gift card / store credit balance.
 *
 * The balance is fetched from our own GET /api/store-credit, which resolves the
 * customer from the session. This used to call sdgc.saadeddin.top directly from
 * the browser with the customer gid in the query string and no credential
 * attached; `customerId` is still taken as a prop, but only to tell whether
 * anyone is signed in — it is never sent.
 */
export function StoreCreditBalance({
  customerId,
  isEn = false,
  initialBalance = null,
}: StoreCreditBalanceProps) {
  const [balance, setBalance] = useState<number | null>(initialBalance);
  const [loading, setLoading] = useState<boolean>(initialBalance === null);

  useEffect(() => {
    if (!customerId) return;

    let isMounted = true;
    setLoading(true);

    fetch('/api/store-credit')
      .then((r) => r.json())
      .then((data: any) => {
        if (isMounted && data.success && typeof data.balance === 'number') {
          setBalance(data.balance);
        }
      })
      .catch((err) => {
        console.error('Failed to fetch store credit balance', err);
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [customerId]);

  if (loading && balance === null) {
    return (
      <div className="store-credit-balance p-6 bg-gradient-to-br from-[#234745] to-[#162e2c] text-white rounded-[24px] shadow-md animate-pulse">
        <div className="h-4 w-32 bg-white/20 rounded mb-3" />
        <div className="h-8 w-24 bg-white/30 rounded" />
      </div>
    );
  }

  return (
    <div
      className="store-credit-balance p-6 md:p-8 bg-gradient-to-br from-[#234745] to-[#183432] text-white rounded-[24px] shadow-lg relative overflow-hidden flex flex-col justify-between"
      dir={isEn ? 'ltr' : 'rtl'}
    >
      <div className="absolute top-0 end-0 transform translate-x-4 -translate-y-4 opacity-10 pointer-events-none">
        <svg className="w-48 h-48 text-white" fill="currentColor" viewBox="0 0 24 24">
          <path d="M21 18v1c0 1.1-.9 2-2 2H5c-1.11 0-2-.9-2-2V5c0-1.1.89-2 2-2h14c1.1 0 2 .9 2 2v1h-9c-1.11 0-2 .9-2 2v8c0 1.1.89 2 2 2h9zm-9-2h10V8H12v8zm4-2.5c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5z" />
        </svg>
      </div>

      <div className="relative z-10">
        <span className="text-xs font-bold uppercase tracking-wider text-[#9FB7AE] block mb-2">
          {isEn ? 'Current Store Credit' : 'رصيد حسابك الحالي'}
        </span>

        {/*
          * A balance we could not establish shows as unavailable, never as 0.00.
          *
          * The route answers 503 with balance: null when the store-credit service
          * cannot be reached, and this card rendered `(balance ?? 0)` — so an
          * outage told the customer their wallet was empty while the account
          * header directly above it correctly said unavailable. Two different
          * answers about the same money on the same screen.
          */}
        {balance === null ? (
          <div className="font-black text-2xl md:text-3xl text-white/70">
            {isEn ? 'Unavailable right now' : 'غير متاح حالياً'}
          </div>
        ) : (
          <div className="flex items-baseline gap-2 font-black text-3xl md:text-4xl text-white">
            <span dir="ltr">{balance.toFixed(2)}</span>
            <SaudiRiyalSymbol className="h-6 md:h-7 w-auto text-white inline-block mb-1" />
          </div>
        )}

        <p className="text-xs text-[#9FB7AE] font-medium mt-3">
          {balance === null
            ? isEn
              ? 'We could not reach the balance service. Your credit is safe — please try again shortly.'
              : 'تعذّر الوصول إلى خدمة الرصيد. رصيدك محفوظ — يرجى المحاولة بعد قليل.'
            : isEn
              ? 'Use your store credit at checkout on any order.'
              : 'يمكنك استخدام رصيدك عند إتمام الشراء لأي طلب.'}
        </p>
      </div>
    </div>
  );
}
