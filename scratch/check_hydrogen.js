import * as Hydrogen from '@shopify/hydrogen';
console.log('Hydrogen Analytics:', Hydrogen.Analytics);
if (Hydrogen.Analytics) {
    console.log('Analytics keys:', Object.keys(Hydrogen.Analytics));
}
