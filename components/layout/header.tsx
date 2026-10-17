'use client';

import { useState, useEffect, useRef } from 'react';
import Logo from '../shared/logo';
import CurrencySelector from '../shared/currency-selector';
import ThemeToggle from '../shared/theme-toggle';
import LangToggle from '../shared/lang-toggle';
import { Link as LocaleLink } from '@/i18n/routing';
import { useTranslations } from 'next-intl';
import TopBannerMarquee from './top-banner-marquee';
import UserMenu from '../shared/user-menu';
import Button from '../ui/button';
import {
  clearClientAuthCookie,
  hasClientAuthCookie,
} from '@/lib/client-auth-cookie';
import { getSession } from '@/lib/session';
import { useVisibleLinks } from '@/components/providers/sections-provider';
import { buildAuthUrl } from '@/lib/auth-callback';

export default function Header() {
  const t = useTranslations('common.navigation');
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const burgerRef = useRef<HTMLButtonElement>(null);
  const [user, setUser] = useState<{ name: string } | null>(null);
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const checkAuth = async () => {
      if (!hasClientAuthCookie()) {
        setUser(null);
        setIsChecking(false);
        return;
      }

      setIsChecking(true);
      try {
        const { status, user } = await getSession();

        if (!isMounted) return;

        if (status !== 200) {
          setUser(null);
          if (status > 0) clearClientAuthCookie();
          return;
        }

        setUser(user ? { name: user.name ?? '' } : null);
      } catch {
        if (!isMounted) return;
        setUser(null);
      } finally {
        if (isMounted) {
          setIsChecking(false);
        }
      }
    };

    const handleAuthChanged = () => {
      if (!hasClientAuthCookie()) {
        setUser(null);
        setIsChecking(false);
        return;
      }

      void checkAuth();
    };

    void checkAuth();
    window.addEventListener('auth-changed', handleAuthChanged);

    return () => {
      isMounted = false;
      window.removeEventListener('auth-changed', handleAuthChanged);
    };
  }, []);

  // Every link carries the visitor's language (owner, 2026-10-12): a plain
  // "/#section" sent crawlers through the root redirect and landed them on
  // the English home.
  const navItems = useVisibleLinks([
    { href: '/#our-works', label: t('ourWorks') },
    { href: '/#work-steps', label: t('workSteps') },
    { href: '/products', label: t('products') },
    { href: '/services', label: t('services') },
    { href: '/#why-us', label: t('whyUs') },
    { href: '/calc-aqeqa', label: t('calcAqeqa') },
  ]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        isMenuOpen &&
        menuRef.current &&
        !menuRef.current.contains(event.target as Node) &&
        // The burger closes the menu itself: a press on it is not «outside» (it reopened the menu).
        !burgerRef.current?.contains(event.target as Node)
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
              <LocaleLink
                key={item.href}
                href={item.href}
                className="text-sm font-medium text-foreground hover:text-success transition-colors"
              >
                {item.label}
              </LocaleLink>
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
                  <Button href={buildAuthUrl('/auth/login')} variant="outline" size="sm">
                    {t('login')}
                  </Button>
                  <Button href={buildAuthUrl('/auth/register')} variant="primary" size="sm">
                    {t('register')}
                  </Button>
                </div>
              ))}
          </div>

          <div className="flex lg:hidden items-center gap-2 ms-auto">
            {!isChecking && user && <UserMenu userName={user.name} />}
            {/* Theme, language and country on the phone too, in this order, the language key as it was in the menu
                (owner, 2026-10-17). */}
            <ThemeToggle />
            <LangToggle />
            <CurrencySelector />
            <button
              onClick={(e) => {
                e.stopPropagation();
                setIsMenuOpen((open) => !open);
              }}
              ref={burgerRef}
              className="burger text-foreground p-2 -m-1"
              data-open={isMenuOpen}
              aria-label={t(isMenuOpen ? 'closeMenu' : 'openMenu')}
              aria-expanded={isMenuOpen}
              aria-controls="site-menu"
            >
              {/* Three lines that fold into an X with a spring, and back (owner, 2026-10-17). */}
              <span className="burger-box" aria-hidden="true">
                <i />
                <i />
                <i />
              </span>
            </button>
          </div>
        </div>

        <div
          ref={menuRef}
          onClick={(e) => e.stopPropagation()}
          id="site-menu"
          // Drops open from the header with a little bounce, its lines arriving one after another; closes quickly
          // upward (owner, 2026-10-17). Closed, it is out of reach (inert).
          className="site-menu lg:hidden"
          data-open={isMenuOpen}
          inert={!isMenuOpen}
        >
          <nav className="pb-4 px-4 space-y-1 border-t border-stroke/20 pt-2">
            {navItems.map((item) => (
              <LocaleLink
                key={item.href}
                href={item.href}
                onClick={handleNavClick}
                className="block py-3 text-foreground text-lg"
              >
                <span className="hover:text-success active:text-success/80 transition-colors">
                  {item.label}
                </span>
              </LocaleLink>
            ))}

            {!isChecking && !user && (
              <div className="pt-3 flex items-center gap-2">
                <Button
                  href={buildAuthUrl('/auth/login')}
                  variant="outline"
                  size="sm"
                  className="flex-1"
                >
                  {t('login')}
                </Button>
                <Button
                  href={buildAuthUrl('/auth/register')}
                  variant="primary"
                  size="sm"
                  className="flex-1"
                >
                  {t('register')}
                </Button>
              </div>
            )}
          </nav>
        </div>
      </header>
    </>
  );
}
