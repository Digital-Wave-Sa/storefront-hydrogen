/**
 * Counting things, in a language that counts them in six ways.
 *
 * English pluralises on one axis — one, or not one — and every counted label
 * in the storefront was written for that axis: a number, a space, and a word
 * that was always the plural. In Arabic the noun after a numeral changes with
 * the numeral, and at one and two it swallows the numeral entirely:
 *
 *     0        لا منتجات
 *     1        منتج واحد          (no numeral)
 *     2        منتجان             (no numeral)
 *     3 - 10   ٣ منتجات           plural
 *     11 - 99  ٨٠ طلبًا            singular, accusative
 *     100 +    ١٠٠ منتج           singular, genitive
 *
 * So an order with one cake announced itself as «1 منتجات» and an account
 * with eighty orders as «80 طلبات» — the 3-10 form applied to every count,
 * which is the mistake an Arabic reader notices first and trusts least.
 *
 * The boundaries are CLDR's for `ar`, computed here rather than through
 * `Intl.PluralRules` so the answer is identical on the worker, in the browser
 * and in a test, whatever ICU data the runtime happens to carry.
 */

export type PluralCategory = 'zero' | 'one' | 'two' | 'few' | 'many' | 'other';

/** Which of the six forms a count takes in Arabic. */
export function arabicCategory(count: number): PluralCategory {
  const n = Math.abs(Math.trunc(count));
  if (n === 0) return 'zero';
  if (n === 1) return 'one';
  if (n === 2) return 'two';
  const mod = n % 100;
  if (mod >= 3 && mod <= 10) return 'few';
  if (mod >= 11 && mod <= 99) return 'many';
  return 'other';
}

export type CountForms = {
  en: {one: string; other: string};
  /**
   * `zero`, `one` and `two` are whole phrases: Arabic states the count in the
   * word, so printing a numeral beside them says it twice. The rest are the
   * noun alone, to follow a numeral.
   */
  ar: {
    zero: string;
    one: string;
    two: string;
    few: string;
    many: string;
    other: string;
  };
};

export const PRODUCTS: CountForms = {
  en: {one: 'Product', other: 'Products'},
  ar: {
    zero: 'لا منتجات',
    one: 'منتج واحد',
    two: 'منتجان',
    few: 'منتجات',
    many: 'منتجًا',
    other: 'منتج',
  },
};

export const ORDERS: CountForms = {
  en: {one: 'Order', other: 'Orders'},
  ar: {
    zero: 'لا طلبات',
    one: 'طلب واحد',
    two: 'طلبان',
    few: 'طلبات',
    many: 'طلبًا',
    other: 'طلب',
  },
};

export const ADDRESSES: CountForms = {
  en: {one: 'Address', other: 'Addresses'},
  ar: {
    zero: 'لا عناوين',
    one: 'عنوان واحد',
    two: 'عنوانان',
    few: 'عناوين',
    many: 'عنوانًا',
    other: 'عنوان',
  },
};

export const BRANCHES: CountForms = {
  en: {one: 'Branch', other: 'Branches'},
  ar: {
    zero: 'لا فروع',
    one: 'فرع واحد',
    two: 'فرعان',
    few: 'فروع',
    many: 'فرعًا',
    other: 'فرع',
  },
};

export const REVIEWS: CountForms = {
  en: {one: 'review', other: 'reviews'},
  ar: {
    zero: 'لا مراجعات',
    one: 'مراجعة واحدة',
    two: 'مراجعتان',
    few: 'مراجعات',
    many: 'مراجعةً',
    other: 'مراجعة',
  },
};

export const POINTS: CountForms = {
  en: {one: 'Point', other: 'Points'},
  ar: {
    zero: 'لا نقاط',
    one: 'نقطة واحدة',
    two: 'نقطتان',
    few: 'نقاط',
    many: 'نقطة',
    other: 'نقطة',
  },
};

/**
 * The numeral and the noun, separately.
 *
 * `number` is null where the language carries the count in the word, so a
 * caller that styles its digits — most of them wrap numerals in `font-en` to
 * keep Latin figures inside Arabic text — can skip the span rather than
 * render an empty one. `<Count>` in `~/components/Count` does exactly that.
 */
export function countParts(
  count: number,
  isEn: boolean,
  forms: CountForms,
): {number: string | null; noun: string} {
  const n = Math.max(0, Math.trunc(Number(count) || 0));

  if (isEn) {
    return {
      number: n.toLocaleString('en-US'),
      noun: n === 1 ? forms.en.one : forms.en.other,
    };
  }

  const category = arabicCategory(n);
  const carriesTheCount =
    category === 'zero' || category === 'one' || category === 'two';
  return {
    number: carriesTheCount ? null : n.toLocaleString('en-US'),
    noun: forms.ar[category],
  };
}

/** The same thing as one string, for labels and attributes. */
export function counted(
  count: number,
  isEn: boolean,
  forms: CountForms,
): string {
  const {number, noun} = countParts(count, isEn, forms);
  return number ? `${number} ${noun}` : noun;
}
