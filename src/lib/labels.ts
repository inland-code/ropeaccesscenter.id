import type { Locale } from '@/i18n/config';

type L = Record<Locale, string>;

export const categoryLabel: Record<string, L> = {
  sertifikasi: { id: 'Sertifikasi', en: 'Certification' },
  keselamatan: { id: 'Keselamatan', en: 'Safety' },
  peralatan: { id: 'Peralatan', en: 'Equipment' },
  layanan: { id: 'Layanan Industri', en: 'Industrial Services' },
  karier: { id: 'Karier', en: 'Careers' },
  kepatuhan: { id: 'Kepatuhan', en: 'Compliance' },
};

export const faqGroupLabel: Record<string, L> = {
  general: { id: 'Umum', en: 'General' },
  training: { id: 'Pelatihan', en: 'Training' },
  certification: { id: 'Sertifikasi', en: 'Certification' },
  services: { id: 'Layanan Industri', en: 'Industrial Services' },
};

export const scheduleStatusLabel: Record<string, L> = {
  open: { id: 'Dibuka', en: 'Open' },
  limited: { id: 'Kursi terbatas', en: 'Limited seats' },
  full: { id: 'Penuh', en: 'Full' },
  request: { id: 'Sesuai permintaan', en: 'On request' },
};

/** "7–12 Sep 2026" / "Sep 7–12, 2026" — rentang tanggal ringkas. */
export function dateRange(start: string, end: string, locale: Locale): string {
  const fmt = new Intl.DateTimeFormat(locale === 'id' ? 'id-ID' : 'en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  });
  return fmt.formatRange(new Date(`${start}T00:00:00Z`), new Date(`${end}T00:00:00Z`));
}
