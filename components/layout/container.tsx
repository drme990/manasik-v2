import { cn } from '@/lib/utils';

export default function Container({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={cn('w-full max-w-6xl mx-auto px-4 md:px-8', className)}>
      {children}
    </div>
  );
}
