export type ReservationFieldKey =
  | 'intention'
  | 'sacrificeFor'
  | 'gender'
  | 'isAlive'
  | 'shortDuaa'
  | 'photo'
  | 'executionDate';

export function isExecutionDateKey(key: ReservationFieldKey): boolean {
  return key === 'executionDate';
}

export function normalizeReservationOptionValue(
  key: ReservationFieldKey,
  value: string,
): string {
  const normalized = value.trim().toLowerCase();

  if (key === 'gender') {
    if (normalized === 'male' || normalized === 'ذكر') return 'ذكر';
    if (normalized === 'female' || normalized === 'انثى') return 'انثى';
  }

  if (key === 'isAlive') {
    if (normalized === 'alive' || normalized === 'حي') return 'حي';
    if (
      normalized === 'alive and dead' ||
      normalized === 'alive & dead' ||
      normalized === 'احياء و متوفين' ||
      normalized === 'أحياء و متوفين'
    )
      return 'احياء و متوفين';
    if (
      normalized === 'dead' ||
      normalized === 'deceased' ||
      normalized === 'ميت' ||
      normalized === 'متوفي'
    )
      return 'متوفي';
  }

  if (key === 'intention') {
    if (normalized === 'aqeeqah' || normalized === 'عقيقة') return 'عقيقة';
    if (normalized === 'charity' || normalized === 'صدقة') return 'صدقة';
    if (normalized === 'vow (nadhr)' || normalized === 'نذر') return 'نذر';
    if (normalized === 'protective sacrifice' || normalized === 'فدو')
      return 'فدو';
  }

  return value.trim();
}
