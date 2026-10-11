import { Inbox } from 'lucide-react';

export default function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-site border border-dashed border-stroke/60 px-6 py-16 text-center">
      <Inbox size={36} className="text-secondary" aria-hidden="true" />
      <p className="text-secondary">{message}</p>
    </div>
  );
}
