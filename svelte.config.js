import adapter from '@sveltejs/adapter-static';
import { resolve } from 'path';
import coframe from './coframe.config.js';

/** @type {import('@sveltejs/kit').Config} */
const config = {
  kit: {
    adapter: adapter({
      fallback: 'index.html'   // SPA mode: tutte le route sconosciute → index.html
    }),
    alias: {
      // Backend plugin components - same dir as server plugins.
      // Path configured in coframe.config.js.
      $plugins: coframe.pluginsDir,
      // Coframe library - separate git repo (src/lib/coframe).
      $coframe: resolve('src/lib/coframe'),
      // Project-level app code (outside $lib, e.g. plugin registry).
      '$app-plugins': resolve('src/app-plugins')
    }
  }
};

export default config;
