import React from 'react';

interface CakePreviewProps {
  shape: string;
  layers: number;
  color: string;
  secondaryColor: string;
}

export function CakePreview({ shape, layers, color, secondaryColor }: CakePreviewProps) {
  // We use the provided high-quality asset as the base
  const cakeImageUrl = '/images/cake-builder/plain-cake.png';

  return (
    <div className="cake-stage relative w-full h-full flex flex-col items-center justify-center">
      
      {/* Lighting / Environment Glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] bg-[#234745]/5 rounded-full blur-[100px] -z-30"></div>

      {/* The Floating Image Container */}
      <div className="relative flex flex-col items-center justify-center animate-float scale-110 h-[350px] w-[350px]">
        
        {/* 1. The Base Photo-Realistic Image (Provides texture, shadows, and highlights) */}
        <img 
          src={cakeImageUrl} 
          alt="Custom Cake Preview" 
          className="absolute inset-0 w-full h-full object-contain transition-transform duration-700 z-10"
          style={{
            transform: `scale(${1 + (layers * 0.05)})`
          }}
        />

        {/* 2. The Dynamic Color Dye (Uses the image itself as an exact stencil) */}
        <div 
          className="absolute inset-0 w-full h-full z-20 transition-colors duration-1000 ease-in-out pointer-events-none"
          style={{
            backgroundColor: color,
            maskImage: `url(${cakeImageUrl})`,
            maskSize: 'contain',
            maskRepeat: 'no-repeat',
            maskPosition: 'center',
            WebkitMaskImage: `url(${cakeImageUrl})`,
            WebkitMaskSize: 'contain',
            WebkitMaskRepeat: 'no-repeat',
            WebkitMaskPosition: 'center',
            mixBlendMode: 'multiply',
            opacity: 0.85,
            transform: `scale(${1 + (layers * 0.05)})`
          }}
        ></div>
        
        {/* 3. Highlight restoration (Optional: brings back some gloss lost during multiply) */}
        <div 
          className="absolute inset-0 w-full h-full z-30 transition-colors duration-1000 ease-in-out pointer-events-none"
          style={{
            backgroundColor: 'rgba(255,255,255,0.1)',
            maskImage: `url(${cakeImageUrl})`,
            maskSize: 'contain',
            maskRepeat: 'no-repeat',
            maskPosition: 'center',
            WebkitMaskImage: `url(${cakeImageUrl})`,
            WebkitMaskSize: 'contain',
            WebkitMaskRepeat: 'no-repeat',
            WebkitMaskPosition: 'center',
            mixBlendMode: 'screen',
            transform: `scale(${1 + (layers * 0.05)})`
          }}
        ></div>

      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-15px); }
        }
        .animate-float {
          animation: float 6s ease-in-out infinite;
        }
      `}} />
    </div>
  );
}
