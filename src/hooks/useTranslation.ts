/**
 * Custom Translation Hooks
 *
 * Provides type-safe translation hooks with enhanced functionality:
 * - useTranslation: Main hook for translations
 * - useLanguage: Hook for language switching
 *
 * @module hooks/useTranslation
 */

import { useTranslation as useI18nTranslation, UseTranslationOptions } from 'react-i18next';
import { useCallback } from 'react';
import { SUPPORTED_LANGUAGES, type SupportedLanguage } from '../i18n';

/**
 * Main translation hook
 *
 * Re-exports react-i18next's useTranslation with additional type safety
 *
 * @param ns - Namespace(s) to use (default: 'common')
 * @param options - Translation options
 *
 * @example
 * ```tsx
 * const { t } = useTranslation();
 * return <button>{t('auth.login')}</button>;
 * ```
 *
 * @example With variables
 * ```tsx
 * const { t } = useTranslation();
 * return <h1>{t('common.welcome', { name: 'John' })}</h1>;
 * ```
 */
export function useTranslation(ns?: string | string[], options?: UseTranslationOptions<undefined>) {
  return useI18nTranslation(ns || 'common', options);
}

/**
 * Language switching hook
 *
 * Provides utilities for managing language state
 *
 * @returns Object with current language and change function
 *
 * @example
 * ```tsx
 * const { currentLanguage, changeLanguage, availableLanguages } = useLanguage();
 *
 * return (
 *   <select value={currentLanguage} onChange={(e) => changeLanguage(e.target.value)}>
 *     {availableLanguages.map(lang => (
 *       <option key={lang} value={lang}>{lang}</option>
 *     ))}
 *   </select>
 * );
 * ```
 */
export function useLanguage() {
  const { i18n } = useI18nTranslation();

  /**
   * Change current language
   * Saves to localStorage automatically
   */
  const changeLanguage = useCallback(
    async (lng: SupportedLanguage) => {
      await i18n.changeLanguage(lng);
    },
    [i18n]
  );

  /**
   * Get current language code
   */
  const currentLanguage = i18n.language as SupportedLanguage;

  /**
   * Get list of available languages
   */
  const configuredLanguages = i18n.options.supportedLngs;
  const availableLanguages = (
    Array.isArray(configuredLanguages)
      ? configuredLanguages
      : Object.keys(SUPPORTED_LANGUAGES)
  ).filter((lng: string) => lng !== 'cimode') as SupportedLanguage[];

  /**
   * Check if a language is currently active
   */
  const isLanguageActive = useCallback(
    (lng: SupportedLanguage) => currentLanguage === lng,
    [currentLanguage]
  );

  return {
    currentLanguage,
    changeLanguage,
    availableLanguages,
    isLanguageActive,
  };
}
