'use client';

import {
  createContext,
  useContext,
  useRef,
  useState,
  useCallback,
  useEffect,
  useMemo,
} from 'react';
import { usePathname } from 'next/navigation';
import { AudioReview } from '@/types/Appearance';
import {
  LuPlay,
  LuPause,
  LuSkipBack,
  LuSkipForward,
  LuSquare,
  LuVolume2,
  LuUser,
  LuStar,
} from 'react-icons/lu';
import Image from 'next/image';
import { Tooltip } from '../ui/tooltip';
import Button from '../ui/button';

interface AudioPlayerState {
  playlist: AudioReview[];
  currentIndex: number;
  isPlaying: boolean;
  isOpen: boolean;
  currentTime: number;
  duration: number;
  progress: number;
  buffered: number;
}

interface AudioPlayerContextType extends AudioPlayerState {
  openPlayer: (audioReviews: AudioReview[]) => void;
  closePlayer: () => void;
  togglePlayback: () => void;
  goTo: (index: number) => void;
  seek: (time: number) => void;
}

const AudioPlayerContext = createContext<AudioPlayerContextType | null>(null);

export function useAudioPlayer() {
  const ctx = useContext(AudioPlayerContext);
  if (!ctx)
    throw new Error('useAudioPlayer must be used within AudioPlayerProvider');
  return ctx;
}

function shuffleAudio<T>(list: T[]): T[] {
  const next = [...list];
  for (let i = next.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [next[i], next[j]] = [next[j], next[i]];
  }
  return next;
}

function filterAudioForLocale(
  audioReviews: AudioReview[],
  locale: 'ar' | 'en',
): AudioReview[] {
  return audioReviews.filter(
    (a) => a.language === locale || a.language === 'shared',
  );
}

function getOrderedPlaylist(audioList: AudioReview[]): AudioReview[] {
  const mainAudio = audioList.find((a) => a.isMain);
  const others = audioList.filter((a) => !a.isMain);
  const shuffledOthers = shuffleAudio(others);
  return mainAudio ? [mainAudio, ...shuffledOthers] : shuffledOthers;
}

function formatTime(time: number) {
  if (!time || Number.isNaN(time)) return '0:00';
  const m = Math.floor(time / 60);
  const s = Math.floor(time % 60)
    .toString()
    .padStart(2, '0');
  return `${m}:${s}`;
}

export function AudioPlayerProvider({
  children,
  locale,
}: {
  children: React.ReactNode;
  locale: 'ar' | 'en';
}) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const progressRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname();

  const isProductPage = pathname?.startsWith('/products/') ?? false;

  const [state, setState] = useState<AudioPlayerState>({
    playlist: [],
    currentIndex: 0,
    isPlaying: false,
    isOpen: false,
    currentTime: 0,
    duration: 0,
    progress: 0,
    buffered: 0,
  });

  const [isDragging, setIsDragging] = useState(false);
  const [dragProgress, setDragProgress] = useState(0);
  const [showVolume, setShowVolume] = useState(false);

  const update = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const dur = audio.duration;
    const time = audio.currentTime;

    if (!isDragging) {
      setState((prev) => ({
        ...prev,
        currentTime: Number.isFinite(time) ? time : 0,
        duration: Number.isFinite(dur) ? dur : 0,
        progress: dur && Number.isFinite(dur) ? (time / dur) * 100 : 0,
      }));
    }

    if (audio.buffered.length > 0 && dur) {
      const bufferedEnd = audio.buffered.end(audio.buffered.length - 1);
      setState((prev) => ({
        ...prev,
        buffered: (bufferedEnd / dur) * 100,
      }));
    }
  }, [isDragging]);

  const goTo = useCallback(
    (index: number) => {
      setState((prev) => {
        if (!prev.playlist.length) return prev;
        const bounded =
          index < 0
            ? prev.playlist.length - 1
            : index >= prev.playlist.length
              ? 0
              : index;
        return { ...prev, currentIndex: bounded };
      });

      requestAnimationFrame(() => {
        const audio = audioRef.current;
        if (!audio) return;
        audio.currentTime = 0;
        if (state.isPlaying) {
          audio.play().catch(() => {
            setState((prev) => ({ ...prev, isPlaying: false }));
          });
        }
      });
    },
    [state.isPlaying],
  );

  const handleEnded = useCallback(() => {
    goTo(state.currentIndex + 1);
  }, [goTo, state.currentIndex]);

  const openPlayer = useCallback(
    (audioReviews: AudioReview[]) => {
      const filtered = filterAudioForLocale(audioReviews, locale);
      if (!filtered.length) return;

      const ordered = getOrderedPlaylist(filtered);

      setState((prev) => ({
        ...prev,
        playlist: ordered,
        currentIndex: 0,
        isOpen: true,
        isPlaying: true,
      }));

      requestAnimationFrame(() => {
        const audio = audioRef.current;
        if (!audio) return;
        audio.currentTime = 0;
        audio.play().catch(() => {
          setState((p) => ({ ...p, isPlaying: false }));
        });
      });
    },
    [locale],
  );

  const closePlayer = useCallback(() => {
    const audio = audioRef.current;
    if (audio) {
      audio.pause();
      audio.currentTime = 0;
    }
    setState((prev) => ({
      ...prev,
      isPlaying: false,
      isOpen: false,
      currentTime: 0,
      progress: 0,
    }));
  }, []);

  const togglePlayback = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;

    if (state.isPlaying) {
      audio.pause();
      setState((prev) => ({ ...prev, isPlaying: false }));
    } else {
      audio.play().then(
        () => setState((prev) => ({ ...prev, isPlaying: true })),
        () => setState((prev) => ({ ...prev, isPlaying: false })),
      );
    }
  }, [state.isPlaying]);

  const seek = useCallback((time: number) => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.currentTime = time;
    setState((prev) => ({
      ...prev,
      currentTime: time,
      progress: prev.duration ? (time / prev.duration) * 100 : 0,
    }));
  }, []);

  const calculateProgress = useCallback((clientX: number) => {
    const rect = progressRef.current?.getBoundingClientRect();
    if (!rect) return 0;
    const percent = (clientX - rect.left) / rect.width;
    return Math.max(0, Math.min(1, percent));
  }, []);

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      setIsDragging(true);
      setDragProgress(calculateProgress(e.clientX) * 100);
    },
    [calculateProgress],
  );

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging) return;
      setDragProgress(calculateProgress(e.clientX) * 100);
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
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, calculateProgress]);

  const currentAudio = state.playlist[state.currentIndex];
  const currentAudioUrl = currentAudio?.url || '';
  const displayProgress = isDragging ? dragProgress : state.progress;

  const ctxValue = useMemo(
    () => ({
      ...state,
      openPlayer,
      closePlayer,
      togglePlayback,
      goTo,
      seek,
    }),
    [state, openPlayer, closePlayer, togglePlayback, goTo, seek],
  );

  return (
    <AudioPlayerContext.Provider value={ctxValue}>
      {children}

      {/* Hidden audio element — persists across navigation */}
      <audio
        ref={audioRef}
        src={currentAudioUrl || undefined}
        preload="metadata"
        onTimeUpdate={update}
        onLoadedMetadata={update}
        onProgress={update}
        onEnded={handleEnded}
        className="hidden"
      />

      {/* Floating player overlay */}
      {state.isOpen && (
        <div className="fixed inset-x-3 bottom-3 z-50 md:inset-x-6" dir="ltr">
          {isProductPage ? (
            <div className="relative mx-auto max-w-2xl rounded-full border border-stroke bg-background/80 backdrop-blur-xl px-5 py-3 pb-5 shadow-xl transition-all duration-300">
              {/* Top Row */}
              <div className="flex items-center justify-between gap-4">
                {/* LEFT */}
                <div className="flex items-center gap-3 min-w-0">
                  {currentAudio?.userImage ? (
                    <Image
                      width={40}
                      height={40}
                      src={currentAudio.userImage}
                      alt={
                        locale === 'ar'
                          ? currentAudio.nameAr
                          : currentAudio.nameEn
                      }
                      className="w-10 h-10 rounded-full object-cover border border-stroke shrink-0"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center border border-stroke shrink-0">
                      <LuUser className="w-5 h-5 text-secondary" />
                    </div>
                  )}

                  <div className="flex flex-col min-w-0">
                    <p className="text-sm font-medium truncate leading-tight">
                      {locale === 'ar'
                        ? currentAudio?.nameAr
                        : currentAudio?.nameEn}
                    </p>

                    <div className="flex items-center gap-1 text-primary">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <LuStar key={i} size={12} fill="currentColor" />
                      ))}
                    </div>
                  </div>
                </div>

                {/* RIGHT */}
                <div className="flex items-center gap-2">
                  {/* Prev */}
                  <Tooltip
                    content={
                      locale === 'ar' ? 'التعليق السابق' : 'Previous Comment'
                    }
                  >
                    <button
                      onClick={() =>
                        goTo(
                          locale === 'ar'
                            ? state.currentIndex + 1
                            : state.currentIndex - 1,
                        )
                      }
                      className="h-9 w-9 flex items-center justify-center rounded-full border border-stroke hover:bg-muted transition active:scale-95"
                    >
                      <LuSkipBack size={16} />
                    </button>
                  </Tooltip>

                  {/* Play */}
                  <Tooltip
                    content={
                      locale === 'ar'
                        ? state.isPlaying
                          ? 'إيقاف'
                          : 'تشغيل'
                        : state.isPlaying
                          ? 'Pause'
                          : 'Play'
                    }
                  >
                    <button
                      onClick={togglePlayback}
                      className="h-12 w-12 flex items-center justify-center rounded-full bg-primary text-white shadow-md transition hover:scale-105 active:scale-95"
                    >
                      {state.isPlaying ? (
                        <LuPause size={20} />
                      ) : (
                        <LuPlay size={20} />
                      )}
                    </button>
                  </Tooltip>

                  {/* Next */}
                  <Tooltip
                    content={
                      locale === 'ar' ? 'التعليق التالي' : 'Next Comment'
                    }
                  >
                    <button
                      onClick={() =>
                        goTo(
                          locale === 'ar'
                            ? state.currentIndex - 1
                            : state.currentIndex + 1,
                        )
                      }
                      className="h-9 w-9 flex items-center justify-center rounded-full border border-stroke hover:bg-muted transition active:scale-95"
                    >
                      <LuSkipForward size={16} />
                    </button>
                  </Tooltip>

                  {/* Volume */}
                  <div className="relative">
                    <Tooltip
                      content={
                        locale === 'ar' ? 'مستوى الصوت' : 'Volume Control'
                      }
                    >
                      <button
                        onClick={() => setShowVolume((v) => !v)}
                        className="h-9 w-9 flex items-center justify-center rounded-full border border-stroke hover:bg-muted transition"
                      >
                        <LuVolume2 size={16} />
                      </button>
                    </Tooltip>

                    {showVolume && (
                      <div className="absolute bottom-full mb-3 right-0 bg-background border border-stroke rounded-full px-3 py-2 shadow-lg">
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
                          className="w-24 accent-primary"
                        />
                      </div>
                    )}
                  </div>

                  {/* Close */}
                  <Tooltip
                    content={locale === 'ar' ? 'إغلاق المشغل' : 'Close Player'}
                  >
                    <Button
                      variant="icon-danger"
                      size="custom"
                      onClick={closePlayer}
                    >
                      <LuSquare size={14} />
                    </Button>
                  </Tooltip>
                </div>
              </div>

              {/* Progress bar on bottom border */}
              <div className="absolute bottom-1 left-0 right-0 flex justify-center pointer-events-none">
                <div
                  ref={progressRef}
                  className="w-5/6 h-1 cursor-pointer pointer-events-auto"
                  onMouseDown={handleMouseDown}
                >
                  <div className="relative w-full h-full rounded-full overflow-hidden bg-white/50">
                    {/* Buffered progress */}
                    <div
                      className="absolute top-0 left-0 h-full bg-primary/30"
                      style={{ width: `${state.buffered}%` }}
                    />
                    {/* Playback progress */}
                    <div
                      className="absolute top-0 left-0 h-full bg-primary"
                      style={{ width: `${displayProgress}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex justify-center">
              <div className="flex items-center gap-3 bg-background/80 backdrop-blur-xl border border-stroke rounded-full py-2 pl-4 pr-3 shadow-xl">
                {currentAudio?.userImage ? (
                  <Image
                    width={32}
                    height={32}
                    src={currentAudio.userImage}
                    alt={
                      locale === 'ar'
                        ? currentAudio.nameAr
                        : currentAudio.nameEn
                    }
                    className="w-8 h-8 rounded-full object-cover border border-stroke"
                  />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center border border-stroke">
                    <LuUser className="w-4 h-4 text-secondary" />
                  </div>
                )}
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate max-w-35">
                    {locale === 'ar'
                      ? currentAudio?.nameAr
                      : currentAudio?.nameEn}
                  </p>
                  <p className="text-[10px] text-secondary">
                    {formatTime(state.currentTime)} /{' '}
                    {formatTime(state.duration)}
                  </p>
                </div>
                <Tooltip
                  content={
                    locale === 'ar'
                      ? state.isPlaying
                        ? 'إيقاف'
                        : 'تشغيل'
                      : state.isPlaying
                        ? 'Pause'
                        : 'Play'
                  }
                >
                  <button
                    onClick={togglePlayback}
                    className="h-9 w-9 flex items-center justify-center rounded-full bg-primary text-white shadow transition hover:scale-105 active:scale-95"
                  >
                    {state.isPlaying ? (
                      <LuPause size={16} />
                    ) : (
                      <LuPlay size={16} />
                    )}
                  </button>
                </Tooltip>
                <Tooltip
                  content={locale === 'ar' ? 'إغلاق المشغل' : 'Close Player'}
                >
                  <Button
                    variant="icon-danger"
                    size="custom"
                    onClick={closePlayer}
                  >
                    <LuSquare size={14} />
                  </Button>
                </Tooltip>
              </div>
            </div>
          )}
        </div>
      )}
    </AudioPlayerContext.Provider>
  );
}
