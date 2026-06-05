'use client';

import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import {
  AppearanceData,
  AudioReview,
  ProductBanner,
  FAQ,
} from '@/types/Appearance';
import { useLocale } from 'next-intl';

const EMPTY_APPEARANCE: AppearanceData = {
  worksImages: { row1: [], row2: [] },
  audioReviews: [],
  whatsAppDefaultMessage: '',
  bannerText: { ar: '', en: '' },
  documentationAnswer: { ar: '', en: '' },
  productsBanners: [],
  faqs: [],
};

const THIS_PLATFORM = 'manasik' as const;

function matchesPlatform(platform: string) {
  return platform === 'shared' || platform === THIS_PLATFORM;
}

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
        platform?: unknown;
        language?: unknown;
        link?: unknown;
      };

      const id = typeof raw.id === 'string' ? raw.id.trim() : '';
      const imageUrl =
        typeof raw.imageUrl === 'string' ? raw.imageUrl.trim() : '';

      const platform =
        raw.platform === 'ghadaq' ||
        raw.platform === 'manasik' ||
        raw.platform === 'shared'
          ? raw.platform
          : 'shared';

      const language =
        raw.language === 'ar' ||
        raw.language === 'en' ||
        raw.language === 'shared'
          ? raw.language
          : 'shared';

      const link = typeof raw.link === 'string' ? raw.link.trim() : '';

      if (!id || !imageUrl) return null;

      return {
        id,
        imageUrl,
        platform,
        language,
        link,
      };
    })
    .filter((item): item is ProductBanner => Boolean(item));
}

function normalizeFAQs(value: unknown): FAQ[] {
  if (!Array.isArray(value)) return [];

  return value
    .map((item) => {
      if (!item || typeof item !== 'object') return null;

      const raw = item as {
        id?: unknown;
        question?: unknown;
        answer?: unknown;
        platform?: unknown;
        showOnProductDetails?: unknown;
      };

      const id = typeof raw.id === 'string' ? raw.id.trim() : '';

      const question =
        typeof raw.question === 'object' && raw.question !== null
          ? {
              ar:
                typeof (raw.question as { ar?: unknown }).ar === 'string'
                  ? (raw.question as { ar: string }).ar.trim()
                  : '',
              en:
                typeof (raw.question as { en?: unknown }).en === 'string'
                  ? (raw.question as { en: string }).en.trim()
                  : '',
            }
          : { ar: '', en: '' };

      const answer =
        typeof raw.answer === 'object' && raw.answer !== null
          ? {
              ar:
                typeof (raw.answer as { ar?: unknown }).ar === 'string'
                  ? (raw.answer as { ar: string }).ar.trim()
                  : '',
              en:
                typeof (raw.answer as { en?: unknown }).en === 'string'
                  ? (raw.answer as { en: string }).en.trim()
                  : '',
            }
          : { ar: '', en: '' };

      const platform =
        raw.platform === 'ghadaq' ||
        raw.platform === 'manasik' ||
        raw.platform === 'shared'
          ? raw.platform
          : 'shared';

      const showOnProductDetails =
        typeof raw.showOnProductDetails === 'boolean'
          ? raw.showOnProductDetails
          : false;

      if (!id || !question.ar || !question.en || !answer.ar || !answer.en) {
        return null;
      }

      return {
        id,
        question,
        answer,
        platform,
        showOnProductDetails,
      };
    })
    .filter((item): item is FAQ => Boolean(item));
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
        const res = await fetch(`/api/appearance?project=${THIS_PLATFORM}`, {
          cache: 'no-store',
        });

        const result = await res.json();

        if (!isMounted || !result?.success) return;

        const row1 = result.data?.worksImages?.row1 ?? result.data?.row1 ?? [];
        const row2 = result.data?.worksImages?.row2 ?? result.data?.row2 ?? [];

        const whatsAppDefaultMessage =
          typeof result.data?.whatsAppDefaultMessage === 'string'
            ? result.data.whatsAppDefaultMessage
            : '';

        const rawBannerText = result.data?.bannerText;

        const audioReviews = normalizeAudioReviews(result.data?.audioReviews);

        const bannerText =
          typeof rawBannerText === 'string'
            ? { ar: rawBannerText, en: rawBannerText }
            : {
                ar:
                  typeof rawBannerText?.ar === 'string' ? rawBannerText.ar : '',
                en:
                  typeof rawBannerText?.en === 'string' ? rawBannerText.en : '',
              };

        const rawDocumentationAnswer = result.data?.documentationAnswer;

        const documentationAnswer =
          typeof rawDocumentationAnswer === 'string'
            ? {
                ar: rawDocumentationAnswer,
                en: rawDocumentationAnswer,
              }
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

        const productsBanners = normalizeProductsBanners(
          result.data?.productsBanners,
        );

        const faqs = normalizeFAQs(result.data?.faqs);

        setAppearance({
          worksImages: { row1, row2 },
          audioReviews,
          whatsAppDefaultMessage,
          bannerText,
          documentationAnswer,
          productsBanners,
          faqs,
        });
      } catch {
        // Keep empty fallback on network/API errors.
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
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
            matchesPlatform(banner.platform) &&
            (banner.language === 'shared' || banner.language === locale),
        ),

        faqs: appearance.faqs?.filter((faq) => matchesPlatform(faq.platform)),
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
