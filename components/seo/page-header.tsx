import { cn } from '@/lib/utils';

// Consistent H1 block for every SEO page (exactly one H1 per page).
export default function PageHeader({
  title,
  description,
  eyebrow,
  align = 'center',
  className,
  children,
}: {
  title: string;
  description?: string;
  eyebrow?: string;
  align?: 'center' | 'start';
  className?: string;
  children?: React.ReactNode;
}) {
  const centered = align === 'center';
  return (
    <header className={cn('mb-10', centered && 'text-center', className)}>
      {eyebrow && (
        <span className="mb-4 inline-flex items-center rounded-full border border-success/30 bg-success/10 px-3 py-1 text-xs font-semibold text-success">
          {eyebrow}
        </span>
      )}
      <h1 className="text-3xl font-bold leading-tight text-foreground md:text-4xl">
        {title}
      </h1>
      {description && (
        <p
          className={cn(
            'mt-3 max-w-2xl text-base leading-relaxed text-secondary md:text-lg',
            centered && 'mx-auto',
          )}
        >
          {description}
        </p>
      )}
      {children}
    </header>
  );
}
