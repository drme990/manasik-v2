'use client';

import { FormEvent, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import Header from '@/components/layout/header';
import Footer from '@/components/layout/footer';
import Input from '@/components/ui/input';
import Button from '@/components/ui/button';

export default function ResetPasswordPage() {
  const t = useTranslations('auth.resetPassword');
  const router = useRouter();
  const searchParams = useSearchParams();

  const email = useMemo(() => searchParams.get('email') || '', [searchParams]);
  const token = useMemo(() => searchParams.get('token') || '', [searchParams]);

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const missingParams = !email || !token;

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');
    setSuccess('');

    if (missingParams) {
      setError(t('errors.invalidLink'));
      return;
    }

    if (password.length < 6) {
      setError(t('errors.passwordLength'));
      return;
    }

    if (password !== confirmPassword) {
      setError(t('errors.passwordMismatch'));
      return;
    }

    setLoading(true);

    try {
      const response = await fetch('/api/auth/manasik/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          token,
          password,
        }),
      });

      const payload = await response.json();

      if (!response.ok) {
        setError(payload?.error || t('errors.generic'));
        return;
      }

      setSuccess(t('success'));
      setTimeout(() => {
        router.push('/auth/login');
      }, 1000);
    } catch (submitError) {
      console.error('Reset password failed', submitError);
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

          {missingParams && (
            <div className="mb-4 rounded-lg border border-error/40 bg-error/10 px-4 py-3 text-sm text-foreground">
              {t('errors.invalidLink')}
            </div>
          )}

          {error && (
            <div className="mb-4 rounded-lg border border-error/40 bg-error/10 px-4 py-3 text-sm text-foreground">
              {error}
            </div>
          )}

          {success && (
            <div className="mb-4 rounded-lg border border-success/40 bg-success/10 px-4 py-3 text-sm text-foreground">
              {success}
            </div>
          )}

          <form className="space-y-4" onSubmit={handleSubmit}>
            <Input
              id="password"
              type="password"
              label={t('fields.password')}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
              disabled={loading || missingParams}
              showPasswordToggle
            />

            <Input
              id="confirmPassword"
              type="password"
              label={t('fields.confirmPassword')}
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              required
              disabled={loading || missingParams}
              showPasswordToggle
            />

            <Button
              type="submit"
              className="w-full"
              disabled={loading || missingParams}
            >
              {loading ? t('actions.loading') : t('actions.submit')}
            </Button>
          </form>

          <p className="mt-5 text-center text-sm text-secondary">
            <Link className="text-success underline" href="/auth/login">
              {t('backToLogin')}
            </Link>
          </p>
        </div>
      </main>
      <Footer />
    </>
  );
}
