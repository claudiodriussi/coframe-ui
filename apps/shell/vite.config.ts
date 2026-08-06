import { defineConfig } from 'vite';
import { coframeVite } from '@coframe/ui/build/vite.js';
import app from './coframe.config.js';

export default defineConfig(coframeVite(app));
