/**
 * Regions where Google Consent Mode v2 requires explicit user consent
 * before storing ad/analytics cookies: the European Economic Area (EEA),
 * the United Kingdom, Switzerland, and the EFTA micro-states that follow
 * the same rules.
 *
 * Pure module (no client-only APIs) so it can be imported from both
 * server and client components.
 */

export const CONSENT_REQUIRED_REGIONS = [
  // EEA / EU
  'AT', 'BE', 'BG', 'HR', 'CY', 'CZ', 'DK', 'EE', 'FI', 'FR', 'DE', 'GR',
  'HU', 'IE', 'IT', 'LV', 'LT', 'LU', 'MT', 'NL', 'PL', 'PT', 'RO', 'SK',
  'SI', 'ES', 'SE',
  // EFTA (follows EEA rules)
  'IS', 'NO', 'LI',
  // United Kingdom + Crown Dependencies
  'GB', 'GG', 'JE', 'IM',
  // Switzerland
  'CH',
] as const;

/** Comma-separated list for the gtag `region` consent parameter. */
export const CONSENT_REQUIRED_REGIONS_CSV =
  CONSENT_REQUIRED_REGIONS.join(',');

/** True for visitors from the EU, UK, CH and EFTA states. */
export function isConsentRequiredCountry(
  countryCode: string | null | undefined,
): boolean {
  if (!countryCode) return false;
  const code = countryCode.trim().toUpperCase();
  return (CONSENT_REQUIRED_REGIONS as readonly string[]).includes(code);
}
