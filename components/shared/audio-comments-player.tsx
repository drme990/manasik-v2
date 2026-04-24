'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import {
  LuPlay,
  LuPause,
  LuSkipBack,
  LuSkipForward,
  LuSquare,
  LuVolume2,
} from 'react-icons/lu';
import Button from '../ui/button';
import { Tooltip } from '../ui/tooltip';

interface AudioCommentsPlayerProps {
  audioReviews: { ar: string[]; en: string[] };
}

function shuffleAudio(list: string[]): string[] {
  const next = [...list];
  for (let i = next.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [next[i], next[j]] = [next[j], next[i]];
  }
  return next;
}

function formatTime(time: number) {
  if (!time || Number.isNaN(time)) return '0:00';
  const m = Math.floor(time / 60);
  const s = Math.floor(time % 60)
    .toString()
    .padStart(2, '0');
  return `${m}:${s}`;
}

export default function AudioCommentsPlayer({
  audioReviews,
}: AudioCommentsPlayerProps) {
  const t = useTranslations('productDetails');
  const audioRef = useRef<HTMLAudioElement>(null);
  const progressRef = useRef<HTMLDivElement>(null);

  const [isOpen, setIsOpen] = useState(false);
  const [isClosing, setIsClosing] = useState(false);

  const [isPlaying, setIsPlaying] = useState(false);
  const [playlist, setPlaylist] = useState<string[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);

  const [progress, setProgress] = useState(0);
  const [buffered, setBuffered] = useState(0);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);

  const [isDragging, setIsDragging] = useState(false);
  const [dragProgress, setDragProgress] = useState(0);

  const [showVolume, setShowVolume] = useState(false);

  const locale = (useLocale?.() || 'ar') as 'ar' | 'en';
  const reviewsForLocale = audioReviews[locale] || [];
  const hasAudio = reviewsForLocale.length > 0;

  const currentAudio = useMemo(
    () => playlist[currentIndex] || '',
    [playlist, currentIndex],
  );

  // 🔁 Update state from audio
  const update = () => {
    const audio = audioRef.current;
    if (!audio) return;

    const dur = audio.duration;
    const time = audio.currentTime;

    if (!isDragging) {
      setCurrentTime(Number.isFinite(time) ? time : 0);
      setDuration(Number.isFinite(dur) ? dur : 0);

      if (dur && Number.isFinite(dur)) {
        setProgress((time / dur) * 100);
      }
    }

    // Buffered
    if (audio.buffered.length > 0 && dur) {
      const bufferedEnd = audio.buffered.end(audio.buffered.length - 1);
      setBuffered((bufferedEnd / dur) * 100);
    }
  };

  // 🎧 Drag logic
  const calculateProgress = (clientX: number) => {
    const rect = progressRef.current?.getBoundingClientRect();
    if (!rect) return 0;

    let percent = (clientX - rect.left) / rect.width;
    percent = Math.max(0, Math.min(1, percent));

    return percent;
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    const percent = calculateProgress(e.clientX);
    setDragProgress(percent * 100);
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (!isDragging) return;
    const percent = calculateProgress(e.clientX);
    setDragProgress(percent * 100);
  };

  const handleMouseUp = (e: MouseEvent) => {
    if (!isDragging) return;

    const percent = calculateProgress(e.clientX);
    const audio = audioRef.current;

    if (audio && audio.duration) {
      audio.currentTime = percent * audio.duration;
    }

    setIsDragging(false);
  };

  useEffect(() => {
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  });

  const openPlayer = () => {
    if (!hasAudio) return;

    const randomized = shuffleAudio(reviewsForLocale);
    setPlaylist(randomized);
    setCurrentIndex(0);
    setIsOpen(true);
    setIsClosing(false);
    setIsPlaying(true);

    requestAnimationFrame(() => {
      const audio = audioRef.current;
      if (!audio) return;
      audio.currentTime = 0;
      audio.play().catch(() => setIsPlaying(false));
    });
  };

  const closePlayer = () => {
    setIsClosing(true);

    setTimeout(() => {
      const audio = audioRef.current;
      if (audio) {
        audio.pause();
        audio.currentTime = 0;
      }
      setIsPlaying(false);
      setIsOpen(false);
      setIsClosing(false);
    }, 250);
  };

  const goTo = (index: number) => {
    if (!playlist.length) return;

    const bounded =
      index < 0 ? playlist.length - 1 : index >= playlist.length ? 0 : index;

    setCurrentIndex(bounded);

    requestAnimationFrame(() => {
      const audio = audioRef.current;
      if (!audio) return;

      audio.currentTime = 0;
      if (isPlaying) {
        audio.play().catch(() => setIsPlaying(false));
      }
    });
  };

  const togglePlayback = () => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
    } else {
      audio.play().then(
        () => setIsPlaying(true),
        () => setIsPlaying(false),
      );
    }
  };

  if (!hasAudio) return null;

  const displayProgress = isDragging ? dragProgress : progress;

  return (
    <>
      <Button
        variant="primary"
        className="w-full flex items-center justify-center gap-3 group relative overflow-hidden"
        onClick={openPlayer}
      >
        <div className="relative flex items-center justify-center">
          {/* 🔵 IDLE → Ping */}
          {!isPlaying && (
            <>
              <span className="absolute inline-flex h-12 w-12 rounded-full bg-success/40 animate-ping [animation-duration:2s]" />
              <span className="absolute inline-flex h-12 w-12 rounded-full bg-success/30 animate-ping [animation-duration:2s] [animation-delay:300ms]" />
            </>
          )}

          {/* 🟢 PLAYING → Rotating ring */}
          {isPlaying && (
            <span className="absolute h-14 w-14 rounded-full border-2 border-success border-t-primary animate-spin" />
          )}

          {/* Main icon */}
          <div className="relative z-10 flex items-center justify-center h-12 w-12 rounded-full border border-success">
            <LuPlay
              size={22}
              className="transition-transform group-hover:scale-110 text-success"
            />
          </div>
        </div>

        <span className="font-medium">{t('audioCommentsButton')}</span>
      </Button>

      {isOpen && (
        <div
          className={`fixed inset-x-3 bottom-3 z-50 md:inset-x-6 transition-all duration-300 ${
            isClosing
              ? 'translate-y-6 opacity-0 scale-95'
              : 'translate-y-0 opacity-100 scale-100'
          }`}
          dir="ltr"
        >
          <div className="mx-auto max-w-2xl rounded-2xl border border-stroke bg-background/80 backdrop-blur-xl p-4 shadow-xl">
            <audio
              ref={audioRef}
              src={currentAudio}
              preload="metadata"
              onTimeUpdate={update}
              onLoadedMetadata={update}
              onProgress={update}
              onEnded={() => goTo(currentIndex + 1)}
              className="hidden"
            />

            {/* Header */}
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium">
                {t('audioCommentsNowPlaying')}
              </p>

              <Tooltip content="Stop">
                <Button
                  variant="icon-danger"
                  size="custom"
                  onClick={closePlayer}
                  className="h-8 w-8 flex items-center justify-center rounded-full"
                >
                  <LuSquare />
                </Button>
              </Tooltip>
            </div>

            {/* Progress */}
            <div
              ref={progressRef}
              className="mt-4 cursor-pointer select-none"
              onMouseDown={handleMouseDown}
              dir="ltr"
            >
              <div className="h-1 w-full bg-muted rounded-full overflow-hidden relative">
                {/* Buffered */}
                <div
                  className="absolute h-full bg-primary/30"
                  style={{ width: `${buffered}%` }}
                />

                {/* Progress */}
                <div
                  className="absolute h-full bg-primary"
                  style={{ width: `${displayProgress}%` }}
                />
              </div>

              <div className="flex justify-between text-xs text-secondary mt-1">
                <span>{formatTime(currentTime)}</span>
                <span>{formatTime(duration)}</span>
              </div>
            </div>

            {/* Controls unchanged */}
            <div className="mt-5 flex items-center justify-between">
              <div className="w-10" />

              <div className="flex items-center gap-4">
                <button
                  onClick={() =>
                    goTo(locale === 'ar' ? currentIndex + 1 : currentIndex - 1)
                  }
                  className="h-10 w-10 flex items-center justify-center rounded-full border border-stroke hover:bg-muted transition active:scale-95"
                >
                  <LuSkipBack />
                </button>

                <button
                  onClick={togglePlayback}
                  className="h-14 w-14 flex items-center justify-center rounded-full bg-primary text-white shadow-lg transition hover:scale-105 active:scale-95"
                >
                  {isPlaying ? <LuPause /> : <LuPlay />}
                </button>

                <button
                  onClick={() =>
                    goTo(locale === 'ar' ? currentIndex - 1 : currentIndex + 1)
                  }
                  className="h-10 w-10 flex items-center justify-center rounded-full border border-stroke hover:bg-muted transition active:scale-95"
                >
                  <LuSkipForward />
                </button>
              </div>

              {/* Volume unchanged */}
              <div className="relative w-10 flex justify-end">
                <button
                  onClick={() => setShowVolume((v) => !v)}
                  className="h-10 w-10 flex items-center justify-center rounded-full border border-stroke hover:bg-muted transition"
                >
                  <LuVolume2 />
                </button>

                <div
                  className={`absolute bottom-full mb-2 right-0 transition-all duration-200 ${
                    showVolume
                      ? 'opacity-100 translate-y-0'
                      : 'opacity-0 translate-y-2 pointer-events-none'
                  }`}
                >
                  <div className="bg-background border border-stroke rounded-xl p-2 shadow-lg">
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.01"
                      defaultValue="1"
                      onChange={(e) => {
                        if (audioRef.current) {
                          audioRef.current.volume = Number(e.target.value);
                        }
                      }}
                      className="w-28 accent-primary"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
