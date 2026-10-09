'use client';

import { useEffect, useMemo, useRef, useState } from 'react';

/**
 * A figure that arrives like a slot machine (the app's numbers, owner 2026-10-09: "make the numbers fun"): every
 * digit is a reel of 0–9 that spins round once and lands on its digit, the reels one after another from the left; the
 * signs between them ("+", ",", "%") pop in as their neighbours land. Written exactly as given ("+21,900", "98%"),
 * left to right.
 *
 * It starts when it is well inside the screen. Without the motion (no script yet, or reduced motion) the reels are
 * already on their figure (app/[locale]/motion.css), so the number is always right.
 */
export default function Odometer({ value, className }: { value: string; className?: string }) {
  const ref = useRef<HTMLSpanElement | null>(null);
  const [on, setOn] = useState(false);
  const chars = useMemo(() => Array.from(value), [value]);

  useEffect(() => {
    const el = ref.current;
    if (!el || !('IntersectionObserver' in window)) {
      setOn(true);
      return;
    }
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          // a moment after its card has started to land
          window.setTimeout(() => setOn(true), 260);
          io.disconnect();
        }
      },
      { threshold: 0.6 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  let reel = 0;
  return (
    <span ref={ref} className={`mo-odo${on ? ' is-on' : ''}${className ? ` ${className}` : ''}`} aria-label={value} role="img">
      {chars.map((char, index) => {
        if (char >= '0' && char <= '9') {
          const r = reel++;
          return (
            <span key={index} className="mo-odo-reel" aria-hidden="true">
              <span className="mo-odo-col" style={{ ['--to' as string]: 10 + Number(char), ['--r' as string]: r }}>
                {DIGITS.map((digit, cell) => (
                  <span key={cell}>{digit}</span>
                ))}
              </span>
            </span>
          );
        }
        return (
          <span key={index} className="mo-odo-sign" aria-hidden="true" style={{ ['--r' as string]: Math.max(0, reel - 1) }}>
            {char}
          </span>
        );
      })}
    </span>
  );
}

const DIGITS = Array.from({ length: 20 }, (_, index) => String(index % 10));
