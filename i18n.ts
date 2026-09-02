import { getRequestConfig } from 'next-intl/server';

export const locales = ['it', 'fr', 'en', 'es', 'pt', 'de', 'ru'];
export const defaultLocale = 'it';

export default getRequestConfig(async ({ requestLocale }) => {
  // 1. Ottieni la locale dalla richiesta (è una Promise in Next.js 15 / next-intl v4)
  let locale = await requestLocale;

  // 2. Assicurati che sia una locale valida, altrimenti usa quella di default
  if (!locale || !locales.includes(locale)) {
    locale = defaultLocale;
  }

  // 3. Restituisci OBBLIGATORIAMENTE sia 'locale' che 'messages'
  return {
    locale,
    messages: (await import(`./messages/${locale}.json`)).default
  };
});