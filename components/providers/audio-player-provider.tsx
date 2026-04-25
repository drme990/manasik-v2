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
  const s = Math.floor(time % 60).toString().padStart(2, '0');
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
    let percent = (clientX - rect.left) / rect.width;
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
        <div
          className="fixed inset-x-3 bottom-3 z-50 md:inset-x-6"
          dir="ltr"
        >
          {isProductPage ? (
            <div className="mx-auto max-w-2xl rounded-2xl border border-stroke bg-background/80 backdrop-blur-xl p-4 shadow-xl transition-all duration-300">
              {/* Header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
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
                      className="w-10 h-10 rounded-full object-cover border border-stroke"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center border border-stroke">
                      <LuUser className="w-5 h-5 text-secondary" />
                    </div>
                  )}
                  <div>
                    <p className="text-sm font-medium">
                      {locale === 'ar'
                        ? currentAudio?.nameAr
                        : currentAudio?.nameEn}
                    </p>
                    <div className="flex items-center gap-1 text-primary">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <LuStar key={i} size={14} fill="currentColor" />
                      ))}
                    </div>
                  </div>
                </div>

                <button
                  onClick={closePlayer}
                  className="h-8 w-8 flex items-center justify-center rounded-full bg-error/10 text-error hover:bg-error/20 transition"
                >
                  <LuSquare size={16} />
                </button>
              </div>

              {/* Progress */}
              <div
                ref={progressRef}
                className="mt-4 cursor-pointer select-none"
                onMouseDown={handleMouseDown}
                dir="ltr"
              >
                <div className="h-1 w-full bg-muted rounded-full overflow-hidden relative">
                  <div
                    className="absolute h-full bg-primary/30"
                    style={{ width: `${state.buffered}%` }}
                  />
                  <div
                    className="absolute h-full bg-primary"
                    style={{ width: `${displayProgress}%` }}
                  />
                </div>
                <div className="flex justify-between text-xs text-secondary mt-1">
                  <span>{formatTime(state.currentTime)}</span>
                  <span>{formatTime(state.duration)}</span>
                </div>
              </div>

              {/* Controls */}
              <div className="mt-5 flex items-center justify-between">
                <div className="w-10" />
                <div className="flex items-center gap-4">
                  <button
                    onClick={() =>
                      goTo(
                        locale === 'ar'
                          ? state.currentIndex + 1
                          : state.currentIndex - 1,
                      )
                    }
                    className="h-10 w-10 flex items-center justify-center rounded-full border border-stroke hover:bg-muted transition active:scale-95"
                  >
                    <LuSkipBack size={18} />
                  </button>

                  <button
                    onClick={togglePlayback}
                    className="h-14 w-14 flex items-center justify-center rounded-full bg-primary text-white shadow-lg transition hover:scale-105 active:scale-95"
                  >
                    {state.isPlaying ? (
                      <LuPause size={22} />
                    ) : (
                      <LuPlay size={22} />
                    )}
                  </button>

                  <button
                    onClick={() =>
                      goTo(
                        locale === 'ar'
                          ? state.currentIndex - 1
                          : state.currentIndex + 1,
                      )
                    }
                    className="h-10 w-10 flex items-center justify-center rounded-full border border-stroke hover:bg-muted transition active:scale-95"
                  >
                    <LuSkipForward size={18} />
                  </button>
                </div>

                <div className="relative w-10 flex justify-end">
                  <button
                    onClick={() => setShowVolume((v) => !v)}
                    className="h-10 w-10 flex items-center justify-center rounded-full border border-stroke hover:bg-muted transition"
                  >
                    <LuVolume2 size={18} />
                  </button>

                  {showVolume && (
                    <div className="absolute bottom-full mb-2 right-0 bg-background border border-stroke rounded-xl p-2 shadow-lg">
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
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="flex justify-end">
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
                  <p className="text-sm font-medium truncate max-w-[140px]">
                    {locale === 'ar'
                      ? currentAudio?.nameAr
                      : currentAudio?.nameEn}
                  </p>
                  <p className="text-[10px] text-secondary">
                    {formatTime(state.currentTime)} /{' '}
                    {formatTime(state.duration)}
                  </p>
                </div>
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
                <button
                  onClick={closePlayer}
                  className="h-8 w-8 flex items-center justify-center rounded-full bg-error/10 text-error hover:bg-error/20 transition"
                >
                  <LuSquare size={14} />
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </AudioPlayerContext.Provider>
  );
}
