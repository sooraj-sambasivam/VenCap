/**
 * i18n shim — v1 passthrough implementation.
 *
 * Returns the English fallback string when provided, or the dot-namespaced key
 * itself when no fallback is given. This is a deliberate v1 shim; a future v2
 * will replace this with react-i18next (or equivalent) when multi-locale
 * support is needed.
 *
 * Usage:
 *   import { t } from '@/lib/i18n';
 *   t('nav.deals', 'Deals')   // => 'Deals'
 *   t('nav.deals')             // => 'nav.deals'
 *
 * Zero imports — this function has no React dependency and can be called
 * anywhere: engine files, components, utilities.
 */
export function t(key: string, fallback?: string): string {
  return fallback ?? key;
}
