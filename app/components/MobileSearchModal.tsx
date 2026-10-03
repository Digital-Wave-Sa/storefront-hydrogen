import { useAside } from '~/components/Aside';
import { Link, useNavigate } from 'react-router';
import { useState, useEffect, useRef } from 'react';
import { Image, Money } from '@shopify/hydrogen';
import { NoImage } from '~/components/NoImage';
import {
  usePredictiveSearch,
  useSearchHistory,
} from '~/lib/use-predictive-search';

export function MobileSearchModal({ locale }: { locale: string }) {
  const { type, close } = useAside();
  const isEn = locale === 'en';
  const [query, setQuery] = useState('');
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);

  const isOpen = type === 'search';

  /**
   * Suggestions as the shopper types, the same as the desktop header bar.
   * This panel used to show nothing until Search was pressed.
   */
  const { results, flattenedItems, searching, answeredCurrentTerm, warm } =
    usePredictiveSearch(query, isEn);
  const { history, add: addToHistory, remove: removeFromHistory, clear: clearHistory, reload: reloadHistory } =
    useSearchHistory();
  const searchUrl = (term: string) =>
    (isEn ? '/en/search?q=' : '/search?q=') + encodeURIComponent(term);

  /**
   * Height of the area the browser is actually showing.
   *
   * The panel was `h-[100dvh]` with the submit button pinned to the
   * bottom via `mt-auto`. Opening the panel focuses the input, which
   * raises the on-screen keyboard — and `dvh` does not shrink for the
   * keyboard on iOS Safari, so the button stayed at the bottom of the
   * full-height panel, roughly 300px underneath it. Enter worked because
   * that key is on the keyboard covering the button.
   *
   * `visualViewport` is the one measurement that does track the keyboard.
   */
  const [viewportHeight, setViewportHeight] = useState<number | null>(null);

  useEffect(() => {
    if (!isOpen || typeof window === 'undefined' || !window.visualViewport) {
      return;
    }
    const vv = window.visualViewport;
    const sync = () => setViewportHeight(vv.height);
    sync();
    vv.addEventListener('resize', sync);
    vv.addEventListener('scroll', sync);
    return () => {
      vv.removeEventListener('resize', sync);
      vv.removeEventListener('scroll', sync);
    };
  }, [isOpen]);

  /** Both the button and the Enter key go through here. */
  const submitSearch = () => {
    const term = query.trim();
    if (!term) return;
    addToHistory(term);
    navigate(searchUrl(term));
    close();
  };

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      document.documentElement.style.overflow = 'hidden';
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
      // Build the catalog index while the shopper starts typing, and pick up
      // any term the desktop box added to the recent searches.
      warm();
      reloadHistory();
    } else {
      document.body.style.overflow = '';
      document.documentElement.style.overflow = '';
      setQuery(''); // Reset query when closed
    }
    
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) close();
    };
    document.addEventListener('keydown', handleEscape);
    
    return () => {
      document.body.style.overflow = '';
      document.documentElement.style.overflow = '';
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen, close]);

  if (!isOpen) return null;

  return (
    <div
      className={`fixed top-0 left-0 w-full h-[100dvh] z-[100] bg-white flex flex-col p-4 md:p-6 animate-in slide-in-from-bottom-4 fade-in duration-300 ${isEn ? 'font-en' : 'font-ar'}`}
      // Falls back to the CSS height when visualViewport is unavailable.
      style={viewportHeight ? {height: `${viewportHeight}px`} : undefined}
      dir={isEn ? 'ltr' : 'rtl'}
    >
      {/* Top Bar */}
      <div className="flex items-center gap-3 w-full">
         <div className="flex-1 flex items-center bg-[#f8f5f2] rounded-full px-4 py-3.5 gap-3">
           <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#234745" strokeWidth="2"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
           <input 
             ref={inputRef}
             type="search" 
             value={query}
             onChange={(e) => setQuery(e.target.value)}
             onKeyDown={(e) => {
               if (e.key === 'Enter') submitSearch();
             }}
             enterKeyHint="search"
             placeholder={isEn ? "What are you looking for?" : "عن ماذا تبحث؟"}
             className="w-full bg-transparent outline-none border-none ring-0 p-0 text-[#234745] placeholder:text-gray-400 font-medium text-[15px]"
           />
         </div>
         <button onClick={close} className="w-12 h-12 flex items-center justify-center rounded-full border border-gray-100 bg-white text-[#234745] hover:bg-gray-50 shrink-0 shadow-sm transition-colors">
           <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
         </button>
      </div>

      {/*
        Suggestions. Scrolling the list drops the keyboard so more of it is
        visible; the list itself scrolls inside the panel, which is sized to
        the visible viewport (above).
      */}
      <div
        className="flex-1 min-h-0 mt-4 -mx-4 md:-mx-6 overflow-y-auto overscroll-contain"
        onTouchMove={() => inputRef.current?.blur()}
      >
        {query.length < 1 ? (
          history.length > 0 ? (
            <div className="px-4 md:px-6">
              <div className="flex items-center justify-between py-2">
                <span className="text-[12px] font-bold text-gray-400 uppercase tracking-wider">
                  {isEn ? 'Recent searches' : 'عمليات البحث الأخيرة'}
                </span>
                <button
                  type="button"
                  onClick={clearHistory}
                  className="text-[12px] font-bold text-red-400 px-2 py-1"
                >
                  {isEn ? 'Clear all' : 'مسح الكل'}
                </button>
              </div>
              <ul>
                {history.map((term) => (
                  <li key={term} className="flex items-center border-b border-gray-50 last:border-0">
                    <Link
                      to={searchUrl(term)}
                      onClick={() => {
                        addToHistory(term);
                        close();
                      }}
                      className="flex-1 flex items-center gap-3 py-3.5 text-[15px] font-medium text-[#234745] min-w-0"
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-gray-300 shrink-0" aria-hidden="true"><polyline points="23 4 23 10 17 10"></polyline><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"></path></svg>
                      <span className="truncate">{term}</span>
                    </Link>
                    <button
                      type="button"
                      onClick={() => removeFromHistory(term)}
                      aria-label={isEn ? `Remove ${term}` : `إزالة ${term}`}
                      className="w-10 h-10 flex items-center justify-center text-gray-300 shrink-0"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ) : null
        ) : searching ? (
          <div className="py-8 text-center text-[15px] font-medium text-gray-500 animate-pulse">
            {isEn ? 'Searching...' : 'جاري البحث...'}
          </div>
        ) : results && flattenedItems.length > 0 ? (
          <div>
            {results.map((group) => {
              if (!group.items.length) return null;
              const typeLabel =
                group.type === 'queries' ? (isEn ? 'Suggestions' : 'اقتراحات') :
                group.type === 'products' ? (isEn ? 'Products' : 'المنتجات') :
                group.type === 'collections' ? (isEn ? 'Categories' : 'التصنيفات') :
                group.type;
              return (
                <div key={group.type}>
                  <div className="px-4 md:px-6 py-2 bg-gray-50 text-[12px] font-bold text-gray-400 uppercase tracking-wider sticky top-0 z-10">
                    {typeLabel}
                  </div>
                  <ul>
                    {group.items.map((item: any) => (
                      <li key={item.id} className="border-b border-gray-50 last:border-0">
                        <Link
                          to={item.url}
                          prefetch="intent"
                          onClick={() => {
                            addToHistory(query);
                            close();
                          }}
                          className="flex items-center gap-3 px-4 md:px-6 py-3 active:bg-[#f5f3f1]"
                        >
                          {item.image?.url ? (
                            <div className="shrink-0 w-14 h-14 bg-white border border-gray-100 rounded-xl overflow-hidden flex items-center justify-center p-1">
                              <Image data={item.image} width={56} height={56} sizes="56px" className="w-full h-full object-contain" />
                            </div>
                          ) : (
                            <div className="shrink-0 w-14 h-14 bg-[#f5f3f1] border border-[#e8e4e1] rounded-xl overflow-hidden">
                              <NoImage title={item.title} size="sm" />
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <p
                              className="text-[15px] font-bold text-[#234745] line-clamp-2 leading-snug"
                              dangerouslySetInnerHTML={{ __html: item.styledTitle || item.title }}
                            />
                            {item.price && (
                              <p className="text-[14px] font-black text-[#234745] mt-0.5">
                                <Money data={item.price} />
                              </p>
                            )}
                          </div>
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
        ) : answeredCurrentTerm ? (
          <div className="py-10 px-6 text-center">
            <p className="text-[15px] font-bold text-[#234745] mb-1">
              {isEn ? 'No results found' : 'لم نجد أي نتائج'}
            </p>
            <p className="text-[13px] text-gray-500">
              {isEn ? 'Try adjusting your search' : 'حاول البحث بكلمات أخرى'}
            </p>
          </div>
        ) : null}
      </div>

      {/* Bottom Fixed Button */}
      <div className="shrink-0 pb-4 pt-3">
         <button
           type="button"
           // pointer-down, not click: tapping blurs the input first, which
           // dismisses the keyboard and moves the button out from under the
           // finger before the click lands.
           onPointerDown={(e) => {
             e.preventDefault();
             submitSearch();
           }}
           className="w-full bg-[#234745] text-white py-4 rounded-[2rem] font-bold flex items-center justify-center gap-2 text-[16px] shadow-lg active:scale-[0.98] transition-all disabled:opacity-50"
           disabled={!query.trim()}
         >
           <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
           {query.trim() && flattenedItems.length > 0
             ? (isEn ? 'See all results' : 'عرض جميع النتائج')
             : (isEn ? 'Search' : 'بحث')}
         </button>
      </div>
    </div>
  );
}
