import type { APIRoute } from 'astro';
import { release, serializeUpdateManifest } from '../../data/release';

export const GET: APIRoute = () => new Response(serializeUpdateManifest(release), {
  headers: {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'public, max-age=0, must-revalidate',
    'X-Content-Type-Options': 'nosniff',
  },
});
