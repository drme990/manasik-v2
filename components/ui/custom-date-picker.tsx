'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Calendar, ChevronLeft, ChevronRight } from 'lucide-react';

type CustomDatePickerProps = {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  locale: string;
  blockedDates?: string[];
  required?: boolean;
  dir?: 'rtl' | 'ltr';
};

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function toIsoDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function fromIsoDate(iso: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return null;
  const [year, month, day] = iso.split('-').map(Number);
  const parsed = new Date(year, month - 1, day);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed;
}

export default function CustomDatePicker({
  value,
  onChange,
  placeholder,
  locale,
  blockedDates = [],
  required,
  dir = 'ltr',
}: CustomDatePickerProps) {
  const [open, setOpen] = useState(false);
  const selectedDate = fromIsoDate(value);
  const [monthDate, setMonthDate] = useState<Date>(selectedDate ?? new Date());
  const rootRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const onOutside = (event: MouseEvent) => {
      if (!rootRef.current) return;
      if (!rootRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    document.addEventListener('mousedown', onOutside);
    return () => document.removeEventListener('mousedown', onOutside);
  }, []);

  const firstDayOfMonth = new Date(
    monthDate.getFullYear(),
    monthDate.getMonth(),
    1,
  );
  const daysInMonth = new Date(
    monthDate.getFullYear(),
    monthDate.getMonth() + 1,
    0,
  ).getDate();
  const firstWeekday = firstDayOfMonth.getDay();

  const calendarDays = useMemo(() => {
    const cells: Array<{ date: Date; inCurrentMonth: boolean }> = [];

    for (let i = 0; i < firstWeekday; i += 1) {
      const d = new Date(
        monthDate.getFullYear(),
        monthDate.getMonth(),
        i - firstWeekday + 1,
      );
      cells.push({ date: d, inCurrentMonth: false });
    }

    for (let day = 1; day <= daysInMonth; day += 1) {
      const d = new Date(monthDate.getFullYear(), monthDate.getMonth(), day);
      cells.push({ date: d, inCurrentMonth: true });
    }

    while (cells.length % 7 !== 0) {
      const d = new Date(
        monthDate.getFullYear(),
        monthDate.getMonth(),
        daysInMonth + (cells.length % 7) + 1,
      );
      cells.push({ date: d, inCurrentMonth: false });
    }

    return cells;
  }, [monthDate, firstWeekday, daysInMonth]);

  const blockedDatesSet = useMemo(
    () => new Set(blockedDates.filter((d) => /^\d{4}-\d{2}-\d{2}$/.test(d))),
    [blockedDates],
  );

  const formattedValue = selectedDate
    ? selectedDate.toLocaleDateString(locale === 'ar' ? 'ar-EG' : 'en-GB', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : '';

  const monthLabel = monthDate.toLocaleDateString(
    locale === 'ar' ? 'ar-EG' : 'en-GB',
    {
      year: 'numeric',
      month: 'long',
    },
  );

  return (
    <div className="relative" ref={rootRef} dir={dir}>
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="w-full px-4 py-3 rounded-site border border-stroke bg-card-bg text-foreground text-sm flex items-center justify-between focus:outline-none focus:ring-2 focus:ring-success/40 focus:border-success transition-all"
        aria-label={placeholder}
      >
        <span className={formattedValue ? '' : 'text-secondary/60'}>
          {formattedValue || placeholder}
        </span>
        <Calendar size={16} className="text-secondary" />
      </button>

      {required && <input type="hidden" value={value} readOnly required />}

      {open && (
        <div className="absolute z-20 mt-2 w-full min-w-70 rounded-site border border-stroke bg-card-bg shadow-lg p-3">
          <div className="flex items-center justify-between mb-3">
            <button
              type="button"
              onClick={() =>
                setMonthDate(
                  new Date(
                    monthDate.getFullYear(),
                    monthDate.getMonth() - 1,
                    1,
                  ),
                )
              }
              className="p-1.5 rounded-md hover:bg-success/10 text-secondary hover:text-foreground"
            >
              <ChevronLeft
                size={16}
                className={locale === 'ar' ? 'rotate-180' : ''}
              />
            </button>
            <span className="text-sm font-semibold">{monthLabel}</span>
            <button
              type="button"
              onClick={() =>
                setMonthDate(
                  new Date(
                    monthDate.getFullYear(),
                    monthDate.getMonth() + 1,
                    1,
                  ),
                )
              }
              className="p-1.5 rounded-md hover:bg-success/10 text-secondary hover:text-foreground"
            >
              <ChevronRight
                size={16}
                className={locale === 'ar' ? 'rotate-180' : ''}
              />
            </button>
          </div>

          <div className="grid grid-cols-7 gap-1 mb-1">
            {WEEKDAYS.map((day) => (
              <div
                key={day}
                className="text-[11px] text-secondary text-center py-1"
              >
                {day}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1">
            {calendarDays.map(({ date, inCurrentMonth }) => {
              const iso = toIsoDate(date);
              const isSelected = value === iso;
              const isBlocked = blockedDatesSet.has(iso);

              return (
                <button
                  key={iso}
                  type="button"
                  disabled={isBlocked}
                  onClick={() => {
                    onChange(iso);
                    setOpen(false);
                  }}
                  className={`h-9 rounded-md text-sm transition-colors ${
                    isBlocked
                      ? 'cursor-not-allowed text-secondary/40 bg-background/70'
                      : isSelected
                        ? 'bg-success text-white'
                        : inCurrentMonth
                          ? 'hover:bg-success/10 text-foreground'
                          : 'text-secondary/40 hover:bg-success/5'
                  }`}
                >
                  {date.getDate()}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
