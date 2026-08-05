import fs from 'fs';
const fname = 'app/routes/($locale).promotions.tsx';
const content = fs.readFileSync(fname, 'utf8');

const split1 = content.indexOf('{/* 3. BOGO & Branch Location Offer Section */}');
const split2 = content.indexOf('{/* 2. Hero Offer Card */}');
const split3 = content.indexOf('{/* 3. BOGO Banner (Buy 1 Get 1 Free) */}');
const split4 = content.indexOf('{/* 4. Two Grid Cards Side-by-Side */}');

if (split1 > -1 && split2 > -1 && split3 > -1 && split4 > -1) {
  const topPart = content.substring(0, split1);
  const bogoNewSection = content.substring(split1, split2);
  const heroSection = content.substring(split2, split3);
  const bottomPart = content.substring(split4);
  
  let newBogoSection = bogoNewSection.replace('grid-cols-2', 'grid-cols-[1.5fr_1fr]');
  
  const finalContent = topPart + heroSection + newBogoSection + bottomPart;
  fs.writeFileSync(fname, finalContent, 'utf8');
  console.log('Successfully reordered and cleaned up duplicate BOGO section.');
} else {
  console.log('Failed to find all section boundaries.');
  console.log('split1:', split1, 'split2:', split2, 'split3:', split3, 'split4:', split4);
}
