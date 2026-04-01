'use client';

import { useState, useEffect, useRef } from 'react';
import { Menu, X } from 'lucide-react';
import Logo from '../shared/logo';
import CurrencySelector from '../shared/currency-selector';
import ThemeToggle from '../shared/theme-toggle';
import LangToggle from '../shared/lang-toggle';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import TopBannerMarquee from './top-banner-marquee';
import UserMenu from '../shared/user-menu';
import Button from '../ui/button';
import { clearAuthHint, hasAuthHint, markAuthHint } from '@/lib/auth-hint';

export default function Header() {
  const t = useTranslations('common.navigation');
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const [user, setUser] = useState<{ name: string } | null>(null);
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      if (!hasAuthHint()) {
        setUser(null);
        setIsChecking(false);
        return;
      }

      try {
        const response = await fetch('/api/auth/manasik/session');
        if (response.ok) {
          const { data } = await response.json();
          setUser(data);
          markAuthHint();
        } else {
          setUser(null);
          clearAuthHint();
        }
      } catch {
        setUser(null);
      } finally {
        setIsChecking(false);
      }
    };

    const handleAuthChanged = () => {
      if (hasAuthHint()) {
        void checkAuth();
      } else {
        setUser(null);
        setIsChecking(false);
      }
    };

    void checkAuth();
    window.addEventListener('auth-changed', handleAuthChanged);

    return () => {
      window.removeEventListener('auth-changed', handleAuthChanged);
    };
  }, []);

  const navItems = [
    { href: '/#our-works', label: t('ourWorks') },
    { href: '/#work-steps', label: t('workSteps') },
    { href: '/#products', label: t('products') },
    { href: '/#why-us', label: t('whyUs') },
    { href: '/#calc-aqeqa', label: t('calcAqeqa') },
  ];

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        isMenuOpen &&
        menuRef.current &&
        !menuRef.current.contains(event.target as Node)
      ) {
        setIsMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isMenuOpen]);

  const handleNavClick = () => {
    setIsMenuOpen(false);
  };

  return (
    <>
      <TopBannerMarquee />
      <header className="sticky top-0 z-50 backdrop-blur-xl bg-background/10 border-b border-stroke transition-transform duration-300 ease-in-out shadow-[0_4px_20px_rgba(0,0,0,0.08)] dark:shadow-[0_4px_20px_rgba(255,255,255,0.05)]">
        <div className="flex items-center gap-4 px-4 py-3 md:px-8">
          <Logo />

          <nav className="hidden lg:flex items-center gap-6 ms-8">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="text-sm font-medium text-foreground hover:text-success transition-colors"
              >
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="hidden lg:flex items-center gap-3 ms-auto">
            <CurrencySelector />
            <ThemeToggle />
            <LangToggle />
            {!isChecking &&
              (user ? (
                <UserMenu userName={user.name} />
              ) : (
                <div className="flex items-center gap-2">
                  <Button href="/auth/login" variant="outline" size="sm">
                    {t('login')}
                  </Button>
                  <Button href="/auth/register" variant="primary" size="sm">
                    {t('register')}
                  </Button>
                </div>
              ))}
          </div>

          <div className="flex lg:hidden items-center gap-2 ms-auto">
            {!isChecking && user && <UserMenu userName={user.name} />}
            <CurrencySelector />
            <button
              onClick={(e) => {
                e.stopPropagation();
                setIsMenuOpen(!isMenuOpen);
              }}
              className="text-foreground hover:text-secondary transition-colors p-2 -m-1"
              aria-label="Toggle menu"
            >
              {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>

        <div
          ref={menuRef}
          onClick={(e) => e.stopPropagation()}
          className={`lg:hidden overflow-hidden transition-all duration-300 ease-in-out ${
            isMenuOpen ? 'max-h-112 opacity-100' : 'max-h-0 opacity-0'
          }`}
        >
          <nav className="pb-4 px-4 space-y-1 border-t border-stroke/20 pt-2">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={handleNavClick}
                className="block py-3 text-foreground text-lg hover:text-success active:text-success/80 transition-colors"
              >
                {item.label}
              </Link>
            ))}

            {!isChecking && !user && (
              <div className="pt-3 flex items-center gap-2">
                <Button
                  href="/auth/login"
                  variant="outline"
                  size="sm"
                  className="flex-1"
                >
                  {t('login')}
                </Button>
                <Button
                  href="/auth/register"
                  variant="primary"
                  size="sm"
                  className="flex-1"
                >
                  {t('register')}
                </Button>
              </div>
            )}
          </nav>
          <div className="pb-4 px-4 flex items-center gap-4 border-t border-stroke/10 pt-3">
            <ThemeToggle />
            <LangToggle />
          </div>
        </div>
      </header>
    </>
  );
}
