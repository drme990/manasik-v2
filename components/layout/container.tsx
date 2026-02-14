import { cn } from '@/lib/utils';

export default function Container({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={cn('w-full min-w-0 max-w-6xl mx-auto px-5', className)}>
      {children}
    </div>
  );
}
