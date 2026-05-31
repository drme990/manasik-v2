import { cn } from '@/lib/utils';

export default function PageTitle({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <h1
      className={cn(
        'text-center mb-12 text-3xl md:text-4xl font-bold',
        className,
      )}
    >
      {children}
    </h1>
  );
}
