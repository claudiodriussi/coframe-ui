import { defineConfig } from 'vite';
import { kitebaseVite } from '@kitebase/ui/build/vite.js';
import app from './kitebase.config.js';

export default defineConfig(kitebaseVite(app));
