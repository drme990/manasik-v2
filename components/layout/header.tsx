'use client';

import { useState, useEffect, useRef } from 'react';
import { Menu, X } from 'lucide-react';
import Logo from '../shared/logo';
import CurrencySelector from '../shared/currency-selector';
import ThemeToggle from '../shared/theme-toggle';
import LangToggle from '../shared/lang-toggle';
import Link from 'next/link';
import { useTranslations } from 'next-intl';

export default function Header() {
  const t = useTranslations('common.navigation');
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isVisible, setIsVisible] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);
  const menuRef = useRef<HTMLDivElement>(null);

  const navItems = [
    { href: '#our-works', label: t('ourWorks') },
    { href: '#work-steps', label: t('workSteps') },
    { href: '#products', label: t('products') },
    { href: '#why-us', label: t('whyUs') },
    { href: '#calc-aqeqa', label: t('calcAqeqa') },
  ];

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;

      if (isMenuOpen) {
        // Keep header visible when menu is open
        setIsVisible(true);
        setLastScrollY(currentScrollY);
        return;
      }

      if (currentScrollY < lastScrollY || currentScrollY < 100) {
        // Scrolling up or at top
        setIsVisible(true);
      } else if (currentScrollY > lastScrollY && currentScrollY > 100) {
        // Scrolling down and past threshold
        setIsVisible(false);
      }

      setLastScrollY(currentScrollY);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });

    return () => window.removeEventListener('scroll', handleScroll);
  }, [lastScrollY, isMenuOpen]);

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
    <header
      className={`sticky top-0 z-50 backdrop-blur-xl bg-background/10 border-b border-stroke transition-transform duration-300 ease-in-out shadow-[0_4px_20px_rgba(0,0,0,0.08)] dark:shadow-[0_4px_20px_rgba(255,255,255,0.05)] ${
        isVisible ? 'translate-y-0' : '-translate-y-full'
      }`}
    >
      <div className="flex items-center justify-between p-4">
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
        <Logo />
        <CurrencySelector />
      </div>

      <div
        ref={menuRef}
        onClick={(e) => e.stopPropagation()}
        className={`overflow-hidden transition-all duration-300 ease-in-out ${
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
        </nav>
        <div className="pb-4 px-4 flex items-center gap-4 border-t border-stroke/10 pt-3">
          <ThemeToggle />
          <LangToggle />
        </div>
      </div>
    </header>
  );
}
