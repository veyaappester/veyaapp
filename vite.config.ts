/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Must match the GitHub repository name, because GitHub Pages serves the app
// from https://<user>.github.io/<repo>/. Override with VEYA_BASE if needed.
const base = process.env.VEYA_BASE ?? '/veyaapp/';

export default defineConfig({
  base,
  plugins: [react()],
  test: {
    include: ['tests/**/*.test.ts'],
    environment: 'node',
  },
});
