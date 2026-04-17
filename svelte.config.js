import adapter from '@sveltejs/adapter-static';
import { resolve } from 'path';
import coframe from './coframe.config.js';

/** @type {import('@sveltejs/kit').Config} */
const config = {
  kit: {
    adapter: adapter({
      fallback: 'index.html'   // SPA mode: unknown routes → index.html
    }),
    alias: {
      $plugins: coframe.pluginsDir,           // backend plugin components (path from coframe.config.js)
      $coframe: resolve('src/coframe-ui'),    // coframe-ui library (separate git repo)
      '$app-plugins': resolve('src/app-plugins') // app-specific plugin registry and formatters
    }
  }
};

export default config;
