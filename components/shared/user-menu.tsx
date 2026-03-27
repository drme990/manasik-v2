'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { ChevronDown, LogOut, Settings, History } from 'lucide-react';

interface UserMenuProps {
  userName: string;
}

export default function UserMenu({ userName }: UserMenuProps) {
  const authT = useTranslations('auth');
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const locale = useLocale();

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/auth/manasik/logout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      if (response.ok) {
        setIsOpen(false);
        window.dispatchEvent(new Event('auth-changed'));
        router.push('/');
        router.refresh();
      }
    } catch (error) {
      console.error('Logout failed', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div ref={menuRef} className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 rounded-xl border border-stroke hover:border-stroke/60 transition-colors text-foreground shadow-sm"
      >
        <span className="text-sm font-medium truncate max-w-25">
          {userName}
        </span>
        <ChevronDown
          size={16}
          className={`transition-transform ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>

      {isOpen && (
        <div
          className={`absolute ${locale === 'en' ? 'right-0' : 'left-0'} mt-2 w-52 rounded-xl border border-stroke/80 bg-background shadow-xl ring-1 ring-black/5 z-50 overflow-hidden`}
        >
          <Link
            href="/user/settings"
            onClick={() => setIsOpen(false)}
            className="flex items-center gap-3 px-4 py-3 hover:bg-background/80 transition-colors border-b border-stroke/60 text-foreground"
          >
            <Settings size={16} />
            <span className="text-sm">{authT('menu.settings')}</span>
          </Link>

          <Link
            href="/user/order-history"
            onClick={() => setIsOpen(false)}
            className="flex items-center gap-3 px-4 py-3 hover:bg-background/80 transition-colors border-b border-stroke/60 text-foreground"
          >
            <History size={16} />
            <span className="text-sm">{authT('menu.orderHistory')}</span>
          </Link>

          <button
            onClick={handleLogout}
            disabled={isLoading}
            className="w-full flex items-center gap-3 px-4 py-3 hover:bg-error/10 transition-colors text-error disabled:opacity-50"
          >
            <LogOut size={16} />
            <span className="text-sm">
              {isLoading ? authT('menu.loggingOut') : authT('menu.logout')}
            </span>
          </button>
        </div>
      )}
    </div>
  );
}
