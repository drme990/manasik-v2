import { ChevronRight } from 'lucide-react';
import { Link } from '@/i18n/routing';

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

// Visible breadcrumb trail — pairs with the BreadcrumbList JSON-LD
// emitted by the page so users and crawlers see the same path.
export default function Breadcrumb({ items }: { items: BreadcrumbItem[] }) {
  return (
    <nav aria-label="Breadcrumb" className="mb-8">
      <ol className="flex flex-wrap items-center gap-1.5 text-sm text-secondary">
        {items.map((item, i) => (
          <li key={i} className="flex min-w-0 items-center gap-1.5">
            {i > 0 && (
              <ChevronRight
                size={14}
                aria-hidden="true"
                className="shrink-0 opacity-60 rtl:rotate-180"
              />
            )}
            {item.href ? (
              <Link
                href={item.href}
                className="transition-colors hover:text-success"
              >
                {item.label}
              </Link>
            ) : (
              <span
                aria-current="page"
                className="max-w-[16rem] truncate font-medium text-foreground sm:max-w-md"
              >
                {item.label}
              </span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}
