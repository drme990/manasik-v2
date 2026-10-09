import { cn } from '@/lib/utils';
import AnimatedIcon from '@/components/shared/animated-icon';

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
        'flex flex-col items-center text-center gap-5 bg-card-bg w-full border border-stroke rounded-site px-4 py-8',
        className,
      )}
    >
      <div className="relative w-14 h-14 shrink-0">
        <AnimatedIcon src={icon} alt={title} className="absolute inset-0 w-full h-full object-contain" />
      </div>
      <h3 className="text-lg font-bold text-foreground">{title}</h3>
      <p className="text-sm text-foreground/70 leading-relaxed">
        {description}
      </p>
    </div>
  );
}
