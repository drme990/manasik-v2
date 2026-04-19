'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import Header from '@/components/layout/header';
import Footer from '@/components/layout/footer';
import Container from '@/components/layout/container';
import Input from '@/components/ui/input';
import Button from '@/components/ui/button';
import CountrySelector from '@/components/shared/country-selector';
import Loading from '@/components/ui/loading';

export default function SettingsPage() {
  const t = useTranslations('auth.settings');
  const checkoutT = useTranslations('checkout');
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isBanned, setIsBanned] = useState(false);

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [country, setCountry] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const response = await fetch('/api/customer/manasik/profile');
        if (!response.ok) {
          if (response.status === 401) {
            router.push('/auth/login');
            return;
          }
          throw new Error('Failed to fetch user data');
        }

        const { data } = await response.json();
        setFullName(data.name);
        setEmail(data.email);
        setPhone(data.phone || '');
        setCountry(data.country || '');
        setIsBanned(Boolean(data.isBanned));
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setLoading(false);
      }
    };

    fetchUserData();
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    setSuccess('');

    if (isBanned) {
      setError(t('blockedError'));
      setSaving(false);
      return;
    }

    try {
      const response = await fetch('/api/customer/manasik/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: fullName,
          email,
          phone,
          country,
          ...(currentPassword && newPassword
            ? { currentPassword, newPassword }
            : {}),
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new Error(errorData?.error || 'Failed to update profile');
      }

      setSuccess(t('updateSuccess'));
      setCurrentPassword('');
      setNewPassword('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <>
        <Header />
        <main className="min-h-[70vh] px-4 py-10 md:px-8">
          <Container>
            <Loading size="lg" />
          </Container>
        </main>
        <Footer />
      </>
    );
  }

  return (
    <>
      <Header />
      <main className="min-h-[70vh] px-4 py-10 md:px-8">
        <Container>
          <div className="mx-auto max-w-2xl">
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

            <form
              onSubmit={handleSubmit}
              className="space-y-4 rounded-site border border-stroke bg-background/80 p-6 md:p-8"
            >
              <Input
                id="email"
                type="email"
                label={t('fields.email')}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={saving || isBanned}
              />

              <Input
                id="fullName"
                type="text"
                label={t('fields.fullName')}
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
                disabled={saving || isBanned}
              />

              <Input
                id="phone"
                type="tel"
                label={t('fields.phone')}
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                disabled={saving || isBanned}
              />

              <CountrySelector
                value={country}
                onChange={setCountry}
                placeholder={checkoutT('country')}
                disabled={saving || isBanned}
              />

              <div className="pt-4 border-t border-stroke">
                <p className="mb-4 text-sm text-secondary">
                  {t('passwordHint')}
                </p>
                <div className="space-y-4">
                  <Input
                    id="currentPassword"
                    type="password"
                    label={t('fields.currentPassword')}
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    disabled={saving || isBanned}
                  />
                  <Input
                    id="newPassword"
                    type="password"
                    label={t('fields.newPassword')}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    disabled={saving || isBanned}
                  />
                </div>
              </div>

              <Button
                type="submit"
                className="w-full"
                disabled={saving || isBanned}
              >
                {saving ? t('actions.saving') : t('actions.save')}
              </Button>
            </form>
          </div>
        </Container>
      </main>
      <Footer />
    </>
  );
}
