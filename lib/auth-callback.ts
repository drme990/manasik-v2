/**
 * Auth callback URL helpers.
 *
 * When redirecting a user to login/register, append `?callback=<current path>`
 * so that after successful authentication the user is returned to the page
 * they were on instead of the home page.
 */

/**
 * Build a login or register URL with a callback query param pointing to the
 * current page (path + search). Safe to use in client components.
 *
 * @param authPath  e.g. "/auth/login" or "/auth/register"
 * @returns URL string like "/ar/auth/login?callback=%2Fproducts%2Ffoo%3Fbar%3D1"
 */
export function buildAuthUrl(authPath: string): string {
  if (typeof window === 'undefined') return authPath;

  const currentPath = window.location.pathname + window.location.search;
  const sep = authPath.includes('?') ? '&' : '?';
  return `${authPath}${sep}callback=${encodeURIComponent(currentPath)}`;
}

/**
 * Read a callback URL from a URLSearchParams object and validate that it's
 * a relative path (to prevent open-redirect attacks via absolute URLs).
 *
 * @returns the safe callback path, or null if missing/invalid.
 */
export function getSafeCallback(
  searchParams: URLSearchParams | null | undefined,
): string | null {
  if (!searchParams) return null;
  const raw = searchParams.get('callback');
  if (!raw) return null;

  // Only allow relative paths starting with "/" — never protocol-relative
  // ("//evil.com") or absolute URLs ("https://evil.com").
  if (!raw.startsWith('/') || raw.startsWith('//')) return null;

  return raw;
}
