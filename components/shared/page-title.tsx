import { cn } from '@/lib/utils';
import type { CSSProperties } from 'react';

export default function PageTitle({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <h1
      data-mo="words"
      className={cn(
        'text-center mb-12 text-3xl md:text-4xl font-bold',
        className,
      )}
    >
      {typeof children === 'string'
        ? children.split(' ').map((word, index) => (
            <span key={index}>
              {index > 0 ? ' ' : null}
              <span className="mo-w inline-block" style={{ '--w': index } as CSSProperties}>
                {word}
              </span>
            </span>
          ))
        : children}
    </h1>
  );
}
