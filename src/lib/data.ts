import { getCollection, type CollectionEntry } from 'astro:content';
import type { Locale } from '@/i18n/config';
import { isProduction } from './env';
import { getRoutes, type Route } from './routes';

/**
 * Akses koleksi data RAC (src/content/data/*.json).
 * Item bertanda `sample: true` (data contoh dari situs lama) disembunyikan otomatis di build produksi.
 */
const real = <T extends { data: { sample?: boolean } }>(items: T[]) => items.filter((i) => !isProduction || !i.data.sample);
const byOrder = <T extends { data: { order: number } }>(a: T, b: T) => a.data.order - b.data.order;

export type ScheduleItem = CollectionEntry<'schedule'>['data'];
export type PageRoute = Extract<Route, { kind: 'page' }>;
export type CourseRoute = PageRoute & { entry: { data: { course: NonNullable<PageRoute['entry']['data']['course']> } } };

/** Hari ini (zona WIB) dalam format YYYY-MM-DD — kelas yang sudah selesai disembunyikan saat build. */
export function todayWib(now = new Date()): string {
  return new Date(now.getTime() + 7 * 3600_000).toISOString().slice(0, 10);
}

/** Kelas yang belum selesai, urut tanggal mulai; opsional difilter per program (translationKey). */
export async function upcomingClasses(course?: string): Promise<ScheduleItem[]> {
  const today = todayWib();
  return (await getCollection('schedule'))
    .map((e) => e.data)
    .filter((c) => c.published && c.endDate >= today && (!course || c.course === course))
    .sort((a, b) => a.startDate.localeCompare(b.startDate));
}

export async function team() {
  return real(await getCollection('team')).sort(byOrder);
}
export async function testimonials() {
  return real(await getCollection('testimonials')).sort(byOrder);
}
export async function accreditations() {
  return (await getCollection('accreditations')).sort(byOrder);
}
export async function faqs(groups: readonly string[]) {
  return (await getCollection('faqs')).filter((f) => groups.includes(f.data.group)).sort(byOrder);
}

/** Halaman program pelatihan (template "course") untuk satu bahasa, urut field course.order. */
export async function courseRoutes(locale: Locale): Promise<CourseRoute[]> {
  return (await getRoutes())
    .filter(
      (r): r is CourseRoute => r.kind === 'page' && r.locale === locale && r.entry.data.template === 'course' && !!r.entry.data.course,
    )
    .sort((a, b) => a.entry.data.course.order - b.entry.data.course.order);
}

/** Halaman layanan (template "service") untuk satu bahasa, urut sesuai urutan file. */
export async function serviceRoutes(locale: Locale): Promise<PageRoute[]> {
  return (await getRoutes()).filter((r): r is PageRoute => r.kind === 'page' && r.locale === locale && r.entry.data.template === 'service');
}
