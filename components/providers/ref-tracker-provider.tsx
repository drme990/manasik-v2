'use client';

import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { getStoredReferral } from './referral-provider';
import { hasClientAuthCookie } from '@/lib/client-auth-cookie';

type RefTrackerAction =
  | 'session_created'
  | 'navigate_products'
  | 'select_product'
  | 'pay_now'
  | 'checkout_choice'
  | 'proceed_to_payment';

type TrackerPayload = {
  appId: 'manasik';
  sessionNumber: string;
  userId?: string;
  ref?: string;
  action: RefTrackerAction;
  path: string;
  productName?: string;
  buttonLabel?: string;
  choice?: string;
  metadata?: Record<string, unknown>;
};

const SESSION_KEY = 'manasik-ref-tracker-session';

function createSessionNumber(): string {
  if (
    typeof crypto !== 'undefined' &&
    typeof crypto.randomUUID === 'function'
  ) {
    return crypto.randomUUID();
  }

  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

function readSessionNumber(): string {
  if (typeof window === 'undefined') return createSessionNumber();

  const stored = window.sessionStorage.getItem(SESSION_KEY);
  if (stored) return stored;

  const next = createSessionNumber();
  window.sessionStorage.setItem(SESSION_KEY, next);
  return next;
}

function getBackendBaseUrl(): string {
  return (
    process.env.NEXT_PUBLIC_BACKEND_URL ||
    process.env.BACKEND_URL ||
    ''
  ).replace(/\/$/, '');
}

async function resolveCurrentUserId(): Promise<string | undefined> {
  if (!hasClientAuthCookie()) return undefined;

  try {
    const response = await fetch('/api/auth/manasik/session', {
      cache: 'no-store',
    });

    if (!response.ok) return undefined;

    const payload = await response.json();
    const userId = payload?.data?._id;
    return typeof userId === 'string' && userId.trim() ? userId : undefined;
  } catch {
    return undefined;
  }
}

async function sendTrackerEvent(payload: TrackerPayload): Promise<void> {
  const baseUrl = getBackendBaseUrl();
  const url = baseUrl ? `${baseUrl}/api/ref-tracker` : '/api/ref-tracker';
  const body = JSON.stringify(payload);

  if (typeof navigator !== 'undefined' && navigator.sendBeacon) {
    const blob = new Blob([body], { type: 'application/json' });
    if (navigator.sendBeacon(url, blob)) return;
  }

  await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body,
    keepalive: true,
  });
}

export default function RefTrackerProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const sessionNumberRef = useRef<string>(readSessionNumber());
  const userIdRef = useRef<string | undefined>(undefined);
  const sentSessionRef = useRef(false);

  useEffect(() => {
    let isMounted = true;

    const handleAuthChanged = () => {
      void resolveCurrentUserId().then((userId) => {
        if (!isMounted) return;
        userIdRef.current = userId;
      });
    };

    const emitSession = async () => {
      if (sentSessionRef.current) return;
      sentSessionRef.current = true;

      try {
        await sendTrackerEvent({
          appId: 'manasik',
          sessionNumber: sessionNumberRef.current,
          userId: userIdRef.current,
          ref: getStoredReferral(null),
          action: 'session_created',
          path: pathname || '/',
          metadata: {
            sessionCreatedAt: new Date().toISOString(),
          },
        });
      } catch {
        // Fire-and-forget; the tracker must never block the app.
      }
    };

    const bootstrap = async () => {
      const userId = await resolveCurrentUserId();
      if (!isMounted) return;
      userIdRef.current = userId;
      await emitSession();
    };

    void bootstrap();

    const handleClick = (event: MouseEvent) => {
      const target = event.target;
      if (!(target instanceof Element)) return;

      const trackerTarget = target.closest<HTMLElement>(
        '[data-ref-track-action]',
      );
      if (!trackerTarget) return;

      const action = trackerTarget.dataset.refTrackAction as
        | RefTrackerAction
        | undefined;
      if (!action) return;

      const productName = trackerTarget.dataset.refTrackProductName;
      const buttonLabel = trackerTarget.dataset.refTrackButtonLabel;
      const choice = trackerTarget.dataset.refTrackChoice;
      const extra = trackerTarget.dataset.refTrackMeta;

      let metadata: Record<string, unknown> | undefined;
      if (extra) {
        try {
          metadata = JSON.parse(extra) as Record<string, unknown>;
        } catch {
          metadata = { raw: extra };
        }
      }

      void sendTrackerEvent({
        appId: 'manasik',
        sessionNumber: sessionNumberRef.current,
        userId: userIdRef.current,
        ref: getStoredReferral(null),
        action,
        path: `${window.location.pathname}${window.location.search}`,
        productName,
        buttonLabel,
        choice,
        metadata,
      }).catch(() => {});
    };

    document.addEventListener('click', handleClick, true);
    window.addEventListener('auth-changed', handleAuthChanged);

    return () => {
      isMounted = false;
      document.removeEventListener('click', handleClick, true);
      window.removeEventListener('auth-changed', handleAuthChanged);
    };
  }, [pathname]);

  return <>{children}</>;
}
