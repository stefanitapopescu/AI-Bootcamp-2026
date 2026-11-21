import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// Planul etajului vine din același floor.json ca harta 3D (web-3d/), nu dintr-o copie.
// Când harta se mută în web/src/features/map, schimbă doar alias-ul de mai jos (și `paths` din tsconfig).
const floorJson = fileURLToPath(new URL('../web-3d/src/map/floor.json', import.meta.url));

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: { alias: { '@floor': floorJson } },
  server: { fs: { allow: ['..'] } },
});
