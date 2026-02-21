'use client';

import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  ReactNode,
} from 'react';
import { Product } from '@/types/Product';
import Modal from '@/components/ui/modal';
import Button from '@/components/ui/button';
import { ArrowUpCircle } from 'lucide-react';
import { useTranslations, useLocale } from 'next-intl';

interface UpgradeModalOptions {
  currentProduct: Product;
  upgradeProducts: Product[];
  onSelect: (product: Product) => void;
}

interface UpgradeModalContextType {
  showUpgradeModal: (options: UpgradeModalOptions) => void;
  hideUpgradeModal: () => void;
}

const UpgradeModalContext = createContext<UpgradeModalContextType | null>(null);

export function useUpgradeModal() {
  const ctx = useContext(UpgradeModalContext);
  if (!ctx)
    throw new Error('useUpgradeModal must be used within UpgradeModalProvider');
  return ctx;
}

export function UpgradeModalProvider({ children }: { children: ReactNode }) {
  const [options, setOptions] = useState<UpgradeModalOptions | null>(null);
  const t = useTranslations('calcAqeqa.upgrade');
  const locale = useLocale();
  const isAr = locale === 'ar';

  const showUpgradeModal = useCallback((opts: UpgradeModalOptions) => {
    setOptions(opts);
  }, []);

  const hideUpgradeModal = useCallback(() => {
    setOptions(null);
  }, []);

  return (
    <UpgradeModalContext.Provider
      value={{ showUpgradeModal, hideUpgradeModal }}
    >
      {children}

      <Modal
        isOpen={!!options}
        onClose={hideUpgradeModal}
        title={t('title')}
        size="md"
      >
        <div className="space-y-4">
          <div className="flex items-center gap-3 p-3 bg-success/10 rounded-site border border-success/20">
            <ArrowUpCircle className="text-success shrink-0" size={20} />
            <p className="text-sm text-foreground">{t('description')}</p>
          </div>

          <p className="text-sm text-secondary">
            {t('currentChoice')}{' '}
            <span className="font-semibold text-foreground">
              {isAr
                ? options?.currentProduct.name.ar
                : options?.currentProduct.name.en}
            </span>
          </p>

          <div className="space-y-2">
            {options?.upgradeProducts.map((p) => (
              <button
                key={p._id}
                onClick={() => {
                  options.onSelect(p);
                  hideUpgradeModal();
                }}
                className="w-full text-start px-4 py-3 border border-stroke rounded-site hover:border-success hover:bg-success/5 transition-colors"
              >
                <p className="font-medium text-foreground">
                  {isAr ? p.name.ar : p.name.en}
                </p>
                {p.sacrificeCount && p.sacrificeCount > 1 && (
                  <p className="text-xs text-success mt-0.5">
                    {t('covers', { count: p.sacrificeCount })}
                  </p>
                )}
              </button>
            ))}
          </div>

          <Button
            variant="outline"
            onClick={hideUpgradeModal}
            className="w-full"
          >
            {t('skip')}
          </Button>
        </div>
      </Modal>
    </UpgradeModalContext.Provider>
  );
}
