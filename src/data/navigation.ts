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
        icon: 'helmet',
        group: { id: 'Akses Tali (TKPK)', en: 'Rope Access (TKPK)' },
        items: [
          { key: 'course-tkpk-1', icon: 'helmet', label: { id: 'TKPK Tingkat 1', en: 'TKPK Level 1' } },
          { key: 'course-tkpk-2', icon: 'helmet', label: { id: 'TKPK Tingkat 2', en: 'TKPK Level 2' } },
          { key: 'course-tkpk-3', icon: 'shield-check', label: { id: 'TKPK Tingkat 3', en: 'TKPK Level 3' } },
        ],
      },
      {
        icon: 'building',
        group: { id: 'Bangunan Tinggi (TKBT)', en: 'High Structures (TKBT)' },
        items: [
          { key: 'course-tkbt-1', icon: 'building', label: { id: 'TKBT Tingkat 1', en: 'TKBT Level 1' } },
          { key: 'course-tkbt-2', icon: 'building', label: { id: 'TKBT Tingkat 2', en: 'TKBT Level 2' } },
          { key: 'certification', icon: 'certificate', label: { id: 'Tentang Sertifikasi Kemnaker', en: 'About Kemnaker Certification' } },
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
        icon: 'building',
        group: { id: 'Gedung & Fasad', en: 'Buildings & Façades' },
        items: [
          { key: 'service-facade', icon: 'building', label: { id: 'Pembersihan Kaca & Fasad', en: 'Glass Cleaning & Façades' } },
          { key: 'service-maintenance', icon: 'wrench', label: { id: 'Perawatan & Perbaikan', en: 'Maintenance & Repair' } },
          { key: 'service-ndt', icon: 'search', label: { id: 'Inspeksi & NDT', en: 'Inspection & NDT' } },
        ],
      },
      {
        icon: 'lifebuoy',
        group: { id: 'Keselamatan & Tenaga Ahli', en: 'Safety & Manpower' },
        items: [
          { key: 'service-rescue', icon: 'lifebuoy', label: { id: 'Standby Rescue', en: 'Standby Rescue' } },
          { key: 'service-manpower', icon: 'users', label: { id: 'Penyediaan Teknisi', en: 'Technician Supply' } },
        ],
      },
    ],
  },
  { key: 'schedule', icon: 'calendar', label: 'nav.schedule' },
  { key: 'articles', icon: 'news', label: 'nav.articles' },
  { key: 'contact', icon: 'phone', label: 'nav.contact' },
];
