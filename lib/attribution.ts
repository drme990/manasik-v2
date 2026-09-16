'use client';

/**
 * Ad-platform click/cookie attribution collector.
 *
 * Reads the click IDs and first-party cookies each ad platform drops,
 * and returns them so checkout can store them on the order. The backend
 * webhook then forwards them in the server-side CAPI Purchase calls so
 * the platforms can match the conversion back to the original ad click.
 *
 * Captured identifiers:
 *   Meta:     _fbc (fbclid cookie), _fbp (browser id cookie)
 *   TikTok:   ttclid (URL param), _ttp (cookie)
 *   Snapchat: ScClickID (URL param), sc_click_id + sc_cookie1 (cookies)
 *   OpenAI:   oppref (URL param), __obref (first-party cookie)
 */

export interface AttributionIds {
  fbc?: string;
  fbp?: string;
  ttclid?: string;
  ttp?: string;
  scClickId?: string;
  scCookie1?: string;
  oppref?: string;
  obref?: string;
}

function getCookie(name: string): string | undefined {
  if (typeof document === 'undefined') return undefined;
  return (
    document.cookie.match(new RegExp(`(?:^|;\\s*)${name}=([^;]*)`))?.[1] ||
    undefined
  );
}

function getParam(...names: string[]): string | undefined {
  if (typeof window === 'undefined') return undefined;
  const params = new URLSearchParams(window.location.search);
  for (const name of names) {
    const value = params.get(name);
    if (value) return value;
  }
  return undefined;
}

/**
 * Collect all available ad-platform identifiers for the current session.
 * Returns undefined fields for identifiers that aren't present — the
 * backend stores only what's there.
 */
export function collectAttribution(): AttributionIds {
  return {
    fbc: getCookie('_fbc'),
    fbp: getCookie('_fbp'),
    ttclid: getParam('ttclid') || getCookie('ttclid'),
    ttp: getCookie('_ttp'),
    scClickId: getParam('ScClickID', 'sc_click_id') || getCookie('sc_click_id'),
    scCookie1: getCookie('sc_cookie1'),
    oppref: getParam('oppref') || getCookie('oppref'),
    obref: getCookie('__obref'),
  };
}
