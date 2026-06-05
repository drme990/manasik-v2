'use client';

import { useState } from 'react';
import { useAppearance } from '../providers/appearance-provider';
import { useLocale, useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';
import { Minus, Plus } from 'lucide-react';

export interface FAQ {
  id: string;
  question: { ar: string; en: string };
  answer: { ar: string; en: string };
  platform: 'ghadaq' | 'manasik' | 'shared';
  showOnProductDetails: boolean;
}

function FaqCard({
  question,
  answer,
  isOpen,
  onToggle,
  className,
}: {
  question: string;
  answer: string;
  isOpen: boolean;
  onToggle: () => void;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'w-full bg-card-bg flex flex-col items-start border border-stroke rounded-site p-5',
        className,
      )}
    >
      <button
        className="w-full flex items-center justify-between gap-3 text-start"
        onClick={onToggle}
        aria-expanded={isOpen}
      >
        <h3 className="text-base font-bold">{question}</h3>
        <div className="relative w-6 h-6">
          <Plus
            className={`absolute inset-0 transition-all duration-300 ${
              isOpen
                ? 'opacity-0 rotate-45 scale-75'
                : 'opacity-100 rotate-0 scale-100'
            }`}
            size={22}
          />
          <Minus
            className={`absolute inset-0 transition-all duration-300 ${
              isOpen
                ? 'opacity-100 rotate-0 scale-100'
                : 'opacity-0 -rotate-45 scale-75'
            }`}
            size={22}
          />
        </div>
      </button>
      <div
        className={`overflow-hidden transition-all duration-300 ease-in-out ${
          isOpen ? 'max-h-96 opacity-100 mt-4' : 'max-h-0 opacity-0'
        }`}
      >
        <p className="text-secondary text-sm leading-relaxed">{answer}</p>
      </div>
    </div>
  );
}

export default function FAQDisplay() {
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  const { appearance } = useAppearance();
  const locale = useLocale() as 'ar' | 'en';
  const tCommon = useTranslations('common');

  const faqs = (appearance.faqs || [])
    .filter((faq) => faq.platform === 'manasik' || faq.platform === 'shared')
    .filter((faq) => faq.showOnProductDetails);

  if (!faqs || faqs.length === 0) {
    return null;
  }

  const toggleExpanded = (id: string) => {
    setExpandedItems((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  if (faqs.length === 0) {
    return null;
  }

  return (
    <div className="space-y-4">
      <h2 className="text-center text-lg font-bold text-foreground">
        {tCommon('faq.title')}
      </h2>
      <div className="space-y-3">
        {faqs.map((faq) => (
          <FaqCard
            key={faq.id}
            question={locale === 'ar' ? faq.question.ar : faq.question.en}
            answer={locale === 'ar' ? faq.answer.ar : faq.answer.en}
            isOpen={expandedItems.has(faq.id)}
            onToggle={() => toggleExpanded(faq.id)}
          />
        ))}
      </div>
    </div>
  );
}
