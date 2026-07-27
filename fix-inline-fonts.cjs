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
            if (file.endsWith('.tsx') || file.endsWith('.jsx')) {
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
    
    // Replace inline styles for GE Dinar One
    data = data.replace(/fontFamily:\s*['"]'GE Dinar One', sans-serif['"]/g, "fontFamily: \"'EnglishDigits', 'GE Dinar One', sans-serif\"");
    data = data.replace(/fontFamily:\s*['"]"GE Dinar One", sans-serif['"]/g, "fontFamily: \"'EnglishDigits', 'GE Dinar One', sans-serif\"");
    
    // Replace inline styles for Bahij Janna
    data = data.replace(/fontFamily:\s*['"]'Bahij Janna', sans-serif['"]/g, "fontFamily: \"'EnglishDigits', 'Bahij Janna', sans-serif\"");
    data = data.replace(/fontFamily:\s*['"]"Bahij Janna", sans-serif['"]/g, "fontFamily: \"'EnglishDigits', 'Bahij Janna', sans-serif\"");

    if (original !== data) {
        fs.writeFileSync(file, data);
        console.log(`Updated ${file}`);
    }
}
console.log('Done replacing inline font styles');
