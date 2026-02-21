import type { Config } from '@react-router/dev/config';
import { hydrogenPreset } from '@shopify/hydrogen/react-router-preset';
import { vercelPreset } from '@vercel/react-router/vite';

export default {
  presets: [
    hydrogenPreset(), 
    vercelPreset()     // Add this second
  ],
  ssr: true,
} satisfies Config;