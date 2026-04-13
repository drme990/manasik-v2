import { LucideIcon } from 'lucide-react';

interface PaymentStatusHeaderProps {
  Icon: LucideIcon;
  title: string;
  message: string;
  anotherMessage?: string;
  iconColorClassName: string;
  iconContainerClassName: string;
}

export default function PaymentStatusHeader({
  Icon,
  title,
  message,
  anotherMessage,
  iconColorClassName,
  iconContainerClassName,
}: PaymentStatusHeaderProps) {
  return (
    <div className="text-center">
      <div
        className={`w-20 h-20 mx-auto rounded-full ${iconContainerClassName} flex items-center justify-center mb-5`}
      >
        <Icon size={40} className={iconColorClassName} />
      </div>
      <h1 className="text-2xl font-bold mb-2">{title}</h1>
      <p className="text-secondary text-sm whitespace-pre-line">{message}</p>
      {anotherMessage && (
        <p className="text-success text-sm whitespace-pre-line mt-2">
          {anotherMessage}
        </p>
      )}
    </div>
  );
}
