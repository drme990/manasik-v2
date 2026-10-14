'use client';

import { useId, type SVGProps } from 'react';

/**
 * The reels' illustrated ("3D") icons: the very same art the mobile app ships
 * (manasik-app `tools/icons3d/svg/*.svg` — play, like, share-arrow, sound-on,
 * sound-off, reels), inlined here so they stay crisp at every size. Art sits
 * in a 48 box; the extra margin holds the soft shadow. Decorative: the key
 * around each icon carries the label.
 */

type IconProps = Omit<SVGProps<SVGSVGElement>, 'children'> & { size?: number };

function frame(size: number, rest: IconProps) {
  const { size: _size, ...props } = rest;
  void _size;
  return { width: size, height: size, viewBox: '-2 -1 52 52', xmlns: 'http://www.w3.org/2000/svg', 'aria-hidden': true, focusable: false, ...props } as const;
}

function Soft({ id }: { id: string }) {
  return (
    <filter id={id} x="-10%" y="-10%" width="120%" height="130%" colorInterpolationFilters="sRGB">
      <feDropShadow dx="0" dy="1.6" stdDeviation="1.3" floodColor="#000618" floodOpacity=".26" />
    </filter>
  );
}

/** The glossy coral play button. */
export function PlayIcon({ size = 48, ...props }: IconProps) {
  const id = useId();
  const soft = `${id}s`;
  const grad = `${id}g`;
  return (
    <svg {...frame(size, props)}>
      <defs>
        <Soft id={soft} />
        <linearGradient id={grad} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ffb199" />
          <stop offset="1" stopColor="#ee5a36" />
        </linearGradient>
      </defs>
      <g filter={`url(#${soft})`}>
        <ellipse cx="24" cy="46" rx="15" ry="1.9" fill="#00102e" opacity=".22" />
        <circle cx="24" cy="26" r="20" fill="#b93a18" />
        <circle cx="24" cy="23.5" r="20" fill={`url(#${grad})`} />
        <path d="M19.3 15.3v16.4a1.6 1.6 0 002.5 1.3l12.3-8.2a1.6 1.6 0 000-2.6l-12.3-8.2a1.6 1.6 0 00-2.5 1.3z" fill="#fff" />
      </g>
    </svg>
  );
}

/** The glossy red heart (a like). */
export function LikeIcon({ size = 48, ...props }: IconProps) {
  const id = useId();
  const soft = `${id}s`;
  const grad = `${id}g`;
  const heart = 'M24 41.5C10.5 33 4 25.5 4 17.5A10.5 10.5 0 0124 13a10.5 10.5 0 0120 4.5C44 25.5 37.5 33 24 41.5z';
  return (
    <svg {...frame(size, props)}>
      <defs>
        <Soft id={soft} />
        <linearGradient id={grad} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ff8d8d" />
          <stop offset="1" stopColor="#e8233b" />
        </linearGradient>
      </defs>
      <g filter={`url(#${soft})`}>
        <ellipse cx="24" cy="45.5" rx="13" ry="2" fill="#00102e" opacity=".22" />
        <path d={heart} fill="#a3132a" transform="translate(0 2.4)" />
        <path d={heart} fill={`url(#${grad})`} />
        <path d="M10 17.5a5.8 5.8 0 015.3-5.6" fill="none" stroke="#fff" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" opacity=".8" />
        <circle cx="36.2" cy="15.2" r="1.5" fill="#fff" opacity=".55" />
      </g>
    </svg>
  );
}

/** The paper share arrow. */
export function ShareArrowIcon({ size = 48, ...props }: IconProps) {
  const id = useId();
  const soft = `${id}s`;
  const grad = `${id}g`;
  const arrow = 'M27 6.5c0-1.4 1.6-2.2 2.7-1.3l14.4 11.9c.9.7.9 2.1 0 2.8L29.7 31.8c-1.1.9-2.7.1-2.7-1.3V25c-9.3-.3-15.6 2.7-20.2 9.6-.7 1-2.3.5-2.2-.7C5.7 21.6 13.5 13.6 27 13.1z';
  return (
    <svg {...frame(size, props)}>
      <defs>
        <Soft id={soft} />
        <linearGradient id={grad} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ffffff" />
          <stop offset="1" stopColor="#d5e0f0" />
        </linearGradient>
      </defs>
      <g filter={`url(#${soft})`}>
        <ellipse cx="24" cy="45" rx="16" ry="2" fill="#00102e" opacity=".22" />
        <g transform="translate(0 5)">
          <path d={arrow} fill="#b8c6dc" transform="translate(0 2.4)" />
          <path d={arrow} fill={`url(#${grad})`} stroke="#a9bbd6" strokeWidth=".9" />
        </g>
      </g>
    </svg>
  );
}

const SPEAKER = 'M4.5 19a3.5 3.5 0 013.5-3.5h5.2l9.2-8.3c1.9-1.7 4.6-.4 4.6 2v29.6c0 2.4-2.7 3.7-4.6 2l-9.2-8.3H8a3.5 3.5 0 01-3.5-3.5z';

function Speaker({ grad }: { grad: string }) {
  return (
    <>
      <ellipse cx="23" cy="45.5" rx="16" ry="2.2" fill="#00102e" opacity=".22" />
      <path d={SPEAKER} fill="#1b55b8" transform="translate(0 2.2)" />
      <path d={SPEAKER} fill={`url(#${grad})`} />
      <path d="M9 20.5h3" fill="none" stroke="#fff" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" opacity=".6" />
    </>
  );
}

function BlueGradient({ id }: { id: string }) {
  return (
    <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stopColor="#8cc8ff" />
      <stop offset="1" stopColor="#2f7df0" />
    </linearGradient>
  );
}

/** The blue speaker with its sound waves. */
export function SoundOnIcon({ size = 48, ...props }: IconProps) {
  const id = useId();
  const soft = `${id}s`;
  const grad = `${id}g`;
  return (
    <svg {...frame(size, props)}>
      <defs>
        <Soft id={soft} />
        <BlueGradient id={grad} />
      </defs>
      <g filter={`url(#${soft})`}>
        <Speaker grad={grad} />
        <path d="M32 17.5c2.2 3.6 2.2 9.4 0 13" fill="none" stroke="#2577b8" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round" transform="translate(0 1.6)" />
        <path d="M32 17.5c2.2 3.6 2.2 9.4 0 13" fill="none" stroke="#46a4e6" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M37.8 12c4.6 6.8 4.6 17.2 0 24" fill="none" stroke="#2577b8" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round" transform="translate(0 1.6)" />
        <path d="M37.8 12c4.6 6.8 4.6 17.2 0 24" fill="none" stroke="#46a4e6" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round" />
      </g>
    </svg>
  );
}

/** The blue speaker, crossed out in coral. */
export function SoundOffIcon({ size = 48, ...props }: IconProps) {
  const id = useId();
  const soft = `${id}s`;
  const grad = `${id}g`;
  return (
    <svg {...frame(size, props)}>
      <defs>
        <Soft id={soft} />
        <BlueGradient id={grad} />
      </defs>
      <g filter={`url(#${soft})`}>
        <Speaker grad={grad} />
        <path d="M32.5 18.5l10 11M42.5 18.5l-10 11" fill="none" stroke="#b93a18" strokeWidth="3.8" strokeLinecap="round" strokeLinejoin="round" transform="translate(0 1.6)" />
        <path d="M32.5 18.5l10 11M42.5 18.5l-10 11" fill="none" stroke="#ee5a36" strokeWidth="3.8" strokeLinecap="round" strokeLinejoin="round" />
      </g>
    </svg>
  );
}

/** The rose "reels" clapper: a film square with a play mark. */
export function ReelsIcon({ size = 48, ...props }: IconProps) {
  const id = useId();
  const soft = `${id}s`;
  const grad = `${id}g`;
  return (
    <svg {...frame(size, props)}>
      <defs>
        <Soft id={soft} />
        <linearGradient id={grad} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ffa6c1" />
          <stop offset="1" stopColor="#e83e73" />
        </linearGradient>
      </defs>
      <g filter={`url(#${soft})`}>
        <ellipse cx="24" cy="46" rx="16" ry="2" fill="#00102e" opacity=".22" />
        <rect x="5" y="6.4" width="38" height="38" rx="11" fill="#b3244f" />
        <rect x="5" y="4" width="38" height="38" rx="11" fill={`url(#${grad})`} />
        <path d="M5 16V15A11 11 0 0116 4h16a11 11 0 0111 11v1z" fill="#b3244f" opacity=".5" />
        <rect x="11" y="8" width="5.4" height="4.4" rx="1.5" fill="#fff" opacity=".9" />
        <rect x="21.3" y="8" width="5.4" height="4.4" rx="1.5" fill="#fff" opacity=".9" />
        <rect x="31.6" y="8" width="5.4" height="4.4" rx="1.5" fill="#fff" opacity=".9" />
        <path d="M19.5 21.5v13a1.5 1.5 0 002.3 1.3l10-6.5a1.5 1.5 0 000-2.6l-10-6.5a1.5 1.5 0 00-2.3 1.3z" fill="#fff" />
      </g>
    </svg>
  );
}
