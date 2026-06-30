import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Desktop-only single-page tool. Hash routing keeps deploys trivial on Vercel
// (no rewrite rules needed) and mirrors the prototype's history behavior.
export default defineConfig({
  plugins: [react()],
});
