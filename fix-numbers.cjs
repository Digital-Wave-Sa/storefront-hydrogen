const fs = require('fs');
const path = 'app/routes/($locale).products.$handle.tsx';
let data = fs.readFileSync(path, 'utf8');

// Replace all occurrences of conditional locale to 'en-US'
data = data.replace(/new Intl\.NumberFormat\(locale === 'en' \? 'en-US' : 'ar-EG'/g, "new Intl.NumberFormat('en-US'");

// Replace all occurrences of hardcoded 'ar-EG' (except for toLocaleDateString which we don't touch unless we want to)
data = data.replace(/new Intl\.NumberFormat\('ar-EG'\)/g, "new Intl.NumberFormat('en-US')");

fs.writeFileSync(path, data);
console.log('Done replacing NumberFormats');
