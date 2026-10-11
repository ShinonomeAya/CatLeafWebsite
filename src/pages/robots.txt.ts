import type { APIRoute } from 'astro';
import { site } from '../data/site';

export const GET: APIRoute = () => new Response(
  `User-agent: *\n${site.indexable ? 'Allow: /' : 'Disallow: /'}\n${site.url && site.indexable ? `Sitemap: ${new URL('/sitemap.xml', site.url).href}\n` : ''}`,
  { headers: { 'Content-Type': 'text/plain; charset=utf-8' } },
);
