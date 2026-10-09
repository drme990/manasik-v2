import { cn } from '@/lib/utils';

// Renders admin-authored rich text (sanitized HTML from the backend).
// Content is trusted — it comes from the admin panel only.
export default function HtmlContent({
  html,
  className,
}: {
  html: string;
  className?: string;
}) {
  if (!html) return null;
  return (
    <div
      className={cn(
        'prose prose-invert max-w-none text-foreground leading-relaxed',
        '[&_h2]:text-xl [&_h2]:font-semibold [&_h2]:mt-6 [&_h2]:mb-3',
        '[&_h3]:text-lg [&_h3]:font-semibold [&_h3]:mt-5 [&_h3]:mb-2',
        '[&_p]:mb-3 [&_ul]:list-disc [&_ul]:ps-6 [&_ul]:mb-3',
        '[&_ol]:list-decimal [&_ol]:ps-6 [&_ol]:mb-3',
        '[&_a]:text-success [&_a]:underline',
        '[&_strong]:font-semibold [&_strong]:text-foreground',
        className,
      )}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
