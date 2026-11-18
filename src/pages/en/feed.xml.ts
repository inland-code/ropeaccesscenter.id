import type { APIRoute } from 'astro';
import { rss } from '../feed.xml';

/** RSS artikel Bahasa Inggris. */
export const GET: APIRoute = () => rss('en');
