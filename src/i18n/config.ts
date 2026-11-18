export const locales = ['id', 'en'] as const;
export type Locale = (typeof locales)[number];
export const defaultLocale: Locale = 'id';

export const localeMeta: Record<Locale, { label: string; short: string; htmlLang: string; ogLocale: string }> = {
  id: { label: 'Bahasa Indonesia', short: 'ID', htmlLang: 'id-ID', ogLocale: 'id_ID' },
  en: { label: 'English', short: 'EN', htmlLang: 'en', ogLocale: 'en_US' },
};

export function isLocale(value: string): value is Locale {
  return (locales as readonly string[]).includes(value);
}
