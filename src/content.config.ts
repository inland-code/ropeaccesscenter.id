import { defineCollection } from 'astro:content';
import { file, glob } from 'astro/loaders';
import { dataCollections, pageSchema, postSchema } from './content/schema';

export type { Section } from './content/schema';

/** id entri = path file tanpa ekstensi (mis. "en/about-us"), bukan field slug. */
const fileId = ({ entry }: { entry: string }) => entry.replace(/\.(json|mdx?)$/, '');

/**
 * Konvensi lokasi file:
 *   src/content/pages/<locale>/<nama>.json   halaman (hero + section)
 *   src/content/posts/<locale>/<nama>.md     artikel
 *   src/content/data/<koleksi>.json          data dua bahasa: jadwal, akreditasi, tim, testimoni, FAQ
 * Skema (dan label untuk dashboard) ada di src/content/schema.ts.
 */
const pages = defineCollection({
  loader: glob({ pattern: '**/*.json', base: './src/content/pages', generateId: fileId }),
  schema: pageSchema,
});

const posts = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/posts', generateId: fileId }),
  schema: postSchema,
});

const data = 'src/content/data';
const schedule = defineCollection({ loader: file(`${data}/schedule.json`), schema: dataCollections.schedule.item });
const accreditations = defineCollection({ loader: file(`${data}/accreditations.json`), schema: dataCollections.accreditations.item });
const team = defineCollection({ loader: file(`${data}/team.json`), schema: dataCollections.team.item });
const testimonials = defineCollection({ loader: file(`${data}/testimonials.json`), schema: dataCollections.testimonials.item });
const faqs = defineCollection({ loader: file(`${data}/faqs.json`), schema: dataCollections.faqs.item });

export const collections = { pages, posts, schedule, accreditations, team, testimonials, faqs };
