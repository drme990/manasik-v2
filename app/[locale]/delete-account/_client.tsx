'use client';

import { useEffect, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import Button from '@/components/ui/button';
import Loading from '@/components/ui/loading';

const PROFILE = '/api/customer/manasik/profile';

type State = 'loading' | 'signed-out' | 'signed-in' | 'confirm' | 'deleting' | 'done';

export default function DeleteAccountPanel() {
  const t = useTranslations('deleteAccount');
  const locale = useLocale();
  const [state, setState] = useState<State>('loading');
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    let alive = true;
    fetch(PROFILE)
      .then(async (res) => {
        if (!alive) return;
        if (!res.ok) {
          setState('signed-out');
          return;
        }
        const body = await res.json().catch(() => null);
        setEmail(body?.data?.email || '');
        setState('signed-in');
      })
      .catch(() => alive && setState('signed-out'));
    return () => {
      alive = false;
    };
  }, []);

  const remove = async () => {
    setState('deleting');
    setError('');
    try {
      const res = await fetch(PROFILE, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ confirm: 'DELETE' }),
      });
      if (!res.ok) throw new Error();
      setState('done');
    } catch {
      setError(t('error'));
      setState('confirm');
    }
  };

  const box = 'rounded-site border border-stroke bg-background/80 p-6 space-y-4';

  if (state === 'loading') return <Loading size="md" />;

  if (state === 'done') {
    return (
      <div className={box}>
        <p className="text-foreground leading-relaxed">{t('done')}</p>
        <Button href="/" variant="outline" size="md">
          {t('home')}
        </Button>
      </div>
    );
  }

  if (state === 'signed-out') {
    return (
      <div className={box}>
        <p className="text-foreground leading-relaxed">{t('signedOut')}</p>
        <Button
          href={`/auth/login?callback=${encodeURIComponent(`/${locale}/delete-account`)}`}
          variant="primary"
          size="md"
        >
          {t('signIn')}
        </Button>
        <p className="text-secondary text-sm leading-relaxed">{t('byMessage')}</p>
      </div>
    );
  }

  return (
    <div className={box}>
      {email ? <p className="text-foreground">{t('signedInAs', { email })}</p> : null}
      {error ? (
        <div className="rounded-lg border border-error/40 bg-error/10 px-4 py-3 text-sm text-foreground">
          {error}
        </div>
      ) : null}
      {state === 'signed-in' ? (
        <Button variant="danger" size="md" onClick={() => setState('confirm')}>
          {t('delete')}
        </Button>
      ) : (
        <>
          <p className="text-foreground font-semibold leading-relaxed">{t('confirmQuestion')}</p>
          <div className="flex flex-wrap gap-3">
            <Button variant="danger" size="md" onClick={remove} disabled={state === 'deleting'}>
              {state === 'deleting' ? t('deleting') : t('confirm')}
            </Button>
            <Button variant="outline" size="md" onClick={() => setState('signed-in')} disabled={state === 'deleting'}>
              {t('cancel')}
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
