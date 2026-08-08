import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'

import en from './locales/en.json'
import es from './locales/es.json'

// EN + ES only: US market (coaches, athletic trainers, band directors).
// The 16-language matrix used elsewhere in the portfolio is intentionally
// not applied — state heat policy content is US-specific.
export const supportedLanguages = {
  en: 'English',
  es: 'Español',
} as const

export type SupportedLanguage = keyof typeof supportedLanguages

export const localeMap: Record<string, string> = {
  en: 'en_US',
  es: 'es_US',
}

i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    es: { translation: es },
  },
  supportedLngs: Object.keys(supportedLanguages),
  fallbackLng: 'en',
  defaultNS: 'translation',
  interpolation: {
    escapeValue: false,
  },
})

export default i18n
