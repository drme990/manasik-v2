import { ArrowRight } from 'lucide-react';
import { Link } from '@/i18n/routing';

// Compact navigational tile — used for related/featured service lists.
export default function LinkTile({
  href,
  label,
  description,
  icon,
}: {
  href: string;
  label: string;
  description?: string;
  icon?: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="group flex h-full items-center gap-4 rounded-site border border-stroke bg-card-bg p-4 transition-all duration-300 hover:border-success/40 hover:shadow-[0_12px_28px_rgba(0,0,0,0.06)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-success"
    >
      {icon && (
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-success/10 text-success">
          {icon}
        </span>
      )}
      <span className="min-w-0 flex-1">
        <span className="block font-semibold text-foreground transition-colors group-hover:text-success">
          {label}
        </span>
        {description && (
          <span className="mt-0.5 block truncate text-sm text-secondary">
            {description}
          </span>
        )}
      </span>
      <ArrowRight
        size={18}
        aria-hidden="true"
        className="shrink-0 text-secondary transition-all duration-300 rtl:rotate-180 group-hover:translate-x-1 group-hover:text-success rtl:group-hover:-translate-x-1"
      />
    </Link>
  );
}
