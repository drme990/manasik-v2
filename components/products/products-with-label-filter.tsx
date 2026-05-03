'use client';

import { useState, useMemo, useEffect } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { Product } from '@/types/Product';
import ProductCard from '@/components/products/product-card';
import LabelFilterModal from '@/components/products/label-filter-modal';
import Button from '@/components/ui/button';

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

  // Open modal on first visit
  useEffect(() => {
    if (!hasProductsWithLabels) return;

    const hasSeenModal = sessionStorage.getItem('labelFilterModalSeen');
    if (!hasSeenModal) {
      setIsModalOpen(true);
      sessionStorage.setItem('labelFilterModalSeen', 'true');
    }
  }, [hasProductsWithLabels]);

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
        <div className="flex flex-wrap gap-2">
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
