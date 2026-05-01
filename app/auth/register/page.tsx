'use client';

import { FormEvent, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import Header from '@/components/layout/header';
import Footer from '@/components/layout/footer';
import Input from '@/components/ui/input';
import Button from '@/components/ui/button';
import CountrySelector from '@/components/shared/country-selector';
import Checkbox from '@/components/ui/checkbox';

export default function RegisterPage() {
  const t = useTranslations('auth.register');
  const commonT = useTranslations('common.navigation');
  const checkoutT = useTranslations('checkout');
  const locale = useLocale();
  const router = useRouter();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('+');
  const [country, setCountry] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError(t('errors.passwordMismatch'));
      return;
    }

    if (!acceptTerms) {
      setError(t('errors.acceptTerms'));
      return;
    }

    setLoading(true);

    try {
      const response = await fetch('/api/auth/manasik/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: fullName,
          email,
          phone,
          country,
          password,
        }),
      });

      const payload = await response.json();

      if (!response.ok || !payload.success) {
        const errorCode = payload.code || payload.error;

        if (errorCode === 'EMAIL_ALREADY_USED') {
          setError(t('errors.emailAlreadyUsed'));
        } else if (errorCode === 'PHONE_ALREADY_USED') {
          setError(t('errors.phoneAlreadyUsed'));
        } else if (errorCode === 'IP_BANNED' || errorCode === 'BANNED_IP') {
          setError(t('errors.registrationFailed'));
        } else {
          setError(payload?.error || t('errors.generic'));
        }
        setLoading(false);
        return;
      }

      router.push('/');
      router.refresh();
    } catch (submitError) {
      console.error('Register failed', submitError);
      setError(t('errors.generic'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Header />
      <main className="min-h-[70vh] px-4 py-10 md:px-8">
        <div className="mx-auto w-full max-w-xl rounded-site border border-stroke bg-background/80 p-6 md:p-8">
          <h1 className="mb-2 text-3xl font-semibold text-foreground">
            {t('title')}
          </h1>
          <p className="mb-6 text-secondary">{t('subtitle')}</p>

          {error && (
            <div className="mb-4 rounded-lg border border-error/40 bg-error/10 px-4 py-3 text-sm text-foreground">
              {error}
            </div>
          )}

          <form className="space-y-4" onSubmit={handleSubmit}>
            <Input
              id="fullName"
              type="text"
              label={t('fields.fullName')}
              placeholder={t('fields.fullNamePlaceholder')}
              value={fullName}
              onChange={(event) => setFullName(event.target.value)}
              required
              disabled={loading}
            />

            <Input
              id="email"
              type="email"
              label={t('fields.email')}
              placeholder={t('fields.emailPlaceholder')}
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
              disabled={loading}
            />

            <Input
              id="phone"
              type="tel"
              label={t('fields.phone')}
              placeholder={t('fields.phonePlaceholder')}
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
              required
              disabled={loading}
            />

            <CountrySelector
              value={country}
              onChange={setCountry}
              placeholder={checkoutT('country')}
            />

            <Input
              id="password"
              type="password"
              label={t('fields.password')}
              placeholder={t('fields.passwordPlaceholder')}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
              disabled={loading}
              showPasswordToggle
            />

            <Input
              id="confirm-password"
              type="password"
              label={t('fields.confirmPassword')}
              placeholder={t('fields.confirmPasswordPlaceholder')}
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              required
              disabled={loading}
              showPasswordToggle
            />

            <label className="flex items-start gap-3 cursor-pointer">
              <Checkbox
                id="acceptTerms"
                checked={acceptTerms}
                onChange={(checked) => setAcceptTerms(!!checked)}
                disabled={loading}
              />
              <span className="text-sm text-secondary">
                {t('fields.acceptTerms')}{' '}
                <Link
                  href="/terms"
                  className="text-success underline hover:text-success/80"
                >
                  {locale === 'ar' ? 'الشروط والأحكام' : 'Terms'}
                </Link>
                {' & '}
                <Link
                  href="/privacy"
                  className="text-success underline hover:text-success/80"
                >
                  {locale === 'ar' ? 'سياسة الخصوصية' : 'Privacy'}
                </Link>
              </span>
            </label>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? t('actions.loading') : t('actions.submit')}
            </Button>
          </form>

          <p className="mt-5 text-sm text-secondary text-center">
            {t('haveAccount')}{' '}
            <Link className="text-success underline" href="/auth/login">
              {commonT('login')}
            </Link>
          </p>
        </div>
      </main>
      <Footer />
    </>
  );
}
