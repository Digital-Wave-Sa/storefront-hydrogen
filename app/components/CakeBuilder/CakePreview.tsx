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
  currentStep?: number;
  cakeAttributes?: any[];
  toppingDesigns?: any[];
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

function checkIsCakeFrosting(
  shape: string,
  view: string,
  rx: number,
  ry: number,
  r: number,
  g: number,
  b: number
): boolean {
  // Bounding check to avoid canvas border artifacts
  if (rx < 0.01 || rx > 0.99 || ry < 0.02 || ry > 0.98) return false;

  // Exclude purple board and gold logo at the bottom of the tray (ry >= 0.72)
  if (ry >= 0.72) {
    const isPurple = (g < r * 0.88 && g < b * 0.88 && (r > 35 || b > 35)) ||
                     (r < 115 && g < 95 && b > 95) ||
                     (g < r && g < b && Math.max(r, g, b) < 145);
    if (isPurple) return false;

    const isGold = (r > 160 && g > 130 && b < 130 && rx >= 0.60);
    if (isGold) return false;
  }

  // Cover 100% of the cake frosting surface across full width
  return true;
}

  return false;
}

function getStandardShapeAsset(view: 'front' | 'top' | 'sliced', flavorName: string): string {
  const normFlavor = flavorName.toLowerCase();
  
  if (normFlavor.includes('chocolate') || normFlavor.includes('شوكولاتة')) {
    if (view === 'front') return '/cake/flavors/chocolate/chocolate-normal-view.png';
    if (view === 'top') return '/cake/flavors/chocolate/chocolate-top-view.png';
    if (view === 'sliced') return '/cake/flavors/chocolate/chocolate-sliced-view.png';
  }
  
  if (normFlavor.includes('red-velvet') || normFlavor.includes('red velvet') || normFlavor.includes('redvelvet') || normFlavor.includes('ريد فيلفيت')) {
    if (view === 'front') return '/cake/flavors/redvelvet/redvelvet-normal-view.png';
    if (view === 'top') return '/cake/flavors/redvelvet/redvelvet-top-view.png';
    if (view === 'sliced') return '/cake/flavors/redvelvet/redvelvet-sliced.png';
  }
  
  if (normFlavor.includes('nutella') || normFlavor.includes('نوتيلا')) {
    if (view === 'front') return '/cake/flavors/nutella/nutella-normal-view.png';
    if (view === 'top') return '/cake/flavors/nutella/nutella-top-view.png';
    if (view === 'sliced') return '/cake/flavors/nutella/nutella-sliced.png';
  }
  
  // Default to vanilla
  if (view === 'front') return '/cake/flavors/vanilla/vanilla-normal-view.png';
  if (view === 'top') return '/cake/flavors/vanilla/vanilla-top-view.png';
  if (view === 'sliced') return '/cake/flavors/vanilla/vanilla-sliced-view.png';
  
  return '/cake/shapes/small-standard-normal-view.png';
}


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
  setView,
  currentStep = 1,
  cakeAttributes = [],
  toppingDesigns = []
}: CakePreviewProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  
  const supportedViews = useMemo(() => {
    const shapeMatch = cakeAttributes?.find(attr => {
      const isShapeType = attr.attributeType?.value?.toLowerCase() === 'shape' || attr.attributeType?.value?.toLowerCase() === 'base';
      if (!isShapeType) return false;
      const shopifyName = (attr.nameEn?.value || '').toLowerCase().replace(/[-_]/g, ' ');
      const cleanShape = (shape || '').toLowerCase().replace(/[-_]/g, ' ');
      return attr.id === shape || cleanShape === shopifyName || (shopifyName && cleanShape.includes(shopifyName)) || (cleanShape && shopifyName.includes(cleanShape));
    });

    const hasTop = !!(shapeMatch?.imageTop?.reference?.image?.url || ['classic_round', 'standard', 'mini_cake', 'small_standard', 'circle'].includes(shape || ''));
    const hasSliced = !!(shapeMatch?.imageSliced?.reference?.image?.url || ['classic_round', 'standard', 'mini_cake', 'small_standard', 'circle'].includes(shape || ''));

    return {
      front: true,
      top: hasTop,
      sliced: hasSliced,
    };
  }, [shape, cakeAttributes]);

  // Sync view selection with isCutaway prop (from step 2 toggle)
  useEffect(() => {
    if (isCutaway && supportedViews.sliced && setView) {
      setView('sliced');
    } else if (!isCutaway && view === 'sliced' && setView) {
      setView('front');
    }
  }, [isCutaway, supportedViews, setView]);

  // Get active image sources based on shape, view, topping dynamically from Shopify Metaobjects
  const activeSources = useMemo(() => {
    let shapeImg = '';
    
    // Find the current shape attribute
    const shapeMatch = cakeAttributes?.find(attr => {
      const isShapeType = attr.attributeType?.value?.toLowerCase() === 'shape' || attr.attributeType?.value?.toLowerCase() === 'base';
      if (!isShapeType) return false;
      const shopifyName = (attr.nameEn?.value || '').toLowerCase().replace(/[-_]/g, ' ');
      const cleanShape = (shape || '').toLowerCase().replace(/[-_]/g, ' ');
      return attr.id === shape || cleanShape === shopifyName || (shopifyName && cleanShape.includes(shopifyName)) || (cleanShape && shopifyName.includes(cleanShape));
    });

    // Check if Shopify has the shape image uploaded
    let resolvedShapeImg = undefined;
    if (shapeMatch) {
      if (view === 'top' && shapeMatch.imageTop?.reference?.image?.url) {
        resolvedShapeImg = shapeMatch.imageTop.reference.image.url;
      } else if (view === 'sliced' && shapeMatch.imageSliced?.reference?.image?.url) {
        resolvedShapeImg = shapeMatch.imageSliced.reference.image.url;
      } else if (view === 'front' && shapeMatch.imageFront?.reference?.image?.url) {
        resolvedShapeImg = shapeMatch.imageFront.reference.image.url;
      }
    }

    if (resolvedShapeImg) {
      shapeImg = resolvedShapeImg;
    } else {
      shapeImg = '';
    }

    const toppingId = toppings?.[0]?.id || '';
    let toppingImg = undefined;

    // Resolve topping from Shopify Metaobjects via connecting design metaobjects
    const toppingMatch = cakeAttributes?.find(attr => (attr.attributeType?.value?.toLowerCase() === 'topping' || attr.attributeType?.value?.toLowerCase() === 'style') && (attr.id === toppingId || attr.nameEn?.value?.toLowerCase() === toppingId.toLowerCase() || attr.nameEn?.value?.toLowerCase()?.replace(/[-_\s]+/g, ' ') === toppingId.toLowerCase()?.replace(/[-_\s]+/g, ' ')));
    
    let resolvedToppingImg = undefined;
    if (toppingMatch && shapeMatch && toppingDesigns?.length) {
      const design = toppingDesigns.find(d => {
        const tRefId = d.topping?.reference?.id;
        const sRefId = d.shape?.reference?.id;
        return tRefId && sRefId && tRefId === toppingMatch.id && sRefId === shapeMatch.id;
      });
      if (design) {
        resolvedToppingImg = view === 'top' && design.imageTop?.reference?.image?.url
          ? design.imageTop.reference.image.url
          : view === 'sliced' && design.imageSliced?.reference?.image?.url
            ? design.imageSliced.reference.image.url
            : design.imageFront?.reference?.image?.url;
      }
    }

    if (resolvedToppingImg) {
      toppingImg = resolvedToppingImg;
    } else {
      toppingImg = undefined;
    }

    let tintImg = undefined;
    // Only use static local fallback tint overlay if NO custom Shopify shape image was uploaded
    if (view === 'front' && !resolvedShapeImg) {
      if (shape === 'classic_round') {
        tintImg = '/cake/shapes/classic-round-tint.png';
      } else if (shape === 'standard') {
        tintImg = '/cake/shapes/standard-tint.png';
      } else if (shape === 'mini_cake') {
        tintImg = '/cake/shapes/mini-cake-tint.png';
      } else if (shape === 'small_standard') {
        tintImg = '/cake/shapes/small-standard-normal-view-tint.png';
      }
    }

    return {
      shapeImg,
      tintImg,
      toppingImg,
      toppingId
    };
  }, [shape, view, toppings, flavorName, currentStep, cakeAttributes, toppingDesigns]);

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

    const { shapeImg, tintImg, toppingImg, toppingId } = activeSources;

    const imagesToLoad: { key: string; src: string }[] = [];
    if (shapeImg) {
      imagesToLoad.push({ key: 'shape', src: shapeImg });
    }
    if (tintImg) {
      imagesToLoad.push({ key: 'tint', src: tintImg });
    }
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
      const isRoundShape = shape === 'standard' || shape === 'circle' || shape === 'classic_round' || shape === 'mini_cake' || shape === 'small_standard';
      if (isRoundShape) {
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
          if (loadedImages.tint) {
            // Draw the base shape on the main canvas directly (uncolored, keeping shadows/board)
            ctx.drawImage(loadedImages.shape, cakeX, cakeY, cakeW, cakeH);
            
            // Draw the tint layer on the offscreen canvas to color it
            oCtx.drawImage(loadedImages.tint, cakeX, cakeY, cakeW, cakeH);
            
            if (color && color.toLowerCase() !== '#fdf5e6') {
              const imgData = oCtx.getImageData(0, 0, width, height);
              const data = imgData.data;

              let hex = color.replace('#', '');
              if (hex.length === 3) {
                hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
              }
              const targetR = parseInt(hex.substring(0, 2) || '255', 16);
              const targetG = parseInt(hex.substring(2, 4) || '255', 16);
              const targetB = parseInt(hex.substring(4, 6) || '255', 16);

              for (let i = 0; i < data.length; i += 4) {
                const r = data[i];
                const g = data[i + 1];
                const b = data[i + 2];
                const a = data[i + 3];
                if (a === 0) continue;

                // Color the frosting tint layer using multiply blend logic
                data[i] = (r * targetR) / 255;
                data[i + 1] = (g * targetG) / 255;
                data[i + 2] = (b * targetB) / 255;
              }
              oCtx.putImageData(imgData, 0, 0);
            }
            
            // Draw the colored frosting tint layer on top of the main canvas
            ctx.drawImage(offscreen, 0, 0);
            
          } else {
            // FALLBACK: Color the shape image directly
            oCtx.drawImage(loadedImages.shape, cakeX, cakeY, cakeW, cakeH);

            // Apply selected color if not default classic white
            if (color && color.toLowerCase() !== '#fdf5e6') {
              const imgData = oCtx.getImageData(0, 0, width, height);
              const data = imgData.data;

              // Parse hex color robustly
              let hex = color.replace('#', '');
              if (hex.length === 3) {
                hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
              }
              const targetR = parseInt(hex.substring(0, 2) || '255', 16);
              const targetG = parseInt(hex.substring(2, 4) || '255', 16);
              const targetB = parseInt(hex.substring(4, 6) || '255', 16);

              for (let i = 0; i < data.length; i += 4) {
                const r = data[i];
                const g = data[i + 1];
                const b = data[i + 2];
                const a = data[i + 3];
                if (a === 0) continue;

                const pixelIndex = i / 4;
                const x = pixelIndex % width;
                const y = Math.floor(pixelIndex / width);

                const relativeX = (x - cakeX) / cakeW;
                const relativeY = (y - cakeY) / cakeH;

                // Determine if pixel is cake frosting based on view and relative vertical position
                let isCake = checkIsCakeFrosting(shape, view, relativeX, relativeY, r, g, b);

                if (isCake) {
                  // Apply color using multiply blend logic
                  data[i] = (r * targetR) / 255;
                  data[i + 1] = (g * targetG) / 255;
                  data[i + 2] = (b * targetB) / 255;
                }
              }
              oCtx.putImageData(imgData, 0, 0);
            }

            // Blended output to main canvas
            ctx.drawImage(offscreen, 0, 0);
          }
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

      // 5. Custom printed photo is attached to order but not rendered on cake preview as per user request

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
