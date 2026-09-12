/**
 * What a configured cake costs.
 *
 * ── Why this file holds no numbers ──
 *
 * Not one riyal is written here. Every amount arrives in the `CakePriceBook`
 * that the client maintains in Shopify admin, and this module only does the
 * arithmetic on it. That separation is the whole point: when the price list
 * finally lands, it is data entry in admin, not a commit and a deploy from us.
 *
 * The pricing model the client chose:
 *
 *     total = format base + filling + decoration + photo print + writing
 *
 * Extras are FLAT — the same filling adds the same amount to a 15 cm cake as
 * to a 50 cm one. If they ever want extras to scale with size, that is a
 * change to this function and to the shape of the price book, and it is the
 * one change here that is genuinely expensive. It was chosen deliberately.
 *
 * The coating colour is free and has no row. The schema keeps an optional slot
 * for it so that charging for colour later costs a line here rather than a
 * migration, but nothing populates it today.
 *
 * ── The rule that matters ──
 *
 * A price that is not in the book is NOT zero. It is missing, and `priceCake`
 * says so in `missing` rather than quietly selling a cake for less than it
 * costs to make. Callers must refuse to add to cart while `missing` is
 * non-empty. Seeding every row at zero (see the metaobject seeding steps) then
 * makes the two states distinguishable: a row holding 0 is the client saying
 * "free", an absent row is something broken.
 */

/** Amounts are in SAR. Kept as numbers, summed in halalas — see `toHalalas`. */
export type CakePriceBook = {
  /** ISO currency of every amount below. The store is SAR-only today. */
  currency: string;
  /**
   * Whether the amounts already include the 15% VAT, matching how the rest of
   * the store is priced (`taxesIncluded: true` shop-wide). The client must
   * answer this on the price sheet — entering ex-VAT numbers into a tax-
   * inclusive store undercharges by 15% on every cake, silently.
   */
  taxIncluded: boolean;
  /** Keyed by format id, e.g. `round-20x20-h8`. All 23 must be present. */
  formats: Record<string, number>;
  /** Keyed by flavour id, e.g. `07`. All 10 must be present. */
  fillings: Record<string, number>;
  /** Keyed by decoration id, e.g. `rose-garden`. All 16, including `none`. */
  decorations: Record<string, number>;
  /** Charged when the shopper uploads a photo, and when they write a message. */
  extras: {photoPrint: number; writing: number};
  /** Unused today. Present so charging per colour later is additive. */
  colors?: Record<string, number>;
  /** When the book was last read, for cache reporting. */
  fetchedAt?: string;
};

export type CakeSelection = {
  format: string;
  flavor: string;
  decoration: string;
  /** True once the shopper has actually uploaded an image. */
  hasPhoto: boolean;
  /** The message written on the cake. Whitespace only counts as no message. */
  message: string;
  color?: string;
};

export type PriceLine = {
  /** Stable machine key, safe to send to the CRM or put on a line item. */
  key: string;
  labelAr: string;
  labelEn: string;
  /** SAR. Always a real number — a line is omitted rather than left null. */
  amount: number;
};

export type CakePrice = {
  lines: PriceLine[];
  total: number;
  currency: string;
  taxIncluded: boolean;
  /**
   * Human-readable reasons this quote cannot be trusted. Empty means the
   * quote is complete. Anything else means DO NOT let the shopper buy: show
   * "السعر غير متوفر حالياً" and disable add-to-cart.
   */
  missing: string[];
};

/**
 * Money in halalas, so that 180.10 + 25.20 is 205.30 and not 205.29999999.
 * Every intermediate sum stays an integer; only the final total converts back.
 */
const toHalalas = (sar: number) => Math.round(sar * 100);
const toSar = (halalas: number) => halalas / 100;

/** A price is usable if it is a finite number that is not negative. */
const isUsable = (v: unknown): v is number =>
  typeof v === 'number' && Number.isFinite(v) && v >= 0;

export function priceCake(
  selection: CakeSelection,
  book: CakePriceBook | null,
): CakePrice {
  const lines: PriceLine[] = [];
  const missing: string[] = [];

  if (!book) {
    return {
      lines: [],
      total: 0,
      currency: 'SAR',
      taxIncluded: true,
      missing: ['price book unavailable'],
    };
  }

  let halalas = 0;

  // ── Base: the format ────────────────────────────────────────────────────
  //
  // The only line that may not be zero. A free filling or a free decoration is
  // a plausible commercial choice; a cake that costs nothing never is, so a
  // zero base is treated as unset rather than as a giveaway.
  const base = book.formats?.[selection.format];
  if (!isUsable(base) || base === 0) {
    missing.push(`format price missing or zero: ${selection.format}`);
  } else {
    halalas += toHalalas(base);
    lines.push({
      key: `format:${selection.format}`,
      labelAr: 'القالب',
      labelEn: 'Cake size',
      amount: base,
    });
  }

  // ── Filling ─────────────────────────────────────────────────────────────
  const filling = book.fillings?.[selection.flavor];
  if (!isUsable(filling)) {
    missing.push(`filling price missing: ${selection.flavor}`);
  } else if (filling > 0) {
    halalas += toHalalas(filling);
    lines.push({
      key: `filling:${selection.flavor}`,
      labelAr: 'الحشوة',
      labelEn: 'Filling',
      amount: filling,
    });
  }

  // ── Decoration ──────────────────────────────────────────────────────────
  //
  // `none` is a real decoration id with its own row, normally zero. It is
  // looked up like any other so that a deleted row is caught here rather than
  // becoming an invisible free upgrade.
  const decoration = book.decorations?.[selection.decoration];
  if (!isUsable(decoration)) {
    missing.push(`decoration price missing: ${selection.decoration}`);
  } else if (decoration > 0) {
    halalas += toHalalas(decoration);
    lines.push({
      key: `decoration:${selection.decoration}`,
      labelAr: 'التزيين',
      labelEn: 'Decoration',
      amount: decoration,
    });
  }

  // ── Extras ──────────────────────────────────────────────────────────────
  //
  // Charged only when the shopper actually used them. Both are seeded at zero
  // while the client decides, so today these add nothing and no line appears —
  // and the day they set a number, it starts charging with no code change.
  const photo = book.extras?.photoPrint;
  if (!isUsable(photo)) {
    missing.push('photo print price missing');
  } else if (selection.hasPhoto && photo > 0) {
    halalas += toHalalas(photo);
    lines.push({
      key: 'extra:photo',
      labelAr: 'طباعة صورة',
      labelEn: 'Photo print',
      amount: photo,
    });
  }

  const writing = book.extras?.writing;
  if (!isUsable(writing)) {
    missing.push('writing price missing');
  } else if (selection.message.trim().length > 0 && writing > 0) {
    halalas += toHalalas(writing);
    lines.push({
      key: 'extra:writing',
      labelAr: 'الكتابة على الكيك',
      labelEn: 'Cake writing',
      amount: writing,
    });
  }

  // ── Colour ──────────────────────────────────────────────────────────────
  //
  // Absent by design. Unlike every lookup above, an absent colour map is not a
  // fault: it means colour is free, which is the current commercial rule.
  if (book.colors && selection.color) {
    const colour = book.colors[selection.color];
    if (isUsable(colour) && colour > 0) {
      halalas += toHalalas(colour);
      lines.push({
        key: `color:${selection.color}`,
        labelAr: 'لون التغطية',
        labelEn: 'Coating colour',
        amount: colour,
      });
    }
  }

  return {
    lines,
    total: missing.length ? 0 : toSar(halalas),
    currency: book.currency || 'SAR',
    taxIncluded: book.taxIncluded !== false,
    missing,
  };
}

/**
 * Every key the price book must contain, derived from the builder's own
 * catalog rather than retyped here — so adding a filling to the catalog
 * automatically makes its missing price an error instead of a silent zero.
 *
 * Pass the catalog (the same object the builder loads) and get back the list
 * of keys to seed. Used by the seeding script and by a startup check.
 */
export function requiredPriceKeys(catalog: {
  formats: Array<{id: string}>;
  flavors: Array<{id: string}>;
}, decorationIds: string[]): {
  formats: string[];
  fillings: string[];
  decorations: string[];
  extras: string[];
} {
  return {
    formats: catalog.formats.map((f) => f.id),
    fillings: catalog.flavors.map((f) => f.id),
    decorations: [...decorationIds],
    extras: ['photoPrint', 'writing'],
  };
}

/**
 * Does this book cover everything the catalog offers?
 *
 * Worth running on deploy and surfacing in an admin health check, because the
 * failure it catches — a filling added to the builder but never priced — looks
 * fine in every test that happens to pick a priced filling.
 */
export function auditPriceBook(
  book: CakePriceBook | null,
  required: ReturnType<typeof requiredPriceKeys>,
): string[] {
  if (!book) return ['price book unavailable'];
  const gaps: string[] = [];
  for (const id of required.formats) {
    if (!isUsable(book.formats?.[id]) || book.formats[id] === 0)
      gaps.push(`format:${id}`);
  }
  for (const id of required.fillings) {
    if (!isUsable(book.fillings?.[id])) gaps.push(`filling:${id}`);
  }
  for (const id of required.decorations) {
    if (!isUsable(book.decorations?.[id])) gaps.push(`decoration:${id}`);
  }
  if (!isUsable(book.extras?.photoPrint)) gaps.push('extra:photoPrint');
  if (!isUsable(book.extras?.writing)) gaps.push('extra:writing');
  return gaps;
}
