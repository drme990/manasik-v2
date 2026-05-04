'use client';

import { useState, useMemo, useEffect } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { Product } from '@/types/Product';
import ProductCard from '@/components/products/product-card';
import LabelFilterModal from '@/components/products/label-filter-modal';
import Button from '@/components/ui/button';

const STORAGE_KEY = 'selectedProductLabel';

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

  const [selectedLabel, setSelectedLabel] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);

  // Extract unique labels
  const availableLabels = useMemo(() => {
    return products.reduce((acc, product) => {
      const label = product.label?.[currentLocale as 'ar' | 'en'];
      if (label && !acc.includes(label)) {
        acc.push(label);
      }
      return acc;
    }, [] as string[]);
  }, [products, currentLocale]);

  const hasProductsWithLabels = availableLabels.length > 0;

  // Load saved filter from localStorage on mount
  useEffect(() => {
    const savedLabel = localStorage.getItem(STORAGE_KEY);
    if (savedLabel) {
      // Validate the saved label still exists in available labels
      if (savedLabel === '__daily__' || availableLabels.includes(savedLabel)) {
        setSelectedLabel(savedLabel);
      }
    }
    setIsLoaded(true);
  }, [availableLabels]);

  // Open modal on first visit (only if no saved filter)
  useEffect(() => {
    if (!hasProductsWithLabels || !isLoaded) return;

    const hasSeenModal = sessionStorage.getItem('labelFilterModalSeen');
    const savedLabel = localStorage.getItem(STORAGE_KEY);
    if (!hasSeenModal && !savedLabel) {
      setIsModalOpen(true);
      sessionStorage.setItem('labelFilterModalSeen', 'true');
    }
  }, [hasProductsWithLabels, isLoaded]);

  // Filter logic
  const filteredProducts = useMemo(() => {
    if (selectedLabel === null) return products;

    if (selectedLabel === '__daily__') {
      return products.filter(
        (product) => !product.label?.[currentLocale as 'ar' | 'en'],
      );
    }

    return products.filter(
      (product) =>
        product.label?.[currentLocale as 'ar' | 'en'] === selectedLabel,
    );
  }, [products, selectedLabel, currentLocale]);

  const handleSelectLabel = (label: string | null) => {
    setSelectedLabel(label);
    if (label === null) {
      localStorage.removeItem(STORAGE_KEY);
    } else {
      localStorage.setItem(STORAGE_KEY, label);
    }
  };

  // No labels → no filter UI
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
            className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 ${
              selectedLabel === null
                ? 'bg-primary text-white shadow-md'
                : 'bg-secondary/50 text-foreground'
            }`}
          >
            {t('showAll')}
          </button>

          <button
            onClick={() => handleSelectLabel('__daily__')}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 ${
              selectedLabel === '__daily__'
                ? 'bg-primary text-white shadow-md'
                : 'bg-secondary/50 text-foreground'
            }`}
          >
            {t('daily')}
          </button>

          {availableLabels.map((label) => (
            <button
              key={label}
              onClick={() => handleSelectLabel(label)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 ${
                selectedLabel === label
                  ? 'bg-primary text-white shadow-md'
                  : 'bg-secondary/50 text-foreground'
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

      {/* First-time Label Filter Modal */}
      <LabelFilterModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        products={products}
        onSelectLabel={(label) => {
          setSelectedLabel(label);
          setIsModalOpen(false);
        }}
        selectedLabel={selectedLabel}
      />
    </>
  );
}
