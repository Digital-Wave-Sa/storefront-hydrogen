import fs from 'fs';

const fname = 'app/routes/($locale).promotions.tsx';
const content = fs.readFileSync(fname, 'utf8');

const split1 = content.indexOf('{/* 3. BOGO & Branch Location Offer Section */}');
const split2 = content.indexOf('{/* 2. Hero Offer Card */}');
const split3 = content.indexOf('{/* 3. BOGO Banner (Buy 1 Get 1 Free) */}');
const split4 = content.indexOf('{/* 4. Two Grid Cards Side-by-Side */}');

if (split1 > -1 && split2 > -1 && split3 > -1 && split4 > -1) {
  // Extract parts
  const topPart = content.substring(0, split1);
  const heroSection = content.substring(split2, split3);
  const lowerBogoBanner = content.substring(split3, split4);
  const bottomPart = content.substring(split4);
  
  // Extract Side-by-Side location section from the original top BOGO
  const upperSection = content.substring(split1, split2);
  const locStart = upperSection.indexOf('{/* Side-by-Side Branch Location Offer Card');
  const locEnd = upperSection.lastIndexOf('</div>');
  
  const locationCardStr = upperSection.substring(locStart, locEnd).trim();

  // Construct the new layout
  // Note: we remove the top BOGO completely. We use the lower BOGO and append the location card.
  
  // Wrap the lower BOGO banner + Location card in a grid
  const newCombinedSection = `
        {/* 3. BOGO & Branch Location Offer Section */}
        <div className={\`w-full \${activeLocationDiscount ? 'grid grid-cols-1 lg:grid-cols-[1.5fr_1fr] gap-6 items-stretch' : ''}\`}>
${lowerBogoBanner.trimEnd()}

          ${locationCardStr}
        </div>

`;

  const finalContent = topPart + heroSection + newCombinedSection + '        ' + bottomPart;
  
  fs.writeFileSync(fname, finalContent, 'utf8');
  console.log('Successfully updated the layout!');
} else {
  console.log('Failed to find all sections.');
}
