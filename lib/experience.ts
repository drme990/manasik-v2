/**
 * «شارك تجربتك» (owner, 2026-10-12): which site this is, and the file types
 * the backend accepts. Ghadaq's copy says 'ghadaq'.
 */
export const EXPERIENCE_APP: 'manasik' | 'ghadaq' = 'manasik';
export const EXPERIENCE_BRAND = { ar: 'مناسك', en: 'Manasik' } as const;

export type ExperienceType = 'text' | 'audio' | 'video';

export interface ExperienceLimits {
  maxTextChars: number;
  maxAudioSeconds: number;
  maxVideoSeconds: number;
}

export const DEFAULT_LIMITS: ExperienceLimits = { maxTextChars: 250, maxAudioSeconds: 60, maxVideoSeconds: 90 };

// MP4 with AAC sound first where the browser can record it (owner, 2026-10-13): a featured voice or video joins the
// app's voice reviews and reels, and the iPhone plays neither WebM nor Ogg. WebM stays as the fallback.
const AUDIO_RECORD_TYPES = ['audio/mp4;codecs=mp4a.40.2', 'audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg;codecs=opus'];
const VIDEO_RECORD_TYPES = ['video/mp4;codecs=avc1,mp4a', 'video/mp4;codecs=avc1.42E01E,mp4a.40.2', 'video/webm;codecs=vp8,opus', 'video/webm;codecs=vp9,opus', 'video/webm', 'video/mp4'];
// On Android, WebM first: Android Chrome's MP4 recordings can play back black (phones record with the camera app anyway).
const ANDROID_VIDEO_RECORD_TYPES = ['video/webm;codecs=vp8,opus', 'video/webm;codecs=vp9,opus', 'video/webm', 'video/mp4;codecs=avc1,mp4a', 'video/mp4'];

/** The first recording format this browser supports, or '' to let it choose. */
export function recordingType(kind: 'audio' | 'video'): string {
  if (typeof MediaRecorder === 'undefined') return '';
  const android = typeof navigator !== 'undefined' && /Android/i.test(navigator.userAgent || '');
  const list = kind === 'audio' ? AUDIO_RECORD_TYPES : android ? ANDROID_VIDEO_RECORD_TYPES : VIDEO_RECORD_TYPES;
  return list.find((type) => MediaRecorder.isTypeSupported?.(type)) || '';
}

/** "audio/webm;codecs=opus" → "audio/webm"; iPhone's .m4a → "audio/mp4". */
export function baseType(type: string, kind: 'audio' | 'video'): string {
  const base = (type || '').split(';')[0].trim().toLowerCase();
  if (base === 'audio/x-m4a' || base === 'audio/m4a') return 'audio/mp4';
  if (!base) return kind === 'audio' ? 'audio/webm' : 'video/mp4';
  return base;
}

/** The length of an audio or video file, in seconds (0 when unknown). */
export function mediaDuration(blob: Blob, kind: 'audio' | 'video'): Promise<number> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(blob);
    const el = document.createElement(kind);
    el.preload = 'metadata';
    const done = (value: number) => {
      URL.revokeObjectURL(url);
      resolve(Number.isFinite(value) ? value : 0);
    };
    el.onloadedmetadata = () => {
      // Chrome reports Infinity for fresh webm recordings until it seeks to the end.
      if (el.duration === Infinity) {
        el.currentTime = 1e7;
        el.ontimeupdate = () => {
          el.ontimeupdate = null;
          done(el.duration);
        };
      } else done(el.duration);
    };
    el.onerror = () => done(0);
    el.src = url;
  });
}
