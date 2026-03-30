'use client';

import { FormEvent, useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import Header from '@/components/layout/header';
import Footer from '@/components/layout/footer';
import Input from '@/components/ui/input';
import Button from '@/components/ui/button';

export default function ForgotPasswordPage() {
  const t = useTranslations('auth.forgotPassword');
  const searchParams = useSearchParams();

  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [retryAfter, setRetryAfter] = useState(0);

  const prefilledEmail = searchParams.get('email');

  useEffect(() => {
    if (prefilledEmail) {
      setEmail(prefilledEmail);
    }
  }, [prefilledEmail]);

  useEffect(() => {
    if (retryAfter <= 0) return;

    const timer = window.setInterval(() => {
      setRetryAfter((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);

    return () => window.clearInterval(timer);
  }, [retryAfter]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (retryAfter > 0) return;

    setError('');
    setSuccess('');
    setLoading(true);

    try {
      const response = await fetch('/api/auth/manasik/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      const payload = await response.json();

      if (!response.ok) {
        setError(payload?.error || t('errors.generic'));
        if (typeof payload?.retryAfterSeconds === 'number') {
          setRetryAfter(payload.retryAfterSeconds);
        }
        return;
      }

      setSuccess(t('success'));
      if (
        typeof payload?.nextRetrySeconds === 'number' &&
        payload.nextRetrySeconds > 0 &&
        payload.nextRetrySeconds <= 120
      ) {
        setRetryAfter(payload.nextRetrySeconds);
      }
    } catch (submitError) {
      console.error('Forgot password failed', submitError);
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

          {success && (
            <div className="mb-4 rounded-lg border border-success/40 bg-success/10 px-4 py-3 text-sm text-foreground">
              {success}
            </div>
          )}

          {retryAfter > 0 && (
            <div className="mb-4 rounded-lg border border-warning/40 bg-warning/10 px-4 py-3 text-sm text-foreground">
              {t('retryAfter', { seconds: retryAfter })}
            </div>
          )}

          <form className="space-y-4" onSubmit={handleSubmit}>
            <Input
              id="email"
              type="email"
              label={t('fields.email')}
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
              disabled={loading}
            />

            <Button
              type="submit"
              className="w-full"
              disabled={loading || retryAfter > 0}
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
