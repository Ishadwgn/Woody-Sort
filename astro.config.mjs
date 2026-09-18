import { defineConfig } from 'astro/config';

// https://astro.build/config
export default defineConfig({
  site: 'https://woodysortgame.com',
  trailingSlash: 'never',
  compressHTML: true,
  vite: {
    optimizeDeps: {
      include: ['canvas-confetti']
    }
  }
});
