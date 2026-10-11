import { cn } from '@/lib/utils';
import type { CSSProperties, ReactNode } from 'react';

/** A title's words, each in its own span, so on the home page they can rise one after another (motion.css). */
function splitWords(children: ReactNode): ReactNode {
  if (typeof children !== 'string') return children;
  return children.split(' ').map((word, index) => (
    <span key={index}>
      {index > 0 ? ' ' : null}
      <span className="mo-w inline-block" style={{ '--w': index } as CSSProperties}>
        {word}
      </span>
    </span>
  ));
}

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
      data-mo="stamp"
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
      data-mo="words"
      className={cn(
        'text-3xl md:text-5xl font-semibold text-foreground text-center mb-5 leading-tight tracking-tight',
        className,
      )}
      {...props}
    >
      {splitWords(children)}
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
      data-mo="rise"
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
