'use client';

import { useEffect, useRef, useState } from 'react';
import { ArrowRight, BadgeCheck, CheckCircle2, ImagePlus, Loader2, Mic, PenLine, Star, Video, X } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { buildAuthUrl } from '@/lib/auth-callback';
import { DEFAULT_LIMITS, EXPERIENCE_APP, EXPERIENCE_BRAND, type ExperienceLimits, type ExperienceType } from '@/lib/experience';
import MediaCapture, { type CapturedMedia } from './media-capture';

const API = `/api/customer/${EXPERIENCE_APP}/experiences`;

type Step = 'loading' | 'login' | 'ineligible' | 'choose' | 'form' | 'done';

interface Gate {
  loggedIn: boolean;
  eligible: boolean;
  name: string;
  avatarUrl: string;
  limits: ExperienceLimits;
}

const TYPES: { type: ExperienceType; icon: typeof PenLine; tone: string }[] = [
  { type: 'text', icon: PenLine, tone: 'from-info/25 to-info/5 text-info' },
  { type: 'audio', icon: Mic, tone: 'from-success/25 to-success/5 text-success' },
  { type: 'video', icon: Video, tone: 'from-warning/30 to-warning/5 text-warning' },
];

/** PUT to the one-time storage link, reporting progress. */
function putWithProgress(url: string, blob: Blob, type: string, onProgress: (percent: number) => void): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('PUT', url);
    xhr.setRequestHeader('Content-Type', type);
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) onProgress(Math.round((event.loaded / event.total) * 100));
    };
    xhr.onload = () => (xhr.status >= 200 && xhr.status < 300 ? resolve() : reject(new Error(`upload ${xhr.status}`)));
    xhr.onerror = () => reject(new Error('upload failed'));
    xhr.send(blob);
  });
}

async function postFile(kind: 'audio' | 'avatar', blob: Blob, type: string): Promise<string> {
  const res = await fetch(`${API}/media?kind=${kind}`, { method: 'POST', headers: { 'Content-Type': type }, body: blob });
  const data = await res.json().catch(() => null);
  if (!res.ok || !data?.success) throw new Error(data?.code || 'UPLOAD');
  return data.data.key as string;
}

export default function ShareExperienceDialog({ onClose, invited = false }: { onClose: () => void; invited?: boolean }) {
  const t = useTranslations('shareExperience');
  const locale = useLocale() === 'en' ? 'en' : 'ar';
  const [step, setStep] = useState<Step>('loading');
  const [gate, setGate] = useState<Gate | null>(null);
  const [type, setType] = useState<ExperienceType>('text');
  const [rating, setRating] = useState(0);
  const [name, setName] = useState('');
  const [photo, setPhoto] = useState<'account' | 'upload' | 'none'>('none');
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoUrl, setPhotoUrl] = useState('');
  const [text, setText] = useState('');
  const [media, setMedia] = useState<CapturedMedia | null>(null);
  const [consent, setConsent] = useState(false);
  const [sending, setSending] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState('');
  const photoRef = useRef<HTMLInputElement | null>(null);
  const limits = gate?.limits || DEFAULT_LIMITS;

  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener('keydown', onKey);
    };
  }, [onClose]);

  useEffect(() => {
    let alive = true;
    fetch(API, { cache: 'no-store' })
      .then((res) => res.json())
      .then((data) => {
        if (!alive) return;
        const g = data?.data as Gate | undefined;
        if (!g) throw new Error('gate');
        setGate(g);
        setName(g.name || '');
        setPhoto(g.avatarUrl ? 'account' : 'none');
        setStep(!g.loggedIn ? 'login' : g.eligible ? 'choose' : 'ineligible');
      })
      .catch(() => {
        if (alive) {
          setError(t('error'));
          setStep('ineligible');
        }
      });
    return () => {
      alive = false;
    };
  }, [t]);

  useEffect(() => () => {
    if (photoUrl) URL.revokeObjectURL(photoUrl);
  }, [photoUrl]);

  const choose = (next: ExperienceType) => {
    setType(next);
    setMedia(null);
    setError('');
    setStep('form');
  };

  const textOk = type !== 'text' || (text.trim().length >= 10 && text.trim().length <= limits.maxTextChars);
  const mediaOk = type === 'text' || Boolean(media);
  const canSend = rating > 0 && name.trim().length >= 2 && textOk && mediaOk && consent && !sending;

  const submit = async () => {
    if (!canSend) return;
    setSending(true);
    setError('');
    setProgress(0);
    try {
      let avatarKey: string | undefined;
      if (photo === 'upload' && photoFile) avatarKey = await postFile('avatar', photoFile, photoFile.type || 'image/jpeg');

      let mediaKey: string | undefined;
      if (type === 'audio' && media) mediaKey = await postFile('audio', media.blob, media.type);
      if (type === 'video' && media) {
        const res = await fetch(`${API}/video-url`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ mime: media.type, size: media.blob.size }),
        });
        const data = await res.json().catch(() => null);
        if (!res.ok || !data?.success) throw new Error(data?.code || 'UPLOAD');
        await putWithProgress(data.data.uploadUrl, media.blob, data.data.mime, setProgress);
        mediaKey = data.data.key;
      }

      const res = await fetch(API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type,
          locale,
          rating,
          displayName: name.trim(),
          text: type === 'text' ? text.trim() : undefined,
          mediaKey,
          mediaDuration: media ? Math.round(media.duration) : undefined,
          avatarKey,
          useAccountPhoto: photo === 'account',
          consent: true,
        }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.success) throw new Error(data?.code || 'SUBMIT');
      setStep('done');
    } catch (err) {
      const code = err instanceof Error ? err.message : '';
      setError(
        code === 'RATE_LIMITED'
          ? t('rateLimited')
          : code === 'TOO_LARGE'
            ? t('fileTooLarge')
            : code === 'NOT_ELIGIBLE'
              ? t('notEligible')
              : t('error'),
      );
    } finally {
      setSending(false);
    }
  };

  const brand = EXPERIENCE_BRAND[locale];

  return (
    <div className="fixed inset-0 z-[200] flex items-end justify-center bg-black/55 backdrop-blur-sm sm:items-center sm:p-4" role="dialog" aria-modal="true" aria-label={t('button')} onClick={onClose}>
      <div
        className="relative flex max-h-[94dvh] w-full flex-col overflow-hidden rounded-t-3xl bg-background text-foreground shadow-2xl sm:max-w-lg sm:rounded-3xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-2 border-b border-stroke px-4 py-3">
          {step === 'form' ? (
            <button type="button" onClick={() => setStep('choose')} className="inline-flex h-11 items-center gap-1 rounded-full px-2 text-sm font-semibold text-secondary hover:text-foreground">
              <ArrowRight size={18} className="ltr:rotate-180" aria-hidden />
              {t('back')}
            </button>
          ) : (
            <span className="mx-auto h-1.5 w-10 rounded-full bg-stroke sm:hidden" aria-hidden />
          )}
          <button type="button" onClick={onClose} aria-label={t('close')} className="inline-flex h-11 w-11 items-center justify-center rounded-full text-secondary hover:bg-foreground/5 hover:text-foreground">
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto overscroll-contain px-5 pb-6 pt-4">
          {step === 'loading' ? (
            <div className="flex min-h-48 items-center justify-center">
              <Loader2 className="animate-spin text-success" size={28} />
            </div>
          ) : null}

          {step === 'login' ? (
            <div className="space-y-5 py-6 text-center">
              <BadgeCheck size={52} className="mx-auto fill-success text-background" aria-hidden />
              <p className="text-base leading-relaxed">{t('loginTitle')}</p>
              <a href={buildAuthUrl('/auth/login')} className="inline-flex h-12 items-center justify-center rounded-full bg-success px-8 text-base font-semibold text-white">
                {t('loginButton')}
              </a>
            </div>
          ) : null}

          {step === 'ineligible' ? (
            <div className="space-y-4 py-8 text-center">
              {error ? null : <BadgeCheck size={52} className="mx-auto fill-success text-background" aria-hidden />}
              <p className="text-base leading-relaxed text-secondary">{error || t('notEligible')}</p>
            </div>
          ) : null}

          {step === 'choose' ? (
            <div className="space-y-5">
              <div className="space-y-2 text-center">
                <h2 className="text-xl font-bold">{t(invited ? 'inviteTitle' : 'title')}</h2>
                <p className="text-[15px] leading-relaxed text-secondary">{t(invited ? 'inviteIntro' : 'intro')}</p>
              </div>
              <div className="grid gap-3">
                {TYPES.map(({ type: kind, icon: Icon, tone }) => (
                  <button
                    key={kind}
                    type="button"
                    onClick={() => choose(kind)}
                    className="group flex items-center gap-4 rounded-2xl border border-stroke bg-card-bg p-4 text-start transition hover:border-success/40 active:scale-[0.99]"
                  >
                    <span className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br shadow-sm ${tone}`}>
                      <Icon size={26} aria-hidden />
                    </span>
                    <span className="space-y-0.5">
                      <span className="block text-base font-bold">{t(`types.${kind}.title`)}</span>
                      <span className="block text-sm text-secondary">{t(`types.${kind}.desc`)}</span>
                    </span>
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          {step === 'form' ? (
            <div className="space-y-5">
              <h2 className="text-lg font-bold">{t(`types.${type}.title`)}</h2>

              <fieldset className="space-y-2">
                <legend className="text-sm font-semibold">{t('rating')}</legend>
                <div className={`flex gap-1 ${locale === 'ar' ? 'justify-end' : 'justify-start'}`} dir="ltr">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <button key={n} type="button" onClick={() => setRating(n)} aria-label={`${n}`} className="flex h-11 w-11 items-center justify-center">
                      <Star size={30} className={n <= rating ? 'text-yellow-500' : 'text-stroke'} fill="currentColor" />
                    </button>
                  ))}
                </div>
              </fieldset>

              <label className="block space-y-2">
                <span className="text-sm font-semibold">{t('name')}</span>
                <input
                  value={name}
                  onChange={(event) => setName(event.target.value.slice(0, 60))}
                  className="h-12 w-full rounded-xl border border-stroke bg-card-bg px-4 text-base outline-none focus:border-success"
                />
              </label>

              <div className="space-y-2">
                <span className="text-sm font-semibold">{t('photo')}</span>
                <div className="flex items-center gap-3">
                  {/* The picker leads (owner, 2026-10-12): tapping the circle opens it too; «بدون صورة» is a quiet link. */}
                  <button
                    type="button"
                    onClick={() => photoRef.current?.click()}
                    aria-label={t('photoUpload')}
                    className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-full bg-success/10 text-success ring-2 ring-success/40"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element -- the account photo */}
                    {photo === 'account' && gate?.avatarUrl ? <img src={gate.avatarUrl} alt="" className="h-full w-full object-cover" /> : null}
                    {/* eslint-disable-next-line @next/next/no-img-element -- a local preview */}
                    {photo === 'upload' && photoUrl ? <img src={photoUrl} alt="" className="h-full w-full object-cover" /> : null}
                    {photo === 'none' || (photo === 'upload' && !photoUrl) ? <ImagePlus size={22} aria-hidden /> : null}
                  </button>
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => photoRef.current?.click()}
                      className="gradient-site gradient-text inline-flex h-11 items-center gap-1.5 rounded-site px-4 text-sm font-medium shadow-lg"
                    >
                      <ImagePlus size={17} aria-hidden />
                      {t('photoUpload')}
                    </button>
                    {gate?.avatarUrl && photo !== 'account' ? (
                      <button type="button" onClick={() => setPhoto('account')} className="h-10 rounded-full px-3 text-sm text-secondary ring-1 ring-stroke">
                        {t('photoUseAccount')}
                      </button>
                    ) : null}
                    {photo !== 'none' ? (
                      <button type="button" onClick={() => setPhoto('none')} className="h-10 px-2 text-xs text-secondary underline-offset-4 hover:underline">
                        {t('photoNone')}
                      </button>
                    ) : null}
                  </div>
                  <input
                    ref={photoRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    className="hidden"
                    onChange={(event) => {
                      const file = event.target.files?.[0];
                      event.target.value = '';
                      if (!file) return;
                      if (file.size > 3 * 1024 * 1024) {
                        setError(t('fileTooLarge'));
                        return;
                      }
                      setPhotoFile(file);
                      setPhotoUrl(URL.createObjectURL(file));
                      setPhoto('upload');
                    }}
                  />
                </div>
              </div>

              {type === 'text' ? (
                <label className="block space-y-2">
                  <span className="text-sm font-semibold">{t('textLabel')}</span>
                  <textarea
                    value={text}
                    onChange={(event) => setText(event.target.value.slice(0, limits.maxTextChars))}
                    rows={4}
                    placeholder={t('textPlaceholder')}
                    className="w-full resize-none rounded-xl border border-stroke bg-card-bg p-4 text-base leading-relaxed outline-none focus:border-success"
                  />
                  <span className="block text-end text-xs tabular-nums text-secondary">
                    {t('textCount', { count: text.length, max: limits.maxTextChars })}
                  </span>
                </label>
              ) : null}

              {type === 'audio' ? (
                <div className="space-y-3">
                  <p className="rounded-2xl bg-success/8 p-4 text-sm leading-relaxed ring-1 ring-success/20">
                    {t('audioTip', { seconds: limits.maxAudioSeconds })}
                    <span className="mt-2 block font-medium text-success">{t('audioRandom')}</span>
                  </p>
                  <MediaCapture kind="audio" maxSeconds={limits.maxAudioSeconds} value={media} onChange={setMedia} />
                </div>
              ) : null}

              {type === 'video' ? (
                <div className="space-y-3">
                  <div className="rounded-2xl bg-warning/8 p-4 text-sm leading-relaxed ring-1 ring-warning/25">
                    <p className="mb-2 font-semibold">{t('videoTipsTitle')}</p>
                    <ol className="list-decimal space-y-1 ps-5">
                      <li>{t('videoTip1')}</li>
                      <li>{t('videoTip2')}</li>
                      <li>{t('videoTip3')}</li>
                      <li>{t('videoTip4', { seconds: limits.maxVideoSeconds })}</li>
                    </ol>
                  </div>
                  <MediaCapture kind="video" maxSeconds={limits.maxVideoSeconds} value={media} onChange={setMedia} />
                </div>
              ) : null}

              <label className="flex items-start gap-3 rounded-2xl p-1">
                <input
                  type="checkbox"
                  checked={consent}
                  onChange={(event) => setConsent(event.target.checked)}
                  className="mt-1 h-5 w-5 shrink-0 accent-[var(--success)]"
                />
                <span className="text-sm leading-relaxed">{t('consent', { brand })}</span>
              </label>

              {error ? <p className="text-sm text-error">{error}</p> : null}

              <button
                type="button"
                onClick={submit}
                disabled={!canSend}
                className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-full bg-success text-base font-semibold text-white transition disabled:opacity-50"
              >
                {sending ? <Loader2 size={18} className="animate-spin" aria-hidden /> : null}
                {sending ? (type === 'video' && progress > 0 && progress < 100 ? t('uploading', { percent: progress }) : t('sending')) : t('submit')}
              </button>
            </div>
          ) : null}

          {step === 'done' ? (
            <div className="space-y-4 py-8 text-center">
              <CheckCircle2 size={56} className="mx-auto text-success" aria-hidden />
              <p className="text-lg font-bold">{t('successTitle')}</p>
              {type === 'audio' ? <p className="text-secondary">{t('audioRandom')}</p> : null}
              <button type="button" onClick={onClose} className="inline-flex h-11 items-center justify-center rounded-full px-6 text-sm font-semibold ring-1 ring-stroke">
                {t('close')}
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
