import { DisplayStatus } from '@/types/payment';

const ORDER_NUMBER_REGEX = /^[a-z]{3}-\d{6}-\d{5}$/i;
const ORDER_NUMBER_ATTEMPT_REGEX = /^([a-z]{3}-\d{6}-\d{5})-[p]\d+$/i;

export function extractOrderNumber(value: string | null): string | null {
  if (!value) return null;

  const trimmed = value.trim();
  if (!trimmed) return null;

  if (ORDER_NUMBER_REGEX.test(trimmed)) {
    return trimmed.toUpperCase();
  }

  const attemptMatch = trimmed.match(ORDER_NUMBER_ATTEMPT_REGEX);
  if (attemptMatch) {
    return attemptMatch[1].toUpperCase();
  }

  return null;
}

export function resolveDisplayStatus(
  serverStatus: string | undefined,
  easykashStatus: string | null,
): DisplayStatus {
  if (serverStatus === 'paid' || serverStatus === 'partial-paid') {
    return 'success';
  }

  if (serverStatus === 'failed' || serverStatus === 'cancelled') {
    return 'failed';
  }

  if (easykashStatus === 'PAID') {
    return 'success';
  }

  if (easykashStatus === 'FAILED' || easykashStatus === 'EXPIRED') {
    return 'failed';
  }

  return 'pending';
}

/**
 * Gets the Islamic Hijri date using the Intl API
 * Uses the 'islamic-umalqura' calendar system for accurate conversion
 */
export function getHijriDateString(
  gregorianDate: Date,
  locale: string = 'en',
): string {
  try {
    const hijriFormatter = new Intl.DateTimeFormat(
      locale === 'ar' ? 'ar-SA' : 'en-US',
      {
        calendar: 'islamic-umalqura',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      },
    );

    return hijriFormatter.format(gregorianDate);
  } catch (error) {
    // Fallback if islamic-umalqura is not supported
    console.error('Islamic calendar not supported:', error);
    return gregorianDate.toLocaleDateString(
      locale === 'ar' ? 'ar-SA' : 'en-US',
    );
  }
}
