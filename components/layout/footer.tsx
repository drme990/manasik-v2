'use client';

import Logo from '../shared/logo';
import { Instagram, Facebook } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import GreenBlur from '../shared/green-blur';
import Container from './container';
import { useTranslations } from 'next-intl';

export default function Footer() {
  const t = useTranslations('common.navigation');
  const tf = useTranslations('common.footer');

  const quickLinks = [
    { href: '/#our-works', label: t('ourWorks') },
    { href: '/#work-steps', label: t('workSteps') },
    { href: '/#why-us', label: tf('benefits') },
  ];

  const productLinks = [
    { href: '/#products', label: t('products') },
    { href: '/#faq', label: t('faq') },
    { href: '/#calc-aqeqa', label: t('calcAqeqa') },
  ];
  return (
    <div className="relative pt-4 mt-6">
      <GreenBlur className="-top-2 left-0" />
      <footer className="bg-card-bg shadow-success text-foreground py-12 rounded-t-site">
        <Container className="space-y-8">
          {/* Logo */}
          <Logo />

          {/* Links Grid */}
          <div className="grid grid-cols-2 gap-8">
            {/* Quick Links - Right Column */}
            <div className="space-y-3">
              <h3 className="font-semibold text-lg mb-4">{tf('quickLinks')}</h3>
              {quickLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="block text-foreground hover:text-success transition-colors"
                >
                  {link.label}
                </Link>
              ))}
            </div>

            {/* Product Links - Left Column */}
            <div className="space-y-3">
              {productLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="block text-foreground hover:text-success transition-colors"
                >
                  {link.label}
                </Link>
              ))}
            </div>
          </div>

          {/* Social Media */}
          <div className="space-y-4">
            <h3 className="font-semibold text-lg">{tf('contactUsTitle')}</h3>
            <div className="flex justify-start gap-6">
              <Link
                href="#"
                className="hover:text-success transition-colors"
                aria-label="Facebook"
              >
                <Facebook size={28} />
              </Link>
              <Link
                href="#"
                className="hover:text-success transition-colors"
                aria-label="X"
              >
                <svg
                  width="28"
                  height="28"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                </svg>
              </Link>
              <Link
                href="#"
                className="hover:text-success  transition-colors"
                aria-label="Instagram"
              >
                <Instagram size={28} />
              </Link>
            </div>
          </div>

          {/* Divider */}
          <div className="border-t border-stroke"></div>

          {/* Payment Methods */}
          <div className="flex justify-center gap-4">
            <div className="bg-background rounded px-3 py-2 flex items-center justify-center">
              <Image
                src="/icons/apple-pay.svg"
                alt="Apple Pay"
                width={40}
                height={24}
              />
            </div>
            <div className="bg-background rounded px-3 py-2 flex items-center justify-center">
              <Image
                src="/icons/master-card.svg"
                alt="MasterCard"
                width={40}
                height={24}
              />
            </div>
            <div className="bg-background rounded px-3 py-2 flex items-center justify-center">
              <Image src="/icons/visa.svg" alt="Visa" width={40} height={24} />
            </div>
          </div>

          {/* Copyright */}
          <div className="text-center space-y-2">
            <div className="flex items-center justify-center gap-2 text-secondary text-sm">
              <div className="w-5 h-5 border-2 border-secondary rounded-full flex items-center justify-center">
                <span className="text-xs">©</span>
              </div>
              <span>
                2025 {tf('companyName')}. {tf('rights')}
              </span>
            </div>
            <Link
              href="/terms"
              className="text-secondary hover:text-foreground transition-colors text-sm"
            >
              {t('terms')}
            </Link>
          </div>

          {/* Powered by */}
          <div className="text-center text-secondary text-xs" dir="ltr">
            powered by{' '}
            <span className="text-sm font-semibold text-foreground">
              Paymob.
            </span>
          </div>
        </Container>
      </footer>
    </div>
  );
}
