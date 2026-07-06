/**
 * Internationalization (i18n) Configuration
 *
 * This file configures i18next with:
 * - Language detection from browser/localStorage
 * - Vietnamese as default fallback language
 * - Namespace support for scalability
 * - Type-safe translations with TypeScript
 *
 * @module i18n
 */

import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

// Import translation files
import enCommon from '../locales/en/common.json';
import viCommon from '../locales/vi/common.json';

// Define supported languages
export const SUPPORTED_LANGUAGES = {
  en: 'English',
  vi: 'Tiếng Việt',
} as const;

export type SupportedLanguage = keyof typeof SUPPORTED_LANGUAGES;

// Default fallback language (Vietnamese)
export const DEFAULT_LANGUAGE: SupportedLanguage = 'vi';

/**
 * Language detection configuration
 * Priority order:
 * 1. localStorage key 'i18nextLng'
 * 2. Browser language
 * 3. Fallback to Vietnamese
 */
const languageDetectorOptions = {
  // Order of detection methods
  order: ['localStorage', 'navigator'],

  // Keys to lookup language from
  lookupLocalStorage: 'i18nextLng',

  // Cache user language
  caches: ['localStorage'],

  // Don't automatically set HTML lang attribute (we'll do this manually)
  htmlTag: document.documentElement,
};

/**
 * Initialize i18next
 *
 * Features:
 * - Automatic language detection
 * - Persistent language selection via localStorage
 * - Fallback to Vietnamese for unsupported languages
 * - Namespace support for organizing translations
 * - Safe fallback for missing translation keys
 */
i18n
  // Use language detector plugin
  .use(LanguageDetector)

  // Pass i18n instance to react-i18next
  .use(initReactI18next)

  // Initialize i18next
  .init({
    // Language resources
    resources: {
      en: {
        common: enCommon,
      },
      vi: {
        common: viCommon,
      },
    },

    // Default namespace
    defaultNS: 'common',

    // Fallback language when detected language is not supported
    fallbackLng: (code) => {
      // If browser language starts with 'vi', use Vietnamese
      if (code && code.startsWith('vi')) {
        return ['vi'];
      }
      // If browser language starts with 'en', use English
      if (code && code.startsWith('en')) {
        return ['en'];
      }
      // For any other language, fallback to Vietnamese
      return [DEFAULT_LANGUAGE];
    },

    // Languages that are supported
    supportedLngs: Object.keys(SUPPORTED_LANGUAGES),

    // Language detector options
    detection: languageDetectorOptions,

    // Interpolation options
    interpolation: {
      // React already escapes values, so we don't need to escape again
      escapeValue: false,

      // Format values (e.g., numbers, dates)
      format: (value, format, lng) => {
        if (format === 'uppercase') return value.toUpperCase();
        if (format === 'lowercase') return value.toLowerCase();
        if (value instanceof Date) {
          return new Intl.DateTimeFormat(lng).format(value);
        }
        return value;
      },
    },

    // React options
    react: {
      // Use Suspense for async loading (future enhancement)
      useSuspense: false,
    },

    // Debugging (set to false in production)
    debug: false,

    // Return key if translation is missing (safe fallback)
    returnNull: false,
    returnEmptyString: false,

    // Key separator for nested translations
    keySeparator: '.',

    // Namespace separator
    nsSeparator: ':',
  });

/**
 * Update HTML lang attribute when language changes
 * This improves accessibility and SEO
 */
i18n.on('languageChanged', (lng) => {
  document.documentElement.lang = lng;
});

// Immediately sync initial detected language to document.documentElement.lang
if (i18n.language) {
  document.documentElement.lang = i18n.language;
}

export default i18n;
