/**
 * An animated icon. The icons are served as small animated AVIF files (256 px, about a tenth of the GIF's weight,
 * the same look at the size they are shown); a browser that cannot show AVIF gets the original GIF. Loaded only when
 * near the screen.
 */
export default function AnimatedIcon({ src, alt, className }: { src: string; alt: string; className?: string }) {
  const avif = src.endsWith('.gif') ? src.replace(/\.gif$/, '.avif') : null;
  return (
    <picture>
      {avif ? <source srcSet={avif} type="image/avif" /> : null}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt={alt} loading="lazy" decoding="async" width={256} height={256} className={className} />
    </picture>
  );
}
