'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/providers/auth-provider';
import Logo from '@/components/shared/logo';
import { LogIn } from 'lucide-react';
import Input from '@/components/ui/input';
import { useTranslations } from 'next-intl';

export default function AdminLoginPage() {
  const router = useRouter();
  const { refreshUser } = useAuth();
  const t = useTranslations('admin.login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (res.ok) {
        // Refresh the auth context to get the user data
        await refreshUser();
        router.replace('/admin');
      } else {
        setError(data.error || t('errors.invalidCredentials'));
      }
    } catch (err) {
      console.error('Login error', err);
      setError(t('errors.loginFailed'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-card-bg border border-stroke rounded-site p-8 space-y-6">
          {/* Logo */}
          <div className="flex justify-center mb-6">
            <Logo />
          </div>

          {/* Title */}
          <div className="text-center">
            <h1 className="text-2xl font-bold text-foreground mb-2">
              {t('title')}
            </h1>
            <p className="text-secondary text-sm">{t('subtitle')}</p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="bg-error/10 border border-error text-error px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              id="email"
              label={t('form.email')}
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@example.com"
              disabled={loading}
            />

            <Input
              id="password"
              label={t('form.password')}
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              disabled={loading}
            />

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-success text-white rounded-lg hover:bg-success/90 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                t('buttons.loggingIn')
              ) : (
                <>
                  <LogIn size={20} />
                  {t('buttons.login')}
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
