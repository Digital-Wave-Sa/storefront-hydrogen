import { useAside } from '~/components/Aside';
import { useNavigate } from 'react-router';
import { useState, useEffect, useRef } from 'react';

export function MobileSearchModal({ locale }: { locale: string }) {
  const { type, close } = useAside();
  const isEn = locale === 'en';
  const [query, setQuery] = useState('');
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);

  const isOpen = type === 'search';

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
    navigate((isEn ? '/en/search?q=' : '/search?q=') + encodeURIComponent(term));
    close();
  };

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      document.documentElement.style.overflow = 'hidden';
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
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

      {/* Main Content Space */}
      <div className="flex-1 mt-6">
      </div>

      {/* Bottom Fixed Button */}
      <div className="mt-auto pb-4 pt-2">
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
           {isEn ? "Search" : "بحث"}
         </button>
      </div>
    </div>
  );
}
