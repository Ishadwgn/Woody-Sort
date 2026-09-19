import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

// https://astro.build/config
export default defineConfig({
  site: 'https://woody-sort.vercel.app',
  trailingSlash: 'never',
  compressHTML: true,
  integrations: [sitemap()],
  vite: {
    optimizeDeps: {
      include: ['canvas-confetti']
    }
  }
});
