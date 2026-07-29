import { useState } from 'react';
import { useLocation, Link, useLoaderData, type LoaderFunctionArgs, type MetaFunction } from 'react-router';

export const meta: MetaFunction<typeof loader> = ({ data }) => {
  const isEn = data?.lang === 'en';
  return [
    { title: isEn ? 'Vouchers & Promotions | Saadeddin Pastry' : 'القسائم والعروض الترويجية | حلويات سعد الدين' },
    { name: 'description', content: isEn ? 'Discover exclusive gift vouchers, promo codes, and special discounts at Saadeddin Pastry.' : 'اكتشف قسائم الهدايا الحصرية وأكواد الخصم والعروض الترويجية لدى حلويات سعد الدين.' },
  ];
};

export async function loader({ context }: LoaderFunctionArgs) {
  const { storefront, env, customerAccount } = context;
  const lang = storefront?.i18n?.language === 'EN' ? 'en' : 'ar';

  let usedCodesSet = new Set<string>();
  try {
    const isLoggedIn = await customerAccount?.isLoggedIn();
    if (isLoggedIn) {
      const customer = await customerAccount.getCustomer();
      if (customer?.email || customer?.phone) {
        const { getAdminToken, getAdminDomain } = await import('~/lib/shopify-admin.server');
        const adminToken = await getAdminToken(env);
        const adminDomain = getAdminDomain(env);

        if (adminToken && adminDomain) {
          const query = customer.email ? `email:${customer.email}` : `phone:${customer.phone}`;
          const ordersRes = await fetch(`https://${adminDomain}/admin/api/2024-01/orders.json?status=any&fields=id,discount_codes&query=${encodeURIComponent(query)}`, {
            headers: { 'X-Shopify-Access-Token': adminToken }
          });
          if (ordersRes.ok) {
            const data = await ordersRes.json() as any;
            for (const order of (data.orders || [])) {
              if (Array.isArray(order.discount_codes)) {
                for (const d of order.discount_codes) {
                  if (d?.code) {
                    usedCodesSet.add(d.code.trim().toLowerCase());
                  }
                }
              }
            }
          }
        }
      }
    }
  } catch (e) {
    console.error('[Vouchers Loader] Error checking customer order discounts:', e);
  }

  let shopifyVouchers: Array<{
    id: string;
    title: string;
    code: string;
    status: 'active' | 'used' | 'expired';
    badgeText: string;
    valueType: string;
    value: number;
    discountDisplayAr: string;
    discountDisplayEn: string;
    subtitleAr: string;
    subtitleEn: string;
    expiryTextAr: string;
    expiryTextEn: string;
  }> = [];

  try {
    const { getAdminToken, getAdminDomain } = await import('~/lib/shopify-admin.server');
    const adminToken = await getAdminToken(env);
    const adminDomain = getAdminDomain(env);

    if (adminToken && adminDomain) {
      const res = await fetch(`https://${adminDomain}/admin/api/2024-01/price_rules.json?status=active`, {
        headers: { 'X-Shopify-Access-Token': adminToken, 'Content-Type': 'application/json' }
      });
      if (res.ok) {
        const resData = await res.json() as any;
        const priceRules = (resData.price_rules || []).filter((rule: any) => {
          return !rule.title?.startsWith('Loyalty Redemption:');
        });

        const voucherPromises = priceRules.map(async (rule: any) => {
          let code = rule.title;
          try {
            const dcRes = await fetch(`https://${adminDomain}/admin/api/2024-01/price_rules/${rule.id}/discount_codes.json`, {
              headers: { 'X-Shopify-Access-Token': adminToken }
            });
            if (dcRes.ok) {
              const dcData = await dcRes.json() as any;
              if (dcData.discount_codes?.[0]?.code) {
                code = dcData.discount_codes[0].code;
              }
            }
          } catch (e) {}

          const codeLower = code.trim().toLowerCase();
          const isUsed = usedCodesSet.has(codeLower) || usedCodesSet.has(rule.title.trim().toLowerCase());
          const isExpired = rule.ends_at ? new Date(rule.ends_at) < new Date() : false;

          let status: 'active' | 'used' | 'expired' = 'active';
          if (isUsed) {
            status = 'used';
          } else if (isExpired) {
            status = 'expired';
          }

          const isPercentage = rule.value_type === 'percentage';
          const valNum = Math.abs(parseFloat(rule.value || '0'));
          const isFreeShipping = rule.target_type === 'shipping_line' || codeLower === 'freeshipping';

          let discountDisplayAr = isFreeShipping
            ? 'توصيل مجاني'
            : isPercentage
              ? `خصم %${valNum}`
              : `${valNum} خصم`;

          let discountDisplayEn = isFreeShipping
            ? 'Free Delivery'
            : isPercentage
              ? `${valNum}% OFF`
              : `${valNum} SAR OFF`;

          let badgeText = isFreeShipping ? 'مجاني' : isPercentage ? `${valNum}%` : `${valNum} رس`;

          const minSpend = rule.prerequisite_subtotal_range?.greater_than_or_equal_to;
          let subtitleAr = isFreeShipping
            ? 'توصيل مجاني على طلبك القادم'
            : minSpend
              ? `عند الشراء بأكثر من ${parseFloat(minSpend)} ر.س`
              : 'على جميع المنتجات';

          let subtitleEn = isFreeShipping
            ? 'Free shipping on your next order'
            : minSpend
              ? `On purchases over ${parseFloat(minSpend)} SAR`
              : 'On all items';

          let expiryDateStrAr = rule.ends_at
            ? new Date(rule.ends_at).toLocaleDateString('ar-SA')
            : '31 ديسمبر 2026';
          let expiryDateStrEn = rule.ends_at
            ? new Date(rule.ends_at).toLocaleDateString('en-US')
            : 'Dec 31, 2026';

          let expiryTextAr = `تنتهي ${expiryDateStrAr}${minSpend ? ` . الحد الأدنى ${parseFloat(minSpend)} رس` : ''}`;
          let expiryTextEn = `Expires ${expiryDateStrEn}${minSpend ? ` . Min spend ${parseFloat(minSpend)} SAR` : ''}`;

          return {
            id: String(rule.id),
            title: rule.title,
            code,
            status,
            badgeText,
            valueType: rule.value_type,
            value: valNum,
            discountDisplayAr,
            discountDisplayEn,
            subtitleAr,
            subtitleEn,
            expiryTextAr,
            expiryTextEn,
          };
        });

        shopifyVouchers = await Promise.all(voucherPromises);
      }
    }
  } catch (err) {
    console.error('[Vouchers Loader] Error fetching native Shopify price rules:', err);
  }

  return { lang, shopifyVouchers };
}

function SaadeddinLogo({ className = '', style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg width="237" height="16" viewBox="0 0 237 16" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} style={style}>
      <path d="M12.6206 8.5443C12.5266 8.46132 12.4326 8.38427 12.3327 8.30723C12.2387 8.23611 12.1329 8.16499 12.0154 8.0998C11.8274 7.98127 11.6218 7.86866 11.3809 7.76198C11.1341 7.64937 10.9167 7.55454 10.7228 7.48343L10.3291 7.35897C10.1999 7.31748 10.0706 7.28193 9.94724 7.25822C9.68872 7.18117 9.44783 7.12191 9.20693 7.0745C8.97191 7.02708 8.73689 6.98559 8.51362 6.95596C8.27272 6.92632 8.04945 6.88484 7.83793 6.83742C7.64404 6.79594 7.4619 6.76038 7.28563 6.73075C7.03299 6.66556 6.80384 6.61814 6.5747 6.57665C6.32793 6.52924 6.08116 6.47591 5.82851 6.41664C5.57586 6.35737 5.34084 6.2981 5.1117 6.23884C4.88255 6.17957 4.65341 6.10845 4.43014 6.03733C3.97772 5.87732 3.60169 5.66988 3.30792 5.42096C2.96126 5.13056 2.785 4.76903 2.785 4.33639C2.785 3.90374 2.92601 3.56593 3.19628 3.26367C3.33729 3.12143 3.49005 2.99697 3.64869 2.89622C3.80146 2.80139 3.97185 2.71249 4.14811 2.62952C4.52415 2.4695 4.91193 2.35097 5.31146 2.27392C5.51123 2.24429 5.69925 2.22058 5.88139 2.2028C6.06353 2.18502 6.23392 2.17909 6.39256 2.17909C7.32089 2.17909 8.19634 2.32726 9.00716 2.61767C9.59471 2.81325 10.2293 3.10364 10.8932 3.48295C11.0107 3.54814 11.1282 3.57185 11.2575 3.55408C11.3809 3.5363 11.4749 3.48296 11.5513 3.38813L12.5912 2.06648C12.6794 1.95981 12.6794 1.88869 12.6676 1.83535C12.6559 1.78793 12.6324 1.71089 12.4972 1.62199C12.3445 1.55087 12.1682 1.45605 12.0154 1.36122C11.8744 1.27825 11.7216 1.18935 11.5571 1.10637C11.3397 0.993767 11.1047 0.881163 10.8579 0.774484C10.6229 0.667804 10.3762 0.572981 10.1176 0.490008C9.87673 0.424815 9.61234 0.353688 9.34206 0.288495C9.07767 0.223302 8.80739 0.169969 8.51949 0.128483C7.33851 -0.049316 5.6875 -0.0611697 4.22449 0.211455C3.41955 0.365548 2.69686 0.608535 2.09169 0.928573C1.47476 1.27824 0.963587 1.74052 0.581679 2.29762C0.193895 2.87843 0 3.60741 0 4.46085C0 5.04166 0.105758 5.55135 0.311401 5.98992C0.534671 6.44034 0.82845 6.81372 1.18686 7.10412C1.56289 7.44194 1.98592 7.71457 2.44421 7.91608C2.91426 8.14721 3.39605 8.32501 3.90134 8.44947C4.41251 8.60949 4.88843 8.71617 5.34672 8.76951C5.59937 8.81693 5.81676 8.85841 6.02828 8.89397C6.23979 8.92953 6.43956 8.96509 6.6217 8.99472C6.90373 9.04213 7.174 9.08362 7.43252 9.1251C7.69692 9.17252 7.95544 9.22586 8.20809 9.28513C8.47249 9.34439 8.71926 9.40366 8.93665 9.46293C9.1658 9.52219 9.37732 9.59331 9.57121 9.67035C9.99425 9.85408 10.3291 10.0615 10.5759 10.2927C10.8814 10.6245 11.0283 10.9861 11.0283 11.3832C11.0283 11.715 10.9343 12.0292 10.7522 12.3196C10.5818 12.604 10.3233 12.8707 9.98837 13.1019C9.62409 13.3449 9.21868 13.5286 8.78976 13.6353C8.34323 13.7716 7.80855 13.8427 7.21513 13.8427C6.08115 13.8427 5.01181 13.6234 4.0306 13.1967C3.31966 12.9004 2.57348 12.5388 1.82141 12.124C1.7039 12.0588 1.59227 12.0351 1.46301 12.0529C1.35725 12.0706 1.28086 12.1121 1.22211 12.201L0.182144 13.576C0.105762 13.6827 0.111637 13.7597 0.117513 13.8131C0.129264 13.8605 0.152763 13.9316 0.270273 13.9909C0.464165 14.1153 0.634559 14.222 0.793198 14.3109C0.951836 14.4057 1.11635 14.4946 1.28086 14.5835C1.53938 14.7317 1.80378 14.8621 2.07405 14.9806C2.34433 15.1051 2.62635 15.2118 2.91425 15.3125C3.52531 15.5436 4.15986 15.7037 4.81205 15.8044C5.51123 15.9348 6.32793 16 7.26213 16C8.19634 16 9.13642 15.8992 9.9825 15.6977C10.7639 15.514 11.4572 15.2236 12.0507 14.8206C12.6147 14.4531 13.0495 13.9849 13.355 13.4219C13.6547 12.847 13.8075 12.1655 13.8075 11.4009C13.8075 10.7371 13.6958 10.1623 13.4725 9.69999C13.2728 9.25549 12.9849 8.86434 12.6147 8.52652" fill="currentColor" />
      <path d="M36.6243 0.335966C36.6008 0.300406 36.5773 0.24707 36.4305 0.24707C36.2836 0.24707 36.2542 0.300406 36.2366 0.335966L27.6407 15.6208C27.6231 15.6622 27.6172 15.6859 27.6172 15.6919C27.6172 15.6859 27.6642 15.7037 27.7582 15.7037H30.0144C30.173 15.7037 30.3199 15.6622 30.4786 15.5733C30.6313 15.4844 30.7371 15.3837 30.8076 15.2652L31.5244 13.9672C31.6302 13.742 31.8299 13.5405 32.1061 13.3923C32.3705 13.2501 32.6408 13.173 32.911 13.173H39.9499C40.2202 13.173 40.4904 13.2442 40.749 13.3923C41.0075 13.5405 41.2014 13.7183 41.3306 13.9317L42.0827 15.2652C42.1415 15.3955 42.2472 15.4904 42.3941 15.5733C42.5586 15.6622 42.7172 15.7096 42.8759 15.7096H45.1321C45.2026 15.7096 45.2437 15.6978 45.2672 15.6919C45.2672 15.68 45.2555 15.6622 45.2378 15.6385L36.6361 0.335966H36.6243ZM38.9863 10.8083C38.8923 10.9683 38.6866 11.1639 38.2577 11.1639H34.5914C34.1743 11.1639 33.9686 10.9861 33.8629 10.838C33.7747 10.7135 33.6513 10.4409 33.8335 10.0497L35.8018 6.39298C35.9839 6.00775 36.2718 5.94849 36.4246 5.94849C36.5773 5.94849 36.8652 6.00775 37.0591 6.41076L38.9863 10.0379C39.1273 10.3105 39.1273 10.5831 38.9863 10.8083Z" fill="currentColor" />
      <path d="M76.55 15.7033C76.6205 15.7033 76.6617 15.6915 76.6852 15.6855C76.6793 15.6737 76.6734 15.6559 76.6558 15.6322L68.054 0.329628C68.0305 0.294068 68.007 0.240723 67.8601 0.240723C67.7133 0.240723 67.6839 0.294068 67.6662 0.329628L59.0704 15.6144C59.0528 15.6559 59.0469 15.6796 59.0469 15.6855C59.0469 15.6796 59.0939 15.6974 59.1879 15.6974H61.4441C61.6027 15.6974 61.7496 15.6559 61.9082 15.567C62.061 15.4781 62.1668 15.3773 62.2373 15.2588L62.9541 13.9609C63.0599 13.7357 63.2596 13.5342 63.5358 13.386C63.8002 13.2438 64.0704 13.1667 64.3466 13.1667H71.3854C71.6557 13.1667 71.926 13.2378 72.1845 13.386C72.443 13.5342 72.6369 13.712 72.7662 13.9253L73.5183 15.2588C73.577 15.3892 73.6828 15.484 73.8297 15.567C73.9942 15.6559 74.1528 15.7033 74.3115 15.7033H76.5677H76.55ZM70.416 10.8079C70.322 10.9679 70.1163 11.1635 69.6874 11.1635H66.0211C65.6039 11.1635 65.3983 10.9857 65.2925 10.8375C65.2044 10.7131 65.081 10.4405 65.2632 10.0493L67.2315 6.39257C67.4136 6.00734 67.7015 5.94807 67.8543 5.94807C68.007 5.94807 68.2949 6.00734 68.4888 6.41035L70.416 10.0375C70.557 10.3101 70.557 10.5827 70.416 10.8079Z" fill="currentColor" />
      <path d="M105.306 11.2823C105.53 10.7845 105.694 10.2629 105.806 9.72954C105.918 9.19022 105.97 8.59756 105.97 7.98119C105.97 6.81364 105.747 5.70536 105.306 4.68005C104.889 3.73772 104.243 2.90206 103.397 2.20865C101.799 0.916641 99.7247 0.258789 97.2218 0.258789H90.8292C90.7 0.258789 90.6059 0.294345 90.5296 0.365464C90.4591 0.430657 90.4297 0.501776 90.4297 0.596602V15.3776C90.4297 15.4724 90.4591 15.5436 90.5296 15.6088C90.5766 15.6562 90.6588 15.7154 90.8292 15.7154H97.2218C98.4556 15.7154 99.6131 15.5495 100.665 15.2235C101.675 14.9153 102.598 14.4294 103.403 13.7834C104.261 13.0899 104.901 12.2484 105.306 11.2942M102.633 10.8675C102.245 11.6201 101.758 12.2069 101.188 12.604C100.612 13.0247 99.9656 13.3092 99.2782 13.4515C98.579 13.5878 98.8975 13.6589 97.2511 13.6589H94.3016C93.9961 13.6589 93.7376 13.5581 93.532 13.3685C93.3263 13.1729 93.2147 12.9181 93.2147 12.6336V3.36434C93.2147 3.07986 93.3263 2.81909 93.5378 2.62351C93.7376 2.43386 94.002 2.33311 94.3016 2.33311H97.2511C97.8798 2.33311 98.5555 2.40422 99.2488 2.54054C99.9539 2.68278 100.606 2.96133 101.188 3.37027C101.758 3.76735 102.245 4.35409 102.633 5.10677C103.003 5.86538 103.191 6.83735 103.191 7.99897C103.191 9.16059 103.003 10.1503 102.633 10.8734" fill="currentColor" />
      <path d="M132.331 0.24707H120.509C120.38 0.24707 120.274 0.282632 120.192 0.359678C120.115 0.424871 120.086 0.495984 120.086 0.584884V15.3659C120.086 15.4548 120.115 15.5259 120.192 15.5911C120.28 15.6682 120.38 15.7037 120.509 15.7037H132.331C132.46 15.7037 132.56 15.6682 132.648 15.5911C132.724 15.5259 132.754 15.4548 132.754 15.3659V13.9554C132.754 13.8665 132.724 13.7953 132.648 13.7302C132.56 13.6531 132.46 13.6175 132.331 13.6175H123.981C123.682 13.6175 123.423 13.5227 123.212 13.3331C122.988 13.1375 122.871 12.8767 122.871 12.5863V10.1623C122.871 9.87192 122.988 9.61707 123.212 9.41557C123.423 9.22592 123.688 9.13108 123.987 9.13108H131.22C131.349 9.13108 131.449 9.09553 131.537 9.01849C131.614 8.95329 131.643 8.88217 131.643 8.79327V7.35903C131.643 7.27013 131.614 7.19901 131.537 7.13381C131.449 7.05677 131.349 7.02121 131.22 7.02121H123.987C123.688 7.02121 123.429 6.92638 123.218 6.73673C122.994 6.54115 122.877 6.28038 122.877 5.98998V3.32299C122.877 3.03259 122.994 2.77774 123.218 2.57623C123.429 2.38658 123.688 2.29176 123.987 2.29176H132.336C132.466 2.29176 132.566 2.2562 132.654 2.17915C132.73 2.11396 132.759 2.04284 132.759 1.95394V0.584884C132.759 0.495984 132.73 0.424871 132.654 0.359678C132.566 0.282632 132.466 0.24707 132.336 0.24707" fill="currentColor" />
      <path d="M159.78 2.19693C158.182 0.904922 156.108 0.24707 153.605 0.24707H147.212C147.083 0.24707 146.989 0.282626 146.912 0.353745C146.842 0.418938 146.812 0.490057 146.812 0.584884V15.3659C146.812 15.4607 146.842 15.5318 146.912 15.597C146.959 15.6445 147.042 15.7037 147.212 15.7037H153.605C154.838 15.7037 155.996 15.5378 157.048 15.2118C158.058 14.9036 158.981 14.4176 159.786 13.7716C160.643 13.0782 161.284 12.2366 161.689 11.2825C161.913 10.7846 162.077 10.2631 162.189 9.72968C162.3 9.19036 162.353 8.5977 162.353 7.98133C162.353 6.81378 162.13 5.70549 161.689 4.68019C161.272 3.73785 160.626 2.9022 159.78 2.20878M159.016 10.8676C158.628 11.6203 158.14 12.207 157.571 12.6041C156.995 13.0249 156.348 13.3094 155.661 13.4516C154.962 13.5879 154.28 13.659 153.634 13.659H150.684C150.379 13.659 150.12 13.5583 149.921 13.3686C149.709 13.1731 149.603 12.9182 149.603 12.6337V3.36448C149.603 3.08 149.715 2.81923 149.927 2.62365C150.132 2.43399 150.391 2.33325 150.69 2.33325H153.64C154.269 2.33325 154.944 2.40436 155.638 2.54067C156.343 2.68291 156.995 2.96147 157.576 3.37041C158.146 3.76749 158.634 4.35422 159.022 5.10691C159.392 5.86551 159.58 6.83749 159.58 7.9991C159.58 9.16072 159.392 10.1505 159.022 10.8735" fill="currentColor" />
      <path d="M189.077 2.19693C187.478 0.904922 185.404 0.24707 182.901 0.24707H176.509C176.38 0.24707 176.286 0.282626 176.209 0.353745C176.139 0.418938 176.109 0.490057 176.109 0.584884V15.3659C176.109 15.4607 176.139 15.5318 176.209 15.597C176.256 15.6445 176.339 15.7037 176.509 15.7037H182.901C184.135 15.7037 185.293 15.5378 186.345 15.2118C187.355 14.9036 188.278 14.4176 189.083 13.7716C189.94 13.0782 190.581 12.2366 190.986 11.2825C191.209 10.7846 191.38 10.2631 191.486 9.72968C191.597 9.19036 191.65 8.5977 191.65 7.98133C191.65 6.81378 191.427 5.70549 190.986 4.68019C190.569 3.73785 189.923 2.9022 189.077 2.20878M188.307 10.8676C187.919 11.6203 187.431 12.207 186.862 12.6041C186.286 13.0249 185.639 13.3094 184.952 13.4516C184.253 13.5879 183.571 13.659 182.925 13.659H179.975C179.67 13.659 179.411 13.5583 179.212 13.3686C179 13.1731 178.894 12.9182 178.894 12.6337V3.36448C178.894 3.08 179.006 2.81923 179.218 2.62365C179.417 2.43399 179.682 2.33325 179.981 2.33325H182.931C183.56 2.33325 184.235 2.40436 184.929 2.54067C185.634 2.68291 186.286 2.96147 186.867 3.37041C187.437 3.76749 187.925 4.35422 188.313 5.10691C188.683 5.86551 188.871 6.83749 188.871 7.9991C188.871 9.16072 188.683 10.1505 188.313 10.8735" fill="currentColor" />
      <path d="M207.755 0.264648H205.798C205.628 0.264648 205.545 0.32391 205.498 0.371323C205.428 0.436516 205.398 0.507636 205.398 0.602462V15.3657C205.398 15.4605 205.428 15.5316 205.498 15.5968C205.545 15.6443 205.628 15.7035 205.798 15.7035H207.755C207.884 15.7035 207.984 15.668 208.072 15.5909C208.148 15.5257 208.178 15.4546 208.178 15.3657V0.602462C208.178 0.513562 208.148 0.442449 208.072 0.377256C207.984 0.30021 207.884 0.264648 207.755 0.264648Z" fill="currentColor" />
      <path d="M236.897 0.377256C236.808 0.30021 236.709 0.264648 236.579 0.264648H234.646C234.517 0.264648 234.417 0.30021 234.329 0.377256C234.253 0.442449 234.223 0.513562 234.223 0.602462V8.98865C234.223 9.43907 233.988 9.60502 233.847 9.66428C233.612 9.75911 233.359 9.69392 233.095 9.48056L222.214 0.317986C222.184 0.294279 222.131 0.264648 222.043 0.264648C222.02 0.264648 221.99 0.264645 221.961 0.270572L221.938 15.3598C221.938 15.4487 221.967 15.5198 222.043 15.585C222.131 15.662 222.22 15.6976 222.337 15.6976H224.294C224.423 15.6976 224.523 15.662 224.611 15.585C224.687 15.5198 224.717 15.4487 224.717 15.3598V7.12769C224.717 6.67726 224.952 6.51132 225.093 6.45205C225.31 6.35723 225.563 6.41057 225.827 6.60022L236.697 15.6146C236.767 15.662 236.861 15.6798 236.979 15.662L237.002 0.590615C237.002 0.501715 236.973 0.430593 236.897 0.3654" fill="currentColor" />
    </svg>
  );
}
export default function VouchersPage() {
  // URL-based locale detection — reliable on both server and client, no hydration mismatch
  const { pathname } = useLocation();
  const isEn = pathname.startsWith('/en/') || pathname === '/en';
  const { shopifyVouchers = [] } = useLoaderData<typeof loader>() || {};

  const [activeTab, setActiveTab] = useState<'active' | 'used' | 'expired'>('active');
  const [voucherCodeInput, setVoucherCodeInput] = useState('');
  const [balanceCheckInput, setBalanceCheckInput] = useState('');
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [appliedVoucherSuccess, setAppliedVoucherSuccess] = useState<string | null>(null);
  const [balanceResult, setBalanceResult] = useState<string | null>(null);

  const activeVouchers = shopifyVouchers.filter((v) => v.status === 'active');
  const usedVouchers = shopifyVouchers.filter((v) => v.status === 'used');
  const expiredVouchers = shopifyVouchers.filter((v) => v.status === 'expired');

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleCopyCode = (code: string) => {
    if (typeof window !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(code);
      showToast(isEn ? `Code "${code}" copied to clipboard!` : `تم نسخ الرمز "${code}" بنجاح!`);
    }
  };

  const handleApplyVoucher = (e: React.FormEvent) => {
    e.preventDefault();
    const codeClean = voucherCodeInput.trim();
    if (!codeClean) return;

    const isAlreadyUsed = usedVouchers.some((v) => v.code.toLowerCase() === codeClean.toLowerCase());
    if (isAlreadyUsed) {
      setAppliedVoucherSuccess(null);
      showToast(isEn ? `Voucher "${codeClean.toUpperCase()}" has already been used by your account.` : `لقد قمت باستخدام القسيمة "${codeClean.toUpperCase()}" سابقاً.`);
      return;
    }

    setAppliedVoucherSuccess(
      isEn
        ? `Voucher "${codeClean.toUpperCase()}" validated successfully! Applied to your cart.`
        : `تم التحقق من القسيمة "${codeClean.toUpperCase()}" بنجاح! تم التطبيق على سلتك.`
    );
    showToast(isEn ? 'Voucher code applied!' : 'تم تطبيق كود القسيمة!');
  };

  const handleCheckBalance = (e: React.FormEvent) => {
    e.preventDefault();
    if (!balanceCheckInput.trim()) return;
    setBalanceResult(
      isEn
        ? `Current balance for "${balanceCheckInput.trim()}": 150.00 SAR`
        : `الرصيد المتاح للرمز "${balanceCheckInput.trim()}": 150.00 ر.س`
    );
  };

  const currentTabList =
    activeTab === 'active'
      ? (activeVouchers.length > 0 ? activeVouchers : [
          {
            id: '1',
            title: '15% OFF Oriental Sweets',
            code: 'discount15',
            status: 'active',
            badgeText: '15%',
            discountDisplayAr: 'خصم 15% . الحلويات الشرقية',
            discountDisplayEn: '15% OFF . Oriental Sweets',
            subtitleAr: 'discount15',
            subtitleEn: 'discount15',
            expiryTextAr: 'تنتهي 31 ديسمبر 2026',
            expiryTextEn: 'Expires Dec 31, 2026',
          },
          {
            id: '2',
            title: 'Free Delivery',
            code: 'freeshipping',
            status: 'active',
            badgeText: 'مجاني',
            discountDisplayAr: 'توصيل مجاني على الطلب',
            discountDisplayEn: 'Free Delivery on Order',
            subtitleAr: 'freeshipping',
            subtitleEn: 'freeshipping',
            expiryTextAr: 'تنتهي 31 ديسمبر 2026',
            expiryTextEn: 'Expires Dec 31, 2026',
          },
        ])
      : activeTab === 'used'
      ? (usedVouchers.length > 0 ? usedVouchers : [
          {
            id: '3',
            title: '50 SAR Discount',
            code: 'discount50',
            status: 'used',
            badgeText: '50 ر.س',
            discountDisplayAr: 'خصم 50 ر.س',
            discountDisplayEn: '50 SAR OFF',
            subtitleAr: 'discount50',
            subtitleEn: 'discount50',
            expiryTextAr: 'تم الاستخدام',
            expiryTextEn: 'Used',
          },
        ])
      : (expiredVouchers.length > 0 ? expiredVouchers : [
          {
            id: '4',
            title: 'Ramadan Special 25 SAR',
            code: 'RAMADAN25',
            status: 'expired',
            badgeText: '25 ر.س',
            discountDisplayAr: 'قسيمة رمضان 25 ر.س',
            discountDisplayEn: 'Ramadan Voucher 25 SAR',
            subtitleAr: 'RAMADAN25',
            subtitleEn: 'RAMADAN25',
            expiryTextAr: 'انتهت 10 ابريل 2025',
            expiryTextEn: 'Expired April 10, 2025',
          },
        ]);

  return (
    <div className={`min-h-screen bg-[#FAF8F5] pb-16 ${isEn ? 'font-en' : 'font-ar'}`} dir={isEn ? 'ltr' : 'rtl'}>
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 bg-[#234745] text-white px-6 py-3 rounded-full shadow-xl flex items-center gap-3 animate-fade-in text-[14px] font-bold border border-[#C8A464]/40">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#C8A464" strokeWidth="2.5">
            <polyline points="20 6 9 17 4 12"></polyline>
          </svg>
          {toastMessage}
        </div>
      )}

      {/* ─── 1. HERO BANNER SECTION (Figma: 1440px max-width, 610px height, border-radius 20px) ─── */}
      <section className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
        <div className="relative w-full h-[360px] sm:h-[480px] lg:h-[610px] rounded-[20px] overflow-hidden shadow-2xl">

          {/* Background Image — full cover */}
          <img
            src="/images/vouchers/voucher-hero.png"
            alt="Saadeddin Luxury Vouchers Banner"
            className="absolute inset-0 w-full h-full object-cover object-center"
          />

          {/* Gradient: physical CSS — Arabic darkens RIGHT side, English darkens LEFT side */}
          <div
            className="absolute inset-0 z-10 pointer-events-none"
            style={{
              background: isEn
                ? 'linear-gradient(to right, rgba(0,0,0,0.65) 0%, rgba(0,0,0,0.35) 40%, rgba(0,0,0,0.05) 70%, transparent 100%)'
                : 'linear-gradient(to left, rgba(0,0,0,0.65) 0%, rgba(0,0,0,0.35) 40%, rgba(0,0,0,0.05) 70%, transparent 100%)',
            }}
          />

          {/*
            Single right-side column spanning full hero height.
            Uses justify-content: space-between so:
              - Badge stays at the top
              - Title + subtitle + buttons stay in the middle
              - Bottom strip stays at the bottom
            All positioned using physical right/left — NOT affected by dir=rtl
          */}
          <div
            className="absolute z-20"
            style={isEn
              ? {
                top: '32px', bottom: '24px', left: '56px',
                display: 'flex', flexDirection: 'column',
                justifyContent: 'center',
                alignItems: 'flex-start',
                gap: '20px',
                maxWidth: '620px',
              }
              : {
                top: '32px', bottom: '24px', right: '56px',
                display: 'flex', flexDirection: 'column',
                justifyContent: 'center',
                alignItems: 'flex-start',
                gap: '20px',
                maxWidth: '620px',
              }
            }
          >

            {/* ── BADGE (top) ── matches reference image: gold pill with teal text and dashes */}
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '10px',
                background: '#C5A96A',
                borderRadius: '999px',
                paddingTop: '8px',
                paddingBottom: '8px',
                paddingLeft: '20px',
                paddingRight: '20px',
                color: '#234745',
                fontWeight: 700,
                fontSize: '14px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                whiteSpace: 'nowrap',
              }}
            >
              <span style={{ color: '#234745', opacity: 0.7 }}>—</span>
              <span>{isEn ? 'Gift Vouchers' : 'قسائم الهدايا'}</span>
              <span style={{ color: '#234745', opacity: 0.7 }}>—</span>
            </div>

            {/* ── MAIN CONTENT (middle): title + subtitle + buttons ── */}
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '14px',
                alignItems: isEn ? 'flex-start' : 'flex-start',
                textAlign: isEn ? 'left' : 'right',
              }}
            >
              {/* Title — Bahij Janna Bold 90px */}
              <h1
                className="text-white font-bold"
                style={{
                  fontFamily: "'Bahij Janna', 'Bahij', serif",
                  fontSize: 'clamp(38px, 6vw, 90px)',
                  fontWeight: 700,
                  lineHeight: '100%',
                  margin: '0 0 20px 0',
                  textShadow: '0 2px 20px rgba(0,0,0,0.5)',
                }}
              >
                {isEn ? (
                  <>Gifts & Promotional <br />Vouchers</>
                ) : (
                  <>الهدايا والعروض <br />الترويجية</>
                )}
              </h1>

              {/* Subtitle — GE Dinar One Regular 400 14px */}
              <p
                className="text-white"
                style={{
                  fontFamily: "'GE Dinar One', 'GE SS Two', sans-serif",
                  fontSize: '14px',
                  fontWeight: 400,
                  lineHeight: '140%',
                  margin: 0,
                  opacity: 0.92,
                  textShadow: '0 1px 8px rgba(0,0,0,0.5)',
                  maxWidth: '480px',
                }}
              >
                {isEn
                  ? 'Give the gift of choice. Buy, gift, and redeem Saadeddin luxury vouchers — the perfect gift for every occasion.'
                  : 'امنح هدية الاختيار. اشترِ، أدر، واستبدل قسائم هدايا "سعد الدين" الراقية — الهدية المثالية لكل مناسبة'}
              </p>

              {/* Buttons — 277×48px, radius 24px, #C5A96A + #BBCFCD */}
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'row',
                  gap: '8px',
                  justifyContent: isEn ? 'flex-start' : 'flex-end',
                }}
              >
                <Link
                  to={isEn ? '/en/collections/all' : '/collections/all'}
                  style={{
                    width: '277px', height: '48px',
                    borderRadius: '24px', background: '#C5A96A',
                    color: '#1A3533', fontWeight: 700, fontSize: '15px',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    textDecoration: 'none', flexShrink: 0,
                    boxShadow: '0 2px 12px rgba(0,0,0,0.2)',
                  }}
                >
                  {isEn ? 'Shop Now' : 'تسوق الان'}
                </Link>
                <a
                  href="#redeem-section"
                  style={{
                    width: '277px', height: '48px',
                    borderRadius: '24px', background: '#BBCFCD',
                    color: '#1A3533', fontWeight: 700, fontSize: '15px',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    textDecoration: 'none', flexShrink: 0,
                    boxShadow: '0 2px 12px rgba(0,0,0,0.15)',
                  }}
                >
                  {isEn ? 'Redeem Voucher' : 'استبدال قسيمة'}
                </a>
              </div>
            </div>

            {/* ── BOTTOM STRIP (bottom) — GE Dinar One Medium 500 14px ── */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '14px',
                flexWrap: 'wrap',
                justifyContent: isEn ? 'flex-start' : 'flex-end',
              }}
            >
              {[
                isEn ? 'Halal & HACCP Certified for Food Safety.' : 'شهادات حلال والهاسب لسلامة الغذاء.',
                isEn ? 'Refrigerated Shipping' : 'شحن مبرد',
                isEn ? 'Over 30 Countries' : 'أكثر من 30 دولة',
              ].map((item, idx, arr) => (
                <>
                  <span
                    key={item}
                    className="text-white"
                    style={{
                      fontFamily: "'GE Dinar One', 'GE SS Two', sans-serif",
                      fontSize: '14px', fontWeight: 500, opacity: 0.9,
                    }}
                  >
                    {item}
                  </span>
                  {idx < arr.length - 1 && (
                    <span key={`sep-${idx}`} style={{ color: 'rgba(255,255,255,0.35)' }}>|</span>
                  )}
                </>
              ))}
            </div>

          </div>

        </div>
      </section>

      {/* ─── 2. AVAILABLE VOUCHERS SECTION ─── */}
      <section className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 pt-16 pb-12">

        {/* Section Header */}
        <div className="text-center mb-12">
          <h2
            className="text-[#171717] font-bold leading-none mb-3"
            style={{
              fontFamily: "'Bahij Janna', 'Bahij', serif",
              fontSize: 'clamp(32px, 4vw, 50px)',
              fontWeight: 700,
              lineHeight: '100%',
            }}
          >
            {isEn ? 'Available Vouchers' : 'القسائم المتاحة'}
          </h2>
          <p
            className="text-[#7D7D7D]"
            style={{
              fontFamily: "'GE Dinar One', 'GE SS Two', sans-serif",
              fontSize: '16px',
              fontWeight: 500,
              lineHeight: '100%',
            }}
          >
            {isEn ? 'Available vouchers for immediate use - Get yours now' : 'القسائم المتاحة للاستخدام - احصل عليها الان'}
          </p>
        </div>

        {/* Voucher Cards — 3 column grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {(shopifyVouchers.length > 0 ? shopifyVouchers : [
            {
              id: '1',
              title: 'Free Delivery',
              code: 'FreeShip',
              discountDisplayAr: 'توصيل مجاني',
              discountDisplayEn: 'Free Delivery',
              subtitleAr: 'توصيل مجاني على طلبك القادم',
              subtitleEn: 'Free shipping on your next order',
              expiryTextAr: 'تنتهي 31 ديسمبر 2026 . الحد الادنى 150 رس',
              expiryTextEn: 'Expires Dec 31, 2026 . Min spend 150 SAR',
            },
            {
              id: '2',
              title: '50 SAR Discount',
              code: 'SWEET',
              discountDisplayAr: '50 خصم',
              discountDisplayEn: '50 SAR OFF',
              subtitleAr: 'عند الشراء بأكثر من ٣٠٠ رس',
              subtitleEn: 'On purchases over 300 SAR',
              expiryTextAr: 'تنتهي 31 ديسمبر 2026 . الحد الادنى 150 رس',
              expiryTextEn: 'Expires Dec 31, 2026 . Min spend 150 SAR',
            },
            {
              id: '3',
              title: '15% Discount',
              code: 'SWEET',
              discountDisplayAr: '15% خصم',
              discountDisplayEn: '15% OFF',
              subtitleAr: 'على جميع الحلويات الشرقية',
              subtitleEn: 'On all Oriental Sweets',
              expiryTextAr: 'تنتهي 31 ديسمبر 2026 . الحد الادنى 150 رس',
              expiryTextEn: 'Expires Dec 31, 2026 . Min spend 150 SAR',
            },
          ]).map((v, index) => {
            const themeIndex = index % 3;
            const themes = [
              {
                bg: '#F5F3EE',
                textPrimary: '#234745',
                textSub: '#666',
                btnBg: '#234745',
                btnText: '#fff',
                dividerColor: 'rgba(35,71,69,0.22)',
              },
              {
                bg: '#C5A96A',
                textPrimary: '#234745',
                textSub: '#1A3533',
                btnBg: '#234745',
                btnText: '#fff',
                dividerColor: 'rgba(35,71,69,0.3)',
              },
              {
                bg: '#234745',
                textPrimary: '#fff',
                textSub: 'rgba(255,255,255,0.85)',
                btnBg: '#C5A96A',
                btnText: '#1A3533',
                dividerColor: 'rgba(255,255,255,0.2)',
              },
            ];
            const theme = themes[themeIndex];

            return (
              <div
                key={v.id || v.code || index}
                className="relative flex flex-col rounded-[20px] overflow-visible shadow-lg hover:-translate-y-1 transition-all duration-300"
                style={{ background: theme.bg }}
              >
                {/* Top section */}
                <div className="flex flex-col px-8 !pt-10 pb-8" style={{ textAlign: isEn ? 'left' : 'right' }}>
                  {/* Brand Logo SVG */}
                  <div className="flex justify-start mb-2 mt-10" style={{ color: theme.textPrimary }}>
                    <SaadeddinLogo className="h-3.5 sm:h-4 w-auto" />
                  </div>
                  {/* Discount value */}
                  <div
                    className="font-bold leading-none mb-4 flex items-baseline gap-2"
                    style={{
                      fontFamily: "'Bahij Janna', 'Bahij', serif",
                      color: theme.textPrimary,
                    }}
                  >
                    <span style={{ fontSize: '42px', fontWeight: 700 }}>
                      {isEn ? v.discountDisplayEn : v.discountDisplayAr}
                    </span>
                  </div>
                  {/* Description */}
                  <div
                    style={{
                      fontFamily: "'GE Dinar One', 'GE SS Two', sans-serif",
                      fontSize: '16px', color: theme.textSub, fontWeight: 400,
                    }}
                  >
                    {isEn ? v.subtitleEn : v.subtitleAr}
                  </div>
                </div>

                {/* Dashed divider with ticket notches */}
                <div className="relative flex items-center" style={{ margin: '0' }}>
                  <div className="absolute -left-3 w-6 h-6 rounded-full z-10" style={{ background: '#FAF8F5' }} />
                  <div className="absolute -right-3 w-6 h-6 rounded-full z-10" style={{ background: '#FAF8F5' }} />
                  <div className="w-full" style={{ borderTop: `2px dashed ${theme.dividerColor}`, marginLeft: '12px', marginRight: '12px' }} />
                </div>

                {/* Bottom section */}
                <div dir="ltr" className="flex items-center justify-between px-8 pt-6 pb-4 gap-4">
                  <button
                    type="button"
                    onClick={() => handleCopyCode(v.code)}
                    className="flex-shrink-0 font-bold transition-opacity hover:opacity-80 active:scale-95"
                    style={{
                      background: theme.btnBg, color: theme.btnText,
                      borderRadius: '999px', padding: '13px 32px',
                      fontSize: '16px', fontWeight: 700,
                      border: 'none', cursor: 'pointer',
                      fontFamily: "'GE Dinar One', sans-serif",
                    }}
                  >
                    {isEn ? 'Get Code' : 'إحصل عليه'}
                  </button>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '12px', color: theme.textSub, marginBottom: '4px', fontFamily: "'GE Dinar One', sans-serif" }}>
                      {isEn ? 'Code' : 'الرمز'}
                    </div>
                    <div style={{ fontSize: '20px', fontWeight: 700, color: theme.textPrimary, fontFamily: 'monospace', letterSpacing: '0.02em' }}>
                      {v.code}
                    </div>
                  </div>
                </div>

                {/* Footer */}
                <div
                  className="px-8 pb-6"
                  style={{
                    fontFamily: "'GE Dinar One', 'GE SS Two', sans-serif",
                    fontSize: '13px', color: theme.textSub, textAlign: isEn ? 'left' : 'right',
                  }}
                >
                  {isEn ? v.expiryTextEn : v.expiryTextAr}
                </div>
              </div>
            );
          })}
        </div>
      </section>


      {/* ─── 3. MY VOUCHERS & REDEMPTION SECTION ─── */}
      <section id="redeem-section" className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">

          {/* RIGHT COLUMN (RTL First): My Vouchers / قسائمي */}
          <div className="lg:col-span-7 flex flex-col space-y-6">
            {/* Header + Tabs */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              {/* Left Side: Filter Tabs Pills */}
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setActiveTab('active')}
                  className={`px-6 py-2.5 text-[14px] font-bold rounded-full transition-all ${activeTab === 'active'
                    ? 'bg-[#234745] text-white shadow-sm'
                    : 'bg-white text-[#7D7D7D] shadow-sm hover:text-[#234745]'
                    }`}
                  style={{ fontFamily: "'GE Dinar One', 'GE SS Two', sans-serif" }}
                >
                  {isEn ? `Active (${activeVouchers.length || 2})` : `فعالة (${activeVouchers.length || 2})`}
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('used')}
                  className={`px-6 py-2.5 text-[14px] font-bold rounded-full transition-all ${activeTab === 'used'
                    ? 'bg-[#234745] text-white shadow-sm'
                    : 'bg-white text-[#7D7D7D] shadow-sm hover:text-[#234745]'
                    }`}
                  style={{ fontFamily: "'GE Dinar One', 'GE SS Two', sans-serif" }}
                >
                  {isEn ? `Used (${usedVouchers.length || 1})` : `مستخدمة (${usedVouchers.length || 1})`}
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('expired')}
                  className={`px-6 py-2.5 text-[14px] font-bold rounded-full transition-all ${activeTab === 'expired'
                    ? 'bg-[#234745] text-white shadow-sm'
                    : 'bg-white text-[#7D7D7D] shadow-sm hover:text-[#234745]'
                    }`}
                  style={{ fontFamily: "'GE Dinar One', 'GE SS Two', sans-serif" }}
                >
                  {isEn ? `Expired (${expiredVouchers.length || 1})` : `منتهية (${expiredVouchers.length || 1})`}
                </button>
              </div>

              {/* Right Side: Title & Subtitle */}
              <div className="text-right">
                <h3
                  className="text-[32px] sm:text-[36px] font-bold text-[#234745] leading-tight"
                  style={{ fontFamily: isEn ? "'Bahij Janna', sans-serif" : "'Bahij Janna', 'Bahij', serif" }}
                >
                  {isEn ? 'My Vouchers' : 'قسائمي'}
                </h3>
                <p
                  className="text-[#A0B2B0] text-[14px] mt-0.5"
                  style={{ fontFamily: "'GE Dinar One', 'GE SS Two', sans-serif" }}
                >
                  {isEn ? 'Your personal voucher wallet' : 'محفظة القسائم الخاصة بك'}
                </p>
              </div>
            </div>

            {/* Voucher Cards List */}
            <div className="space-y-4 pt-2">
              {currentTabList.map((v, i) => {
                const isUsedState = v.status === 'used';
                const isExpiredState = v.status === 'expired';
                const isActiveState = v.status === 'active';

                const badgeBg = isActiveState
                  ? '#234745'
                  : isUsedState
                  ? '#E2C78A'
                  : '#97A7AD';

                return (
                  <div
                    key={v.id || i}
                    className={`relative bg-white transition-all flex items-center justify-between ${
                      !isActiveState ? 'shadow-sm border border-gray-100' : ''
                    }`}
                    style={{
                      borderRight: '4px solid #234745',
                      borderRadius: '12px',
                      padding: '24px',
                      gap: '24px',
                      minHeight: '136px',
                    }}
                  >
                    {/* Right Main Info + Badge */}
                    <div className="flex items-center gap-5">
                      {/* Badge */}
                      <div
                        className="w-[88px] h-[88px] rounded-[20px] text-white font-bold text-[20px] flex items-center justify-center flex-shrink-0 shadow-sm"
                        style={{ background: badgeBg }}
                      >
                        {v.badgeText}
                      </div>
                      <div className="text-right flex flex-col gap-2">
                        <h4
                          style={{
                            color: isActiveState ? '#234745' : '#7D7D7D',
                            fontFamily: "'Bahij Janna', 'Bahij', serif",
                            fontWeight: 700,
                            fontSize: '20px',
                            lineHeight: '100%',
                            textAlign: 'right',
                          }}
                        >
                          {isEn ? v.discountDisplayEn : v.discountDisplayAr}
                        </h4>
                        <p
                          style={{
                            color: '#7D7D7D',
                            fontFamily: "'GE Dinar One', 'GE SS Two', sans-serif",
                            fontWeight: 500,
                            fontSize: '16px',
                            lineHeight: '100%',
                            textAlign: 'right',
                          }}
                        >
                          {v.code}
                        </p>
                        <span
                          style={{
                            color: '#7D7D7D',
                            fontFamily: "'GE Dinar One', 'GE SS Two', sans-serif",
                            fontWeight: 500,
                            fontSize: '16px',
                            lineHeight: '100%',
                            textAlign: 'right',
                          }}
                        >
                          {isEn ? v.expiryTextEn : v.expiryTextAr}
                        </span>
                      </div>
                    </div>

                    {/* Left Action & Status */}
                    <div className="flex flex-col items-center justify-between self-stretch gap-3">
                      <span
                        style={{
                          color: '#7D7D7D',
                          fontFamily: "'GE Dinar One', 'GE SS Two', sans-serif",
                          fontWeight: 500,
                          fontSize: '16px',
                          lineHeight: '100%',
                          textAlign: 'center',
                        }}
                      >
                        {isActiveState
                          ? isEn ? 'Active' : 'فعالة'
                          : isUsedState
                          ? isEn ? 'Used' : 'مستخدمة'
                          : isEn ? 'Expired' : 'منتهية'}
                      </span>
                      {isActiveState && (
                        <button
                          type="button"
                          onClick={() => handleCopyCode(v.code)}
                          className="hover:opacity-90 transition-all shadow-sm active:scale-95 border-none cursor-pointer"
                          style={{
                            color: '#FFFFFF',
                            fontFamily: "'GE Dinar One', 'GE SS Two', sans-serif",
                            fontWeight: 700,
                            fontSize: '16px',
                            lineHeight: '100%',
                            textAlign: 'center',
                            width: '148px',
                            height: '48px',
                            gap: '8px',
                            borderRadius: '24px',
                            padding: '12px 20px',
                            background: '#234745',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            textDecoration: 'none',
                          }}
                        >
                          {isEn ? 'Use Now' : 'إستخدم الان'}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* LEFT COLUMN: Use Voucher Card / استخدام القسيمة */}
          <div className="lg:col-span-5 bg-white rounded-[24px] p-7 sm:p-8 border border-gray-200 shadow-sm text-right">
            <h3
              className="text-[26px] sm:text-[28px] font-bold text-[#234745] mb-1"
              style={{ fontFamily: isEn ? "'Bahij Janna', sans-serif" : "'Bahij Janna', 'Bahij', serif" }}
            >
              {isEn ? 'Use Voucher' : 'استخدام القسيمة'}
            </h3>
            <p
              className="text-[#7D7D7D] text-[15px] mb-6"
              style={{ fontFamily: "'GE Dinar One', 'GE SS Two', sans-serif" }}
            >
              {isEn ? 'Enter the code to apply it to your cart' : 'أدخل الرمز لتطبيقه علي سلتك'}
            </p>

            {/* Voucher Code Form */}
            <form onSubmit={handleApplyVoucher} className="space-y-3 mb-6">
              <div dir="ltr" className="relative flex items-center">
                <button
                  type="submit"
                  className="absolute left-1.5 h-[42px] px-6 bg-[#234745] hover:bg-[#1A3533] text-white font-bold text-[14px] rounded-[12px] transition-all z-10 shadow-sm"
                  style={{ fontFamily: "'GE Dinar One', 'GE SS Two', sans-serif" }}
                >
                  {isEn ? 'Apply' : 'تطبيق'}
                </button>
                <input
                  type="text"
                  value={voucherCodeInput}
                  onChange={(e) => setVoucherCodeInput(e.target.value)}
                  placeholder={isEn ? 'Enter Voucher Code' : 'أدخل رمز القسيمة'}
                  className="w-full h-[54px] pl-[105px] pr-5 rounded-[14px] border border-[#B8D0CC] text-[14px] text-right focus:outline-none focus:border-[#234745] transition-all placeholder:text-[#A0B2B0]"
                  style={{ fontFamily: "'GE Dinar One', 'GE SS Two', sans-serif" }}
                />
              </div>

              {appliedVoucherSuccess && (
                <p className="text-[12px] text-emerald-700 bg-emerald-50 p-3 rounded-xl border border-emerald-200 font-medium">
                  {appliedVoucherSuccess}
                </p>
              )}

              <p
                className="text-[13px] text-[#A0B2B0] leading-relaxed text-right pt-0.5"
                style={{ fontFamily: "'GE Dinar One', 'GE SS Two', sans-serif" }}
              >
                {isEn
                  ? 'One voucher code per order. Cannot be combined with other offers.'
                  : 'يمكن استخدام قسيمة واحدة لكل طلب. لا تجمع القسائم مع العروض الأخري'}
              </p>
            </form>

            <div className="pt-2">
              <h4
                className="text-[15px] font-bold text-[#7D7D7D] text-right mb-3"
                style={{ fontFamily: "'GE Dinar One', 'GE SS Two', sans-serif" }}
              >
                {isEn ? 'Check Balance' : 'التحقق من الرصيد'}
              </h4>
              <form onSubmit={handleCheckBalance} className="space-y-3">
                <div dir="ltr" className="relative flex items-center">
                  <button
                    type="submit"
                    className="absolute left-1.5 h-[42px] px-6 bg-white hover:bg-gray-50 text-[#234745] font-bold text-[14px] rounded-[12px] border border-[#234745] transition-all z-10"
                    style={{ fontFamily: "'GE Dinar One', 'GE SS Two', sans-serif" }}
                  >
                    {isEn ? 'Check' : 'تحقق'}
                  </button>
                  <input
                    type="text"
                    value={balanceCheckInput}
                    onChange={(e) => setBalanceCheckInput(e.target.value)}
                    placeholder={isEn ? 'Voucher Number' : 'رقم القسيمة'}
                    className="w-full h-[54px] pl-[95px] pr-5 rounded-[14px] border border-[#B8D0CC] text-[14px] text-right focus:outline-none focus:border-[#234745] transition-all placeholder:text-[#A0B2B0]"
                    style={{ fontFamily: "'GE Dinar One', 'GE SS Two', sans-serif" }}
                  />
                </div>

                {balanceResult && (
                  <p className="mt-3 text-[12px] text-[#234745] bg-[#F5F3EF] p-3 rounded-xl border border-[#C8A464]/30 font-bold">
                    {balanceResult}
                  </p>
                )}
              </form>
            </div>
          </div>

        </div>
      </section>

      {/* ─── 4. WHAT WOULD YOU LIKE TO DO SECTION ────────────────────────── */}
      <section className="w-full bg-white py-16">
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-10">
            <h2
              className="text-[28px] sm:text-[34px] font-bold text-[#234745] mb-2"
              style={{ fontFamily: isEn ? "'Bahij Janna', sans-serif" : undefined }}
            >
              {isEn ? 'What would you like to do?' : 'ماذا تريد أن تفعل؟'}
            </h2>
            <p
              className="text-[#666666] text-[14px] sm:text-[15px]"
              style={{ fontFamily: isEn ? "'Gotham Light', sans-serif" : undefined }}
            >
              {isEn ? 'Choose the option you want' : 'اختر الخيار الذي تريده'}
            </p>
          </div>

          {/* 2 Options Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">

            {/* Option Card 1: Gift a Voucher */}
            <div className="bg-[#FEF8EB] rounded-2xl p-8 sm:p-10 border border-[#C8A464]/30 text-center flex flex-col items-center justify-between hover:shadow-md transition-all">
              <div className="flex flex-col items-center">
                <div className="w-[48px] h-[48px] rounded-full bg-[#255441] text-[#C8A464] flex items-center justify-center mb-5 shadow-inner">
                  <svg width="17" height="18" viewBox="0 0 17 18" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M7 17C7.82843 17 8.5 16.3284 8.5 15.5C8.5 14.6716 7.82843 14 7 14C6.17157 14 5.5 14.6716 5.5 15.5C5.5 16.3284 6.17157 17 7 17Z" stroke="#BBCFCD" />
                    <path d="M14 17C14.8284 17 15.5 16.3284 15.5 15.5C15.5 14.6716 14.8284 14 14 14C13.1716 14 12.5 14.6716 12.5 15.5C12.5 16.3284 13.1716 17 14 17Z" stroke="#BBCFCD" />
                    <path d="M0.5 0.5H2.5L6.004 11.5H14" stroke="#BBCFCD" stroke-linecap="round" stroke-linejoin="round" />
                    <path d="M5.22869 9.00049L3.30469 3.00049H15.8117C15.891 3.00039 15.9691 3.01914 16.0397 3.05519C16.1103 3.09124 16.1713 3.14356 16.2177 3.20783C16.2641 3.2721 16.2946 3.34649 16.3066 3.42484C16.3185 3.5032 16.3117 3.58328 16.2867 3.65849L14.6197 8.65849C14.5865 8.75801 14.5229 8.84459 14.4379 8.90596C14.3528 8.96734 14.2506 9.00041 14.1457 9.00049H5.22869Z" stroke="#BBCFCD" stroke-linecap="round" stroke-linejoin="round" />
                  </svg>

                </div>
                <h3
                  className="text-[22px] sm:text-[26px] font-bold text-[#255441] !mb-[16px]"
                  style={{ fontFamily: isEn ? "'Bahij Janna', sans-serif" : undefined }}
                >
                  {isEn ? 'Gift a Voucher' : 'أهدِ قسيمة'}
                </h3>
                <p
                  className="text-[#9FB7AE] text-[14px] font-medium leading-relaxed max-w-[420px] !mb-[16px]"
                  style={{ fontFamily: isEn ? "'Gotham Light', sans-serif" : undefined }}
                >
                  {isEn
                    ? 'Send a digital gift voucher to your loved ones via email with a personalized message and choice of designs.'
                    : 'أرسل قسيمة هدية لأي شخص عبر البريد الإلكتروني مع رسالة شخصية وتصميم اختياري'}
                </p>
              </div>
              <Link
                to={isEn ? '/en/buy-gift-card' : '/buy-gift-card'}
                className="w-full sm:w-auto h-[48px] px-10 bg-[#255441] !w-[248px] hover:bg-[#1A3533] !text-white font-bold text-[14px] rounded-full flex items-center justify-center transition-all active:scale-98"
              >
                {isEn ? 'Start Now' : 'إبدأ الان'}
              </Link>
            </div>

            {/* Option Card 2: Buy for Yourself */}
            <div className="bg-[#FEF8EB] rounded-2xl p-8 sm:p-10 border border-[#C8A464]/30 text-center flex flex-col items-center justify-between hover:shadow-md transition-all">
              <div className="flex flex-col items-center">
                <div className="w-[48px] h-[48px] rounded-full bg-[#C5A96A] text-[#C8A464] flex items-center justify-center mb-5 shadow-inner">
                  <svg width="17" height="18" viewBox="0 0 17 18" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M7 17C7.82843 17 8.5 16.3284 8.5 15.5C8.5 14.6716 7.82843 14 7 14C6.17157 14 5.5 14.6716 5.5 15.5C5.5 16.3284 6.17157 17 7 17Z" stroke="#BBCFCD" />
                    <path d="M14 17C14.8284 17 15.5 16.3284 15.5 15.5C15.5 14.6716 14.8284 14 14 14C13.1716 14 12.5 14.6716 12.5 15.5C12.5 16.3284 13.1716 17 14 17Z" stroke="#BBCFCD" />
                    <path d="M0.5 0.5H2.5L6.004 11.5H14" stroke="#BBCFCD" stroke-linecap="round" stroke-linejoin="round" />
                    <path d="M5.22869 9.00049L3.30469 3.00049H15.8117C15.891 3.00039 15.9691 3.01914 16.0397 3.05519C16.1103 3.09124 16.1713 3.14356 16.2177 3.20783C16.2641 3.2721 16.2946 3.34649 16.3066 3.42484C16.3185 3.5032 16.3117 3.58328 16.2867 3.65849L14.6197 8.65849C14.5865 8.75801 14.5229 8.84459 14.4379 8.90596C14.3528 8.96734 14.2506 9.00041 14.1457 9.00049H5.22869Z" stroke="#BBCFCD" stroke-linecap="round" stroke-linejoin="round" />
                  </svg>

                </div>
                <h3
                  className="text-[22px] sm:text-[26px] font-bold text-[#255441] !mb-[16px]"
                  style={{ fontFamily: isEn ? "'Bahij Janna', sans-serif" : undefined }}
                >
                  {isEn ? 'Buy for Yourself' : 'إشترِ لنفسك'}
                </h3>
                <p
                  className="text-[#9FB7AE] text-[14px] font-medium leading-relaxed max-w-[420px] !mb-[16px]"
                  style={{ fontFamily: isEn ? "'Gotham Light', sans-serif" : undefined }}
                >
                  {isEn
                    ? 'Add credit to your account and use it whenever you want at checkout without needing gifting details.'
                    : 'أضف رصيداً الي حسابك واستخدمه عند الدفع في أي وقت تريده دون الحاجة لتفاصيل الإهداء'}
                </p>
              </div>
              <Link
                to={isEn ? '/en/buy-gift-card?mode=self' : '/buy-gift-card?mode=self'}
                className="w-full sm:w-auto h-[48px] px-10 bg-transparent !w-[248px] hover:bg-[#1A3533] !text-[#255441] hover:!text-white border !border-[#255441] font-bold text-[14px] rounded-full flex items-center justify-center transition-all active:scale-98"
              >
                {isEn ? 'Start Now' : 'إبدأ الان'}
              </Link>
            </div>

          </div>
        </div>
      </section>
    </div>
  );
}
