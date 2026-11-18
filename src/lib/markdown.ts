import site from '@/data/site.json';
import type { Section } from '@/content.config';
import type { Locale } from '@/i18n/config';
import { resolveHref } from './links';
import { absoluteUrl } from './seo';
import type { Route } from './routes';
import { accreditations, courseRoutes, faqs, serviceRoutes, team, testimonials, upcomingClasses } from './data';
import { dateRange, scheduleStatusLabel } from './labels';
import type { Course } from '@/content/schema';

/**
 * Versi Markdown bersih tiap halaman untuk mesin AI / LLM (GEO).
 * Diturunkan dari data konten yang sama dengan HTML, jadi selalu sinkron.
 */

async function link(label: string, href: string, locale: Locale): Promise<string> {
  const url = await resolveHref(href, locale);
  return `[${label}](${url.startsWith('/') ? absoluteUrl(url) : url})`;
}

async function sectionToMd(s: Section, locale: Locale): Promise<string> {
  const h = (t?: string) => (t ? `## ${t}\n\n` : '');
  switch (s.type) {
    case 'trust':
      return s.items.map((i) => `- **${i.title}** — ${i.text}`).join('\n');
    case 'stats':
      return h(s.title) + s.items.map((i) => `- ${i.value}${i.suffix} ${i.label}`).join('\n');
    case 'service-cards': {
      const items = await Promise.all(
        s.items.map(async (i) => {
          const links = await Promise.all(i.links.map((l) => link(l.label, l.href, locale)));
          return `### ${i.title}\n\n${i.text}${links.length ? `\n\n${links.map((l) => `- ${l}`).join('\n')}` : ''}`;
        }),
      );
      return h(s.title) + (s.intro ? `${s.intro}\n\n` : '') + items.join('\n\n');
    }
    case 'value-cards':
      return (
        h(s.title) +
        (s.intro ? `${s.intro}\n\n` : '') +
        s.items
          .map((i) =>
            [`### ${i.title}`, i.text, i.bullets.map((b) => `- **${b.title}** — ${b.text}`).join('\n')].filter(Boolean).join('\n\n'),
          )
          .join('\n\n')
      );
    case 'prose':
      return h(s.title) + s.body;
    case 'lists':
      return h(s.title) + s.columns.map((c) => `### ${c.title}\n\n${c.items.map((i) => `- ${i}`).join('\n')}`).join('\n\n');
    case 'page-cards': {
      const pages = s.of === 'course' ? await courseRoutes(locale) : await serviceRoutes(locale);
      const items = pages.map(
        (p) => `- [${p.entry.data.hero.title}](${absoluteUrl(p.path)}) — ${p.entry.data.card?.summary ?? p.entry.data.seo.description}`,
      );
      return h(s.title) + (s.intro ? `${s.intro}\n\n` : '') + items.join('\n');
    }
    case 'schedule': {
      const courses = await courseRoutes(locale);
      const rows = (await upcomingClasses(s.course)).slice(0, s.limit ?? 99).map((c) => {
        const name = courses.find((r) => r.translationKey === c.course)?.entry.data.hero.title ?? c.course;
        const when = c.status === 'request' ? scheduleStatusLabel.request![locale] : dateRange(c.startDate, c.endDate, locale);
        return `| ${when} | ${name} | ${c.location[locale]} | ${scheduleStatusLabel[c.status]![locale]} |`;
      });
      if (!rows.length) return '';
      const head = locale === 'id' ? '| Tanggal | Program | Lokasi | Status |' : '| Dates | Programme | Location | Status |';
      return h(s.title) + `${head}\n| --- | --- | --- | --- |\n${rows.join('\n')}`;
    }
    case 'accreditations':
      return h(s.title) + (await accreditations()).map((a) => `- **${a.data.name}** — ${a.data.note[locale]}`).join('\n');
    case 'team':
      return (
        h(s.title) +
        (await team())
          .map((p) => `### ${p.data.name} — ${p.data.role[locale]}\n\n${p.data.bio[locale]}\n\n${p.data.credentials.join(', ')}`)
          .join('\n\n')
      );
    case 'testimonials':
      return (
        h(s.title) +
        (await testimonials())
          .slice(0, s.limit)
          .map((t) => `> ${t.data.quote[locale]}\n> — ${t.data.name}, ${t.data.role[locale]}, ${t.data.company}`)
          .join('\n\n')
      );
    case 'faq-group':
      return (
        h(s.title) +
        (await faqs(s.groups))
          .slice(0, s.limit ?? 99)
          .map((f) => `### ${f.data.question[locale]}\n\n${f.data.answer[locale]}`)
          .join('\n\n')
      );
    case 'faq':
      return h(s.title) + s.items.map((f) => `### ${f.q}\n\n${f.a}`).join('\n\n');
    case 'gallery':
      return s.groups.map((g) => `## ${g.title}\n\n${g.images.map((i) => `- ${i.alt}`).join('\n')}`).join('\n\n');
    case 'banner':
    case 'cta':
      return `## ${s.title}\n\n${s.text}`;
    case 'table':
      return (
        h(s.title) +
        (s.intro ? `${s.intro}\n\n` : '') +
        `| ${s.columns.join(' | ')} |\n| ${s.columns.map(() => '---').join(' | ')} |\n` +
        s.rows.map((r) => `| ${r.join(' | ')} |`).join('\n') +
        (s.note ? `\n\n*${s.note}*` : '')
      );
    case 'contact':
    case 'latest-posts':
      return '';
  }
}

function contactBlock(locale: Locale): string {
  const a = site.address;
  return locale === 'id'
    ? `---\n\n**${site.name}** (${site.shortName}) — ${site.tagline.id}\n\n- Alamat: ${a.street}, ${a.locality}, ${a.region} ${a.postalCode}\n- WhatsApp/Telepon: ${site.phoneDisplay}\n- Email: ${site.email}\n- Area layanan: ${site.areaServed.join(', ')}\n- Jam operasional: Senin–Jumat 08:00–17:00 WIB`
    : `---\n\n**${site.name}** (${site.shortName}) — ${site.tagline.en}\n\n- Address: ${a.street}, ${a.locality}, ${a.region} ${a.postalCode}, Indonesia\n- WhatsApp/Phone: ${site.phoneDisplay}\n- Email: ${site.email}\n- Service area: ${site.areaServed.join(', ')}\n- Hours: Mon–Fri 08:00–17:00 (WIB)`;
}

function courseToMd(c: Course, locale: Locale): string {
  const L = (id: string, en: string) => (locale === 'id' ? id : en);
  return [
    `- ${L('Kode', 'Code')}: ${c.code}\n- ${L('Skema', 'Scheme')}: ${c.scheme} · ${c.level}\n- ${L('Durasi', 'Duration')}: ${c.duration}\n- ${L('Biaya', 'Fee')}: ${c.price}`,
    `## ${L('Prasyarat peserta', 'Entry requirements')}\n\n${c.prerequisites.map((p) => `- ${p}`).join('\n')}`,
    `## ${L('Kompetensi yang dicapai', 'Learning outcomes')}\n\n${c.outcomes.map((p) => `- ${p}`).join('\n')}`,
    c.syllabus.length ? `## ${L('Silabus', 'Syllabus')}\n\n${c.syllabus.map((x) => `### ${x.title}\n\n${x.detail}`).join('\n\n')}` : '',
    `## ${L('Sertifikat', 'Certificate')}\n\n${c.certificate}`,
  ]
    .filter(Boolean)
    .join('\n\n');
}

export async function routeToMarkdown(route: Route): Promise<string> {
  const url = absoluteUrl(route.path);
  if (route.kind === 'post') {
    const d = route.entry.data;
    return (
      [
        `# ${d.title}`,
        `> ${d.excerpt}`,
        `URL: ${url}  \n${route.locale === 'id' ? 'Diterbitkan' : 'Published'}: ${d.publishedAt.toISOString().slice(0, 10)}`,
        (route.entry.body ?? '').trim(),
        ...(d.sources.length
          ? [
              `## ${route.locale === 'id' ? 'Referensi' : 'References'}\n\n${d.sources.map((c) => `- [${c.title}](${c.url})${c.publisher ? ` — ${c.publisher}` : ''}`).join('\n')}`,
            ]
          : []),
        contactBlock(route.locale),
      ].join('\n\n') + '\n'
    );
  }
  const d = route.entry.data;
  const parts = await Promise.all(d.sections.map((s) => sectionToMd(s, route.locale)));
  return (
    [
      `# ${d.hero.title}`,
      `> ${d.seo.description}`,
      `URL: ${url}`,
      d.hero.tagline ? `*${d.hero.tagline}*` : '',
      d.hero.body,
      d.course ? courseToMd(d.course, route.locale) : '',
      ...parts,
      contactBlock(route.locale),
    ]
      .filter(Boolean)
      .join('\n\n') + '\n'
  );
}

/** "/" -> "/index.md", "/a/" -> "/a.md", "/en/" -> "/en/index.md" */
export function markdownPath(path: string): string {
  if (path === '/') return '/index.md';
  if (path === '/en/') return '/en/index.md';
  return path.replace(/\/$/, '') + '.md';
}
