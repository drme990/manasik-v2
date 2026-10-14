'use client';

import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';

interface MediaKeyProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'> {
  children: ReactNode;
  /** Spoken by the screen reader: the key shows a picture only. */
  label: string;
  /** A round key this wide and tall; leave out for a pill that is as wide as its content. */
  size?: number;
  /** A toggle that is on (the like): the screen reader hears it. */
  selected?: boolean;
}

/**
 * A control laid over video (close, sound, share, like, "try again"): the round dark-glass key the app's reels
 * have — the same in every look, because the frame behind it is the video's and not the theme's. Two layers: the
 * wrapper is the dark glass (the body of the key and its lip), the face a lighter sheet of it with a lit top rim,
 * and the only thing that moves when pressed (components/reels/reels.css).
 */
export const MediaKey = forwardRef<HTMLButtonElement, MediaKeyProps>(function MediaKey({ children, label, size, selected, className, style, ...rest }, ref) {
  const round = size ? { width: size, height: size } : undefined;
  return (
    <button
      ref={ref}
      type="button"
      aria-label={label}
      aria-pressed={selected === undefined ? undefined : selected}
      className={`reel-key ${size ? '' : 'reel-key-pill'} ${className ?? ''}`.trim()}
      style={{ ...round, ...style }}
      {...rest}
    >
      <span className="reel-key-face">{children}</span>
    </button>
  );
});
