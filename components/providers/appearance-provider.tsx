'use client';

import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { AppearanceData } from '@/types/Appearance';

const EMPTY_APPEARANCE: AppearanceData = {
  worksImages: { row1: [], row2: [] },
  audioReviews: [],
  whatsAppDefaultMessage: '',
  bannerText: { ar: '', en: '' },
};

function normalizeAudioReviews(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === 'string');
}

type AppearanceContextType = {
  appearance: AppearanceData;
  isLoading: boolean;
};

const AppearanceContext = createContext<AppearanceContextType | null>(null);

export function AppearanceProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [appearance, setAppearance] =
    useState<AppearanceData>(EMPTY_APPEARANCE);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    async function loadAppearance() {
      try {
        const [projectRes, sharedRes] = await Promise.all([
          fetch('/api/appearance?project=manasik', { cache: 'no-store' }),
          fetch('/api/appearance?project=shared', { cache: 'no-store' }),
        ]);
        const [projectData, sharedData] = await Promise.all([
          projectRes.json(),
          sharedRes.json(),
        ]);

        if (!isMounted || !projectData?.success) return;

        const row1 =
          projectData.data?.worksImages?.row1 ?? projectData.data?.row1 ?? [];
        const row2 =
          projectData.data?.worksImages?.row2 ?? projectData.data?.row2 ?? [];
        const whatsAppDefaultMessage =
          typeof projectData.data?.whatsAppDefaultMessage === 'string'
            ? projectData.data.whatsAppDefaultMessage
            : '';
        const rawBannerText = projectData.data?.bannerText;
        const projectAudio = normalizeAudioReviews(
          projectData.data?.audioReviews,
        );
        const sharedAudio = sharedData?.success
          ? normalizeAudioReviews(sharedData.data?.audioReviews)
          : [];
        const bannerText =
          typeof rawBannerText === 'string'
            ? { ar: rawBannerText, en: rawBannerText }
            : {
                ar:
                  typeof rawBannerText?.ar === 'string' ? rawBannerText.ar : '',
                en:
                  typeof rawBannerText?.en === 'string' ? rawBannerText.en : '',
              };

        setAppearance({
          worksImages: { row1, row2 },
          audioReviews: [...sharedAudio, ...projectAudio],
          whatsAppDefaultMessage,
          bannerText,
        });
      } catch {
        // Keep empty fallback on network/API errors.
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    loadAppearance();

    return () => {
      isMounted = false;
    };
  }, []);

  const value = useMemo(
    () => ({ appearance, isLoading }),
    [appearance, isLoading],
  );

  return (
    <AppearanceContext.Provider value={value}>
      {children}
    </AppearanceContext.Provider>
  );
}

export function useAppearance() {
  const context = useContext(AppearanceContext);
  if (!context) {
    throw new Error('useAppearance must be used within AppearanceProvider');
  }
  return context;
}
