import site from '@/data/site.json';
import type { Locale } from '@/i18n/config';
import { hrefFor } from './routes';

export function whatsappUrl(locale: Locale, message?: string): string {
  const text = message ?? site.whatsappMessage[locale];
  return `https://wa.me/${site.whatsapp}?text=${encodeURIComponent(text)}`;
}

/**
 * Resolusi href dari konten:
 *  "#whatsapp"            -> link WhatsApp
 *  "about" (translationKey) -> URL sesuai bahasa aktif
 *  "/path/", "https://…", "#id", "mailto:", "tel:" -> apa adanya
 */
export async function resolveHref(href: string, locale: Locale): Promise<string> {
  if (href === '#whatsapp') return whatsappUrl(locale);
  if (/^(\/|#|https?:|mailto:|tel:)/.test(href)) return href;
  return hrefFor(href, locale);
}
