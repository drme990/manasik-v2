'use client';

import { useState, useMemo, useEffect } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { Product } from '@/types/Product';
import ProductCard from '@/components/products/product-card';
import LabelFilterModal from '@/components/products/label-filter-modal';
import Button from '@/components/ui/button';

const STORAGE_KEY = 'selectedProductLabel';
const MODAL_SEEN_KEY = 'labelFilterModalSeen';

interface ProductsWithLabelFilterProps {
  products: Product[];
  locale: string;
}

export default function ProductsWithLabelFilter({
  products,
  locale,
}: ProductsWithLabelFilterProps) {
  const t = useTranslations('labels');
  const currentLocale = useLocale();

  // Extract labels
  const availableLabels = useMemo(() => {
    return products.reduce((acc, product) => {
      const label = product.label?.[currentLocale as 'ar' | 'en'];
      if (label && !acc.includes(label)) acc.push(label);
      return acc;
    }, [] as string[]);
  }, [products, currentLocale]);

  const hasProductsWithLabels = availableLabels.length > 0;

  const isValidLabel = (label: string | null) => {
    if (!label) return true;
    if (label === '__daily__') return true;
    return availableLabels.includes(label);
  };

  const getInitialLabel = (): string | null => {
    if (typeof window === 'undefined') return null;

    const saved = localStorage.getItem(STORAGE_KEY);
    return isValidLabel(saved) ? saved : null;
  };

  const getInitialModalState = () => {
    if (typeof window === 'undefined') return false;

    const hasSeen = sessionStorage.getItem(MODAL_SEEN_KEY);
    const saved = localStorage.getItem(STORAGE_KEY);

    return !hasSeen && !saved;
  };

  const [selectedLabel, setSelectedLabel] = useState<string | null>(
    getInitialLabel
  );

  const [isModalOpen, setIsModalOpen] = useState(getInitialModalState);

  // Only side effect: mark modal as seen
  useEffect(() => {
    if (isModalOpen) {
      sessionStorage.setItem(MODAL_SEEN_KEY, 'true');
    }
  }, [isModalOpen]);

  const handleSelectLabel = (label: string | null) => {
    if (!isValidLabel(label)) {
      label = null;
    }

    setSelectedLabel(label);

    if (!label) {
      localStorage.removeItem(STORAGE_KEY);
    } else {
      localStorage.setItem(STORAGE_KEY, label);
    }
  };

  const filteredProducts = useMemo(() => {
    if (selectedLabel === null) return products;

    if (selectedLabel === '__daily__') {
      return products.filter(
        (product) =>
          product.showAlways ||
          !product.label?.[currentLocale as 'ar' | 'en']
      );
    }

    return products.filter(
      (product) =>
        product.showAlways ||
        product.label?.[currentLocale as 'ar' | 'en'] === selectedLabel
    );
  }, [products, selectedLabel, currentLocale]);

  if (!hasProductsWithLabels) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-3 gap-x-3 gap-y-6 pb-16">
        {products.map((product, index) => (
          <ProductCard
            key={product.slug}
            product={product}
            locale={locale}
            revealDelayMs={index * 80}
          />
        ))}
      </div>
    );
  }

  return (
    <>
      {/* Filter Tabs */}
      <div className="mb-6">
        <div className="flex flex-wrap gap-2" style={{ minHeight: '40px' }}>
          <button
            onClick={() => handleSelectLabel(null)}
            className={`px-4 py-2 rounded-full text-sm font-medium ${
              selectedLabel === null
                ? 'bg-primary text-white'
                : 'bg-secondary/50'
            }`}
          >
            {t('showAll')}
          </button>

          <button
            onClick={() => handleSelectLabel('__daily__')}
            className={`px-4 py-2 rounded-full text-sm font-medium ${
              selectedLabel === '__daily__'
                ? 'bg-primary text-white'
                : 'bg-secondary/50'
            }`}
          >
            {t('daily')}
          </button>

          {availableLabels.map((label) => (
            <button
              key={label}
              onClick={() => handleSelectLabel(label)}
              className={`px-4 py-2 rounded-full text-sm font-medium ${
                selectedLabel === label
                  ? 'bg-primary text-white'
                  : 'bg-secondary/50'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Products */}
      {filteredProducts.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <p className="text-secondary text-lg">
            {selectedLabel === '__daily__'
              ? 'No regular products available'
              : `No products with label "${selectedLabel}"`}
          </p>

          <Button
            variant="outline"
            onClick={() => handleSelectLabel(null)}
            className="mt-4"
          >
            {t('showAll')}
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-x-3 gap-y-6 pb-16">
          {filteredProducts.map((product, index) => (
            <ProductCard
              key={product.slug}
              product={product}
              locale={locale}
              revealDelayMs={index * 80}
            />
          ))}
        </div>
      )}

      {/* Modal */}
      <LabelFilterModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        products={products}
        selectedLabel={selectedLabel}
        onSelectLabel={(label) => {
          handleSelectLabel(label);
          setIsModalOpen(false);
        }}
      />
    </>
  );
}