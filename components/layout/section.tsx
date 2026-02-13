import { cn } from '@/lib/utils';

type SectionProps = React.ComponentPropsWithoutRef<'section'>;

export function Section({ className, children, ...props }: SectionProps) {
  return (
    <section className={cn('py-14', className)} {...props}>
      {children}
    </section>
  );
}

type SectionOtherTitleProps = React.ComponentPropsWithoutRef<'p'>;

export function SectionUpTitle({
  className,
  children,
  ...props
}: SectionOtherTitleProps) {
  return (
    <p
      className={cn(
        'w-fit mx-auto px-6 py-2 bg-background font-medium text-sm uppercase text-foreground text-center mb-5 tracking-wide border border-stroke rounded-site',
        className,
      )}
      {...props}
    >
      {children}
    </p>
  );
}

type SectionTitleProps = React.ComponentPropsWithoutRef<'h2'>;

export function SectionTitle({
  className,
  children,
  ...props
}: SectionTitleProps) {
  return (
    <h2
      className={cn(
        'text-xl font-bold text-foreground text-center mb-4 leading-snug',
        className,
      )}
      {...props}
    >
      {children}
    </h2>
  );
}

export function SectionSubtitle({
  className,
  children,
  ...props
}: SectionOtherTitleProps) {
  return (
    <p
      className={cn(
        'text-base text-secondary text-center mb-10 max-w-md mx-auto leading-relaxed px-2',
        className,
      )}
      {...props}
    >
      {children}
    </p>
  );
}
