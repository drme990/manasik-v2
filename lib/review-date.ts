/**
 * A review's short date, month and year only: «أكتوبر 2026» / "October 2026" (owner, 2026-10-13),
 * with Latin digits. Empty when the review has no real date (the old reviews' dates are unknown,
 * and none is ever made up for them).
 */
export function reviewMonth(date: string | null | undefined, locale: string): string {
  if (!date) return '';
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return '';
  try {
    return new Intl.DateTimeFormat(locale === 'ar' ? 'ar-EG-u-nu-latn' : 'en-GB', { month: 'long', year: 'numeric' }).format(d);
  } catch {
    return '';
  }
}
