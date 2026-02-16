'use client';

import Logo from '../shared/logo';
import { FiFacebook, FiInstagram } from 'react-icons/fi';
import { PiTiktokLogo } from 'react-icons/pi';
import Image from 'next/image';
import Link from 'next/link';
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
    <div className="relative pt-8 mt-12">
      <div className="gbf gbf-lg gbf-left overflow-x-clip" />
      <footer className="bg-card-bg shadow-success text-foreground py-16 rounded-t-site">
        <Container className="space-y-10">
          {/* Logo */}
          <Logo />

          {/* Links Grid */}
          <div className="grid grid-cols-2 gap-10">
            {/* Quick Links - Right Column */}
            <div className="space-y-4">
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
            <div className="space-y-4">
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
          <div className="space-y-5">
            <h3 className="font-semibold text-lg">{tf('contactUsTitle')}</h3>
            <div className="flex justify-start gap-6">
              <Link
                href="https://www.facebook.com/Manasik990"
                className="hover:text-success transition-colors"
                aria-label="Facebook"
              >
                <FiFacebook size={28} />
              </Link>
              <Link
                href="https://www.tiktok.com/@manasik2990"
                className="hover:text-success transition-colors"
                aria-label="TikTok"
              >
                <PiTiktokLogo size={28} />
              </Link>
              <Link
                href="https://www.instagram.com/manasik990/"
                className="hover:text-success transition-colors"
                aria-label="Instagram"
              >
                <FiInstagram size={28} />
              </Link>
            </div>
          </div>

          {/* Contact Information */}
          <div className="space-y-4">
            <h3 className="font-semibold text-lg">{tf('contactInfo')}</h3>
            <div className="space-y-2">
              <p className="text-foreground text-sm">Dar Alsalam, Tanzania</p>
              <p>
                {tf('emailLabel')}:{' '}
                <Link
                  href="mailto:info@manasik.net"
                  className="hover:text-success transition-colors"
                >
                  info@manasik.net
                </Link>
              </p>
              <p className="text-foreground text-sm">
                {tf('phoneLabel')}:{' '}
                <Link
                  href="tel:+201027282396"
                  className="hover:text-success transition-colors"
                >
                  +201027282396
                </Link>
              </p>
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
            <div className="flex items-center justify-center gap-4">
              <Link
                href="/terms"
                className="text-secondary hover:text-foreground transition-colors text-sm"
              >
                {t('terms')}
              </Link>
              <span className="text-secondary">|</span>
              <Link
                href="/privacy"
                className="text-secondary hover:text-foreground transition-colors text-sm"
              >
                {t('privacy')}
              </Link>
            </div>
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
