import { cn } from '@/lib/utils';

// Renders admin-authored rich text. The backend sanitizes HTML on save
// (allow-listed tags/attributes only), so it is safe to inject here.
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
        'max-w-none wrap-break-word leading-relaxed text-foreground/85',
        '[&_h2]:mb-3 [&_h2]:mt-6 [&_h2]:text-xl [&_h2]:font-semibold [&_h2]:text-foreground',
        '[&_h3]:mb-2 [&_h3]:mt-5 [&_h3]:text-lg [&_h3]:font-semibold [&_h3]:text-foreground',
        '[&_h4]:mb-2 [&_h4]:mt-4 [&_h4]:font-semibold [&_h4]:text-foreground',
        '[&_p]:mb-3 [&_p:last-child]:mb-0',
        '[&_ul]:mb-3 [&_ul]:list-disc [&_ul]:space-y-1 [&_ul]:ps-6',
        '[&_ol]:mb-3 [&_ol]:list-decimal [&_ol]:space-y-1 [&_ol]:ps-6',
        '[&_li]:marker:text-success',
        '[&_a]:font-medium [&_a]:text-success [&_a]:underline [&_a]:underline-offset-2',
        '[&_strong]:font-semibold [&_strong]:text-foreground',
        '[&_blockquote]:my-4 [&_blockquote]:border-s-4 [&_blockquote]:border-success/50 [&_blockquote]:ps-4 [&_blockquote]:italic',
        '[&_img]:my-4 [&_img]:h-auto [&_img]:max-w-full [&_img]:rounded-site',
        '[&_table]:my-4 [&_table]:w-full [&_table]:text-sm [&_td]:border [&_td]:border-stroke/40 [&_td]:p-2 [&_th]:border [&_th]:border-stroke/40 [&_th]:p-2',
        className,
      )}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
