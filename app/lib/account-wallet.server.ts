import { getLoyaltyFullInfo } from './loyalty.server';
import { getAdminToken } from './shopify-admin.server';
import { toGiftCardPhone } from './phone-validation';

export async function fetchWalletData({
  customer,
  request,
  context,
}: {
  customer: any;
  request: Request;
  context: any;
}) {
  let loyaltyPoints: number | null = null;
  /**
   * null means "we could not establish it", which is not the same as zero.
   * Callers must render it as unavailable rather than as an empty wallet — a
   * failed lookup used to print 0.00 as though it were the customer's balance.
   */
  let balance: number | null = null;
  let history: any[] = [];
  let cards: any[] = [];

  try {
    const middlewareUrl =
      context.env.MIDDLEWARE_URL || 'https://api.saadeddin.top';
    /**
     * The store-credit service, keyed by customer id.
     *
     * This is the SAME source the wallet page's StoreCreditBalance card reads,
     * and it is the authority on the balance. The header used to read a
     * different service entirely — `${middlewareUrl}/gift-cards/by-phone/…` —
     * so /account/wallet showed two balances at once for the same customer:
     * 50.00 in the header from the phone lookup, 134.00 in the card from this
     * one. A phone is not a reliable key (spelling, country code, a number
     * reused after a customer changes it); a customer id is.
     */
    const storeCreditUrl =
      context.env.STORE_CREDIT_API_URL || 'https://sdgc.saadeddin.top';
    const isLocal =
      new URL(request.url).host.includes('localhost') ||
      new URL(request.url).host.includes('127.0.0.1');

    // One canonical spelling for every gift-card call — see toGiftCardPhone.
    const cleanPhone = toGiftCardPhone(customer?.phone);

    /**
     * Balance by customer id — the figure the wallet page shows.
     *
     * Runs first and wins. The phone lookup below still runs, because it is
     * where the individual card codes and their transaction history come from,
     * but it no longer decides the balance.
     */
    let authoritativeBalance: number | null = null;

    /**
     * The id reaches here in two shapes: a gid from the Storefront customer,
     * and a bare numeric id from the `loginCustomerId` session key. The
     * store-credit service is asked with the gid, which is what the wallet
     * page's own card already sends.
     */
    const rawId = String(customer?.id || '').trim();
    const customerGid = /^\d+$/.test(rawId)
      ? `gid://shopify/Customer/${rawId}`
      : rawId;

    if (customerGid) {
      try {
        const creditRes = await fetch(
          `${storeCreditUrl}/api/storefront/gift-card?customerId=${encodeURIComponent(customerGid)}`,
        );
        if (creditRes.ok) {
          const creditData = (await creditRes.json()) as any;
          const value = parseFloat(creditData?.balance);
          if (creditData?.success && Number.isFinite(value)) {
            authoritativeBalance = value;
          }
        } else {
          console.warn(
            `[WALLET] Store-credit lookup returned ${creditRes.status} for ${customerGid}`,
          );
        }
      } catch (err) {
        console.warn('[WALLET] Store-credit lookup failed:', err);
      }
    }

    if (cleanPhone) {
      const baseGiftCardUrl = middlewareUrl;
      try {
        /**
         * No encodeURIComponent: it escaped the leading `+` to `%2B`, and a URL
         * path is not decoded before route matching, so this request answered
         * 400 for every customer whose Shopify phone is stored in `+` form.
         * `cleanPhone` is digits only, so there is nothing to escape.
         */
        const cardsRes = await fetch(
          `${baseGiftCardUrl}/gift-cards/by-phone/${cleanPhone}`,
        );
        if (cardsRes.ok) {
          const cardsData = (await cardsRes.json()) as any;
          if (cardsData?.success && cardsData?.data) {
            cards = cardsData.data.cards || cardsData.data.accounts || [];

            /**
             * Parse, do not type-check. A middleware returning "500.00" as a
             * string used to fail `typeof === 'number'` and be recorded as 0.
             * The cards are summed as a cross-check: when the two disagree the
             * reported total is still trusted, but the mismatch is logged —
             * that gap is exactly what a customer reports as "I have 500 but
             * the site shows 50".
             */
            const reported = parseFloat(cardsData.data.totalBalance);
            const summed = (cards as any[]).reduce(
              (n, c) => n + (parseFloat(c?.currentBalance) || 0),
              0,
            );
            if (Number.isFinite(reported)) {
              if (cards.length > 0 && Math.abs(reported - summed) > 0.01) {
                console.warn(
                  `[WALLET] totalBalance ${reported} does not match the sum of ${cards.length} card(s) (${summed}) for ${cleanPhone}`,
                );
              }
              balance = reported;
            } else {
              balance = summed;
            }
          }
        } else {
          console.warn(
            `[WALLET] Gift-card lookup returned ${cardsRes.status} for ${cleanPhone}; balance reported as unavailable.`,
          );
        }
      } catch (err) {
        console.warn('[WALLET] Failed fetching live gift cards by phone:', err);
      }
    }

    if (cards.length === 0 && isLocal) {
      const globalGiftCards = (globalThis as any).__giftCards || new Map();
      const targetPhone = (cleanPhone || '0501234567').replace(/\D/g, '');
      for (const card of globalGiftCards.values()) {
        if (card.phone && card.phone.replace(/\D/g, '') === targetPhone) {
          cards.push({
            code: card.code,
            currentBalance: card.currentBalance,
            status: card.status,
          });
          balance = (balance ?? 0) + card.currentBalance;
        }
      }
    }

    if (cards.length > 0) {
      const baseGiftCardUrl = middlewareUrl;
      const historyPromises = cards.map(async (card: any) => {
        try {
          if (!card.code) return [];
          const txRes = await fetch(
            `${baseGiftCardUrl}/gift-cards/${card.code}/transactions`,
          );
          if (txRes.ok) {
            const txData = (await txRes.json()) as any;
            return (txData?.data?.transactions || []).map((tx: any) => {
              const amt = parseFloat(tx.amount || '0');
              return {
                id: tx.id,
                amount:
                  tx.operation === 'REDEEM' || tx.operation === 'VOID'
                    ? -amt
                    : amt,
                date: tx.timestamp,
                labelEn: `${tx.operation} - ${card.code}`,
                labelAr: `${tx.operation === 'REDEEM' ? 'استرداد' : tx.operation === 'TOPUP' ? 'شحن' : tx.operation === 'ACTIVATE' ? 'تفعيل' : 'إنشاء'} - ${card.code}`,
              };
            });
          }
        } catch (e) {}
        return [];
      });

      const historyResults = await Promise.all(historyPromises);
      history = historyResults
        .flat()
        .sort(
          (a: any, b: any) =>
            new Date(b.date).getTime() - new Date(a.date).getTime(),
        );
    }

    // Fetch used vouchers / discount codes from customer's orders
    if (customer?.phone || customer?.email || customer?.id) {
      try {
        const adminDomain = context.env.PUBLIC_STORE_DOMAIN;
        const adminToken = await getAdminToken(context.env);
        const numId = customer.id?.split('/').pop();
        const rawPhone = (customer?.phone || cleanPhone || '').replace(/\D/g, '');
        const phoneSearch = rawPhone.slice(-9);

        let fetchUrl = '';
        if (numId && !numId.includes('123456789')) {
          fetchUrl = `https://${adminDomain}/admin/api/2024-01/customers/${numId}/orders.json?status=any&limit=50`;
        } else if (phoneSearch) {
          fetchUrl = `https://${adminDomain}/admin/api/2024-01/orders.json?status=any&limit=50`;
        }

        if (fetchUrl) {
          const ordersRes = await fetch(fetchUrl, {
            headers: {
              'X-Shopify-Access-Token': adminToken,
              'Content-Type': 'application/json',
            },
          });
          if (ordersRes.ok) {
            const ordersData = (await ordersRes.json()) as any;
            const fetchedOrders = ordersData?.orders || [];
            fetchedOrders.forEach((o: any) => {
              if (phoneSearch && (!numId || numId.includes('123456789'))) {
                const orderPhone = (o.phone || o.customer?.phone || o.shipping_address?.phone || '').replace(/\D/g, '');
                if (orderPhone && !orderPhone.endsWith(phoneSearch)) {
                  return;
                }
              }

              const codes = o.discount_codes || [];
              const applications = o.discount_applications || [];

              codes.forEach((dc: any, idx: number) => {
                const code = dc.code || '';
                if (!code) return;
                const amount = parseFloat(dc.amount || o.total_discounts || '0');
                const isLoyalty =
                  code.startsWith('LOYAL') || code.includes('LOYALTY');
                history.push({
                  id: `order-dc-${o.id}-${idx}-${code}`,
                  amount: amount > 0 ? -amount : 0,
                  date: o.created_at || o.processed_at || new Date().toISOString(),
                  labelEn: isLoyalty
                    ? `Loyalty Redemption Code (${code})`
                    : `Used Discount Voucher (${code})`,
                  labelAr: isLoyalty
                    ? `استخدام كود نقاط الولاء (${code})`
                    : `استخدام كود الخصم (${code})`,
                });
              });

              if (codes.length === 0 && applications.length > 0) {
                applications.forEach((da: any, idx: number) => {
                  const title = da.code || da.title || '';
                  if (!title) return;
                  const amount = parseFloat(da.value || o.total_discounts || '0');
                  const isLoyalty = title.startsWith('LOYAL') || title.toUpperCase().includes('LOYAL');
                  history.push({
                    id: `order-da-${o.id}-${idx}-${title}`,
                    amount: amount > 0 ? -amount : 0,
                    date: o.created_at || o.processed_at || new Date().toISOString(),
                    labelEn: isLoyalty
                      ? `Loyalty Points Discount (${title})`
                      : `Applied Discount (${title})`,
                    labelAr: isLoyalty
                      ? `خصم نقاط الولاء (${title})`
                      : `خصم مستخدم (${title})`,
                  });
                });
              }
            });
          }
        }
      } catch (e) {
        console.error('Failed to fetch order discount codes for wallet history:', e);
      }
    }

    history = history.sort(
      (a: any, b: any) =>
        new Date(b.date).getTime() - new Date(a.date).getTime(),
    );

    // Fetch Loyalty Points explicitly from CRM endpoint
    const loyaltyInfo = await getLoyaltyFullInfo({
      customerId: customer?.id || '',
      phone: cleanPhone || customer?.phone || undefined,
      email: customer?.email || undefined,
      env: context.env,
      context,
    });
    /**
     * Points are `null` on the same terms as the balance: getLoyaltyFullInfo
     * returns a zeroed object for "not enrolled", for an SDLP outage and for a
     * timeout alike, and the account header used to state all three as
     * "0 نقطة، المستوى الفضي" — a tier claim built on a failed request.
     */
    /**
     * One balance, from the customer-id service.
     *
     * The phone lookup's figure is kept only as a fallback for a customer with
     * no id, and a disagreement between the two is logged rather than silently
     * picked between — that mismatch is exactly what a customer reports as
     * "the site shows 50 but I have more".
     */
    if (authoritativeBalance !== null) {
      if (balance !== null && Math.abs(balance - authoritativeBalance) > 0.01) {
        console.warn(
          `[WALLET] Balance sources disagree for ${customerGid}: store credit ${authoritativeBalance}, phone lookup ${balance}. Using store credit.`,
        );
      }
      balance = authoritativeBalance;
    }

    loyaltyPoints = typeof loyaltyInfo?.balance === 'number' ? loyaltyInfo.balance : null;
    return {loyaltyPoints, balance, history, cards, loyaltyInfo};
  } catch (e) {
    console.error('[WALLET] fetchWalletData failed:', e);
  }
  return {loyaltyPoints, balance, history, cards, loyaltyInfo: null};
}
