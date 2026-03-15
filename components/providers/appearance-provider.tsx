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
  whatsAppDefaultMessage: '',
  bannerText: { ar: '', en: '' },
};

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
        const res = await fetch('/api/appearance?project=manasik', {
          cache: 'no-store',
        });
        const data = await res.json();

        if (!isMounted || !data?.success) return;

        const row1 = data.data?.worksImages?.row1 ?? data.data?.row1 ?? [];
        const row2 = data.data?.worksImages?.row2 ?? data.data?.row2 ?? [];
        const whatsAppDefaultMessage =
          typeof data.data?.whatsAppDefaultMessage === 'string'
            ? data.data.whatsAppDefaultMessage
            : '';
        const rawBannerText = data.data?.bannerText;
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
