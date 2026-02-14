import { cn } from '@/lib/utils';

type SectionProps = React.ComponentPropsWithoutRef<'section'>;

export function Section({ className, children, ...props }: SectionProps) {
  return (
    <section className={cn('py-8 px-6 md:py-12 md:px-8', className)} {...props}>
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
        'w-fit mx-auto px-4 py-2 bg-background font-medium text-sm uppercase text-foreground text-center mb-5 tracking-wide border border-stroke rounded-site',
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
        'text-3xl md:text-5xl font-bold text-foreground text-center mb-5 leading-tight tracking-tight',
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
        'text-base md:text-lg text-secondary text-center mb-12 max-w-2xl mx-auto leading-relaxed px-6 md:px-0',
        className,
      )}
      {...props}
    >
      {children}
    </p>
  );
}
