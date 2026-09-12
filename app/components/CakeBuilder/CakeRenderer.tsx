/**
 * The cake canvas.
 *
 * Owns a `<canvas>` and nothing else — no option lists, no steps, no chrome.
 * Everything it draws comes from the props, so the surrounding builder keeps
 * its own design and this stays swappable.
 *
 * ── Why the engine is imported inside an effect ──
 *
 * `compose.ts` reaches for `document`, `createImageBitmap` and `Image` at
 * module scope on the paths it takes. A static import would pull all of that
 * into the server bundle and break the SSR pass for the whole route, so it is
 * imported dynamically the first time the component actually renders in a
 * browser. The import is cached by the bundler, so this costs one await once.
 *
 * ── Why renders are serialised ──
 *
 * A full render is hundreds of milliseconds of synchronous JavaScript. A
 * shopper dragging the photo slider fires far faster than that, and running
 * two composes concurrently would interleave their work on the shared geometry
 * cache. Every render therefore takes a ticket (`revision`) and a late result
 * is discarded rather than painted — otherwise releasing the slider would
 * leave the canvas showing a frame from halfway through the drag.
 */

import {useEffect, useRef, useState, useCallback} from 'react';
// Type-only, so it is erased at build time and pulls no browser code into the
// server bundle. The runtime import of the same module happens in `loadEngine`.
import type {CakeChoice, CakeView, CakeAngle} from '~/lib/cake-render/compose';

export type CakeRendererProps = {
  formatId: string;
  fillingId: string;
  colorId: string;
  decorationId: string;
  creamTheme?: 'white' | 'pink' | 'chocolate';
  view?: CakeView;
  angle?: CakeAngle;
  /** The shopper's uploaded image, as a data URL or object URL. */
  photoSrc?: string | null;
  photo?: {
    scale: number;
    x: number;
    y: number;
    rotation: number;
    shape: 'circle' | 'rectangle';
  };
  text?: {
    value: string;
    color: string;
    scale: number;
    x: number;
    y: number;
    font: string;
  };
  /**
   * Canvas edge in pixels. 940 is the vendor's preview size. Cost is
   * quadratic, so raising this to sharpen the image is expensive — the canvas
   * is already displayed larger than it renders via CSS.
   */
  size?: number;
  className?: string;
  /** Arabic or English, for the loading and error text only. */
  isEn?: boolean;
  /** Fires after every successful paint, with the canvas, for export. */
  onRendered?: (canvas: HTMLCanvasElement) => void;
  /**
   * DOM id for the canvas element.
   *
   * Load-bearing: `CustomCakeBuilder.handleCheckout` captures the preview for
   * the order with `document.getElementById('cake-3d-canvas')`. Drop or rename
   * this and the order still completes — it just silently arrives at the branch
   * with no picture of the cake, which is the kind of failure nobody notices
   * until a baker calls.
   */
  canvasId?: string;
};

const DEFAULT_PHOTO = {
  scale: 1,
  x: 0,
  y: 0,
  rotation: 0,
  shape: 'circle' as const,
};
const DEFAULT_TEXT = {
  value: '',
  color: '#6d3747',
  scale: 1,
  x: 0,
  y: -0.2,
  font: 'Noto Sans Arabic',
};

type Engine = typeof import('~/lib/cake-render/compose');

let enginePromise: Promise<Engine> | null = null;
function loadEngine(): Promise<Engine> {
  if (!enginePromise) enginePromise = import('~/lib/cake-render/compose');
  return enginePromise;
}

export default function CakeRenderer({
  formatId,
  fillingId,
  colorId,
  decorationId,
  creamTheme = 'white',
  view = 'whole',
  angle = 'original',
  photoSrc = null,
  photo = DEFAULT_PHOTO,
  text = DEFAULT_TEXT,
  size = 940,
  className = '',
  isEn = false,
  onRendered,
  canvasId,
}: CakeRendererProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const revision = useRef(0);
  // The decoded upload, kept out of React state: it is a multi-megabyte typed
  // array and re-rendering on it would be pure cost.
  const decodedPhoto = useRef<{src: string; texture: any} | null>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');

  const draw = useCallback(async () => {
    const token = ++revision.current;
    setStatus((s) => (s === 'ready' ? s : 'loading'));

    try {
      const engine = await loadEngine();
      if (token !== revision.current) return;

      if (photoSrc && decodedPhoto.current?.src !== photoSrc) {
        decodedPhoto.current = {
          src: photoSrc,
          texture: await engine.decodeUserPhoto(photoSrc),
        };
      } else if (!photoSrc) {
        decodedPhoto.current = null;
      }
      if (token !== revision.current) return;

      const choice: CakeChoice = {
        format: formatId,
        filling: fillingId,
        color: colorId,
        decoration: decorationId,
        theme: creamTheme,
        view,
        angle,
        photo: {...DEFAULT_PHOTO, ...photo},
        text: {...DEFAULT_TEXT, ...text},
      };

      const {raw, size: edge} = await engine.composeCake(
        choice,
        decodedPhoto.current?.texture ?? null,
        size,
      );
      if (token !== revision.current) return;

      const canvas = canvasRef.current;
      if (!canvas) return;
      canvas.width = edge;
      canvas.height = edge;
      canvas.getContext('2d')!.putImageData(new ImageData(raw, edge, edge), 0, 0);
      setStatus('ready');
      onRendered?.(canvas);
    } catch (error) {
      if (token !== revision.current) return;
      console.error('[CakeRenderer] render failed:', error);
      setStatus('error');
    }
  }, [
    formatId,
    fillingId,
    colorId,
    decorationId,
    creamTheme,
    view,
    angle,
    photoSrc,
    // Spread rather than the objects themselves: the parent rebuilds these
    // literals on every keystroke, and depending on identity would redraw on
    // every render whether or not anything actually moved.
    photo.scale,
    photo.x,
    photo.y,
    photo.rotation,
    photo.shape,
    text.value,
    text.color,
    text.scale,
    text.x,
    text.y,
    text.font,
    size,
    onRendered,
  ]);

  useEffect(() => {
    let cancelled = false;
    // One frame of debounce. A slider drag fires many times per render, and
    // without this every intermediate position queues a full compose that is
    // thrown away by the revision check anyway — the work still blocks the
    // main thread and the drag stutters.
    const timer = setTimeout(() => {
      if (!cancelled) void draw();
    }, 60);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [draw]);

  return (
    <div className={`relative ${className}`}>
      <canvas
        ref={canvasRef}
        id={canvasId}
        className="w-full h-auto block select-none"
        style={{aspectRatio: '1 / 1'}}
        aria-label={isEn ? 'Cake design preview' : 'معاينة تصميم الكيك'}
      />

      {status === 'loading' && (
        <div className="absolute inset-0 flex items-center justify-center bg-white/70 backdrop-blur-sm rounded-2xl">
          <span className="text-sm font-bold text-[#294941]">
            {isEn ? 'Preparing your cake…' : 'بنجهّز كيكتك…'}
          </span>
        </div>
      )}

      {status === 'error' && (
        <button
          type="button"
          onClick={() => void draw()}
          className="absolute inset-0 flex items-center justify-center bg-white/85 rounded-2xl text-sm font-bold text-[#294941] cursor-pointer"
        >
          {isEn
            ? 'Preview failed — tap to retry'
            : 'تعذّر تحميل المعاينة — اضغط للمحاولة'}
        </button>
      )}
    </div>
  );
}
