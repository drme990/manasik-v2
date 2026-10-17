'use client';

import { useTheme } from 'next-themes';
import { Sun, Moon } from 'lucide-react';
import { flushSync } from 'react-dom';
import Button from '../ui/button';

/**
 * Light ↔ dark (owner, 2026-10-17: «الانتقال من ثيم لثيم بحركة ممتعة»): the new theme spreads from the key in a
 * growing circle with a little overshoot, while the sun turns into the moon. Without the browser's view transitions
 * (or with less motion asked), it simply switches. `compact`: the phone header's glass key, sized to the flag.
 */
export default function ThemeToggle({ compact = false }: { compact?: boolean }) {
  const { resolvedTheme, setTheme } = useTheme();

  const toggleTheme = (e: React.MouseEvent<HTMLButtonElement>) => {
    const next = resolvedTheme === 'dark' ? 'light' : 'dark';
    const doc = document as Document & { startViewTransition?: (cb: () => void) => { ready: Promise<void> } };
    if (!doc.startViewTransition || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setTheme(next);
      return;
    }
    const r = e.currentTarget.getBoundingClientRect();
    const x = r.left + r.width / 2;
    const y = r.top + r.height / 2;
    const end = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y));
    document.documentElement.classList.add('theme-morph');
    const t = doc.startViewTransition(() => {
      flushSync(() => setTheme(next));
    });
    t.ready
      .then(() => {
        document.documentElement.animate(
          { clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${end}px at ${x}px ${y}px)`] },
          { duration: 650, easing: 'cubic-bezier(0.34, 1.15, 0.64, 1)', pseudoElement: '::view-transition-new(root)' },
        ).finished.finally(() => document.documentElement.classList.remove('theme-morph'));
      })
      .catch(() => document.documentElement.classList.remove('theme-morph'));
  };

  const size = compact ? 17 : 19;
  const stroke = compact ? 1.75 : 2;
  return (
    <Button
      variant="icon"
      size="custom"
      onClick={toggleTheme}
      className={compact ? 'theme-key h-[34px]! w-[34px]! p-0! rounded-[10px]! relative inline-flex items-center justify-center glass-key border-foreground/10! backdrop-blur-md' : 'theme-key relative'}
      aria-label={`Switch to ${resolvedTheme === 'dark' ? 'light' : 'dark'} mode`}
    >
      <span className="relative block" style={{ width: size, height: size }}>
        <Moon size={size} strokeWidth={stroke} className="theme-moon absolute inset-0" />
        <Sun size={size} strokeWidth={stroke} className="theme-sun absolute inset-0" />
      </span>
    </Button>
  );
}
