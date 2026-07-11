'use client';

import { FormEvent, useState } from 'react';
import { useTranslations } from 'next-intl';
import Modal from '@/components/ui/modal';
import Input from '@/components/ui/input';
import Button from '@/components/ui/button';
import CountrySelector from '@/components/shared/country-selector';

interface AccountSetupModalProps {
  isOpen: boolean;
  onComplete: () => void;
  appId: 'manasik' | 'ghadaq';
  initialEmail?: string;
}

export default function AccountSetupModal({
  isOpen,
  onComplete,
  appId,
  initialEmail = '',
}: AccountSetupModalProps) {
  const t = useTranslations('auth.accountSetup');

  const [name, setName] = useState('');
  const [email, setEmail] = useState(initialEmail);
  const [country, setCountry] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await fetch(`/api/auth/${appId}/setup-account`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          email,
          country,
          password,
        }),
      });

      const payload = await response.json();

      if (!response.ok) {
        setError(payload?.error || t('errors.failed'));
        return;
      }

      window.dispatchEvent(new Event('auth-changed'));
      onComplete();
    } catch {
      setError(t('errors.failed'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => { }}
      title={t('title')}
      size="md"
      showCloseButton={false}
    >
      <form className="space-y-4" onSubmit={handleSubmit}>
        <p className="text-sm text-secondary">{t('description')}</p>

        {error && (
          <div className="rounded-lg border border-error/40 bg-error/10 px-4 py-3 text-sm text-foreground">
            {error}
          </div>
        )}

        <Input
          id="setup-name"
          type="text"
          label={t('fields.name')}
          placeholder={t('fields.namePlaceholder')}
          value={name}
          onChange={(event) => setName(event.target.value)}
          required
          disabled={loading}
        />

        <Input
          id="setup-email"
          type="email"
          label={t('fields.email')}
          placeholder={t('fields.emailPlaceholder')}
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          required
          disabled={loading}
        />

        <CountrySelector
          value={country}
          onChange={setCountry}
          placeholder={t('fields.countryPlaceholder')}
          disabled={loading}
        />

        <Input
          id="setup-password"
          type="password"
          label={t('fields.password')}
          placeholder={t('fields.passwordPlaceholder')}
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
    </Modal>
  );
}
