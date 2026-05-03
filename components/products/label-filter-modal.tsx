'use client';

import { useTranslations } from 'next-intl';
import { useLocale } from 'next-intl';
import Modal from '@/components/ui/modal';
import { Product } from '@/types/Product';
import { LuCheck } from 'react-icons/lu';

interface LabelFilterModalProps {
  isOpen: boolean;
  onClose: () => void;
  products: Product[];
  onSelectLabel: (label: string | null) => void;
  selectedLabel: string | null;
}

export default function LabelFilterModal({
  isOpen,
  onClose,
  products,
  onSelectLabel,
  selectedLabel,
}: LabelFilterModalProps) {
  const t = useTranslations('labels');
  const locale = useLocale();

  // Extract unique labels from products
  const availableLabels = products.reduce((acc, product) => {
    if (product.label?.[locale as 'ar' | 'en']) {
      const labelText = product.label[locale as 'ar' | 'en'];
      if (!acc.includes(labelText)) {
        acc.push(labelText);
      }
    }
    return acc;
  }, [] as string[]);

  // Check if any products have labels
  const hasProductsWithLabels = availableLabels.length > 0;

  // Don't render if no products have labels
  if (!hasProductsWithLabels && !isOpen) {
    return null;
  }

  const handleLabelSelect = (label: string | null) => {
    onSelectLabel(label);
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={t('filterByLabel')}>
      <div className="space-y-4">
        <p className="text-sm text-secondary">{t('selectLabelDescription')}</p>

        {/* Show All option - display all products */}
        <button
          onClick={() => handleLabelSelect(null)}
          className={`w-full p-4 rounded-xl border-2 transition-all duration-200 text-left ${
            selectedLabel === null
              ? 'border-primary bg-primary/10'
              : 'border-stroke hover:border-primary/50'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="font-medium">{t('showAll')}</span>
            {selectedLabel === null && (
              <LuCheck className="w-5 h-5 text-primary" />
            )}
          </div>
        </button>

        {/* Daily option - for products without labels */}
        <button
          onClick={() => handleLabelSelect('__daily__')}
          className={`w-full p-4 rounded-xl border-2 transition-all duration-200 text-left ${
            selectedLabel === '__daily__'
              ? 'border-primary bg-primary/10'
              : 'border-stroke hover:border-primary/50'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="font-medium">{t('daily')}</span>
            {selectedLabel === '__daily__' && (
              <LuCheck className="w-5 h-5 text-primary" />
            )}
          </div>
        </button>

        {/* Available labels */}
        {availableLabels.map((label) => (
          <button
            key={label}
            onClick={() => handleLabelSelect(label)}
            className={`w-full p-4 rounded-xl border-2 transition-all duration-200 text-left ${
              selectedLabel === label
                ? 'border-primary bg-primary/10'
                : 'border-stroke hover:border-primary/50'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="font-medium">{label}</span>
              {selectedLabel === label && (
                <LuCheck className="w-5 h-5 text-primary" />
              )}
            </div>
          </button>
        ))}
      </div>
    </Modal>
  );
}
