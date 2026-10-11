import { defineConfig } from 'astro/config';
import { site } from './src/data/site';

export default defineConfig({
  output: 'static',
  ...(site.url ? { site: site.url } : {}),
});
