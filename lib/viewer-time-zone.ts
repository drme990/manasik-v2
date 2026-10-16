/**
 * The browser's time zone (an IANA name such as "Africa/Cairo"), sent with the checkout in `x-viewer-tz`
 * (owner, 2026-10-16). The server records it next to the country of the internet address, for its country check:
 * a VPN moves the address, not the computer's clock. Nothing is shown to the visitor, and nothing is priced by it here.
 */
export const VIEWER_TZ_HEADER = 'x-viewer-tz';

/** `{ 'x-viewer-tz': zone }`, or `{}` when the browser does not tell (the checkout is sent the same either way). */
export function viewerTimeZoneHeader(): Record<string, string> {
  try {
    const zone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    // A plain zone name only: anything else could not be sent as a header.
    return typeof zone === 'string' && zone.length <= 64 && /^[A-Za-z0-9_+\-/]+$/.test(zone)
      ? { [VIEWER_TZ_HEADER]: zone }
      : {};
  } catch {
    return {};
  }
}
