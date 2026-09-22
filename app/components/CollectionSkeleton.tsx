/**
 * Placeholders shaped like the collection listing, for the moment between a
 * click and the products arriving.
 *
 * Two uses:
 *   - `ProductGridSkeleton` replaces the grid inside a collection page while a
 *     filter, sort, category or search is loading. The sidebar and header stay
 *     put; only what is about to change is blanked.
 *   - `CollectionPageSkeleton` stands in for the whole page when arriving from
 *     elsewhere (root.tsx), the way ProductSkeleton does for product pages.
 *
 * The card mirrors ProductItem's grid card: #F9F9F9 ground, 20px radius, a 4:3
 * image, one title line, a price line and a full-width pill button. Same
 * dimensions, so nothing jumps when the real cards replace these.
 */

function Bar({className = ''}: {className?: string}) {
  return <div className={`bg-[#E9E4DC] rounded-full ${className}`} />;
}

export function ProductCardSkeleton({view = 'grid'}: {view?: 'grid' | 'list'}) {
  if (view === 'list') {
    return (
      <div className="flex items-center gap-6 p-4 md:p-6 bg-white border border-gray-100 rounded-3xl">
        <div className="w-32 h-32 md:w-48 md:h-48 bg-[#F1ECE4] rounded-2xl shrink-0" />
        <div className="flex-1 flex flex-col gap-3">
          <Bar className="h-4 w-2/3" />
          <Bar className="h-4 w-1/4" />
          <Bar className="h-[44px] w-[150px] mt-2" />
        </div>
      </div>
    );
  }
  return (
    <div className="flex flex-col bg-[#F9F9F9] rounded-[20px] overflow-hidden">
      <div className="w-full aspect-[4/3] bg-[#F1ECE4]" />
      <div className="p-3 md:p-4 flex flex-col">
        <Bar className="h-4 w-3/4 mt-1" />
        <div className="mt-[8px] mb-[16px] min-h-[28px] flex items-center">
          <Bar className="h-4 w-16" />
        </div>
        <Bar className="h-[40px] md:h-[44px] w-full" />
      </div>
    </div>
  );
}

export function ProductGridSkeleton({
  count = 6,
  view = 'grid',
  gridClassName = 'grid grid-cols-2 lg:grid-cols-3 gap-[10px] md:gap-6 lg:gap-8',
  isEn = false,
}: {
  count?: number;
  view?: 'grid' | 'list';
  gridClassName?: string;
  isEn?: boolean;
}) {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-busy="true"
      className={`${view === 'grid' ? gridClassName : 'flex flex-col gap-5'} motion-safe:animate-pulse`}
    >
      <span className="sr-only">{isEn ? 'Loading products…' : 'جارٍ تحميل المنتجات…'}</span>
      {Array.from({length: count}).map((_, i) => (
        <ProductCardSkeleton key={i} view={view} />
      ))}
    </div>
  );
}

export function CollectionPageSkeleton({isEn = false}: {isEn?: boolean}) {
  return (
    <div className="w-full" dir={isEn ? 'ltr' : 'rtl'}>
      {/* Hero band: title and count pill */}
      <div className="w-full bg-[#234745] px-4 md:px-8 lg:px-12 py-10 md:py-14">
        <div className="max-w-[1440px] mx-auto flex items-center justify-between gap-4 motion-safe:animate-pulse">
          <div className="h-9 md:h-11 w-48 md:w-72 rounded-full bg-white/15" />
          <div className="h-10 w-28 md:w-32 rounded-full bg-[#FEF8EB]/80" />
        </div>
      </div>

      {/* Breadcrumb */}
      <div className="bg-white border-b border-gray-100">
        <div className="px-4 md:px-8 lg:px-12 py-4 max-w-[1440px] mx-auto">
          <Bar className="h-4 w-40 motion-safe:animate-pulse" />
        </div>
      </div>

      <div className="bg-[#FEF8EB]">
        <div className="max-w-[1440px] mx-auto px-4 md:px-8 lg:px-12 py-10 flex gap-8">
          {/* Sidebar (desktop) */}
          <aside className="hidden lg:flex w-[300px] shrink-0 flex-col gap-5 bg-white rounded-[25px] p-4 border border-gray-100 self-start motion-safe:animate-pulse">
            <Bar className="h-10 w-full" />
            <Bar className="h-4 w-24 mt-2" />
            {Array.from({length: 6}).map((_, i) => (
              <div key={i} className="flex items-center justify-between gap-3">
                <Bar className="h-4 w-32" />
                <Bar className="h-4 w-8" />
              </div>
            ))}
            <Bar className="h-4 w-20 mt-4" />
            <div className="flex gap-3">
              <Bar className="h-10 flex-1" />
              <Bar className="h-10 flex-1" />
            </div>
          </aside>

          <div className="flex-1 min-w-0 flex flex-col gap-6">
            <div className="flex justify-end">
              <Bar className="h-11 w-40 motion-safe:animate-pulse" />
            </div>
            <ProductGridSkeleton count={6} isEn={isEn} />
          </div>
        </div>
      </div>
    </div>
  );
}
