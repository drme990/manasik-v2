const AUTH_HINT_STORAGE_KEY = 'manasik-auth-hint';
const AUTH_HINT_COOKIE_KEY = 'manasik-auth';

function hasAuthHintCookie(): boolean {
  return document.cookie
    .split(';')
    .some((entry) => entry.trim().startsWith(`${AUTH_HINT_COOKIE_KEY}=1`));
}

export function hasAuthHint(): boolean {
  if (typeof window === 'undefined') return false;

  try {
    if (window.localStorage.getItem(AUTH_HINT_STORAGE_KEY) === '1') {
      return true;
    }
  } catch {
    // Ignore storage access issues and fall back to cookie check.
  }

  return hasAuthHintCookie();
}

export function markAuthHint(): void {
  if (typeof window === 'undefined') return;

  try {
    window.localStorage.setItem(AUTH_HINT_STORAGE_KEY, '1');
  } catch {
    // Best-effort optimization only.
  }
}

export function clearAuthHint(): void {
  if (typeof window === 'undefined') return;

  try {
    window.localStorage.removeItem(AUTH_HINT_STORAGE_KEY);
  } catch {
    // Best-effort optimization only.
  }
}
