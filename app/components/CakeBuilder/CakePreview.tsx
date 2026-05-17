import React from 'react';

interface CakePreviewProps {
  shape: string;
  layers: number;
  color: string;
  secondaryColor?: string;
  message?: string;
}

export function CakePreview({ shape, layers, color, secondaryColor, message }: CakePreviewProps) {
  // We use CSS masking and blend modes to dye the realistic cake photo
  
  // A simple regex to detect Arabic characters
  const isArabic = (text: string) => /[\u0600-\u06FF]/.test(text);
  
  return (
    <div className="relative w-full h-[320px] flex items-center justify-center animate-float">
      
      {/* 
        The Cake Compositing Engine 
        We use a transparent base image and apply a color overlay using mix-blend-mode.
      */}
      <div className="relative w-64 h-64 flex flex-col items-center justify-end z-10 transition-transform duration-700">
        
        {/* Shadow under the cake */}
        <div className="absolute -bottom-4 w-56 h-8 bg-black/20 rounded-[100%] blur-md z-0"></div>

        {/* Dynamic Layers Engine */}
        <div className="relative z-10 flex flex-col items-center pb-4">
          
          {/* Base Layer Component */}
          <div className="relative w-56 h-56 transition-all duration-700 ease-in-out hover:scale-105">
            {/* 1. Original Image (Luminosity / Texture Base) */}
            <img 
              src="/images/cake-builder/plain-cake.png" 
              alt="Cake Base"
              className="absolute inset-0 w-full h-full object-contain z-10"
              style={{ filter: 'contrast(1.1) brightness(0.95)' }}
            />
            
            {/* 2. Color Tint Layer (Multiply) */}
            {/* This layer applies the deep color while preserving dark shadows */}
            <div 
              className="absolute inset-0 w-full h-full z-20"
              style={{
                backgroundColor: color,
                mixBlendMode: 'multiply',
                maskImage: 'url(/images/cake-builder/plain-cake.png)',
                maskSize: 'contain',
                maskRepeat: 'no-repeat',
                maskPosition: 'center',
                WebkitMaskImage: 'url(/images/cake-builder/plain-cake.png)',
                WebkitMaskSize: 'contain',
                WebkitMaskRepeat: 'no-repeat',
                WebkitMaskPosition: 'center'
              }}
            ></div>

            {/* 3. Highlight Layer (Screen) */}
            {/* This layer brings back the shiny frosting highlights that multiply destroys */}
            <div 
              className="absolute inset-0 w-full h-full z-30 opacity-60"
              style={{
                backgroundColor: color,
                mixBlendMode: 'screen',
                maskImage: 'url(/images/cake-builder/plain-cake.png)',
                maskSize: 'contain',
                maskRepeat: 'no-repeat',
                maskPosition: 'center',
                WebkitMaskImage: 'url(/images/cake-builder/plain-cake.png)',
                WebkitMaskSize: 'contain',
                WebkitMaskRepeat: 'no-repeat',
                WebkitMaskPosition: 'center'
              }}
            ></div>

            {/* --- 4. 3D Text Overlay Engine --- */}
            {message && (
              <div 
                className="absolute inset-0 z-40 flex items-center justify-center pointer-events-none"
                style={{
                  // Position the text on the "top" surface of the cake
                  top: '-35%',
                  // CSS Magic to lay the text flat on a 3D plane
                  transform: 'rotateX(55deg) rotateZ(0deg)',
                  transformOrigin: 'center'
                }}
              >
                <span 
                  className="text-center font-bold px-4 break-words leading-tight"
                  style={{
                    color: '#3D2B1F', // Dark chocolate frosting color
                    // Dynamic font based on language
                    fontFamily: isArabic(message) ? "'Aref Ruqaa', 'Cairo', serif" : "'Dancing Script', 'Brush Script MT', cursive",
                    fontSize: isArabic(message) ? '34px' : '42px',
                    // Create a thick 3D frosting shadow effect
                    textShadow: `
                      -1px -1px 0 rgba(255,255,255,0.3),
                      1px 1px 1px rgba(0,0,0,0.6),
                      2px 2px 2px rgba(0,0,0,0.4),
                      3px 3px 3px rgba(0,0,0,0.2)
                    `,
                    maxWidth: '180px',
                    lineHeight: '1.2',
                    opacity: 0.9
                  }}
                >
                  {message}
                </span>
              </div>
            )}
            
          </div>

        </div>
        
      </div>
      
      {/* Decorative Sparkles */}
      <div className="absolute top-10 right-10 w-3 h-3 bg-white rounded-full shadow-[0_0_15px_rgba(255,255,255,0.8)] animate-pulse"></div>
      <div className="absolute bottom-20 left-10 w-2 h-2 bg-white rounded-full shadow-[0_0_10px_rgba(255,255,255,0.8)] animate-pulse" style={{ animationDelay: '1s' }}></div>
      <div className="absolute top-1/2 left-1/4 w-1.5 h-1.5 bg-white rounded-full shadow-[0_0_8px_rgba(255,255,255,0.8)] animate-pulse" style={{ animationDelay: '0.5s' }}></div>

    </div>
  );
}
