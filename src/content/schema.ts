/**
 * Skema konten Rope Access Center — satu sumber kebenaran untuk:
 *   1) validasi build Astro (src/content.config.ts), dan
 *   2) form editor dashboard /admin (diekspor ke JSON Schema lewat /admin/schema.json).
 * `.meta({ title, description, widget })` dipakai dashboard sebagai label & jenis input.
 * Widget: text (default) | textarea | markdown | image | link | date.
 */
import { z } from 'astro/zod';

const s = (title: string, description?: string) => z.string().meta({ title, ...(description ? { description } : {}) });
const text = (title: string, description?: string) =>
  z.string().meta({ title, widget: 'textarea', ...(description ? { description } : {}) });
const md = (title: string, description?: string) => z.string().meta({ title, widget: 'markdown', ...(description ? { description } : {}) });
const img = (title = 'Gambar') =>
  z.string().meta({ title, widget: 'image', description: 'Path relatif dari src/assets/images, mis. "pelatihan/menara-latih.jpg"' });
const href = (title = 'Tautan') =>
  z.string().meta({ title, widget: 'link', description: 'translationKey halaman (mis. "about"), "#whatsapp", "/path/", atau URL lengkap' });
const date = (title: string) =>
  z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'format tanggal YYYY-MM-DD')
    .meta({ title, widget: 'date' });
/** Teks dua bahasa untuk koleksi data (jadwal, tim, testimoni, FAQ, akreditasi). */
const i18n = (title: string, long = false) =>
  z.object({ id: (long ? text : s)(`${title} (ID)`), en: (long ? text : s)(`${title} (EN)`) }).meta({ title });

export const seoSchema = z
  .object({
    title: s('Judul SEO', 'Maks. 70 karakter, idealnya ≤ 60').min(1).max(70),
    description: text('Meta description', '50–170 karakter, idealnya 120–160').min(50).max(170),
    ogImage: img('Gambar OG (opsional)').optional(),
    noindex: z.boolean().default(false).meta({ title: 'Sembunyikan dari Google (noindex)' }),
  })
  .meta({ title: 'SEO' });

const cta = z
  .object({
    label: s('Teks tombol'),
    href: href(),
    variant: z.enum(['light', 'dark', 'whatsapp', 'outline']).default('light').meta({ title: 'Gaya tombol' }),
  })
  .meta({ title: 'Tombol' });

export const heroSchema = z
  .object({
    eyebrow: s('Label kecil di atas judul').optional(),
    title: s('Judul (H1)'),
    tagline: s('Tagline').optional(),
    body: text('Paragraf'),
    image: img('Foto hero (opsional — tanpa foto tampil grafis merek RAC)').optional(),
    imageAlt: s('Teks alternatif foto').optional(),
    ctas: z.array(cta).default([]).meta({ title: 'Tombol' }),
  })
  .meta({ title: 'Hero' });

/* ---------- Section ---------- */

export const iconNames = [
  'shield',
  'shield-check',
  'target',
  'users',
  'building',
  'calendar',
  'clock',
  'graduation-cap',
  'certificate',
  'helmet',
  'briefcase',
  'wrench',
  'search',
  'lifebuoy',
  'clipboard',
  'globe',
  'map-pin',
  'layers',
  'check-circle',
  'chat',
  'rope',
] as const;
const icon = z.enum(iconNames).meta({ title: 'Ikon' });
const link = z.object({ label: s('Teks'), href: href() }).meta({ title: 'Tautan' });
const heading = {
  eyebrow: s('Label kecil di atas judul').optional(),
  title: s('Judul section'),
  intro: text('Pengantar').optional(),
};
const imageItem = z.object({ image: img(), alt: s('Teks alternatif'), caption: s('Keterangan').optional() }).meta({ title: 'Foto' });

export const faqGroups = ['general', 'training', 'certification', 'services'] as const;

export const sectionSchema = z.discriminatedUnion('type', [
  z
    .object({
      type: z.literal('trust'),
      items: z
        .array(z.object({ icon, title: s('Judul'), text: s('Teks') }).meta({ title: 'Poin' }))
        .min(2)
        .max(4)
        .meta({ title: 'Poin keunggulan' }),
    })
    .meta({ title: 'Strip keunggulan' }),
  z
    .object({
      type: z.literal('stats'),
      ...heading,
      items: z
        .array(
          z
            .object({
              value: z.number().nonnegative().meta({ title: 'Angka' }),
              suffix: s('Akhiran (mis. +)').default(''),
              label: s('Label'),
              note: s('Catatan kecil').optional(),
            })
            .meta({ title: 'Statistik' }),
        )
        .min(2)
        .max(4)
        .meta({ title: 'Angka' }),
    })
    .meta({ title: 'Statistik bisnis' }),
  z
    .object({
      type: z.literal('page-cards'),
      ...heading,
      of: z.enum(['course', 'service']).meta({ title: 'Jenis halaman', description: 'course = program pelatihan, service = layanan' }),
      featuredOnly: z.boolean().default(false).meta({ title: 'Hanya yang diunggulkan' }),
      limit: z.number().int().min(1).max(12).optional().meta({ title: 'Jumlah maksimum' }),
      cta: link.optional(),
    })
    .meta({ title: 'Kartu otomatis (pelatihan / layanan)' }),
  z
    .object({
      type: z.literal('value-cards'),
      ...heading,
      title: s('Judul section').optional(),
      items: z
        .array(
          z
            .object({
              icon: icon.optional(),
              title: s('Judul'),
              text: text('Teks').optional(),
              bullets: z
                .array(z.object({ title: s('Judul'), text: text('Teks') }).meta({ title: 'Poin' }))
                .default([])
                .meta({ title: 'Poin' }),
            })
            .meta({ title: 'Kartu' }),
        )
        .meta({ title: 'Kartu' }),
    })
    .meta({ title: 'Kartu nilai' }),
  z
    .object({
      type: z.literal('prose'),
      title: s('Judul section (opsional)').optional(),
      body: md('Isi (Markdown)', 'Gunakan ## untuk subjudul, **tebal**, [tautan](/kontak/).'),
    })
    .meta({ title: 'Teks panjang (Markdown)' }),
  z
    .object({
      type: z.literal('lists'),
      ...heading,
      title: s('Judul section').optional(),
      columns: z
        .array(
          z
            .object({ icon: icon.optional(), title: s('Judul kolom'), items: z.array(s('Poin')).min(1).meta({ title: 'Poin' }) })
            .meta({ title: 'Kolom' }),
        )
        .min(1)
        .max(3)
        .meta({ title: 'Kolom daftar' }),
    })
    .meta({ title: 'Daftar poin (lingkup, industri, hasil kerja)' }),
  z
    .object({
      type: z.literal('gallery'),
      groups: z
        .array(z.object({ title: s('Judul grup'), images: z.array(imageItem).min(1).meta({ title: 'Foto' }) }).meta({ title: 'Grup' }))
        .meta({ title: 'Grup galeri' }),
    })
    .meta({ title: 'Galeri foto' }),
  z
    .object({
      type: z.literal('contact'),
      infoTitle: s('Judul informasi kontak'),
      socialTitle: s('Judul media sosial'),
      socialText: text('Teks media sosial'),
      formTitle: s('Judul formulir'),
      formText: text('Teks formulir'),
    })
    .meta({ title: 'Kontak + formulir' }),
  z
    .object({
      type: z.literal('schedule'),
      ...heading,
      course: s('Filter program (kunci terjemahan, opsional)', 'Kosong = semua program').optional(),
      limit: z.number().int().min(1).max(50).optional().meta({ title: 'Jumlah maksimum' }),
      cta: link.optional(),
    })
    .meta({ title: 'Jadwal kelas (dari data Jadwal)' }),
  z
    .object({
      type: z.literal('accreditations'),
      ...heading,
    })
    .meta({ title: 'Akreditasi & standar (dari data Akreditasi)' }),
  z
    .object({
      type: z.literal('team'),
      ...heading,
    })
    .meta({ title: 'Tim (dari data Tim)' }),
  z
    .object({
      type: z.literal('testimonials'),
      ...heading,
      limit: z.number().int().min(1).max(12).default(3).meta({ title: 'Jumlah testimoni' }),
    })
    .meta({ title: 'Testimoni (dari data Testimoni)' }),
  z
    .object({
      type: z.literal('latest-posts'),
      ...heading,
      limit: z.number().int().min(1).max(6).default(3).meta({ title: 'Jumlah artikel' }),
      cta: link.optional(),
    })
    .meta({ title: 'Artikel terbaru' }),
  z
    .object({
      type: z.literal('faq'),
      ...heading,
      items: z
        .array(z.object({ q: s('Pertanyaan'), a: text('Jawaban') }).meta({ title: 'Tanya-jawab' }))
        .min(1)
        .meta({ title: 'Tanya-jawab' }),
    })
    .meta({ title: 'FAQ (ditulis di halaman ini)' }),
  z
    .object({
      type: z.literal('faq-group'),
      ...heading,
      groups: z
        .array(z.enum(faqGroups))
        .min(1)
        .meta({ title: 'Grup FAQ', description: 'general = umum, training = pelatihan, certification = sertifikasi, services = layanan' }),
      grouped: z.boolean().default(false).meta({ title: 'Tampilkan judul per grup' }),
      limit: z.number().int().min(1).max(50).optional().meta({ title: 'Jumlah maksimum' }),
      cta: link.optional(),
    })
    .meta({ title: 'FAQ (dari data FAQ)' }),
  z
    .object({
      type: z.literal('table'),
      ...heading,
      columns: z.array(s('Judul kolom')).min(2).max(4).meta({ title: 'Kolom' }),
      rows: z
        .array(z.array(s('Sel')).min(2).max(4).meta({ title: 'Baris' }))
        .min(1)
        .meta({ title: 'Baris' }),
      note: text('Catatan di bawah tabel').optional(),
    })
    .meta({ title: 'Tabel (perbandingan)' }),
  z
    .object({
      type: z.literal('cta'),
      eyebrow: s('Label kecil di atas judul').optional(),
      title: s('Judul'),
      text: text('Teks'),
      button: link,
      tone: z.enum(['brand', 'light']).default('brand').meta({ title: 'Warna' }),
    })
    .meta({ title: 'Ajakan konsultasi' }),
]);

export type Section = z.infer<typeof sectionSchema>;

/** Data program pelatihan (wajib untuk template "course"). Dipakai kartu, halaman detail, dan JSON-LD Course. */
export const courseSchema = z
  .object({
    code: s('Kode program', 'mis. TKPK-1'),
    scheme: z
      .enum(['KEMNAKER'])
      .default('KEMNAKER')
      .meta({ title: 'Skema sertifikasi', description: 'Kemnaker RI (Permenaker No. 9 Tahun 2016)' }),
    level: s('Tingkat', 'mis. Tingkat 1'),
    order: z.number().int().meta({ title: 'Urutan tampil' }),
    featured: z.boolean().default(false).meta({ title: 'Unggulkan di beranda' }),
    summary: text('Ringkasan (kartu & JSON-LD)'),
    duration: s('Durasi (opsional)', 'mis. 5 hari pelatihan + 1 hari uji. Kosong = "dikonfirmasi saat pendaftaran"').optional(),
    durationDays: z.number().int().min(1).max(60).meta({ title: 'Total hari (opsional, angka untuk data terstruktur)' }).optional(),
    price: s('Harga', 'mis. "Hubungi kami untuk penawaran"'),
    prerequisites: z.array(s('Prasyarat')).min(1).meta({ title: 'Prasyarat peserta' }),
    outcomes: z.array(s('Kompetensi')).min(1).meta({ title: 'Kompetensi yang dicapai' }),
    syllabus: z
      .array(z.object({ title: s('Judul sesi'), detail: text('Rincian') }).meta({ title: 'Sesi' }))
      .default([])
      .meta({ title: 'Silabus' }),
    certificate: text('Sertifikat yang diterima'),
  })
  .meta({ title: 'Data program pelatihan' });

export type Course = z.infer<typeof courseSchema>;

export const pageTemplates = [
  'home',
  'about',
  'training',
  'course',
  'schedule',
  'certification',
  'services',
  'service',
  'articles',
  'faq',
  'contact',
  'legal',
  'generic',
] as const;

export const pageSchema = z
  .object({
    translationKey: s('Kunci terjemahan', 'Sama untuk versi ID & EN dari halaman yang sama'),
    slug: s('Slug URL', 'Huruf kecil, angka, tanda hubung. Kosong = beranda. Jangan ubah slug setelah situs live.').regex(
      /^[a-z0-9-]*$/,
      'slug: huruf kecil, angka, tanda hubung',
    ),
    template: z.enum(pageTemplates).meta({ title: 'Template' }),
    navLabel: s('Label singkat (breadcrumb)', 'mis. "Pelatihan". Kosong = judul hero').optional(),
    contentStatus: z
      .enum(['review', 'draft', 'final'])
      .default('review')
      .meta({ title: 'Status konten', description: 'review = dari situs lama, perlu dicek pemilik' }),
    seo: seoSchema,
    hero: heroSchema,
    /** Teks & ikon untuk kartu otomatis (halaman layanan/pelatihan). */
    card: z
      .object({ icon: icon.optional(), summary: text('Ringkasan kartu') })
      .meta({ title: 'Kartu (untuk daftar layanan)' })
      .optional(),
    course: courseSchema.optional(),
    sections: z.array(sectionSchema).default([]).meta({ title: 'Section' }),
    parent: s(
      'Halaman induk (kunci terjemahan)',
      'Untuk breadcrumb & halaman terkait. Kosong = "services" untuk layanan, "training" untuk pelatihan.',
    ).optional(),
    relatedPosts: z
      .array(s('Slug artikel'))
      .default([])
      .meta({ title: 'Artikel terkait', description: 'Ditampilkan lebih dulu; sisanya otomatis dari artikel yang menautkan halaman ini.' }),
    updatedAt: z.string().meta({ title: 'Terakhir diperbarui', widget: 'date' }).optional(),
  })
  .superRefine((d, ctx) => {
    if (d.template === 'course' && !d.course)
      ctx.addIssue({ code: 'custom', path: ['course'], message: 'Halaman pelatihan wajib punya data program' });
  });

export const postCategories = ['sertifikasi', 'keselamatan', 'peralatan', 'layanan', 'karier', 'kepatuhan'] as const;

export const postSchema = z.object({
  translationKey: s('Kunci terjemahan'),
  slug: s('Slug URL', 'Huruf kecil, angka, tanda hubung').regex(/^[a-z0-9-]+$/),
  title: s('Judul artikel (H1)'),
  seo: seoSchema,
  excerpt: text('Ringkasan'),
  category: z.enum(postCategories).meta({ title: 'Kategori' }),
  image: img('Gambar utama (opsional)').optional(),
  imageAlt: s('Teks alternatif gambar').optional(),
  publishedAt: z.coerce.date().meta({ title: 'Tanggal terbit', widget: 'date' }),
  updatedAt: z.coerce.date().meta({ title: 'Tanggal diperbarui', widget: 'date' }).optional(),
  author: s('Penulis').default('Tim Rope Access Center'),
  draft: z.boolean().default(false).meta({ title: 'Draf (belum terbit)' }),
  faq: z
    .array(z.object({ q: s('Pertanyaan'), a: text('Jawaban') }).meta({ title: 'Tanya-jawab' }))
    .default([])
    .meta({ title: 'FAQ (rich result)' }),
  sources: z
    .array(
      z
        .object({
          title: s('Judul sumber'),
          publisher: s('Penerbit / lembaga').optional(),
          url: z.url().meta({ title: 'URL (https://…)' }),
        })
        .meta({ title: 'Sumber' }),
    )
    .default([])
    .meta({ title: 'Referensi (link keluar ke sumber kredibel)' }),
});

/* ---------- Koleksi data (satu file JSON per koleksi, diedit dari dashboard) ---------- */

export const scheduleItemSchema = z
  .object({
    id: s('ID unik', 'mis. 2027-01-tkpk-1').regex(/^[a-z0-9-]+$/),
    course: s('Program (kunci terjemahan halaman pelatihan)', 'mis. course-tkpk-1'),
    startDate: date('Tanggal mulai'),
    endDate: date('Tanggal selesai'),
    location: i18n('Lokasi'),
    seatsTotal: z.number().int().min(0).meta({ title: 'Kuota (0 = sesuai permintaan)' }),
    seatsLeft: z.number().int().min(0).meta({ title: 'Sisa kursi' }),
    status: z
      .enum(['open', 'limited', 'full', 'request'])
      .meta({ title: 'Status', description: 'open = dibuka, limited = kursi terbatas, full = penuh, request = sesuai permintaan' }),
    published: z.boolean().default(true).meta({ title: 'Tampilkan' }),
  })
  .meta({ title: 'Kelas' });

export const accreditationItemSchema = z
  .object({
    id: s('ID unik').regex(/^[a-z0-9-]+$/),
    name: s('Nama lembaga / standar'),
    note: i18n('Keterangan', true),
    url: z.url().meta({ title: 'Situs resmi (opsional)' }).optional(),
    order: z.number().int().meta({ title: 'Urutan' }),
  })
  .meta({ title: 'Akreditasi' });

export const teamItemSchema = z
  .object({
    id: s('ID unik').regex(/^[a-z0-9-]+$/),
    name: s('Nama'),
    role: i18n('Jabatan'),
    credentials: z.array(s('Sertifikat')).default([]).meta({ title: 'Kredensial' }),
    bio: i18n('Profil singkat', true),
    photo: img('Foto (opsional)').optional(),
    order: z.number().int().meta({ title: 'Urutan' }),
    sample: z
      .boolean()
      .default(false)
      .meta({ title: 'Data contoh (disembunyikan di situs live)', description: 'Matikan setelah data dikonfirmasi asli.' }),
  })
  .meta({ title: 'Anggota tim' });

export const testimonialItemSchema = z
  .object({
    id: s('ID unik').regex(/^[a-z0-9-]+$/),
    name: s('Nama'),
    role: i18n('Jabatan'),
    company: s('Perusahaan'),
    quote: i18n('Kutipan', true),
    order: z.number().int().meta({ title: 'Urutan' }),
    sample: z
      .boolean()
      .default(false)
      .meta({ title: 'Data contoh (disembunyikan di situs live)', description: 'Matikan setelah testimoni dikonfirmasi asli.' }),
  })
  .meta({ title: 'Testimoni' });

export const faqItemSchema = z
  .object({
    id: s('ID unik').regex(/^[a-z0-9-]+$/),
    group: z.enum(faqGroups).meta({ title: 'Grup' }),
    order: z.number().int().meta({ title: 'Urutan' }),
    question: i18n('Pertanyaan'),
    answer: i18n('Jawaban', true),
  })
  .meta({ title: 'Tanya-jawab' });

/** Nama file JSON koleksi data → skema item. Dipakai content.config.ts, dashboard, dan Worker. */
export const dataCollections = {
  schedule: { title: 'Jadwal Kelas', item: scheduleItemSchema },
  accreditations: { title: 'Akreditasi', item: accreditationItemSchema },
  team: { title: 'Tim', item: teamItemSchema },
  testimonials: { title: 'Testimoni', item: testimonialItemSchema },
  faqs: { title: 'FAQ', item: faqItemSchema },
} as const;
export type DataCollection = keyof typeof dataCollections;

/* ---------- Data bisnis ---------- */

const hours = z
  .object({
    days: z.array(z.enum(['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'])).meta({ title: 'Hari' }),
    opens: s('Buka (HH:MM)'),
    closes: s('Tutup (HH:MM)'),
  })
  .meta({ title: 'Jam' });

export const siteSchema = z.object({
  name: s('Nama bisnis'),
  shortName: s('Nama singkat'),
  legalName: s('Nama legal'),
  url: s('URL situs'),
  tagline: z.object({ id: s('Tagline (ID)'), en: s('Tagline (EN)') }).meta({ title: 'Tagline' }),
  description: z.object({ id: text('Deskripsi (ID)'), en: text('Deskripsi (EN)') }).meta({ title: 'Deskripsi singkat perusahaan' }),
  foundingDate: s('Tahun berdiri (opsional)').optional(),
  parentOrganization: z
    .object({ name: s('Nama induk usaha'), url: s('Situs induk usaha') })
    .meta({ title: 'Induk usaha / grup (opsional)' })
    .optional(),
  email: s('Email'),
  phoneDisplay: s('Telepon (tampilan)'),
  phoneE164: s('Telepon (format +62…)'),
  whatsapp: s('Nomor WhatsApp (62…)'),
  whatsappMessage: z.object({ id: s('Pesan awal (ID)'), en: s('Pesan awal (EN)') }).meta({ title: 'Pesan WhatsApp' }),
  address: z
    .object({
      street: s('Jalan'),
      locality: s('Kota'),
      region: s('Provinsi'),
      postalCode: s('Kode pos'),
      country: s('Negara (kode)'),
    })
    .meta({ title: 'Alamat' }),
  geo: z
    .object({ latitude: z.number().meta({ title: 'Lintang' }), longitude: z.number().meta({ title: 'Bujur' }) })
    .meta({ title: 'Koordinat peta (opsional)' })
    .optional(),
  areaServed: z.array(s('Wilayah')).meta({ title: 'Area layanan' }),
  openingHours: z.array(hours).meta({ title: 'Jam operasional' }),
  social: z
    .object({
      facebook: s('Facebook URL'),
      instagram: s('Instagram URL'),
      threads: s('Threads URL').default(''),
      linkedin: s('LinkedIn URL'),
      youtube: s('YouTube URL'),
      tiktok: s('TikTok URL'),
    })
    .meta({ title: 'Media sosial' }),
});
