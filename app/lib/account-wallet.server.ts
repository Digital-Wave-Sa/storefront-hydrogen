import { getLoyaltyFullInfo } from './loyalty.server';
import { getAdminToken } from './shopify-admin.server';

export async function fetchWalletData({
  customer,
  request,
  context,
}: {
  customer: any;
  request: Request;
  context: any;
}) {
  let loyaltyPoints = 0;
  let balance = 0;
  let history: any[] = [];
  let cards: any[] = [];

  try {
    const middlewareUrl =
      context.env.MIDDLEWARE_URL || 'https://api.saadeddin.top';
    const isLocal =
      new URL(request.url).host.includes('localhost') ||
      new URL(request.url).host.includes('127.0.0.1');

    let formattedPhone = customer?.phone || '';
    if (isLocal && !formattedPhone) {
      formattedPhone = '0501234567';
    }
    if (formattedPhone.startsWith('+966')) {
      formattedPhone = '0' + formattedPhone.slice(4);
    }

    if (isLocal) {
      const globalGiftCards = (globalThis as any).__giftCards || new Map();
      const targetPhone = formattedPhone.replace(/\D/g, '');
      for (const card of globalGiftCards.values()) {
        if (card.phone && card.phone.replace(/\D/g, '') === targetPhone) {
          cards.push({
            code: card.code,
            currentBalance: card.currentBalance,
            status: card.status,
          });
          balance += card.currentBalance;
        }
      }

      history = cards
        .flatMap((card: any) => {
          const fullCard = globalGiftCards.get(card.code);
          return (fullCard?.transactions || []).map((tx: any) => {
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
        })
        .sort(
          (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
        );
    } else if (formattedPhone) {
      const baseGiftCardUrl = middlewareUrl;
      const cardsRes = await fetch(
        `${baseGiftCardUrl}/gift-cards/by-phone/${encodeURIComponent(formattedPhone)}`,
      );
      if (cardsRes.ok) {
        const cardsData = (await cardsRes.json()) as any;
        if (cardsData?.success && cardsData?.data) {
          cards = cardsData.data.cards || [];
          balance = cardsData.data.totalBalance || 0;
        }
      }

      const historyPromises = cards.map(async (card: any) => {
        try {
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
        const rawPhone = (customer.phone || formattedPhone || '').replace(/\D/g, '');
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
      phone: formattedPhone || customer?.phone || undefined,
      email: customer?.email || undefined,
      env: context.env,
      context,
    });
    loyaltyPoints = loyaltyInfo?.balance || 0;
    return {loyaltyPoints, balance, history, cards, loyaltyInfo};
  } catch (e) {}
  return {loyaltyPoints, balance, history, cards, loyaltyInfo: null};
}
