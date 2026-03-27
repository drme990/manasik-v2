'use client';

import { FormEvent, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import Header from '@/components/layout/header';
import Footer from '@/components/layout/footer';
import Input from '@/components/ui/input';
import Button from '@/components/ui/button';

export default function LoginPage() {
  const t = useTranslations('auth.login');
  const commonT = useTranslations('common.navigation');
  const router = useRouter();
  const searchParams = useSearchParams();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const registered = searchParams.get('registered') === '1';

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await fetch('/api/auth/manasik/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          password,
        }),
      });

      const payload = await response.json();

      if (!response.ok) {
        setError(payload?.error || t('errors.invalidCredentials'));
        return;
      }

      router.push('/');
      router.refresh();
    } catch (submitError) {
      console.error('Login failed', submitError);
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

          {registered && (
            <div className="mb-4 rounded-lg border border-success/40 bg-success/10 px-4 py-3 text-sm text-foreground">
              {t('registeredSuccess')}
            </div>
          )}

          {error && (
            <div className="mb-4 rounded-lg border border-error/40 bg-error/10 px-4 py-3 text-sm text-foreground">
              {error}
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

            <Input
              id="password"
              type="password"
              label={t('fields.password')}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
              disabled={loading}
              showPasswordToggle
            />

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? t('actions.loading') : t('actions.submit')}
            </Button>
          </form>

          <p className="mt-5 text-sm text-secondary text-center">
            {t('noAccount')}{' '}
            <Link className="text-success underline" href="/auth/register">
              {commonT('register')}
            </Link>
          </p>
        </div>
      </main>
      <Footer />
    </>
  );
}
