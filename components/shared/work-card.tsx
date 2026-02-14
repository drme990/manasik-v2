import { cn } from '@/lib/utils';
import Image from 'next/image';

export default function WorkCard({
  icon,
  title,
  description,
  className = '',
}: {
  icon: string;
  title: string;
  description: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'flex flex-col items-center text-center gap-5 bg-card-bg w-full border border-stroke rounded-site px-6 py-6',
        className,
      )}
    >
      <div className="relative w-14 h-14 shrink-0">
        <Image
          src={icon}
          alt={title}
          fill
          className="object-contain"
          unoptimized
        />
      </div>
      <h3 className="text-lg font-bold text-foreground">{title}</h3>
      <p className="text-sm text-foreground/70 leading-relaxed">
        {description}
      </p>
    </div>
  );
}
