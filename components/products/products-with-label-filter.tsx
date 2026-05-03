'use client';

import { useState, useMemo, useEffect } from 'react';
import { useLocale } from 'next-intl';
import { Product } from '@/types/Product';
import ProductCard from '@/components/products/product-card';
import LabelFilterModal from '@/components/products/label-filter-modal';
import Button from '@/components/ui/button';
import { Filter, X } from 'lucide-react';
import { useTranslations } from 'next-intl';

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

  const [isModalOpen, setIsModalOpen] = useState(false);
  // null = no filter (show all), '__daily__' = products without labels, string = specific label
  const [selectedLabel, setSelectedLabel] = useState<string | null>(null);

  // Check if any products have labels
  const hasProductsWithLabels = useMemo(() => {
    return products.some(
      (product) => product.label?.[currentLocale as 'ar' | 'en'],
    );
  }, [products, currentLocale]);

  // Auto-open modal on first visit if labels are available
  useEffect(() => {
    if (!hasProductsWithLabels) return;

    const hasSeenModal = sessionStorage.getItem('labelFilterModalSeen');

    if (!hasSeenModal) {
      // Avoid synchronous state update warning
      queueMicrotask(() => {
        setIsModalOpen(true);
      });

      sessionStorage.setItem('labelFilterModalSeen', 'true');
    }
  }, [hasProductsWithLabels]);

  // Filter products based on selected label
  const filteredProducts = useMemo(() => {
    if (selectedLabel === null) {
      return products;
    }

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

  const clearFilter = () => {
    setSelectedLabel(null);
  };

  // Don't show filter if no products have labels
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
      {/* Filter Bar */}
      <div className="mb-6 flex items-center gap-3">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2"
        >
          <Filter size={16} />
          {t('filterByLabel')}
          {selectedLabel !== null && (
            <span className="ml-1 px-2 py-0.5 bg-primary/20 rounded-full text-xs">
              {selectedLabel === '__daily__' ? t('daily') : selectedLabel}
            </span>
          )}
        </Button>

        {selectedLabel !== null && (
          <Button
            variant="ghost"
            size="sm"
            onClick={clearFilter}
            className="flex items-center gap-1 text-secondary"
          >
            <X size={14} />
            {t('showAll')}
          </Button>
        )}
      </div>

      {/* Products Grid */}
      {filteredProducts.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <p className="text-secondary text-lg">
            {selectedLabel === '__daily__'
              ? 'No regular products available'
              : `No products with label "${selectedLabel}"`}
          </p>
          <Button variant="outline" onClick={clearFilter} className="mt-4">
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

      {/* Label Filter Modal */}
      <LabelFilterModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        products={products}
        onSelectLabel={handleSelectLabel}
        selectedLabel={selectedLabel}
      />
    </>
  );
}
