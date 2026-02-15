'use client';

import { useEffect, useState } from 'react';
import { Product } from '@/types/Product';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import Table from '@/components/ui/table';
import { useTranslations } from 'next-intl';
import { toast } from 'react-toastify';
import ConfirmModal, { useConfirmModal } from '@/components/ui/confirm-modal';

export default function AdminProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const t = useTranslations('admin.products');
  const { confirm, modalProps } = useConfirmModal();

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      const res = await fetch('/api/products?limit=100');
      const data = await res.json();
      if (data.success) {
        setProducts(data.data.products);
      }
    } catch (error) {
      console.error('Error fetching products:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    const confirmed = await confirm({
      title: t('deleteConfirmTitle', { defaultValue: 'Delete Product' }),
      message: t('deleteConfirm'),
      type: 'danger',
      confirmText: t('deleteConfirmButton', { defaultValue: 'Delete' }),
      cancelText: t('deleteCancelButton', { defaultValue: 'Cancel' }),
    });

    if (!confirmed) return;

    try {
      const res = await fetch(`/api/products/${id}`, { method: 'DELETE' });
      if (res.ok) {
        toast.success(t('messages.deleteSuccess'));
        fetchProducts();
      } else {
        const data = await res.json();
        toast.error(data.error || t('messages.deleteFailed'));
      }
    } catch (error) {
      console.error('Error deleting product:', error);
    }
  };

  const columns = [
    {
      header: t('table.image'),
      accessor: (product: Product) => {
        const img = product.images?.[0] || product.image;
        return img ? (
          <div className="relative w-12 h-12 rounded-lg overflow-hidden">
            <Image
              src={img}
              alt={product.name.ar}
              fill
              className="object-cover"
              unoptimized
            />
          </div>
        ) : (
          <div className="w-12 h-12 rounded-lg bg-stroke/10" />
        );
      },
    },
    {
      header: t('table.nameAr'),
      accessor: (product: Product) => (
        <span className="font-medium">{product.name.ar}</span>
      ),
    },
    {
      header: t('table.price'),
      accessor: (product: Product) => (
        <span>
          {product.price} {product.currency}
        </span>
      ),
    },
    {
      header: t('table.inStock'),
      accessor: (product: Product) => (
        <span
          className={`px-2 py-1 rounded-full text-xs font-medium ${
            product.inStock
              ? 'bg-success/10 text-success'
              : 'bg-error/10 text-error'
          }`}
        >
          {product.inStock ? t('status.inStock') : t('status.outOfStock')}
        </span>
      ),
    },
    {
      header: t('table.actions'),
      accessor: (product: Product) => (
        <div className="flex items-center gap-2">
          <button
            onClick={(e) => {
              e.stopPropagation();
              router.push(`/admin/products/edit?id=${product._id}`);
            }}
            className="p-2 hover:bg-background rounded-lg transition-colors"
          >
            <Pencil size={16} />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleDelete(product._id);
            }}
            className="p-2 hover:bg-error/10 text-error rounded-lg transition-colors"
          >
            <Trash2 size={16} />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-2">
            {t('title')}
          </h1>
          <p className="text-secondary">{t('description')}</p>
        </div>
        <button
          onClick={() => router.push('/admin/products/new')}
          className="flex items-center gap-2 px-4 py-2 bg-success text-white rounded-lg hover:bg-success/90 transition-colors"
        >
          <Plus size={20} />
          {t('addProduct')}
        </button>
      </div>

      <Table
        columns={columns}
        data={products}
        loading={loading}
        emptyMessage={t('emptyMessage')}
      />

      <ConfirmModal {...modalProps} />
    </div>
  );
}
