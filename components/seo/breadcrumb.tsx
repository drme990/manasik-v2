import { Link } from '@/i18n/routing';
import { Fragment } from 'react';

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

// Visible breadcrumb trail — pairs with the BreadcrumbList JSON-LD
// emitted by the page so users and crawlers see the same path.
export default function Breadcrumb({ items }: { items: BreadcrumbItem[] }) {
  return (
    <nav aria-label="Breadcrumb" className="mb-6">
      <ol className="flex flex-wrap items-center gap-1.5 text-sm text-secondary">
        {items.map((item, i) => (
          <Fragment key={i}>
            {i > 0 && <li aria-hidden="true">/</li>}
            <li>
              {item.href ? (
                <Link
                  href={item.href}
                  className="hover:text-success transition-colors"
                >
                  {item.label}
                </Link>
              ) : (
                <span className="text-foreground font-medium">
                  {item.label}
                </span>
              )}
            </li>
          </Fragment>
        ))}
      </ol>
    </nav>
  );
}
