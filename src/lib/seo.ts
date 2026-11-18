import site from '@/data/site.json';
import type { Locale } from '@/i18n/config';
import type { Course } from '@/content/schema';
import type { ScheduleItem } from './data';

const ORG_ID = `${site.url}/#organization`;
const WEBSITE_ID = `${site.url}/#website`;

export function absoluteUrl(path: string): string {
  return new URL(path, site.url).toString();
}

/** Entitas bisnis: pusat pelatihan (EducationalOrganization) sekaligus penyedia jasa (LocalBusiness). */
export function organizationSchema() {
  const sameAs = Object.values(site.social).filter(Boolean);
  return {
    '@type': ['EducationalOrganization', 'LocalBusiness'],
    '@id': ORG_ID,
    name: site.name,
    alternateName: site.shortName,
    legalName: site.legalName,
    url: site.url,
    logo: absoluteUrl('/logo-rac.png'),
    image: absoluteUrl('/og/index.jpg'),
    description: site.description.id,
    email: site.email,
    telephone: site.phoneE164,
    foundingDate: site.foundingDate,
    slogan: 'Training, Certification, & Corporate Services',
    address: {
      '@type': 'PostalAddress',
      streetAddress: site.address.street,
      addressLocality: site.address.locality,
      addressRegion: site.address.region,
      postalCode: site.address.postalCode,
      addressCountry: site.address.country,
    },
    geo: { '@type': 'GeoCoordinates', latitude: site.geo.latitude, longitude: site.geo.longitude },
    areaServed: site.areaServed.map((name) => ({ '@type': 'Country', name })),
    knowsAbout: ['Rope access', 'IRATA', 'BNSP TKPK', 'Work at height', 'Non-destructive testing', 'Rescue at height'],
    openingHoursSpecification: site.openingHours.map((h) => ({
      '@type': 'OpeningHoursSpecification',
      dayOfWeek: h.days.map((d) => `https://schema.org/${dayName(d)}`),
      opens: h.opens,
      closes: h.closes,
    })),
    ...(sameAs.length ? { sameAs } : {}),
  };
}

function dayName(d: string): string {
  return (
    (
      { Mo: 'Monday', Tu: 'Tuesday', We: 'Wednesday', Th: 'Thursday', Fr: 'Friday', Sa: 'Saturday', Su: 'Sunday' } as Record<string, string>
    )[d] ?? d
  );
}

export function websiteSchema(locale: Locale) {
  return {
    '@type': 'WebSite',
    '@id': WEBSITE_ID,
    url: site.url,
    name: site.name,
    inLanguage: locale === 'id' ? 'id-ID' : 'en',
    publisher: { '@id': ORG_ID },
  };
}

export function breadcrumbSchema(items: { name: string; path: string }[]) {
  return {
    '@type': 'BreadcrumbList',
    itemListElement: items.map((it, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: it.name,
      item: absoluteUrl(it.path),
    })),
  };
}

export function graph(...nodes: object[]) {
  return { '@context': 'https://schema.org', '@graph': nodes };
}

export { ORG_ID, WEBSITE_ID };

export function faqSchema(items: { q: string; a: string }[]) {
  return {
    '@type': 'FAQPage',
    mainEntity: items.map((f) => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })),
  };
}

export function serviceSchema(opts: { name: string; description: string; path: string; image?: string; locale: Locale }) {
  return {
    '@type': 'Service',
    '@id': `${absoluteUrl(opts.path)}#service`,
    name: opts.name,
    serviceType: opts.name,
    description: opts.description,
    url: absoluteUrl(opts.path),
    ...(opts.image ? { image: opts.image } : {}),
    inLanguage: opts.locale === 'id' ? 'id-ID' : 'en',
    provider: { '@id': ORG_ID },
    areaServed: site.areaServed.map((name) => ({ '@type': 'Country', name })),
  };
}

const lang = (l: Locale) => (l === 'id' ? 'id-ID' : 'en');
const place = (item: ScheduleItem, locale: Locale) => ({
  '@type': 'Place',
  name: item.location[locale],
  address: { '@type': 'PostalAddress', addressLocality: item.location[locale], addressCountry: 'ID' },
});

/** Program pelatihan (Google "Course info"): Course + CourseInstance dari jadwal kelas. */
export function courseSchema(opts: { name: string; course: Course; path: string; locale: Locale; classes: ScheduleItem[] }) {
  const c = opts.course;
  const url = absoluteUrl(opts.path);
  const instances = opts.classes.filter((k) => k.status !== 'request');
  return {
    '@type': 'Course',
    '@id': `${url}#course`,
    name: opts.name,
    description: c.summary,
    url,
    courseCode: c.code,
    inLanguage: lang(opts.locale),
    provider: { '@id': ORG_ID },
    educationalCredentialAwarded: c.certificate,
    coursePrerequisites: c.prerequisites,
    teaches: c.outcomes,
    timeRequired: `P${c.durationDays}D`,
    offers: { '@type': 'Offer', category: 'Paid', url, availability: 'https://schema.org/InStock' },
    hasCourseInstance: (instances.length ? instances : [undefined]).map((k) => ({
      '@type': 'CourseInstance',
      courseMode: 'Onsite',
      courseWorkload: `P${c.durationDays}D`,
      inLanguage: lang(opts.locale),
      ...(k
        ? {
            startDate: k.startDate,
            endDate: k.endDate,
            location: place(k, opts.locale),
            courseSchedule: { '@type': 'Schedule', startDate: k.startDate, endDate: k.endDate, repeatCount: 1, repeatFrequency: 'P1D' },
          }
        : {}),
    })),
  };
}

/** Satu kelas terbuka di halaman jadwal. */
export function educationEventSchema(opts: { item: ScheduleItem; name: string; coursePath?: string; locale: Locale }) {
  const k = opts.item;
  return {
    '@type': 'EducationEvent',
    name: opts.name,
    startDate: k.startDate,
    endDate: k.endDate,
    eventStatus: 'https://schema.org/EventScheduled',
    eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
    location: place(k, opts.locale),
    organizer: { '@id': ORG_ID },
    inLanguage: lang(opts.locale),
    ...(opts.coursePath ? { url: absoluteUrl(opts.coursePath) } : {}),
    ...(k.seatsTotal > 0 ? { maximumAttendeeCapacity: k.seatsTotal, remainingAttendeeCapacity: k.seatsLeft } : {}),
  };
}
