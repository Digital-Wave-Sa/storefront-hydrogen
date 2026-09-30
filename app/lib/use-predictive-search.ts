import {useEffect, useRef, useState} from 'react';
import {useFetcher} from 'react-router';
import type {NormalizedPredictiveSearchResults} from '~/components/Search';
import {isCorporateProduct} from '~/lib/stock';

/**
 * Suggestions as the shopper types — shared by the desktop header search
 * (GlobalSearchBar) and the mobile search panel (MobileSearchModal).
 *
 * Mobile had a text box and a Search button only: nothing appeared until the
 * shopper submitted. The request, retry and "no results" rules below were
 * worked out on the desktop bar against Oxygen, so both use this one copy
 * rather than a second, drifting one.
 */
export function usePredictiveSearch(query: string, isEn: boolean) {
  const fetcher = useFetcher<any>();
  const [isTyping, setIsTyping] = useState(false);
  const searchEndpoint = isEn ? '/en/predictive-search' : '/predictive-search';

  // Debounce typing state for smoother spinner transition
  useEffect(() => {
    if (!query) {
      setIsTyping(false);
      return;
    }
    setIsTyping(true);
    const timer = setTimeout(() => setIsTyping(false), 300);
    return () => clearTimeout(timer);
  }, [query]);

  /**
   * One request per PAUSE in typing, not one per keystroke.
   *
   * This fired `fetcher.submit` on every character. Each submit is a real
   * round trip to the predictive-search route, and each of those can have to
   * wait on the catalog index — so typing four letters queued four server
   * requests, every one of them re-rendering the results as its state
   * changed. A 300ms debounce collapses a burst of typing into a single
   * request, and the two-character minimum keeps a single letter — which
   * matches most of the catalog and tells the shopper nothing — from asking
   * at all.
   */
  useEffect(() => {
    const term = query.trim();
    if (term.length < 2) return;
    const timer = setTimeout(() => {
      fetcher.submit(
        {q: term, predictive: 'true'},
        {method: 'get', action: searchEndpoint},
      );
    }, 300);
    return () => clearTimeout(timer);
  }, [query, isEn]);

  /**
   * Focusing the box warms the catalog index.
   *
   * The route treats an empty `q` as "the shopper is about to type, go build
   * the index". Without this the first real keystroke paid for the whole
   * catalog crawl — and for Arabic, which has no fallback source, that
   * keystroke answered «لم نجد أي نتائج».
   *
   * A bare `fetch` rather than the fetcher: this must not overwrite the
   * results with an empty set.
   */
  const warmedRef = useRef(false);
  const warm = () => {
    if (warmedRef.current) return;
    warmedRef.current = true;
    fetch(`${searchEndpoint}?q=`, {
      headers: {Accept: 'application/json'},
    }).catch(() => {
      // Warming is best effort; a failure here costs nothing.
      warmedRef.current = false;
    });
  };

  /**
   * An unanswerable keystroke is retried, not reported as "no results".
   *
   * `pending` from the route means the index was not available to look in.
   * Capped at two retries per term so a broken index cannot loop; past the
   * cap the empty answer is accepted as the answer (`gaveUpOn`), so the
   * panel does not say «جاري البحث...» forever.
   */
  const MAX_PENDING_RETRIES = 2;
  const retriesRef = useRef<Record<string, number>>({});
  const [gaveUpOn, setGaveUpOn] = useState<string | null>(null);

  // A new query gets a fresh retry budget.
  useEffect(() => {
    retriesRef.current = {};
    setGaveUpOn(null);
  }, [query]);

  useEffect(() => {
    const answer: any = fetcher.data;
    if (!answer?.pending || fetcher.state !== 'idle') return;
    const term = String(answer.searchTerm || '').trim();
    if (!term || term !== query.trim()) return;
    const attempts = retriesRef.current[term] || 0;
    if (attempts >= MAX_PENDING_RETRIES) {
      setGaveUpOn(term);
      return;
    }
    retriesRef.current[term] = attempts + 1;
    const timer = setTimeout(() => {
      fetcher.submit(
        {q: term, predictive: 'true'},
        {method: 'get', action: searchEndpoint},
      );
    }, 1500);
    return () => clearTimeout(timer);
  }, [fetcher.data, fetcher.state, query, isEn]);

  /**
   * «No results» is only said once the server has answered THIS term.
   *
   * Comparing the answered term to the typed one means stale data from a
   * previous query is never shown as the answer to this one, and the empty
   * state waits for evidence rather than for a timer (below two characters
   * nothing is asked at all, so nothing can have been "not found").
   */
  const trimmedQuery = query.trim();
  const answeredCurrentTerm =
    trimmedQuery.length >= 2 &&
    fetcher.state === 'idle' &&
    !isTyping &&
    fetcher.data?.searchTerm === trimmedQuery &&
    (!fetcher.data?.pending || gaveUpOn === trimmedQuery);

  /**
   * Still searching covers the whole wait, not just the two timers: there is
   * a tick after `isTyping` clears and before `fetcher.state` turns
   * `loading` where nothing has been answered yet.
   */
  const searching =
    query.length >= 1 &&
    (fetcher.state === 'loading' ||
      isTyping ||
      (trimmedQuery.length >= 2 && !answeredCurrentTerm));

  const rawResults = fetcher.data?.searchResults?.results as
    | NormalizedPredictiveSearchResults
    | undefined;
  const results = rawResults?.map((group) => ({
    ...group,
    items: group.items.filter((item: any) => !isCorporateProduct(item)),
  }));
  const flattenedItems = results?.flatMap((group) => group.items) || [];

  return {results, flattenedItems, searching, answeredCurrentTerm, warm};
}

/** Recent searches, kept for the browser session and shared by both boxes. */
const HISTORY_KEY = 'searchHistory';

export function useSearchHistory() {
  const [history, setHistory] = useState<string[]>([]);

  useEffect(() => {
    try {
      const saved = sessionStorage.getItem(HISTORY_KEY);
      if (saved) setHistory(JSON.parse(saved) as string[]);
    } catch (e) {
      console.error('Failed to parse search history', e);
    }
  }, []);

  const save = (next: string[]) => {
    setHistory(next);
    try {
      if (next.length) sessionStorage.setItem(HISTORY_KEY, JSON.stringify(next));
      else sessionStorage.removeItem(HISTORY_KEY);
    } catch {
      // Private mode or storage off: history just is not kept.
    }
  };

  const add = (term: string) => {
    if (!term.trim()) return;
    // Read the stored list, not state: the other search box may have added
    // to it since this one mounted.
    let current = history;
    try {
      const saved = sessionStorage.getItem(HISTORY_KEY);
      if (saved) current = JSON.parse(saved) as string[];
    } catch {
      // fall back to state
    }
    save(
      [term, ...current.filter((h) => h.toLowerCase() !== term.toLowerCase())].slice(0, 5),
    );
  };

  const remove = (term: string) => save(history.filter((h) => h !== term));
  const clear = () => save([]);

  /** Re-read on open: the desktop box may have added a term meanwhile. */
  const reload = () => {
    try {
      const saved = sessionStorage.getItem(HISTORY_KEY);
      setHistory(saved ? (JSON.parse(saved) as string[]) : []);
    } catch {
      // keep what we have
    }
  };

  return {history, add, remove, clear, reload};
}
