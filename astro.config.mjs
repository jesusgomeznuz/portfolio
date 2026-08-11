// @ts-check
import { defineConfig } from 'astro/config';
import react from '@astrojs/react';

// https://astro.build/config
export default defineConfig({
  integrations: [react()],
  devToolbar: { enabled: false },
  vite: {
    optimizeDeps: {
      // sin esto, Vite descubre @react-three/rapier hasta el primer import()
      // dinámico del demo (lazy-loaded) y reoptimiza a mitad de esa carga,
      // rompiendo el primer load tras cada restart del dev server.
      include: ['@react-three/rapier'],
    },
  },
});
