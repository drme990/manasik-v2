'use client';

import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { AppearanceData, AudioReview, ProductBanner } from '@/types/Appearance';
import { useLocale } from 'next-intl';

const EMPTY_APPEARANCE: AppearanceData = {
  worksImages: { row1: [], row2: [] },
  audioReviews: [],
  whatsAppDefaultMessage: '',
  bannerText: { ar: '', en: '' },
  documentationAnswer: { ar: '', en: '' },
  productsBanners: [],
};

function normalizeAudioReviews(value: unknown): AudioReview[] {
  if (!Array.isArray(value)) return [];
  return value.filter(
    (item): item is AudioReview =>
      typeof item === 'object' &&
      item !== null &&
      typeof (item as AudioReview).id === 'string' &&
      typeof (item as AudioReview).url === 'string',
  );
}

function normalizeProductsBanners(value: unknown): ProductBanner[] {
  if (!Array.isArray(value)) return [];

  return value
    .map((item) => {
      if (!item || typeof item !== 'object') return null;

      const raw = item as {
        id?: unknown;
        imageUrl?: unknown;
        target?: unknown;
        language?: unknown;
        link?: unknown;
      };

      const id = typeof raw.id === 'string' ? raw.id.trim() : '';
      const imageUrl =
        typeof raw.imageUrl === 'string' ? raw.imageUrl.trim() : '';
      const target =
        raw.target === 'ghadaq' ||
        raw.target === 'manasik' ||
        raw.target === 'both'
          ? raw.target
          : 'both';
      const language =
        raw.language === 'ar' ||
        raw.language === 'en' ||
        raw.language === 'shared'
          ? raw.language
          : 'shared';
      const link = typeof raw.link === 'string' ? raw.link.trim() : '';

      if (!id || !imageUrl) return null;

      return { id, imageUrl, target, language, link };
    })
    .filter((item): item is ProductBanner => Boolean(item));
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
  const locale = useLocale();
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

        const rawDocumentationAnswer = sharedData?.data?.documentationAnswer;
        const documentationAnswer =
          typeof rawDocumentationAnswer === 'string'
            ? { ar: rawDocumentationAnswer, en: rawDocumentationAnswer }
            : {
                ar:
                  typeof rawDocumentationAnswer?.ar === 'string'
                    ? rawDocumentationAnswer.ar
                    : '',
                en:
                  typeof rawDocumentationAnswer?.en === 'string'
                    ? rawDocumentationAnswer.en
                    : '',
              };

        // Merge audio reviews from both project and shared
        // Filter for manasik platform (or shared)
        const allAudio = [...projectAudio, ...sharedAudio];
        const filteredAudio = allAudio.filter(
          (a) => a.platform === 'manasik' || a.platform === 'shared',
        );
        const productsBanners = normalizeProductsBanners(
          projectData.data?.productsBanners,
        );

        setAppearance({
          worksImages: { row1, row2 },
          audioReviews: filteredAudio,
          whatsAppDefaultMessage,
          bannerText,
          documentationAnswer,
          productsBanners,
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
    () => ({
      appearance: {
        ...appearance,
        productsBanners: appearance.productsBanners.filter(
          (banner) =>
            banner.language === 'shared' || banner.language === locale,
        ),
      },
      isLoading,
    }),
    [appearance, isLoading, locale],
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
