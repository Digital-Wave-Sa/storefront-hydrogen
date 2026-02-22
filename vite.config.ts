import { defineConfig } from 'vite';
import { hydrogen } from '@shopify/hydrogen/vite';
import { reactRouter } from '@react-router/dev/vite';
import { vercelPreset } from '@vercel/react-router/vite'; // Import this
import tsconfigPaths from 'vite-tsconfig-paths';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [
    tailwindcss(),
    hydrogen(),
    vercelPreset(),
    reactRouter(),
    tsconfigPaths(),
  ],
  build: {
    assetsInlineLimit: 0,
  },
  ssr: {
    optimizeDeps: {
      include: ['set-cookie-parser', 'cookie', 'react-router'],
    },
  },
});