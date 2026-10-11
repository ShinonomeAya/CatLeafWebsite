import type { APIRoute } from 'astro';
import { site, pages } from '../data/site';

export function getStaticPaths() {
  return site.url ? [{ params: { sitemap: 'sitemap' } }] : [];
}
export const GET: APIRoute = () => new Response(
  `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${pages.map(path => `<url><loc>${new URL(path, site.url!).href}</loc></url>`).join('')}</urlset>`,
  { headers: { 'Content-Type': 'application/xml; charset=utf-8' } },
);
