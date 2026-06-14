import fs from 'fs';
import path from 'path';

function walk(dir) {
    let results = [];
    const list = fs.readdirSync(dir);
    list.forEach(function(file) {
        file = path.join(dir, file);
        const stat = fs.statSync(file);
        if (stat && stat.isDirectory()) { 
            results = results.concat(walk(file));
        } else { 
            if (file.endsWith('.tsx') || file.endsWith('.jsx') || file.endsWith('.ts')) {
                results.push(file);
            }
        }
    });
    return results;
}

const files = walk('./app');

for (const file of files) {
    let data = fs.readFileSync(file, 'utf8');
    let original = data;
    
    // Replace all instances of ar-EG and ar-SA in NumberFormat
    data = data.replace(/new Intl\.NumberFormat\([^)]*'ar-EG'[^)]*\)/g, "new Intl.NumberFormat('en-US')");
    data = data.replace(/new Intl\.NumberFormat\([^)]*'ar-SA'[^)]*,/g, "new Intl.NumberFormat('en-US',");
    data = data.replace(/new Intl\.NumberFormat\([^)]*'ar-SA'[^)]*\)/g, "new Intl.NumberFormat('en-US')");

    // Account specifically for the Payments page currency formatting:
    // new Intl.NumberFormat(isEn ? 'en-SA' : 'ar-SA', { style: 'currency', currency: 'SAR' })
    data = data.replace(/new Intl\.NumberFormat\(isEn \? 'en-SA' : 'ar-SA'/g, "new Intl.NumberFormat('en-US'");

    if (original !== data) {
        fs.writeFileSync(file, data);
        console.log(`Updated ${file}`);
    }
}
console.log('Done replacing NumberFormat globally');
