import type { UiKey } from '@/i18n/ui';

/** Menu utama; item merujuk translationKey supaya URL otomatis sesuai bahasa. */
export type NavItem = {
  key: string;
  /** Nama ikon dari src/components/icons/Icon.astro */
  icon: string;
  label: UiKey | { id: string; en: string };
  children?: {
    group: { id: string; en: string };
    /** translationKey halaman untuk judul grup (opsional — tanpa ini judul grup bukan tautan). */
    groupKey?: string;
    icon: string;
    items: { key: string; icon: string; label: { id: string; en: string } }[];
  }[];
};

export const mainNav: NavItem[] = [
  { key: 'about', icon: 'info', label: 'nav.about' },
  {
    key: 'training',
    icon: 'graduation-cap',
    label: 'nav.training',
    children: [
      {
        icon: 'graduation-cap',
        group: { id: 'Program IRATA', en: 'IRATA Programmes' },
        items: [
          { key: 'course-irata-l1', icon: 'helmet', label: { id: 'IRATA Level 1', en: 'IRATA Level 1' } },
          { key: 'course-irata-l2', icon: 'helmet', label: { id: 'IRATA Level 2', en: 'IRATA Level 2' } },
          { key: 'course-irata-l3', icon: 'helmet', label: { id: 'IRATA Level 3', en: 'IRATA Level 3' } },
          { key: 'course-refresher', icon: 'clock', label: { id: 'Refresher & Revalidasi', en: 'Refresher & Revalidation' } },
        ],
      },
      {
        groupKey: 'certification',
        icon: 'certificate',
        group: { id: 'Sertifikasi', en: 'Certification' },
        items: [
          { key: 'course-bnsp-tkpk', icon: 'certificate', label: { id: 'Sertifikasi BNSP TKPK', en: 'BNSP TKPK Certification' } },
          { key: 'course-in-house', icon: 'building', label: { id: 'Pelatihan In-House', en: 'In-House Training' } },
          { key: 'schedule', icon: 'calendar', label: { id: 'Jadwal Pelatihan', en: 'Training Schedule' } },
        ],
      },
    ],
  },
  {
    key: 'services',
    icon: 'wrench',
    label: 'nav.services',
    children: [
      {
        icon: 'search',
        group: { id: 'Inspeksi & Perawatan', en: 'Inspection & Maintenance' },
        items: [
          { key: 'service-ndt', icon: 'search', label: { id: 'Inspeksi & NDT', en: 'Inspection & NDT' } },
          { key: 'service-maintenance', icon: 'wrench', label: { id: 'Perawatan & Perbaikan', en: 'Maintenance & Repair' } },
          { key: 'service-facade', icon: 'building', label: { id: 'Perawatan Fasad Gedung', en: 'Façade Maintenance' } },
        ],
      },
      {
        icon: 'lifebuoy',
        group: { id: 'Keselamatan & Tenaga Ahli', en: 'Safety & Manpower' },
        items: [
          { key: 'service-rescue', icon: 'lifebuoy', label: { id: 'Standby Rescue', en: 'Standby Rescue' } },
          { key: 'service-audit', icon: 'clipboard', label: { id: 'Konsultasi & Audit K3', en: 'HSE Consulting & Audit' } },
          { key: 'service-manpower', icon: 'users', label: { id: 'Penyediaan Teknisi', en: 'Technician Supply' } },
        ],
      },
    ],
  },
  { key: 'schedule', icon: 'calendar', label: 'nav.schedule' },
  { key: 'articles', icon: 'news', label: 'nav.articles' },
  { key: 'contact', icon: 'phone', label: 'nav.contact' },
];
