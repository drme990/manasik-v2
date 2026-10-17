'use client';

import { useTheme } from 'next-themes';
import { Sun, Moon } from 'lucide-react';
import Button from '../ui/button';

/** `compact`: the phone header's size, matching the country flag beside it (owner, 2026-10-17). */
export default function ThemeToggle({ compact = false }: { compact?: boolean }) {
  const { theme, setTheme } = useTheme();

  const toggleTheme = () => {
    setTheme(theme === 'light' ? 'dark' : 'light');
  };

  return (
    <Button
      variant="icon"
      size="custom"
      onClick={toggleTheme}
      className={compact ? 'h-[34px]! w-[34px]! p-0! rounded-[10px]! inline-flex items-center justify-center' : undefined}
      aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
    >
      <Moon size={compact ? 17 : 19} strokeWidth={compact ? 1.75 : 2} className="hidden dark:block" />
      <Sun size={compact ? 17 : 19} strokeWidth={compact ? 1.75 : 2} className="dark:hidden" />
    </Button>
  );
}
