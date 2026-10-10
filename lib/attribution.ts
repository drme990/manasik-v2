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

import { getVisitorId } from '@/lib/visitor-id';

export interface AttributionIds {
  fbc?: string;
  fbp?: string;
  ttclid?: string;
  ttp?: string;
  scClickId?: string;
  scCookie1?: string;
  oppref?: string;
  obref?: string;
  /** The website's own visitor id (Meta external_id). */
  vid?: string;
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
    // Snapchat puts its click id in the ad's address as ScCid; the layout keeps it in sc_click_id.
    scClickId: getParam('ScCid', 'ScClickID', 'sc_click_id') || getCookie('sc_click_id'),
    // The Snap Pixel's own browser id is the _scid cookie.
    scCookie1: getCookie('_scid') || getCookie('sc_cookie1'),
    oppref: getParam('oppref') || getCookie('oppref'),
    obref: getCookie('__obref'),
    vid: getVisitorId(),
  };
}
