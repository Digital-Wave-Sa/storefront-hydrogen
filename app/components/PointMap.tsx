import {useEffect, useRef, useState} from 'react';
import {loadGoogleMaps} from '~/lib/google-maps-loader';

/**
 * A map that shows one place and glides to the next one.
 *
 * The delivery modal used a Google Maps *embed* iframe here, and an iframe
 * can only change place by changing its `src` — which reloads the whole map:
 * a white flash, then tiles filling in patch by patch. It happened on every
 * branch or address the shopper clicked, and twice on opening (once for the
 * first branch, again when their saved address was auto-selected), which is
 * the blinking.
 *
 * This keeps ONE JavaScript map alive for as long as the modal is open and
 * pans it: no reload, no flash.
 */

const RIYADH = {lat: 24.7136, lng: 46.6753};

/** Addresses without coordinates are geocoded once per string, per page. */
const geocodeCache = new Map<string, {lat: number; lng: number} | null>();

export function PointMap({
  googleMapsKey,
  isEn,
  point,
  query,
  zoom = 16,
  className = '',
}: {
  googleMapsKey: string;
  isEn: boolean;
  /** Where to show, when the coordinates are known. */
  point?: {lat: number; lng: number} | null;
  /** Otherwise, an address for Google to find. */
  query?: string;
  zoom?: number;
  className?: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const markerRef = useRef<any>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    loadGoogleMaps(googleMapsKey, isEn ? 'en' : 'ar')
      .then(() => !cancelled && setReady(true))
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [googleMapsKey, isEn]);

  // Build the map once.
  useEffect(() => {
    if (!ready || !containerRef.current || mapRef.current) return;
    const google = (window as any).google;
    const start = point && point.lat && point.lng ? point : RIYADH;
    mapRef.current = new google.maps.Map(containerRef.current, {
      center: start,
      zoom,
      disableDefaultUI: true,
      zoomControl: true,
      clickableIcons: false,
      gestureHandling: 'cooperative',
    });
    markerRef.current = new google.maps.Marker({
      map: point ? mapRef.current : null,
      position: start,
    });
    return () => {
      markerRef.current?.setMap(null);
      markerRef.current = null;
      google.maps.event.clearInstanceListeners(mapRef.current);
      mapRef.current = null;
    };
    // `point` and `zoom` are applied by the effect below, not by rebuilding.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready]);

  // Move to the current place.
  const lat = point?.lat;
  const lng = point?.lng;
  useEffect(() => {
    const map = mapRef.current;
    if (!ready || !map) return;
    let cancelled = false;

    const go = (p: {lat: number; lng: number}) => {
      if (cancelled) return;
      map.panTo(p);
      if (map.getZoom() !== zoom) map.setZoom(zoom);
      markerRef.current?.setPosition(p);
      markerRef.current?.setMap(map);
    };

    if (lat && lng) {
      go({lat, lng});
    } else if (query) {
      if (geocodeCache.has(query)) {
        const hit = geocodeCache.get(query);
        if (hit) go(hit);
      } else {
        const google = (window as any).google;
        new google.maps.Geocoder().geocode(
          {address: query, region: 'sa'},
          (results: any, status: any) => {
            const loc = status === 'OK' ? results?.[0]?.geometry?.location : null;
            const hit = loc ? {lat: loc.lat(), lng: loc.lng()} : null;
            geocodeCache.set(query, hit);
            if (hit) go(hit);
          },
        );
      }
    }

    return () => {
      cancelled = true;
    };
  }, [ready, lat, lng, query, zoom]);

  return (
    <div
      ref={containerRef}
      className={`w-full h-full bg-[#EDEAE3] ${className}`}
      role="img"
      aria-label={isEn ? 'Map' : 'خريطة'}
    />
  );
}
