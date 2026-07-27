const fs = require('fs');
const path = require('path');

const componentsDir = path.join(__dirname, 'app', 'components');

const filesToFix = [
  'BestSellers.tsx',
  'CustomerReviews.tsx',
  'DesignYourCake.tsx',
  'NewArrivals.tsx',
  'OffersAndDiscounts.tsx',
  'ShopByCategory.tsx',
  'ShopByOccasion.tsx',
  'WhoAreYouGifting.tsx',
  'RamadanBanner.tsx'
];

filesToFix.forEach(file => {
  const filePath = path.join(componentsDir, file);
  if (!fs.existsSync(filePath)) return;
  
  let content = fs.readFileSync(filePath, 'utf8');

  // Standardize font-black to font-bold
  content = content.replace(/className="([^"]*)font-black([^"]*)"/g, 'className="$1font-bold$2"');

  // Fix hardcoded inline styles for Bahij Janna
  // 1. style={{ fontFamily: 'Bahij Janna' }} -> style={!isEn ? { fontFamily: "'Bahij Janna', sans-serif" } : undefined}
  content = content.replace(/style={{ fontFamily: ['"]Bahij Janna['"] }}/g, `style={!isEn ? { fontFamily: "'Bahij Janna', sans-serif" } : undefined}`);
  
  // 2. style={{ fontFamily: "'Bahij Janna', sans-serif" }} -> style={!isEn ? { fontFamily: "'Bahij Janna', sans-serif" } : undefined}
  content = content.replace(/style={{ fontFamily: ['"]'Bahij Janna', sans-serif['"] }}/g, `style={!isEn ? { fontFamily: "'Bahij Janna', sans-serif" } : undefined}`);
  content = content.replace(/style={{ fontFamily: ['"]"Bahij Janna", sans-serif['"] }}/g, `style={!isEn ? { fontFamily: "'Bahij Janna', sans-serif" } : undefined}`);

  // Special case for DesignYourCake.tsx which has a very messy inline style
  if (file === 'DesignYourCake.tsx') {
    content = content.replace(
      /style={{ fontFamily: ['"]'Bahij Janna', sans-serif['"], fontWeight: 700, fontSize: '50px', lineHeight: '100%', letterSpacing: '0%', textAlign: 'center', verticalAlign: 'middle' }}/g,
      `style={!isEn ? { fontFamily: "'Bahij Janna', sans-serif" } : undefined}`
    );
    // Also add text sizes to the className since we removed them from inline styles
    content = content.replace(/className="text-\[#234745\] mb-2"/g, 'className="text-[#234745] mb-2 text-[36px] lg:text-[50px] font-bold leading-none text-center"');
  }

  fs.writeFileSync(filePath, content, 'utf8');
  console.log('Fixed', file);
});
