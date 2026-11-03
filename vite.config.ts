import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

function normalizeBase(value: string | undefined): string {
  const raw = value?.trim();

  if (!raw || raw === '/') return '/';
  if (/^https?:\/\//.test(raw)) {
    return raw.endsWith('/') ? raw : `${raw}/`;
  }
  if (raw.startsWith('.')) return raw;

  return `/${raw.replace(/^\/+|\/+$/g, '')}/`;
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');

  return {
    base: normalizeBase(env.VITE_BASE),
    plugins: [react(), tailwindcss()],
  };
});
