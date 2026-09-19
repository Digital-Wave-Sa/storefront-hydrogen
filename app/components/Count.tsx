import {countParts, type CountForms} from '~/lib/plural';

/**
 * A count and its noun, agreeing in whichever language is on screen.
 *
 * The digits keep their Latin face — Arabic copy across the storefront sets
 * numerals in `font-en` — and disappear entirely where Arabic states the
 * count in the word instead («منتج واحد», «منتجان»). See `~/lib/plural`.
 */
export function Count({
  n,
  forms,
  isEn,
  digitClassName = 'font-en',
}: {
  n: number;
  forms: CountForms;
  isEn: boolean;
  digitClassName?: string;
}) {
  const {number, noun} = countParts(n, isEn, forms);
  if (!number) return <>{noun}</>;
  return (
    <>
      <span className={digitClassName}>{number}</span> {noun}
    </>
  );
}
