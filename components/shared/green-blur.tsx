import { cn } from '@/lib/utils';

interface GreenBlurProps {
  className?: string;
}

export default function GreenBlur({ className }: GreenBlurProps) {
  return (
    <div
      className={cn('absolute pointer-events-none -z-10', className)}
      aria-hidden="true"
    >
      <div className="w-50 h-50 bg-[radial-gradient(circle,#33ad6c_0%,#1723398a_54%)] blur-[80px]" />
    </div>
  );
}
