'use client';

import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { toast } from 'react-toastify';
import { ArrowRight } from 'lucide-react';
import ProductForm from '@/components/admin/product-form';

export default function ProductCreatePage() {
  const router = useRouter();
  const t = useTranslations('admin.products');

  const handleSubmit = async (data: Record<string, unknown>) => {
    try {
      const res = await fetch('/api/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (res.ok) {
        toast.success(t('messages.createSuccess'));
        router.push('/admin/products');
      } else {
        const resData = await res.json();
        toast.error(resData.error || t('messages.saveFailed'));
      }
    } catch (error) {
      console.error('Error creating product:', error);
      toast.error(t('messages.saveFailed'));
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <button
          onClick={() => router.push('/admin/products')}
          className="p-2 hover:bg-background rounded-lg transition-colors"
        >
          <ArrowRight size={20} className="rtl:rotate-0 ltr:rotate-180" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            {t('addProduct')}
          </h1>
        </div>
      </div>

      <div className="bg-card-bg rounded-xl border border-stroke p-6">
        <ProductForm
          onSubmit={handleSubmit}
          onCancel={() => router.push('/admin/products')}
        />
      </div>
    </div>
  );
}
