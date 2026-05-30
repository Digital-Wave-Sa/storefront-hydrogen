import React, { useMemo, useState, useEffect } from 'react';

interface CakePreviewProps {
  shape?: string;
  layers?: number;
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
}

export function CakePreview({
  shape,
  layers,
  color,
  toppings,
  message,
  flavorName,
  isCutaway = false,
  scale = 1.0,
  isMini = false,
  textColor,
  textFont,
  uploadedImage
}: CakePreviewProps) {

  const toppingsStr = JSON.stringify(toppings);
  
  const config = useMemo(() => {
    // Calculate shape
    let shapeType = 'circle';
    if (shape === 'square') shapeType = 'square';
    if (shape === 'rectangle' || shape === 'sheet') shapeType = 'sheet';
    if (shape === 'heart') shapeType = 'heart';
    if (shape === 'star' || shape === 'hexagon' || shape === 'standard') shapeType = 'standard'; // Fallback for complex shapes

    // Setup tiers based on layers
    const numTiers = layers === 'three' ? 3 : layers === 'two' ? 2 : 1;
    const tiersArr = Array.from({ length: numTiers }).map(() => ({
      color: color || '#fdf5e6'
    }));

    // Find topping style from selected toppings
    let toppingStyle = 'basic';
    if (toppings && toppings.length > 0) {
      const knownStyles = ['birthday-candles', 'cherry-choco', 'retro-cherries', 'purple-star', 'rose-fields', 'lemon-retro', 'spider-retro', 'witches-dont-age', 'queen-of-hearts', 'snoopys-day', 'sweet-cherry', 'aries-queen', 'glitter-charm', 'healing', 'cancer-glow', '20s-retro', 'rip-20s', 'retro-skies', 'gemini-vibes', 'leo-season', 'pisces-vibes', 'scorpio-vibes', 'libra-vibes', 'capricorn', 'taurus', 'retro-ribbons', 'sweet-retro', 'whos-33', 'sprinkles', 'basic'];
      
      const exactMatch = toppings.find(t => knownStyles.includes(t.id));
      
      if (exactMatch) {
        toppingStyle = exactMatch.id;
      } else {
        const toppingNames = toppings.map(t => (t.name || '').toLowerCase());
        
        if (toppingNames.some(n => n.includes('cherry') && n.includes('choco'))) toppingStyle = 'cherry-choco';
        else if (toppingNames.some(n => n.includes('retro') && n.includes('cherry'))) toppingStyle = 'retro-cherries';
        else if (toppingNames.some(n => n.includes('purple') || n.includes('star'))) toppingStyle = 'purple-star';
        else if (toppingNames.some(n => n.includes('rose'))) toppingStyle = 'rose-fields';
        else if (toppingNames.some(n => n.includes('lemon'))) toppingStyle = 'lemon-retro';
        else if (toppingNames.some(n => n.includes('spider'))) toppingStyle = 'spider-retro';
        else if (toppingNames.some(n => n.includes('witch'))) toppingStyle = 'witches-dont-age';
        else if (toppingNames.some(n => n.includes('queen') && n.includes('heart'))) toppingStyle = 'queen-of-hearts';
        else if (toppingNames.some(n => n.includes('snoopy'))) toppingStyle = 'snoopys-day';
        else if (toppingNames.some(n => n.includes('sweet') && n.includes('cherry'))) toppingStyle = 'sweet-cherry';
        else if (toppingNames.some(n => n.includes('aries'))) toppingStyle = 'aries-queen';
        else if (toppingNames.some(n => n.includes('glitter'))) toppingStyle = 'glitter-charm';
        else if (toppingNames.some(n => n.includes('healing'))) toppingStyle = 'healing';
        else if (toppingNames.some(n => n.includes('cancer'))) toppingStyle = 'cancer-glow';
        else if (toppingNames.some(n => n.includes('20s') && n.includes('retro'))) toppingStyle = '20s-retro';
        else if (toppingNames.some(n => n.includes('20s'))) toppingStyle = 'rip-20s';
        else if (toppingNames.some(n => n.includes('retro') && n.includes('skies'))) toppingStyle = 'retro-skies';
        else if (toppingNames.some(n => n.includes('gemini'))) toppingStyle = 'gemini-vibes';
        else if (toppingNames.some(n => n.includes('leo'))) toppingStyle = 'leo-season';
        else if (toppingNames.some(n => n.includes('pisces'))) toppingStyle = 'pisces-vibes';
        else if (toppingNames.some(n => n.includes('scorpio'))) toppingStyle = 'scorpio-vibes';
        else if (toppingNames.some(n => n.includes('libra'))) toppingStyle = 'libra-vibes';
        else if (toppingNames.some(n => n.includes('capricorn'))) toppingStyle = 'capricorn';
        else if (toppingNames.some(n => n.includes('taurus'))) toppingStyle = 'taurus';
        else if (toppingNames.some(n => n.includes('retro') && n.includes('ribbon'))) toppingStyle = 'retro-ribbons';
        else if (toppingNames.some(n => n.includes('sweet') && n.includes('retro'))) toppingStyle = 'sweet-retro';
        else if (toppingNames.some(n => n.includes('who') && n.includes('33'))) toppingStyle = 'whos-33';
        else toppingStyle = 'sprinkles'; // Fallback to sprinkles if any topping is selected
      }
    }

    let flavorColor = '#f5deb3';
    if (flavorName?.toLowerCase().includes('chocolate')) flavorColor = '#4a2511';
    if (flavorName?.toLowerCase().includes('red velvet')) flavorColor = '#8b0000';

    return {
      tiers: tiersArr,
      toppingStyle,
      shapeType,
      scale,
      customText: message,
      isCutaway,
      flavorColor,
      textColor,
      textFont,
      uploadedImage
    };
  }, [shape, layers, color, toppingsStr, message, flavorName, isCutaway, textColor, textFont, uploadedImage]);

  const [Cake3D, setCake3D] = useState<any>(null);
  useEffect(() => {
    import('./Cake3DCanvas').then((mod) => {
      setCake3D(() => mod.default);
    });
  }, []);

  return (
    <div dir="ltr" className={`cake-preview-wrapper w-full h-full relative cursor-grab active:cursor-grabbing`}>
      {Cake3D ? (
        <Cake3D config={config} isMini={isMini} />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#c6a386]"></div>
        </div>
      )}
    </div>
  );
}
