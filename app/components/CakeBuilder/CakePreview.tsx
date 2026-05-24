import React, { useRef, useEffect, useState, useMemo } from 'react';

// Seeded random number generator for stable topping positions
function seededRandom(seed: number) {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

// Generates CSS-based scattered toppings within an ellipse (cake top)
function ToppingScatter({ toppingId, shape }: { toppingId: string, shape?: string }) {
  const items = useMemo(() => {
    let count = 0;
    let renderItem: (i: number) => React.ReactNode;
    
    if (toppingId === 'strawberries') {
      count = 8;
      renderItem = () => <div className="w-5 h-5 bg-red-600 rounded-full shadow-[inset_-2px_-2px_6px_rgba(0,0,0,0.4)]" />;
    } else if (toppingId === 'pistachio-crumb') {
      count = 50;
      renderItem = () => <div className="w-2 h-2 bg-[#8fc977] rounded-sm opacity-90 shadow-[0_1px_1px_rgba(0,0,0,0.2)]" />;
    } else if (toppingId === 'gold-flakes') {
      count = 30;
      renderItem = () => <div className="w-3 h-3 bg-gradient-to-br from-[#ffe066] to-[#d4af37] rounded-sm rotate-45 shadow-[0_0_4px_#d4af37]" />;
    } else if (toppingId === 'white-pearls') {
      count = 20;
      renderItem = () => <div className="w-3.5 h-3.5 bg-gradient-to-br from-white to-gray-200 rounded-full shadow-[inset_-1px_-1px_3px_rgba(0,0,0,0.3)]" />;
    } else if (toppingId === 'belgian-drip') {
      count = 12; // Placed at the edge
      renderItem = () => <div className="w-4 bg-[#3E2723] rounded-b-full opacity-95 shadow-[0_4px_4px_rgba(0,0,0,0.2)]" style={{ height: `${20 + Math.random() * 30}px` }} />;
    } else {
      return [];
    }

    const scatter = [];
    let seed = toppingId.length;
    for (let i = 0; i < count; i++) {
      let r = seededRandom(seed++) * 40; // radius up to 40% of container
      let theta = seededRandom(seed++) * 2 * Math.PI;
      
      // If belgian-drip, place strictly along the outer perimeter
      if (toppingId === 'belgian-drip') {
        r = 45 + seededRandom(seed++) * 5; 
      }
      
      let left = 50 + (r * Math.cos(theta)); 
      let top = 50 + (r * Math.sin(theta));  
      
      const scale = 0.7 + seededRandom(seed++) * 0.6;
      const rot = seededRandom(seed++) * 360;

      scatter.push(
        <div key={i} className="absolute transition-all duration-700 animate-fade-in" style={{ 
          left: `${left}%`, 
          top: `${top}%`, 
          transform: `translate(-50%, -50%) rotate(${rot}deg) scale(${scale})`
        }}>
          {renderItem(i)}
        </div>
      );
    }
    return scatter;
  }, [toppingId, shape]);

  return <>{items}</>;
}

interface CakePreviewProps {
  shape?: string;
  layers?: number;
  color: string; // hex
  toppings?: string[];
  message?: string;
  textColor?: string;
  textFont?: string;
  flavorName?: string;
  baseImage?: string;
}

function getCakeImage(shape?: string, layers?: number): string {
  if (layers && layers >= 3) return '/images/cake-builder/cake-tall.png';
  if (shape === 'heart') return '/images/cake-builder/cake-heart.png';
  if (shape === 'square' || shape === 'rectangle') return '/images/cake-builder/cake-square.png';
  return '/images/cake-builder/cake-round.png';
}

function parseHex(hex: string): [number, number, number] {
  const safe = hex && hex.startsWith('#') && hex.length === 7 ? hex : '#F4C2C2';
  return [
    parseInt(safe.slice(1, 3), 16),
    parseInt(safe.slice(3, 5), 16),
    parseInt(safe.slice(5, 7), 16),
  ];
}

// Global cache for processed cake images to make color switching instant
const processedCache = new Map<string, ImageData>();

/**
 * Canvas-based chroma key & frosting colorizer.
 * Optimized: downscales large images, hoists invariant calculations outside pixel loop.
 */
function processCakeImage(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  targetColor: string,
) {
  const MAX_SIZE = 600; // Cap resolution for performance
  let w = img.naturalWidth;
  let h = img.naturalHeight;
  
  if (w > MAX_SIZE || h > MAX_SIZE) {
    const ratio = Math.min(MAX_SIZE / w, MAX_SIZE / h);
    w = Math.round(w * ratio);
    h = Math.round(h * ratio);
  }

  // Ensure canvas is resized to the capped dimensions
  ctx.canvas.width = w;
  ctx.canvas.height = h;

  ctx.clearRect(0, 0, w, h);
  ctx.drawImage(img, 0, 0, w, h);

  const imageData = ctx.getImageData(0, 0, w, h);
  const d = imageData.data;

  const [tr, tg, tb] = parseHex(targetColor);

  // --- HOISTED: Calculate target color HSL ONCE outside the loop ---
  const trn = tr / 255, tgn = tg / 255, tbn = tb / 255;
  const tmax = Math.max(trn, tgn, tbn), tmin = Math.min(trn, tgn, tbn);
  let th = 0, ts = 0;
  const tl = (tmax + tmin) / 2;
  const tdelta = tmax - tmin;
  if (tdelta !== 0) {
    ts = tl > 0.5 ? tdelta / (2 - tmax - tmin) : tdelta / (tmax + tmin);
    if (tmax === trn) th = (tgn - tbn) / tdelta + (tgn < tbn ? 6 : 0);
    else if (tmax === tgn) th = (tbn - trn) / tdelta + 2;
    else if (tmax === tbn) th = (trn - tgn) / tdelta + 4;
    th /= 6;
  }
  
  // HSL to RGB conversion helper (hoisted)
  const hue2rgb = (p: number, q: number, t: number) => {
    if(t < 0) t += 1;
    if(t > 1) t -= 1;
    if(t < 1/6) return p + (q - p) * 6 * t;
    if(t < 1/2) return q;
    if(t < 2/3) return p + (q - p) * (2/3 - t) * 6;
    return p;
  };

  for (let i = 0; i < d.length; i += 4) {
    const r = d[i], g = d[i + 1], b = d[i + 2], a = d[i + 3];
    if (a < 30) continue; // skip fully transparent

    // --- Chroma Keying (Remove Neon Green Background) ---
    if (g > 150 && r < 120 && b < 120) {
      d[i + 3] = 0;
      continue;
    }
    
    // Anti-alias the green edges
    if (g > 120 && r < 140 && b < 140 && g > r * 1.2 && g > b * 1.2) {
       d[i+3] = Math.max(0, d[i+3] - 150);
       continue;
    }

    // Compute HSL lightness & saturation for the remaining cake pixels
    const rn = r / 255, gn = g / 255, bn = b / 255;
    const max = Math.max(rn, gn, bn);
    const min = Math.min(rn, gn, bn);
    const l = (max + min) / 2;
    const delta = max - min;
    const s = delta === 0 ? 0 : delta / (1 - Math.abs(2 * l - 1));

    // --- Frosting detection ---
    let strengthL = (l - 0.25) * 2.5; 
    strengthL = Math.max(0, Math.min(1, strengthL));
    
    let strengthS = 1 - (s * 2.5); 
    strengthS = Math.max(0, Math.min(1, strengthS));
    
    const strength = strengthL * strengthS * 0.95;

    if (strength > 0.05) {
      const adjustedL = Math.min(1, l * (1 + (ts * 0.2))); 
      
      let newR, newG, newB;
      if (ts === 0) {
        newR = newG = newB = adjustedL;
      } else {
        const q = adjustedL < 0.5 ? adjustedL * (1 + ts) : adjustedL + ts - adjustedL * ts;
        const p = 2 * adjustedL - q;
        newR = hue2rgb(p, q, th + 1/3);
        newG = hue2rgb(p, q, th);
        newB = hue2rgb(p, q, th - 1/3);
      }

      newR = Math.min(255, newR * 255);
      newG = Math.min(255, newG * 255);
      newB = Math.min(255, newB * 255);

      d[i]     = Math.round(r + (newR - r) * strength);
      d[i + 1] = Math.round(g + (newG - g) * strength);
      d[i + 2] = Math.round(b + (newB - b) * strength);
    }
  }

  ctx.putImageData(imageData, 0, 0);
  return imageData;
}

export function CakePreview({
  shape,
  layers,
  color,
  toppings,
  message,
  textColor,
  textFont,
  flavorName,
  baseImage,
}: CakePreviewProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [canvasReady, setCanvasReady] = useState(false);
  const cakeImage = useMemo(() => getCakeImage(shape, layers), [shape, layers]);
  const isArabic = (text: string) => /[\u0600-\u06FF]/.test(text);

  // Re-run when color OR shape/layers (image src) changes
  useEffect(() => {
    setCanvasReady(false);
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;

    const imgSource = baseImage || cakeImage;
    const safeColor = color || '#F4C2C2';
    const cacheKey = `${imgSource}_${safeColor}`;

    // 1. Check Cache
    if (processedCache.has(cacheKey)) {
      const cachedData = processedCache.get(cacheKey)!;
      canvas.width = cachedData.width;
      canvas.height = cachedData.height;
      ctx.putImageData(cachedData, 0, 0);
      setCanvasReady(true);
      return;
    }

    // 2. Load image and process
    const img = new Image();
    img.src = imgSource;
    img.crossOrigin = "anonymous";

    img.onload = () => {
      const resultData = processCakeImage(ctx, img, safeColor);
      processedCache.set(cacheKey, resultData);
      
      // Limit cache size to prevent memory leaks (e.g. keep last 20)
      if (processedCache.size > 20) {
        const firstKey = processedCache.keys().next().value;
        if (firstKey !== undefined) processedCache.delete(firstKey);
      }
      
      setCanvasReady(true);
    };

    img.onerror = () => {
      // Fallback
      setCanvasReady(true);
    };
  }, [baseImage, cakeImage, color]);

  // Ambient glow color derived from selection
  const glowColor = useMemo(() => {
    const [r, g, b] = parseHex(color || '#F4C2C2');
    return `rgba(${r},${g},${b},0.28)`;
  }, [color]);

  const hasToppings = toppings.length > 0 && !toppings.includes('none');

  return (
    <div
      className="relative w-full flex items-center justify-center"
      style={{ height: 340 }}
    >
      {/* Ambient glow */}
      <div
        className="absolute inset-0 pointer-events-none rounded-full transition-all duration-700"
        style={{
          background: `radial-gradient(ellipse 65% 50% at 50% 58%, ${glowColor} 0%, transparent 68%)`,
        }}
      />

      {/* Ground shadow */}
      <div
        className="absolute pointer-events-none"
        style={{
          bottom: 10,
          left: '50%',
          transform: 'translateX(-50%)',
          width: 210,
          height: 18,
          background: 'radial-gradient(ellipse, rgba(0,0,0,0.18) 0%, transparent 75%)',
          filter: 'blur(8px)',
        }}
      />

      {/* Canvas — the photorealistic cake with chroma key and frosting recolored */}
      <div
        className="relative transition-opacity duration-500"
        style={{ width: 280, height: 300, opacity: canvasReady ? 1 : 0 }}
      >
        <canvas
          ref={canvasRef}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'contain',
            display: 'block',
            transform: 'scale(1.2) translateY(-5%)', // Matched the scale used previously for baseImage
          }}
        />

        {/* Specular shine overlay */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              'radial-gradient(ellipse 55% 42% at 34% 28%, rgba(255,255,255,0.18) 0%, transparent 60%)',
            mixBlendMode: 'screen',
          }}
        />

        {/* Topping warmth hint */}
        {hasToppings && (
          <div
            className="absolute pointer-events-none transition-opacity duration-500"
            style={{
              top: '8%',
              left: '20%',
              right: '20%',
              height: '20%',
              background:
                'radial-gradient(ellipse, rgba(160,40,40,0.18) 0%, transparent 70%)',
            }}
          />
        )}

        {/* Dynamic Toppings Scattering Engine */}
        {toppings && toppings.map(t => t !== 'none' && (
          <div key={t} className="absolute pointer-events-none" style={{
            top: '8%', left: '20%', right: '20%', height: '32%',
            transform: 'perspective(250px) rotateX(15deg)'
          }}>
            <ToppingScatter toppingId={t} shape={shape} />
          </div>
        ))}

        {/* Piped message */}
        {message && (
          <div
            className="absolute pointer-events-none flex items-center justify-center"
            style={{
              top: '10%',
              left: '10%',
              right: '10%',
              height: '24%',
              transform: 'perspective(250px) rotateX(22deg)',
              transformOrigin: 'center bottom',
            }}
          >
            <span
              style={{
                color: textColor || '#2D1505',
                fontFamily:
                  textFont === 'Script'
                    ? "'Dancing Script', cursive"
                    : textFont === 'Modern'
                    ? "'Inter', sans-serif"
                    : isArabic(message)
                    ? "'Aref Ruqaa', serif"
                    : "'Playfair Display', serif",
                fontSize: isArabic(message) ? '13px' : '15px',
                fontWeight: 700,
                textAlign: 'center',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                maxWidth: '100%',
                textShadow:
                  '0 1px 0 rgba(255,255,255,0.3), 0 -1px 0 rgba(0,0,0,0.2), 1px 1px 3px rgba(0,0,0,0.35)',
                letterSpacing: '0.8px',
              }}
            >
              {message.length > 20 ? message.slice(0, 20) + '…' : message}
            </span>
          </div>
        )}
      </div>

      {/* Sparkles */}
      <div className="absolute top-8 right-14 w-2 h-2 rounded-full bg-white shadow-[0_0_10px_4px_rgba(255,255,255,0.8)] animate-pulse pointer-events-none" />
      <div className="absolute bottom-16 left-12 w-1.5 h-1.5 rounded-full bg-white shadow-[0_0_8px_3px_rgba(255,255,255,0.7)] animate-pulse pointer-events-none" style={{ animationDelay: '0.9s' }} />
      <div className="absolute top-1/2 right-8 w-1 h-1 rounded-full bg-white shadow-[0_0_6px_2px_rgba(255,255,255,0.6)] animate-pulse pointer-events-none" style={{ animationDelay: '1.6s' }} />
    </div>
  );
}
