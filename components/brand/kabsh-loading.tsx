/**
 * The loading mark, served as a static image (SEO D12-a, owner 2026-10-12).
 *
 * The animation itself lives in kabsh-loading-svg.tsx and is written to
 * public/brand/kabsh-loading-{light,dark}.svg by scripts/build-kabsh-loader.tsx.
 * Inline, it put ~150 KB of SVG into every page that shows it (twice on
 * product pages), pushing the page's real content far down the HTML that
 * search and AI crawlers read. As a file it is downloaded once and cached.
 *
 * An <img> cannot read the page's CSS variables, so the theme picks the file:
 * the light one is hidden on the dark site and the other way round.
 */
export default function KabshLoading({ size = 84, className }: { size?: number; className?: string }) {
  const height = Math.round((size * 78) / 84);
  const common = {
    width: size,
    height,
    'aria-hidden': true,
    decoding: 'async' as const,
  };
  return (
    <>
      {/* eslint-disable-next-line @next/next/no-img-element -- animated SVG; next/image would rasterise it */}
      <img src="/brand/kabsh-loading-light.svg" alt="" {...common} className={`dark:hidden ${className ?? ''}`} />
      {/* eslint-disable-next-line @next/next/no-img-element -- animated SVG; next/image would rasterise it */}
      <img src="/brand/kabsh-loading-dark.svg" alt="" {...common} className={`hidden dark:inline ${className ?? ''}`} />
    </>
  );
}
