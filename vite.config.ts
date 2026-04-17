import tailwindcss from '@tailwindcss/vite';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig, loadEnv } from 'vite';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const port = parseInt(env.VITE_DEV_PORT) || 5173;
  const apiBase = env.VITE_API_BASE_URL || 'http://localhost:8300';
  const apiPrefix = env.VITE_API_PREFIX || 'coframe';

  return {
    plugins: [tailwindcss(), sveltekit()],

    server: {
      port,
      fs: {
        allow: ['..']
      },
      // In dev: proxy API calls to the backend server.
      // In prod: same-origin (FastAPI serves everything), no proxy needed.
      proxy: {
        [`/${apiPrefix}`]: {
          target: apiBase,
          changeOrigin: true
        }
      }
    }
  };
});
