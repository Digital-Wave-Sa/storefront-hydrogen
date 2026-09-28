/**
 * Loads the Google Maps JavaScript API once per page, whoever asks first.
 *
 * Each map used to add its own <script> tag, checking only whether
 * `window.google.maps` already existed. While the first copy was still
 * downloading that check was false, so a second copy went in — React's
 * development double-run of effects was enough to do it on every first open.
 * Google warned «You have included the Google Maps JavaScript API multiple
 * times», and it meant it: the second copy replaced `google.maps` after the
 * map was built, so the blue location dot (made from the new copy) could not
 * be put on the map (made from the old one), the callback threw, and the map
 * never moved to the shopper. Only the second opening of the picker worked.
 *
 * One promise, shared: every caller waits on the same download.
 */

let loading: Promise<any> | null = null;

export function loadGoogleMaps(apiKey: string, language: string): Promise<any> {
  if (typeof window === 'undefined') return Promise.reject(new Error('SSR'));
  const w = window as any;
  if (w.google?.maps?.Map) return Promise.resolve(w.google);
  if (loading) return loading;

  loading = new Promise((resolve, reject) => {
    const done = () => resolve(w.google);

    // A tag some other page added (the branches page has its own).
    const existing = document.querySelector<HTMLScriptElement>(
      'script[src*="maps.googleapis.com/maps/api/js"]',
    );
    if (existing) {
      const poll = window.setInterval(() => {
        if (w.google?.maps?.Map) {
          window.clearInterval(poll);
          done();
        }
      }, 50);
      return;
    }

    const callback = `__sdGoogleMapsReady`;
    w[callback] = done;
    const script = document.createElement('script');
    script.src =
      `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(apiKey)}` +
      `&libraries=places&language=${language}&callback=${callback}`;
    // Not `loading=async`: that mode leaves Geocoder, Marker and friends to
    // be imported one by one, and both pickers use them from the namespace.
    script.async = true;
    script.dataset.gmapsSdk = 'true';
    script.onerror = () => {
      loading = null;
      reject(new Error('Google Maps failed to load'));
    };
    document.head.appendChild(script);
  });

  return loading;
}
