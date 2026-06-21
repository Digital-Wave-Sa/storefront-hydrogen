import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Eye, Layers, Compass } from 'lucide-react';

interface CakePreviewProps {
  shape?: string;
  layers?: number | string;
  color: string; // hex
  toppings?: { id: string; name?: string; image?: string }[];
  message?: string;
  textColor?: string;
  textFont?: string;
  flavorName?: string;
  baseImage?: string;
  maskImage?: string;
  isCutaway?: boolean;
  scale?: number;
  isMini?: boolean;
  uploadedImage?: string | null;
  view?: 'front' | 'top' | 'sliced';
  setView?: (v: 'front' | 'top' | 'sliced') => void;
}

// Map shape IDs to their 2D visual assets
const shapeAssets: Record<string, { front: string; top?: string; sliced?: string }> = {
  circle: {
    front: '/cake/shapes/small-standard-normal-view.png',
    top: '/cake/shapes/small-standard-top-view.png',
    sliced: '/cake/shapes/small-standard-sliced-view.png',
  },
  standard: {
    front: '/cake/shapes/small-standard-normal-view.png',
    top: '/cake/shapes/small-standard-top-view.png',
    sliced: '/cake/shapes/small-standard-sliced-view.png',
  },
  heart: {
    front: '/cake/shapes/heart-normal-view.png',
    top: '/cake/shapes/heart-top-view.png',
    sliced: '/cake/shapes/heart-sliced.png',
  },
  square: {
    front: '/cake/shapes/classic-square.png',
  },
  sheet: {
    front: '/cake/shapes/sheet.png',
  }
};

// Map flavor names to their interior sponge textures
const flavorAssets: Record<string, string> = {
  vanilla: '/cake/flavors/vanilla.png',
  chocolate: '/cake/flavors/chocolate.png',
  'red-velvet': '/cake/flavors/red-velvet.png',
  nutella: '/cake/flavors/nutella.png',
};

// Map topping IDs to their layered assets
const toppingAssets: Record<string, { front: string; top?: string; sliced?: string }> = {
  'witches-dont-age': {
    front: '/cake/toppings/witches_dont_age/front.png',
    top: '/cake/toppings/witches_dont_age/top.png',
    sliced: '/cake/toppings/witches_dont_age/sliced.png',
  },
  'witches_dont_age': {
    front: '/cake/toppings/witches_dont_age/front.png',
    top: '/cake/toppings/witches_dont_age/top.png',
    sliced: '/cake/toppings/witches_dont_age/sliced.png',
  }
};

export function CakePreview({
  shape = 'standard',
  layers = 1,
  color,
  toppings,
  message,
  flavorName = 'vanilla',
  isCutaway = false,
  scale = 1.0,
  isMini = false,
  textColor = '#4a2511',
  textFont = 'Classic',
  uploadedImage,
  view = 'front',
  setView
}: CakePreviewProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  
  // Check which views are supported by the active shape
  const supportedViews = useMemo(() => {
    const assets = shapeAssets[shape] || shapeAssets.standard;
    return {
      front: true,
      top: !!assets.top,
      sliced: !!assets.sliced,
    };
  }, [shape]);

  // Sync view selection with isCutaway prop (from step 2 toggle)
  useEffect(() => {
    if (isCutaway && supportedViews.sliced && setView) {
      setView('sliced');
    } else if (!isCutaway && view === 'sliced' && setView) {
      setView('front');
    }
  }, [isCutaway, supportedViews, setView]);

  // Get active image sources based on shape, view, topping
  const activeSources = useMemo(() => {
    const sAssets = shapeAssets[shape] || shapeAssets.standard;
    const shapeImg = view === 'top' && sAssets.top 
      ? sAssets.top 
      : view === 'sliced' && sAssets.sliced 
        ? sAssets.sliced 
        : sAssets.front;

    const toppingId = toppings?.[0]?.id || '';
    const tAssets = toppingAssets[toppingId];
    const toppingImg = tAssets
      ? (view === 'top' && tAssets.top 
          ? tAssets.top 
          : view === 'sliced' && tAssets.sliced 
            ? tAssets.sliced 
            : tAssets.front)
      : undefined;

    return {
      shapeImg,
      toppingImg,
      toppingId
    };
  }, [shape, view, toppings]);

  // Render loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = 800;
    const height = 800;
    canvas.width = width;
    canvas.height = height;

    const { shapeImg, toppingImg, toppingId } = activeSources;

    const imagesToLoad: { key: string; src: string }[] = [];
    imagesToLoad.push({ key: 'shape', src: shapeImg });
    if (toppingImg) {
      imagesToLoad.push({ key: 'topping', src: toppingImg });
    }

    let loadedCount = 0;
    const loadedImages: Record<string, HTMLImageElement> = {};

    if (imagesToLoad.length === 0) {
      ctx.clearRect(0, 0, width, height);
      return;
    }

    imagesToLoad.forEach((item) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        loadedImages[item.key] = img;
        loadedCount++;
        if (loadedCount === imagesToLoad.length) {
          render();
        }
      };
      img.onerror = () => {
        loadedCount++;
        if (loadedCount === imagesToLoad.length) {
          render();
        }
      };
      img.src = item.src;
    });

    function render() {
      if (!ctx) return;
      ctx.clearRect(0, 0, width, height);

      // Define bounding box to center the cake
      let cakeW = 560;
      let cakeH = 560;
      let cakeX = (width - cakeW) / 2;
      let cakeY = (height - cakeH) / 2;

      // Adjust height for aspect ratios of standard/heart shapes
      if (shape === 'standard' || shape === 'circle') {
        cakeH = 560 * (578 / 500); // aspect ratio ~1.156
        cakeY = (height - cakeH) / 2;
        if (view !== 'top') {
          cakeY -= 70; // Center visually in front/sliced view by offsetting empty space on top
        }
      } else if (shape === 'heart') {
        cakeH = 560 * (521 / 500); // aspect ratio ~1.042
        cakeY = (height - cakeH) / 2;
        if (view !== 'top') {
          cakeY -= 70; // Center visually in front/sliced view by offsetting empty space on top
        }
      }

      // 2. Draw cake shape and apply dynamic coloring mask
      if (loadedImages.shape) {
        const offscreen = document.createElement('canvas');
        offscreen.width = width;
        offscreen.height = height;
        const oCtx = offscreen.getContext('2d');
        
        if (oCtx) {
          oCtx.drawImage(loadedImages.shape, cakeX, cakeY, cakeW, cakeH);

          // Apply selected color if not default classic white
          if (color && color.toLowerCase() !== '#fdf5e6') {
            oCtx.globalCompositeOperation = 'source-in';
            oCtx.fillStyle = color;
            oCtx.fillRect(0, 0, width, height);
            
            oCtx.globalCompositeOperation = 'multiply';
            oCtx.drawImage(loadedImages.shape, cakeX, cakeY, cakeW, cakeH);
          }

          // Blended output to main canvas
          ctx.drawImage(offscreen, 0, 0);
        } else {
          ctx.drawImage(loadedImages.shape, cakeX, cakeY, cakeW, cakeH);
        }
      }

      // 3. Draw premium topping layer
      if (loadedImages.topping) {
        ctx.drawImage(loadedImages.topping, cakeX, cakeY, cakeW, cakeH);
      }

      // 4. Render dynamic sprinkles if selected and not witches-dont-age
      if (toppingId === 'sprinkles' || (!toppingImg && toppings?.[0]?.id === 'sprinkles')) {
        drawSprinkles(ctx, cakeX, cakeY, cakeW, cakeH);
      }

      // 5. Render custom printed photo if uploaded
      if (uploadedImage) {
        drawUploadedImage(ctx, cakeX, cakeY, cakeW, cakeH);
      }

      // 6. Draw written frosting message text
      if (message) {
        drawMessage(ctx, width, height, cakeY + cakeH);
      }
    }

    function drawSprinkles(ctx: CanvasRenderingContext2D, cx: number, cy: number, cw: number, ch: number) {
      ctx.save();
      const colors = ['#FF6B6B', '#4D96FF', '#6BCB77', '#FFD93D', '#ECE2E1', '#FF8AAE'];
      
      if (view === 'top') {
        const centerX = cx + cw / 2;
        const centerY = cy + ch / 2;
        for (let i = 0; i < 80; i++) {
          const radius = Math.random() * (cw * 0.3);
          const angle = Math.random() * Math.PI * 2;
          const sx = centerX + Math.cos(angle) * radius;
          const sy = centerY + Math.sin(angle) * radius * 0.7;
          
          ctx.fillStyle = colors[Math.floor(Math.random() * colors.length)];
          ctx.beginPath();
          ctx.ellipse(sx, sy, 3, 7, Math.random() * Math.PI, 0, Math.PI * 2);
          ctx.fill();
        }
      } else {
        const centerX = cx + cw / 2;
        const topY = cy + ch * 0.32;
        for (let i = 0; i < 40; i++) {
          const sx = centerX + (Math.random() - 0.5) * (cw * 0.6);
          const sy = topY + (Math.random() - 0.5) * (ch * 0.08);
          ctx.fillStyle = colors[Math.floor(Math.random() * colors.length)];
          ctx.beginPath();
          ctx.ellipse(sx, sy, 2.5, 6, Math.random() * Math.PI, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      ctx.restore();
    }

    function drawUploadedImage(ctx: CanvasRenderingContext2D, cx: number, cy: number, cw: number, ch: number) {
      const img = new Image();
      img.onload = () => {
        ctx.save();
        const centerX = cx + cw / 2;
        if (view === 'top') {
          const size = cw * 0.45;
          ctx.beginPath();
          ctx.arc(centerX, cy + ch / 2, size / 2, 0, Math.PI * 2);
          ctx.clip();
          ctx.drawImage(img, centerX - size / 2, (cy + ch / 2) - size / 2, size, size);
        } else {
          const sizeW = cw * 0.35;
          const sizeH = ch * 0.25;
          const rx = centerX - sizeW / 2;
          const ry = cy + ch * 0.55;
          
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(rx - 4, ry - 4, sizeW + 8, sizeH + 8);
          ctx.drawImage(img, rx, ry, sizeW, sizeH);
        }
        ctx.restore();
      };
      if (uploadedImage) img.src = uploadedImage;
    }

    function drawMessage(ctx: CanvasRenderingContext2D, w: number, h: number, cakeBottom: number) {
      ctx.save();
      ctx.fillStyle = textColor;
      ctx.textAlign = 'center';
      
      let fontFamily = "'Outfit', sans-serif";
      if (textFont === 'Handwriting') fontFamily = "'Cairo', cursive";
      else if (textFont === 'Modern') fontFamily = "'Outfit', sans-serif";
      
      ctx.font = `bold 28px ${fontFamily}`;
      
      ctx.shadowColor = 'rgba(0,0,0,0.15)';
      ctx.shadowBlur = 4;
      ctx.shadowOffsetX = 1;
      ctx.shadowOffsetY = 3;

      if (view === 'top') {
        ctx.fillText(message!, w / 2, h / 2 + 10);
      } else {
        const bx = w / 2;
        const by = h - 60;
        
        ctx.shadowColor = 'rgba(0,0,0,0.05)';
        ctx.shadowBlur = 10;
        ctx.fillStyle = '#ffffff';
        ctx.strokeStyle = '#294941';
        ctx.lineWidth = 1.5;
        
        const textWidth = ctx.measureText(message!).width;
        const padX = 30;
        const padY = 12;
        
        ctx.beginPath();
        ctx.roundRect(bx - textWidth / 2 - padX, by - 24 - padY, textWidth + padX * 2, 40 + padY * 2, 12);
        ctx.fill();
        ctx.stroke();
        
        ctx.shadowColor = 'transparent';
        ctx.fillStyle = textColor;
        ctx.font = `900 24px ${fontFamily}`;
        ctx.fillText(message!, bx, by + 4);
      }
      ctx.restore();
    }

  }, [activeSources, view, color, message, textColor, textFont, uploadedImage, shape]);

  return (
    <div dir="ltr" className="w-full h-full relative flex items-center justify-center">
      {/* 2D Composited Canvas */}
      <canvas 
        ref={canvasRef} 
        id="cake-3d-canvas" 
        className="w-full h-full max-w-full max-h-full object-contain drop-shadow-xl"
        style={{ width: '100%', height: '100%', aspectRatio: '1/1' }}
      />
    </div>
  );
}
