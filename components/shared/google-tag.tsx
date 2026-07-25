import { CONSENT_REQUIRED_REGIONS_CSV } from '@/lib/consent-regions';

/**
 * Google tag (gtag.js) for Google Ads account AW-18346838035.
 *
 * Loaded once in the root layout's <head>. Renders, in order:
 *   1. dataLayer + gtag() shim + Consent Mode v2 defaults
 *      - EU/UK/CH/EFTA visitors: all storage denied by default
 *      - everyone else: all storage granted by default
 *      (Google applies the region-specific default based on the
 *       visitor's IP, so no client-side geo call is needed here.)
 *   2. the gtag.js loader (async)
 *   3. gtag('js', ...) + gtag('config', 'AW-18346838035')
 *
 * The <ConsentBanner /> component later calls gtag('consent', 'update', ...)
 * when an EU/UK/CH visitor makes a choice. No second Google tag should be
 * added anywhere else — additional destinations can be wired to this same
 * tag via gtag('config', '<DEST_ID>') instead.
 */

const GOOGLE_ADS_ID = 'AW-18346838035';

// Inline script #1 — must run BEFORE gtag.js so the consent defaults apply.
const consentDefaultsScript = `
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}

  // EU / UK / CH / EFTA — denied until the user consents via the banner.
  gtag('consent', 'default', {
    ad_storage: 'denied',
    analytics_storage: 'denied',
    ad_user_data: 'denied',
    ad_personalization: 'denied',
    wait_for_update: 500,
    region: [${CONSENT_REQUIRED_REGIONS_CSV.split(',')
      .map((c) => `'${c}'`)
      .join(',')}]
  });

  // Rest of the world — granted by default (no consent banner shown).
  gtag('consent', 'default', {
    ad_storage: 'granted',
    analytics_storage: 'granted',
    ad_user_data: 'granted',
    ad_personalization: 'granted'
  });
`;

// Inline script #2 — runs after the gtag.js loader is queued.
const configScript = `
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  gtag('config', '${GOOGLE_ADS_ID}');
`;

export default function GoogleTag() {
  return (
    <>
      {/* Consent Mode v2 defaults — must precede gtag.js */}
      <script dangerouslySetInnerHTML={{ __html: consentDefaultsScript }} />
      {/* Google tag (gtag.js) */}
      <script
        async
        src={`https://www.googletagmanager.com/gtag/js?id=${GOOGLE_ADS_ID}`}
      />
      <script dangerouslySetInnerHTML={{ __html: configScript }} />
    </>
  );
}
