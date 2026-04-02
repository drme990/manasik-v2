const AUTH_COOKIE_NAME = 'manasik-auth';

export function hasClientAuthCookie(): boolean {
  if (typeof document === 'undefined') return false;

  return document.cookie
    .split(';')
    .map((cookie) => cookie.trim())
    .some((cookie) => cookie.startsWith(`${AUTH_COOKIE_NAME}=`));
}

export function clearClientAuthCookie(): void {
  if (typeof document === 'undefined') return;

  document.cookie = `${AUTH_COOKIE_NAME}=; Max-Age=0; path=/`;
}
