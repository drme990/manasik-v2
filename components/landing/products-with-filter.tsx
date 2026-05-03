'use client';

import { useState, useMemo } from 'react';
import { useLocale } from 'next-intl';
import { Product } from '@/types/Product';
import ProductCard from '@/components/products/product-card';
import LabelFilterModal from '@/components/products/label-filter-modal';
import Button from '@/components/ui/button';
import { Filter, X } from 'lucide-react';
import { useTranslations } from 'next-intl';

interface LandingProductsWithFilterProps {
  products: Product[];
  locale: string;
}

export default function LandingProductsWithFilter({
  products,
  locale,
}: LandingProductsWithFilterProps) {
  const t = useTranslations('labels');
  const tc = useTranslations('common');
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


  // Filter products based on selected label
  const filteredProducts = useMemo(() => {
    if (selectedLabel === null) {
      // No filter selected - show ALL products
      return products;
    }
    if (selectedLabel === '__daily__') {
      // Show only products without labels (Daily)
      return products.filter(
        (product) => !product.label?.[currentLocale as 'ar' | 'en'],
      );
    }
    // Show products with the selected label
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
      <div className="relative">
        <div className="overflow-x-auto pb-4 -mx-4 px-4 scrollbar-hide">
          <div className="flex gap-4 w-max">
            {products.map((product, index) => (
              <ProductCard
                key={product.slug}
                product={product}
                locale={locale}
                variant="carousel"
                revealDelayMs={index * 100}
              />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Filter Bar */}
      <div className="mb-4 flex items-center gap-3">
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

      {/* Products Carousel */}
      {filteredProducts.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <p className="text-secondary text-base">
            {selectedLabel === '__daily__'
              ? 'No regular products available'
              : `No products with label "${selectedLabel}"`}
          </p>
          <Button variant="outline" onClick={clearFilter} className="mt-4">
            {t('showAll')}
          </Button>
        </div>
      ) : (
        <div className="relative">
          <div className="overflow-x-auto pb-4 -mx-4 px-4 scrollbar-hide">
            <div className="flex gap-4 w-max">
              {filteredProducts.map((product, index) => (
                <ProductCard
                  key={product.slug}
                  product={product}
                  locale={locale}
                  variant="carousel"
                  revealDelayMs={index * 100}
                />
              ))}
            </div>
          </div>
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
