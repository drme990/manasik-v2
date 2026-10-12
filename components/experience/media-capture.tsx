'use client';

import { useEffect, useRef, useState } from 'react';
import { Mic, RotateCcw, Square, Upload, Video } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { baseType, mediaDuration, recordingType } from '@/lib/experience';

export interface CapturedMedia {
  blob: Blob;
  url: string;
  type: string;
  duration: number;
  /** A still from the recording, shown before it plays (a fresh recording can show black until played). */
  poster?: string;
}

/**
 * Records a voice or video experience in the page (stops by itself at the
 * limit), or takes a file from the phone. Shows the result to play back
 * before sending, with «أعد التسجيل».
 */
export default function MediaCapture({
  kind,
  maxSeconds,
  value,
  onChange,
}: {
  kind: 'audio' | 'video';
  maxSeconds: number;
  value: CapturedMedia | null;
  onChange: (media: CapturedMedia | null) => void;
}) {
  const t = useTranslations('shareExperience');
  const [state, setState] = useState<'idle' | 'starting' | 'recording'>('idle');
  const [elapsed, setElapsed] = useState(0);
  const [error, setError] = useState('');
  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const timerRef = useRef<number | null>(null);
  const liveRef = useRef<HTMLVideoElement | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);
  const posterRef = useRef<string>('');

  /** Keeps a still of the live camera, taken just before the recording stops. */
  const grabFrame = () => {
    const video = liveRef.current;
    if (kind !== 'video' || !video || !video.videoWidth) return;
    try {
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      // The live view is mirrored like a mirror; the recording (and so the still) is not.
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      posterRef.current = canvas.toDataURL('image/jpeg', 0.8);
    } catch {
      posterRef.current = '';
    }
  };

  const stopTracks = () => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    if (timerRef.current) window.clearInterval(timerRef.current);
    timerRef.current = null;
  };

  useEffect(() => () => stopTracks(), []);
  useEffect(() => () => {
    if (value?.url) URL.revokeObjectURL(value.url);
  }, [value?.url]);

  const start = async () => {
    setError('');
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
      setError(t('recordUnsupported'));
      return;
    }
    setState('starting');
    try {
      const stream = await navigator.mediaDevices.getUserMedia(
        kind === 'audio'
          ? { audio: { echoCancellation: true, noiseSuppression: true } }
          : { audio: true, video: { facingMode: 'user', width: { ideal: 720 }, height: { ideal: 1280 } } },
      );
      streamRef.current = stream;
      if (kind === 'video' && liveRef.current) {
        liveRef.current.srcObject = stream;
        void liveRef.current.play().catch(() => undefined);
      }
      const mimeType = recordingType(kind);
      const recorder = new MediaRecorder(stream, {
        ...(mimeType ? { mimeType } : {}),
        audioBitsPerSecond: 64_000,
        ...(kind === 'video' ? { videoBitsPerSecond: 1_500_000 } : {}),
      });
      const chunks: BlobPart[] = [];
      const startedAt = Date.now();
      recorder.ondataavailable = (event) => {
        if (event.data.size) chunks.push(event.data);
      };
      recorder.onstop = () => {
        const seconds = Math.min(maxSeconds, (Date.now() - startedAt) / 1000);
        const type = baseType(recorder.mimeType || mimeType, kind);
        const blob = new Blob(chunks, { type });
        stopTracks();
        setState('idle');
        if (blob.size) onChange({ blob, url: URL.createObjectURL(blob), type, duration: seconds, poster: posterRef.current || undefined });
      };
      recorderRef.current = recorder;
      recorder.start(1000);
      setElapsed(0);
      setState('recording');
      timerRef.current = window.setInterval(() => {
        const seconds = (Date.now() - startedAt) / 1000;
        setElapsed(seconds);
        if (seconds >= maxSeconds && recorder.state === 'recording') {
          grabFrame();
          recorder.stop();
        }
      }, 250);
    } catch {
      stopTracks();
      setState('idle');
      setError(kind === 'audio' ? t('micDenied') : t('camDenied'));
    }
  };

  const stop = () => {
    if (recorderRef.current?.state === 'recording') {
      grabFrame();
      recorderRef.current.stop();
    }
  };

  const pickFile = async (file: File | undefined) => {
    setError('');
    if (!file) return;
    const type = baseType(file.type, kind);
    if (!type.startsWith(kind)) {
      setError(t('wrongFile'));
      return;
    }
    const seconds = await mediaDuration(file, kind);
    if (seconds > maxSeconds + 1) {
      setError(t('tooLong', { seconds: maxSeconds }));
      return;
    }
    onChange({ blob: file, url: URL.createObjectURL(file), type, duration: seconds });
  };

  const left = Math.max(0, Math.ceil(maxSeconds - elapsed));
  const Icon = kind === 'audio' ? Mic : Video;

  if (value) {
    return (
      <div className="space-y-3">
        {kind === 'audio' ? (
          <audio src={value.url} controls className="w-full" />
        ) : (
          <video
            src={value.url}
            poster={value.poster}
            controls
            playsInline
            preload="metadata"
            // A fresh recording shows black until a frame is decoded: step a little into it (fixes the black screen, owner 2026-10-12).
            onLoadedMetadata={(event) => {
              const el = event.currentTarget;
              if (el.currentTime === 0) el.currentTime = Number.isFinite(el.duration) && el.duration > 0.2 ? 0.1 : 0.001;
            }}
            className="mx-auto max-h-[50vh] w-full rounded-2xl bg-black object-contain"
          />
        )}
        <button
          type="button"
          onClick={() => onChange(null)}
          className="inline-flex h-11 items-center gap-2 rounded-full px-4 text-sm font-semibold text-secondary ring-1 ring-stroke hover:text-foreground"
        >
          <RotateCcw size={16} aria-hidden />
          {t('retake')}
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {kind === 'video' ? (
        <video
          ref={liveRef}
          muted
          playsInline
          className={`mx-auto max-h-[45vh] w-full rounded-2xl bg-black object-cover ${state === 'idle' ? 'hidden' : ''}`}
          style={{ transform: 'scaleX(-1)' }}
        />
      ) : null}

      {state === 'recording' ? (
        <div className="flex flex-col items-center gap-3 rounded-2xl bg-error/8 p-4 ring-1 ring-error/20">
          {/* A big countdown ring: the customer always sees how much time is left (owner, 2026-10-12). */}
          <div className="relative h-28 w-28" role="timer" aria-live="off" aria-label={t('remaining', { seconds: left })}>
            <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90" aria-hidden>
              <circle cx="50" cy="50" r="44" fill="none" strokeWidth="8" className="stroke-error/15" />
              <circle
                cx="50"
                cy="50"
                r="44"
                fill="none"
                strokeWidth="8"
                strokeLinecap="round"
                className="stroke-error transition-[stroke-dashoffset] duration-300 ease-linear"
                strokeDasharray={2 * Math.PI * 44}
                strokeDashoffset={2 * Math.PI * 44 * (1 - Math.min(1, elapsed / maxSeconds))}
              />
            </svg>
            <span className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-3xl font-bold tabular-nums text-foreground">{left}</span>
              <span className="text-[11px] text-secondary">{t('secondsLeft')}</span>
            </span>
          </div>
          <span className="flex items-center gap-2 text-sm font-semibold text-error">
            <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-error" aria-hidden />
            {t('recording')}
          </span>
          <button
            type="button"
            onClick={stop}
            className="inline-flex h-12 items-center gap-2 rounded-full bg-error px-7 text-base font-semibold text-white"
          >
            <Square size={14} fill="currentColor" aria-hidden />
            {t('stop')}
          </button>
        </div>
      ) : (
        // Two equal ways (owner, 2026-10-12): record here, or upload a recording already on the phone.
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={start}
            disabled={state === 'starting'}
            className="gradient-site gradient-text inline-flex min-h-12 items-center justify-center gap-2 rounded-site px-3 text-[15px] font-medium shadow-lg disabled:opacity-60"
          >
            <Icon size={18} aria-hidden />
            {t('recordNow')}
          </button>
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="inline-flex min-h-12 items-center justify-center gap-2 rounded-site border border-success/50 px-3 text-[15px] font-medium text-success hover:bg-success/10"
          >
            <Upload size={18} aria-hidden />
            {t(kind === 'audio' ? 'uploadAudio' : 'uploadVideo')}
          </button>
          <input
            ref={fileRef}
            type="file"
            accept={kind === 'audio' ? 'audio/*' : 'video/*'}
            className="hidden"
            onChange={(event) => {
              void pickFile(event.target.files?.[0]);
              event.target.value = '';
            }}
          />
        </div>
      )}

      {error ? <p className="text-sm text-error">{error}</p> : null}
    </div>
  );
}
