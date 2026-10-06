import {formatPreorderDate, type PreorderInfo} from '~/lib/preorder';

/**
 * Product-page box for pre-order products: when it can be delivered/picked up,
 * until when it can be ordered, and the two rules (online payment, separate
 * order). See ~/lib/preorder.
 */
export function PreorderNotice({info, isEn}: {info: PreorderInfo; isEn: boolean}) {
  if (!info.isPreorder) return null;
  const font = {fontFamily: "'EnglishDigits', 'GE Dinar One', sans-serif"};

  if (info.closed) {
    return (
      <div className="w-full rounded-2xl border border-[#E64950]/30 bg-[#FDF1F1] p-4 text-[#9B2C2C]" style={font}>
        <p className="m-0 text-[14px] font-bold">
          {isEn ? 'Pre-orders for this product are closed' : 'انتهى الطلب المسبق لهذا المنتج'}
        </p>
      </div>
    );
  }

  const lines: string[] = [];
  if (info.earliestDate) {
    lines.push(
      isEn
        ? `Ready for delivery or pickup from ${formatPreorderDate(info.earliestDate, true)}.`
        : `جاهز للتوصيل أو الاستلام ابتداءً من ${formatPreorderDate(info.earliestDate, false)}.`,
    );
  }
  if (info.until) {
    lines.push(
      isEn
        ? `Order by ${formatPreorderDate(info.until, true)}.`
        : `آخر موعد للطلب: ${formatPreorderDate(info.until, false)}.`,
    );
  }
  lines.push(
    isEn
      ? 'Paid online, and ordered separately from other products.'
      : 'الدفع إلكترونياً، ويُطلب بشكل منفصل عن المنتجات الأخرى.',
  );

  return (
    <div className="w-full rounded-2xl border border-[#906B51]/30 bg-[#FEF8EB] p-4 text-[#234745]" style={font}>
      <p className="m-0 mb-1 text-[15px] font-bold text-[#906B51]">
        {isEn ? 'Pre-order' : 'طلب مسبق'}
      </p>
      {lines.map((l) => (
        <p key={l} className="m-0 text-[13px] leading-[22px]">
          {l}
        </p>
      ))}
    </div>
  );
}
