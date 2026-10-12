import * as flags from 'country-flag-icons/react/3x2';

type FlagComponent = React.ComponentType<React.SVGProps<SVGSVGElement> & { title?: string }>;

/**
 * A country's flag from its two-letter code (owner, 2026-10-12: each review
 * shows its customer's country as a flag only). Nothing when the code is
 * unknown or empty.
 */
export default function CountryFlag({ code, className = '' }: { code?: string | null; className?: string }) {
  const key = (code || '').trim().toUpperCase();
  if (!/^[A-Z]{2}$/.test(key)) return null;
  const Flag = (flags as unknown as Record<string, FlagComponent | undefined>)[key];
  if (!Flag) return null;
  return <Flag aria-hidden="true" className={`inline-block h-3.5 w-5 shrink-0 rounded-[2px] shadow-sm ${className}`} />;
}
