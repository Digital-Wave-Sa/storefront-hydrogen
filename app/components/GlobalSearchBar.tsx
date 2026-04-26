import { useState, useEffect, useRef } from 'react';
import { useFetcher, Form, useNavigate, Link } from 'react-router';
import { Image, Money } from '@shopify/hydrogen';
import { useI18n } from '~/lib/i18n';
import type { NormalizedPredictiveSearchResults } from './Search';

export function GlobalSearchBar({ locale, isMobile }: { locale?: string, isMobile?: boolean }) {
  const isEn = locale === 'en';
  const fetcher = useFetcher<any>();
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [history, setHistory] = useState<string[]>([]);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [isTyping, setIsTyping] = useState(false);

  // Load history from session storage
  useEffect(() => {
    const saved = sessionStorage.getItem('searchHistory');
    if (saved) {
      try {
        setHistory(JSON.parse(saved) as string[]);
      } catch (e) {
        console.error('Failed to parse search history', e);
      }
    }
  }, []);

  const addToHistory = (term: string) => {
    const cleanTerm = term.trim();
    if (!cleanTerm || cleanTerm.length < 2) return;
    const newHistory = [cleanTerm, ...history.filter(h => h !== cleanTerm)].slice(0, 5);
    setHistory(newHistory);
    sessionStorage.setItem('searchHistory', JSON.stringify(newHistory));
  };

  const clearHistory = (e: React.MouseEvent) => {
    e.stopPropagation();
    setHistory([]);
    sessionStorage.removeItem('searchHistory');
  };

  // Debounce logic
  useEffect(() => {
    if (query.length < 1) {
      setIsTyping(false);
      return;
    }
    setIsTyping(true);
    setIsOpen(true);
    const timer = setTimeout(() => {
      const searchAction = isEn ? '/en/predictive-search' : '/predictive-search';
      fetcher.submit({ q: query, limit: '6', type: 'PRODUCT,QUERY' }, { method: 'GET', action: searchAction });
      setIsTyping(false);
    }, 200);

    return () => clearTimeout(timer);
  }, [query, isEn]);

  // Click outside to close
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const results = fetcher.data?.searchResults?.results as NormalizedPredictiveSearchResults | undefined;
  
  // Flatten items for keyboard navigation
  const historyItemsCount = query.length < 1 ? history.length : 0;
  const flattenedItems = results?.flatMap(group => group.items) || [];

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) return;
    
    // History keyboard nav
    if (query.length < 1 && history.length > 0) {
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            setSelectedIndex(prev => (prev < history.length - 1 ? prev + 1 : prev));
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setSelectedIndex(prev => (prev > 0 ? prev - 1 : prev));
        } else if (e.key === 'Enter' && selectedIndex >= 0) {
            e.preventDefault();
            const term = history[selectedIndex];
            setQuery(term);
            navigate((isEn ? "/en/search?q=" : "/search?q=") + encodeURIComponent(term));
            setIsOpen(false);
        }
        return;
    }

    if (flattenedItems.length === 0) return;
    
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => (prev < flattenedItems.length - 1 ? prev + 1 : prev));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => (prev > 0 ? prev - 1 : prev));
    } else if (e.key === 'Enter' && selectedIndex >= 0) {
      e.preventDefault();
      const item = flattenedItems[selectedIndex];
      addToHistory(query);
      navigate(item.url);
      setIsOpen(false);
      setQuery('');
    } else if (e.key === 'Escape') {
      setIsOpen(false);
    }
  };

  return (
    <div ref={wrapperRef} className={`relative flex-1 ${isMobile ? 'w-full' : 'max-w-[280px]'}`}>
      <Form
        method="get"
        action={isEn ? "/en/search" : "/search"}
        onSubmit={(e) => {
          if (!query) e.preventDefault();
          addToHistory(query);
          setIsOpen(false);
        }}
        className="relative"
      >
        <input
          type="search"
          name="q"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setSelectedIndex(-1);
          }}
          onKeyDown={handleKeyDown}
          onFocus={() => { 
            setIsOpen(true); 
            setSelectedIndex(-1);
          }}
          placeholder={isEn ? "Search for a product..." : "إبحث عن منتج..."}
          className="w-full bg-white !border-transparent !border-none !outline-none !ring-0 !rounded-full !py-3 !ps-12 !pe-5 !text-[14px] !m-0 font-medium text-[#1b3d2e] placeholder:text-gray-400 focus:!outline-none focus:!ring-0 focus:!border-transparent !shadow-sm transition-all"
          autoComplete="off"
        />
        <button type="submit" className="absolute start-4 top-1/2 -translate-y-1/2 text-[#1b3d2e] hover:opacity-70 transition-opacity">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
        </button>
      </Form>

      {isOpen && (
        <div className="absolute top-full mt-2 w-[120%] lg:w-full bg-white border border-gray-100 rounded-xl shadow-xl z-50 overflow-hidden end-0 lg:end-auto lg:start-0 animate-fade-in">
          {(query.length < 1 && history.length > 0) ? (
            <div className="py-2">
                <div className="px-4 py-2 flex items-center justify-between">
                    <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">
                        {isEn ? 'Recent Searches' : 'عمليات البحث الأخيرة'}
                    </span>
                    <button 
                        onClick={clearHistory}
                        className="text-[10px] font-bold text-red-400 hover:text-red-500 transition-colors uppercase tracking-tight"
                    >
                        {isEn ? 'Clear All' : 'مسح الكل'}
                    </button>
                </div>
                <ul>
                    {history.map((term, idx) => (
                        <li key={term}>
                            <button
                                onClick={() => {
                                    setQuery(term);
                                    navigate((isEn ? "/en/search?q=" : "/search?q=") + encodeURIComponent(term));
                                    setIsOpen(false);
                                }}
                                className={`w-full flex items-center gap-3 px-4 py-2.5 text-[13px] font-medium text-gray-600 transition-colors text-start ${selectedIndex === idx ? 'bg-[#f5f3f1] text-[#1b3d2e]' : 'hover:bg-gray-50'}`}
                            >
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-gray-300"><polyline points="23 4 23 10 17 10"></polyline><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"></path></svg>
                                {term}
                            </button>
                        </li>
                    ))}
                </ul>
            </div>
          ) : query.length >= 1 && (fetcher.state === 'loading' || isTyping) ? (
            <div className="p-5 text-center text-sm font-medium text-gray-500 animate-pulse">{isEn ? 'Searching...' : 'جاري البحث...'}</div>
          ) : results && flattenedItems.length > 0 ? (
            <div className="max-h-[60vh] lg:max-h-[70vh] overflow-y-auto custom-scrollbar">
              {results.map((group) => {
                if (!group.items.length) return null;
                const typeLabel = group.type === 'queries' ? (isEn ? 'Suggestions' : 'اقتراحات') :
                                  group.type === 'products' ? (isEn ? 'Products' : 'المنتجات') :
                                  group.type === 'collections' ? (isEn ? 'Categories' : 'التصنيفات') : group.type;
                return (
                  <div key={group.type} className="border-b border-gray-50 last:border-0">
                    <div className="px-4 py-2.5 bg-gray-50/80 text-[11px] font-bold text-gray-400 uppercase tracking-wider backdrop-blur-sm sticky top-0 z-10">
                      {typeLabel}
                    </div>
                    <ul>
                      {group.items.map((item) => {
                        const globalIndex = flattenedItems.findIndex(i => i.id === item.id);
                        const isSelected = globalIndex === selectedIndex;
                        return (
                          <li key={item.id}>
                            <Link
                              to={item.url}
                              onClick={() => {
                                addToHistory(query);
                                setIsOpen(false);
                                setQuery('');
                              }}
                              className={`flex items-center gap-3 px-4 py-3 transition-colors ${isSelected ? 'bg-[#f5f3f1] outline-none' : 'hover:bg-gray-50'}`}
                            >
                              {item.image?.url ? (
                                <div className="shrink-0 w-12 h-12 bg-white border border-gray-100 rounded-lg overflow-hidden flex items-center justify-center p-1">
                                  <Image data={item.image as any} width={40} height={40} className="w-full h-full object-contain" />
                                </div>
                              ) : (
                                <div className="shrink-0 w-12 h-12 bg-[#f5f3f1] border border-[#e8e4e1] rounded-lg flex items-center justify-center text-gray-400">
                                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
                                </div>
                              )}
                              <div className="flex-1 min-w-0">
                                <p className="text-[13px] font-bold text-[#1b3d2e] truncate" dangerouslySetInnerHTML={{ __html: item.styledTitle || item.title }} />
                                {item.price && (
                                  <p className="text-[13px] font-black text-[#d4a06a] mt-0.5">
                                    <Money data={item.price} />
                                  </p>
                                )}
                              </div>
                            </Link>
                          </li>
                        )
                      })}
                    </ul>
                  </div>
                );
              })}
              <div className="p-3 border-t border-gray-50 bg-gray-50/30">
                <Link to={(isEn ? "/en/search?q=" : "/search?q=") + encodeURIComponent(query)} onClick={() => { addToHistory(query); setIsOpen(false); }} className="block w-full text-center text-[12px] font-bold text-[#1b3d2e] py-2 rounded-lg hover:bg-[#e8e4e1] transition-colors">
                  {isEn ? `See all results for "${query}"` : `عرض جميع النتائج لـ "${query}"`}
                </Link>
              </div>
            </div>
          ) : query.length >= 1 && fetcher.state === 'idle' && !isTyping ? (
            <div className="p-6 text-center">
              <div className="w-12 h-12 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-3">
                 <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#d4a06a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /><line x1="8" y1="11" x2="14" y2="11" /></svg>
              </div>
              <p className="text-sm font-bold text-[#1b3d2e] mb-1">{isEn ? 'No results found' : 'لم نجد أي نتائج'}</p>
              <p className="text-[12px] text-gray-500">{isEn ? 'Try adjusting your search' : 'حاول البحث بكلمات أخرى'}</p>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}
