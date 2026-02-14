'use client';

import { useEffect, useState } from 'react';
import { Product, ProductSection } from '@/types/Product';
import { Plus, Pencil, Trash2, GripVertical } from 'lucide-react';
import Image from 'next/image';
import Table from '@/components/ui/table';
import Modal from '@/components/ui/modal';
import Switch from '@/components/ui/switch';
import Input from '@/components/ui/input';
import MultiCurrencyPriceEditor, {
  CurrencyPrice,
} from '@/components/admin/multi-currency-price-editor';
import { useTranslations } from 'next-intl';
import { toast } from 'react-toastify';
import ConfirmModal, { useConfirmModal } from '@/components/ui/confirm-modal';

export default function AdminProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [formData, setFormData] = useState({
    name_ar: '',
    name_en: '',
    description_ar: '',
    description_en: '',
    features_ar: [] as string[],
    features_en: [] as string[],
    sections: [] as ProductSection[],
    verify_ar: '',
    verify_en: '',
    receiving_ar: '',
    receiving_en: '',
    implementationMechanism_ar: '',
    implementationMechanism_en: '',
    implementationPeriod_ar: '',
    implementationPeriod_en: '',
    implementationPlaces_ar: '',
    implementationPlaces_en: '',
    price: 0,
    currency: 'SAR',
    mainCurrency: 'SAR',
    prices: [] as CurrencyPrice[],
    inStock: true,
    image: '',
  });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>('');
  const [uploading, setUploading] = useState(false);
  const [addedPricePercentage, setAddedPricePercentage] = useState<number>(0);
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

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveImage = () => {
    setSelectedFile(null);
    setImagePreview('');
    setFormData({ ...formData, image: '' });
  };

  const uploadImageToCloudinary = async (): Promise<string | null> => {
    if (!selectedFile) return formData.image || null;

    try {
      setUploading(true);
      const formDataToSend = new FormData();
      formDataToSend.append('file', selectedFile);
      formDataToSend.append('folder', 'products');
      if (formData.image) {
        formDataToSend.append('oldImageUrl', formData.image);
      }

      const res = await fetch('/api/upload/image', {
        method: 'POST',
        body: formDataToSend,
      });

      const data = await res.json();
      if (data.success) {
        return data.data.url;
      } else {
        toast.error(data.error || t('messages.uploadFailed'));
        return null;
      }
    } catch (error) {
      console.error('Error uploading image:', error);
      toast.error(t('messages.uploadFailed'));
      return null;
    } finally {
      setUploading(false);
    }
  };

  const handleApplyPriceIncrease = () => {
    if (!addedPricePercentage || addedPricePercentage <= 0) {
      toast.error(t('messages.invalidPercentage'));
      return;
    }

    if (formData.price <= 0) {
      toast.error(t('messages.setPriceFirst'));
      return;
    }

    const multiplier = 1 + addedPricePercentage / 100;

    // Update base price
    const newBasePrice = Math.round(formData.price * multiplier * 100) / 100;

    // Update all currency prices
    const updatedPrices = formData.prices.map((p) => ({
      ...p,
      amount: Math.round(p.amount * multiplier * 100) / 100,
    }));

    setFormData({
      ...formData,
      price: newBasePrice,
      prices: updatedPrices,
    });

    toast.success(
      t('messages.priceIncreased', { percentage: addedPricePercentage }),
    );
    setAddedPricePercentage(0);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Upload image first if there's a new file
    let imageUrl = formData.image;
    if (selectedFile) {
      const uploadedUrl = await uploadImageToCloudinary();
      if (!uploadedUrl) {
        return; // Upload failed, don't proceed
      }
      imageUrl = uploadedUrl;
    }

    // Filter valid sections (must have at least one title or content)
    const validSections = formData.sections.filter(
      (s) =>
        s.title.ar.trim() ||
        s.title.en.trim() ||
        s.content.ar.trim() ||
        s.content.en.trim(),
    );

    // Warn user if sections were filtered out
    const removedSections = formData.sections.length - validSections.length;
    if (removedSections > 0) {
      toast.warning(t('messages.sectionsFiltered', { count: removedSections }));
    }

    const productData = {
      name: {
        ar: formData.name_ar,
        en: formData.name_en,
      },
      description: {
        ar: formData.description_ar,
        en: formData.description_en,
      },
      features: {
        ar: formData.features_ar.filter((f) => f.trim()),
        en: formData.features_en.filter((f) => f.trim()),
      },
      sections: validSections,
      verify: {
        ar: formData.verify_ar,
        en: formData.verify_en,
      },
      receiving: {
        ar: formData.receiving_ar,
        en: formData.receiving_en,
      },
      implementationMechanism: {
        ar: formData.implementationMechanism_ar,
        en: formData.implementationMechanism_en,
      },
      implementationPeriod: {
        ar: formData.implementationPeriod_ar,
        en: formData.implementationPeriod_en,
      },
      implementationPlaces: {
        ar: formData.implementationPlaces_ar,
        en: formData.implementationPlaces_en,
      },
      price: formData.price,
      currency: formData.currency,
      mainCurrency: formData.mainCurrency,
      prices: formData.prices,
      inStock: formData.inStock,
      image: imageUrl,
    };

    try {
      const url = editingProduct
        ? `/api/products/${editingProduct._id}`
        : '/api/products';
      const method = editingProduct ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(productData),
      });

      if (res.ok) {
        toast.success(
          editingProduct
            ? t('messages.updateSuccess')
            : t('messages.createSuccess'),
        );
        fetchProducts();
        closeModal();
      } else {
        const data = await res.json();
        toast.error(data.error || t('messages.saveFailed'));
      }
    } catch (error) {
      console.error('Error saving product:', error);
      toast.error(t('messages.saveFailed'));
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

  const openModal = (product?: Product) => {
    if (product) {
      setEditingProduct(product);

      setFormData({
        name_ar: product.name.ar,
        name_en: product.name.en,
        description_ar: product.description.ar,
        description_en: product.description.en,
        features_ar: product.features?.ar || [],
        features_en: product.features?.en || [],
        sections: product.sections || [],
        verify_ar: product.verify?.ar || '',
        verify_en: product.verify?.en || '',
        receiving_ar: product.receiving?.ar || '',
        receiving_en: product.receiving?.en || '',
        implementationMechanism_ar: product.implementationMechanism?.ar || '',
        implementationMechanism_en: product.implementationMechanism?.en || '',
        implementationPeriod_ar: product.implementationPeriod?.ar || '',
        implementationPeriod_en: product.implementationPeriod?.en || '',
        implementationPlaces_ar: product.implementationPlaces?.ar || '',
        implementationPlaces_en: product.implementationPlaces?.en || '',
        price: product.price,
        currency: product.currency,
        mainCurrency: product.mainCurrency || product.currency || 'SAR',
        prices: product.prices || [],
        inStock: product.inStock,
        image: product.image || '',
      });
      setImagePreview(product.image || '');
    } else {
      setEditingProduct(null);
      setFormData({
        name_ar: '',
        name_en: '',
        description_ar: '',
        description_en: '',
        features_ar: [],
        features_en: [],
        sections: [],
        verify_ar: '',
        verify_en: '',
        receiving_ar: '',
        receiving_en: '',
        implementationMechanism_ar: '',
        implementationMechanism_en: '',
        implementationPeriod_ar: '',
        implementationPeriod_en: '',
        implementationPlaces_ar: '',
        implementationPlaces_en: '',
        price: 0,
        currency: 'SAR',
        mainCurrency: 'SAR',
        prices: [],
        inStock: true,
        image: '',
      });
      setImagePreview('');
    }
    setSelectedFile(null);
    setAddedPricePercentage(0);
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingProduct(null);
    setAddedPricePercentage(0);
  };

  const columns = [
    {
      header: t('table.image'),
      accessor: (product: Product) =>
        product.image ? (
          <div className="relative w-12 h-12 rounded-lg overflow-hidden">
            <Image
              src={product.image}
              alt={product.name.ar}
              fill
              className="object-cover"
              unoptimized
            />
          </div>
        ) : (
          <div className="w-12 h-12 rounded-lg bg-stroke/10" />
        ),
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
              openModal(product);
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
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-2">
            {t('title')}
          </h1>
          <p className="text-secondary">{t('description')}</p>
        </div>
        <button
          onClick={() => openModal()}
          className="flex items-center gap-2 px-4 py-2 bg-success text-white rounded-lg hover:bg-success/90 transition-colors"
        >
          <Plus size={20} />
          {t('addProduct')}
        </button>
      </div>

      {/* Products Table */}
      <Table
        columns={columns}
        data={products}
        loading={loading}
        emptyMessage={t('emptyMessage')}
      />

      {/* Modal */}
      <Modal
        isOpen={showModal}
        onClose={closeModal}
        title={editingProduct ? t('editProduct') : t('addProduct')}
        size="lg"
        footer={
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={closeModal}
              className="flex-1 py-2 bg-background border border-stroke rounded-lg hover:bg-stroke/10 transition-colors font-medium"
            >
              {t('buttons.cancel')}
            </button>
            <button
              type="submit"
              form="product-form"
              disabled={uploading}
              className="flex-1 py-2 bg-success text-white rounded-lg hover:bg-success/90 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {uploading
                ? t('buttons.uploading')
                : editingProduct
                  ? t('buttons.updateProduct')
                  : t('buttons.addProduct')}
            </button>
          </div>
        }
      >
        <form id="product-form" onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label={t('form.nameAr')}
              type="text"
              required
              value={formData.name_ar}
              onChange={(e) =>
                setFormData({ ...formData, name_ar: e.target.value })
              }
            />
            <Input
              label={t('form.nameEn')}
              type="text"
              required
              value={formData.name_en}
              onChange={(e) =>
                setFormData({ ...formData, name_en: e.target.value })
              }
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              {t('form.descriptionAr')}
            </label>
            <textarea
              required
              rows={3}
              value={formData.description_ar}
              onChange={(e) =>
                setFormData({ ...formData, description_ar: e.target.value })
              }
              className="w-full px-4 py-2 rounded-lg border border-stroke bg-background focus:outline-none focus:ring-2 focus:ring-success/20 focus:border-success"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              {t('form.descriptionEn')}
            </label>
            <textarea
              required
              rows={3}
              value={formData.description_en}
              onChange={(e) =>
                setFormData({ ...formData, description_en: e.target.value })
              }
              className="w-full px-4 py-2 rounded-lg border border-stroke bg-background focus:outline-none focus:ring-2 focus:ring-success/20 focus:border-success"
            />
          </div>

          {/* Multi-Currency Price Editor */}
          <MultiCurrencyPriceEditor
            mainCurrency={formData.mainCurrency}
            basePrice={formData.price}
            prices={formData.prices}
            onChange={(prices) => setFormData({ ...formData, prices })}
            onMainCurrencyChange={(currency) => {
              setFormData({
                ...formData,
                mainCurrency: currency,
                currency: currency, // Keep legacy field in sync
              });
            }}
            onBasePriceChange={(price) => setFormData({ ...formData, price })}
          />

          {/* Added Price Percentage */}
          <div className="border border-stroke rounded-lg p-4 bg-background space-y-3">
            <label className="block text-sm font-medium">
              {t('form.addedPrice')}
            </label>
            <p className="text-xs text-secondary">{t('form.addedPriceHelp')}</p>
            <div className="flex items-end gap-3">
              <div className="flex-1">
                <Input
                  type="number"
                  value={addedPricePercentage || ''}
                  onChange={(e) =>
                    setAddedPricePercentage(parseFloat(e.target.value) || 0)
                  }
                  placeholder={t('form.addedPricePlaceholder')}
                  min="0"
                  step="0.1"
                />
              </div>
              <button
                type="button"
                onClick={handleApplyPriceIncrease}
                disabled={!addedPricePercentage || addedPricePercentage <= 0}
                className="px-6 py-3 bg-success text-white rounded-lg hover:bg-success/90 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {t('form.applyButton')}
              </button>
            </div>
          </div>

          {/* Features */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="block text-sm font-medium">
                {t('form.featuresAr')}
              </label>
              <button
                type="button"
                onClick={() =>
                  setFormData({
                    ...formData,
                    features_ar: [...formData.features_ar, ''],
                  })
                }
                className="text-xs text-success hover:text-success/80 flex items-center gap-1"
              >
                <Plus size={14} />
                {t('form.addFeature')}
              </button>
            </div>
            {formData.features_ar.map((feature, index) => (
              <div key={index} className="flex items-center gap-2">
                <Input
                  value={feature}
                  onChange={(e) => {
                    const updated = [...formData.features_ar];
                    updated[index] = e.target.value;
                    setFormData({ ...formData, features_ar: updated });
                  }}
                  placeholder={`${t('form.featurePlaceholder')} ${index + 1}`}
                />
                <button
                  type="button"
                  onClick={() => {
                    const updated = formData.features_ar.filter(
                      (_, i) => i !== index,
                    );
                    setFormData({ ...formData, features_ar: updated });
                  }}
                  className="p-2 text-error hover:bg-error/10 rounded-lg transition-colors shrink-0"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="block text-sm font-medium">
                {t('form.featuresEn')}
              </label>
              <button
                type="button"
                onClick={() =>
                  setFormData({
                    ...formData,
                    features_en: [...formData.features_en, ''],
                  })
                }
                className="text-xs text-success hover:text-success/80 flex items-center gap-1"
              >
                <Plus size={14} />
                {t('form.addFeature')}
              </button>
            </div>
            {formData.features_en.map((feature, index) => (
              <div key={index} className="flex items-center gap-2">
                <Input
                  value={feature}
                  onChange={(e) => {
                    const updated = [...formData.features_en];
                    updated[index] = e.target.value;
                    setFormData({ ...formData, features_en: updated });
                  }}
                  placeholder={`${t('form.featurePlaceholder')} ${index + 1}`}
                  dir="ltr"
                />
                <button
                  type="button"
                  onClick={() => {
                    const updated = formData.features_en.filter(
                      (_, i) => i !== index,
                    );
                    setFormData({ ...formData, features_en: updated });
                  }}
                  className="p-2 text-error hover:bg-error/10 rounded-lg transition-colors shrink-0"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>

          {/* Custom Sections */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <label className="block text-sm font-medium">
                {t('form.customSections')}
              </label>
              <button
                type="button"
                onClick={() =>
                  setFormData({
                    ...formData,
                    sections: [
                      ...formData.sections,
                      {
                        title: { ar: '', en: '' },
                        content: { ar: '', en: '' },
                        type: 'text',
                      },
                    ],
                  })
                }
                className="text-xs text-success hover:text-success/80 flex items-center gap-1"
              >
                <Plus size={14} />
                {t('form.addSection')}
              </button>
            </div>

            {formData.sections.map((section, sIndex) => (
              <div
                key={sIndex}
                className="border border-stroke rounded-lg p-4 space-y-3 relative"
              >
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2 text-xs text-secondary">
                    <GripVertical size={14} />
                    <span>
                      {t('form.sectionNumber', { number: sIndex + 1 })}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <select
                      value={section.type}
                      onChange={(e) => {
                        const updated = [...formData.sections];
                        updated[sIndex] = {
                          ...updated[sIndex],
                          type: e.target.value as 'text' | 'list',
                        };
                        setFormData({ ...formData, sections: updated });
                      }}
                      className="text-xs px-2 py-1 rounded border border-stroke bg-background"
                    >
                      <option value="text">{t('form.sectionTypeText')}</option>
                      <option value="list">{t('form.sectionTypeList')}</option>
                    </select>
                    <button
                      type="button"
                      onClick={() => {
                        const updated = formData.sections.filter(
                          (_, i) => i !== sIndex,
                        );
                        setFormData({ ...formData, sections: updated });
                      }}
                      className="p-1 text-error hover:bg-error/10 rounded transition-colors"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <Input
                    label={t('form.sectionTitleAr')}
                    value={section.title.ar}
                    onChange={(e) => {
                      const updated = [...formData.sections];
                      updated[sIndex] = {
                        ...updated[sIndex],
                        title: { ...updated[sIndex].title, ar: e.target.value },
                      };
                      setFormData({ ...formData, sections: updated });
                    }}
                    placeholder={t('form.sectionTitleArPlaceholder')}
                  />
                  <Input
                    label={t('form.sectionTitleEn')}
                    value={section.title.en}
                    onChange={(e) => {
                      const updated = [...formData.sections];
                      updated[sIndex] = {
                        ...updated[sIndex],
                        title: { ...updated[sIndex].title, en: e.target.value },
                      };
                      setFormData({ ...formData, sections: updated });
                    }}
                    placeholder={t('form.sectionTitleEnPlaceholder')}
                    dir="ltr"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium mb-1">
                    {t('form.sectionContentAr')}
                  </label>
                  <textarea
                    rows={3}
                    value={section.content.ar}
                    onChange={(e) => {
                      const updated = [...formData.sections];
                      updated[sIndex] = {
                        ...updated[sIndex],
                        content: {
                          ...updated[sIndex].content,
                          ar: e.target.value,
                        },
                      };
                      setFormData({ ...formData, sections: updated });
                    }}
                    placeholder={
                      section.type === 'list'
                        ? t('form.sectionContentListPlaceholder')
                        : t('form.sectionContentTextPlaceholder')
                    }
                    className="w-full px-3 py-2 rounded-lg border border-stroke bg-background focus:outline-none focus:ring-2 focus:ring-success/20 focus:border-success text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium mb-1">
                    {t('form.sectionContentEn')}
                  </label>
                  <textarea
                    rows={3}
                    value={section.content.en}
                    onChange={(e) => {
                      const updated = [...formData.sections];
                      updated[sIndex] = {
                        ...updated[sIndex],
                        content: {
                          ...updated[sIndex].content,
                          en: e.target.value,
                        },
                      };
                      setFormData({ ...formData, sections: updated });
                    }}
                    placeholder={
                      section.type === 'list'
                        ? t('form.sectionContentListPlaceholder')
                        : t('form.sectionContentTextPlaceholder')
                    }
                    dir="ltr"
                    className="w-full px-3 py-2 rounded-lg border border-stroke bg-background focus:outline-none focus:ring-2 focus:ring-success/20 focus:border-success text-sm"
                  />
                </div>
              </div>
            ))}
          </div>

          {/* Optional Product Details */}
          <div className="space-y-4 border-t border-stroke pt-4">
            <label className="block text-sm font-medium text-secondary">
              {t('form.optionalDetails')}
            </label>

            {/* Verify / التوثيق */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label={t('form.verifyAr')}
                value={formData.verify_ar}
                onChange={(e) =>
                  setFormData({ ...formData, verify_ar: e.target.value })
                }
                placeholder={t('form.verifyArPlaceholder')}
              />
              <Input
                label={t('form.verifyEn')}
                value={formData.verify_en}
                onChange={(e) =>
                  setFormData({ ...formData, verify_en: e.target.value })
                }
                placeholder={t('form.verifyEnPlaceholder')}
                dir="ltr"
              />
            </div>

            {/* Receiving / الاستلام */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label={t('form.receivingAr')}
                value={formData.receiving_ar}
                onChange={(e) =>
                  setFormData({ ...formData, receiving_ar: e.target.value })
                }
                placeholder={t('form.receivingArPlaceholder')}
              />
              <Input
                label={t('form.receivingEn')}
                value={formData.receiving_en}
                onChange={(e) =>
                  setFormData({ ...formData, receiving_en: e.target.value })
                }
                placeholder={t('form.receivingEnPlaceholder')}
                dir="ltr"
              />
            </div>

            {/* Implementation Mechanism / آلية التنفيذ */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label={t('form.implementationMechanismAr')}
                value={formData.implementationMechanism_ar}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    implementationMechanism_ar: e.target.value,
                  })
                }
                placeholder={t('form.implementationMechanismArPlaceholder')}
              />
              <Input
                label={t('form.implementationMechanismEn')}
                value={formData.implementationMechanism_en}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    implementationMechanism_en: e.target.value,
                  })
                }
                placeholder={t('form.implementationMechanismEnPlaceholder')}
                dir="ltr"
              />
            </div>

            {/* Implementation Period / مدة التنفيذ */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label={t('form.implementationPeriodAr')}
                value={formData.implementationPeriod_ar}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    implementationPeriod_ar: e.target.value,
                  })
                }
                placeholder={t('form.implementationPeriodArPlaceholder')}
              />
              <Input
                label={t('form.implementationPeriodEn')}
                value={formData.implementationPeriod_en}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    implementationPeriod_en: e.target.value,
                  })
                }
                placeholder={t('form.implementationPeriodEnPlaceholder')}
                dir="ltr"
              />
            </div>

            {/* Implementation Places / أماكن التنفيذ */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label={t('form.implementationPlacesAr')}
                value={formData.implementationPlaces_ar}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    implementationPlaces_ar: e.target.value,
                  })
                }
                placeholder={t('form.implementationPlacesArPlaceholder')}
              />
              <Input
                label={t('form.implementationPlacesEn')}
                value={formData.implementationPlaces_en}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    implementationPlaces_en: e.target.value,
                  })
                }
                placeholder={t('form.implementationPlacesEnPlaceholder')}
                dir="ltr"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              {t('form.productImage')}
            </label>

            {/* Image Preview */}
            {imagePreview && (
              <div className="mb-3 relative w-full h-48 rounded-lg overflow-hidden border border-stroke">
                <Image
                  src={imagePreview}
                  alt="Preview"
                  fill
                  className="object-cover"
                  unoptimized
                />
                <button
                  type="button"
                  onClick={handleRemoveImage}
                  className="absolute top-2 right-2 p-2 bg-error text-white rounded-lg hover:bg-error/90 transition-colors"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            )}

            {/* File Input */}
            <div className="flex items-center gap-3">
              <label className="flex-1 cursor-pointer">
                <div className="flex items-center justify-center gap-2 px-4 py-2 border-2 border-dashed border-stroke rounded-lg hover:border-success transition-colors">
                  <Plus size={20} />
                  <span>
                    {selectedFile ? selectedFile.name : t('form.chooseImage')}
                  </span>
                </div>
                <input
                  type="file"
                  accept="image/jpeg,image/jpg,image/png,image/webp,image/gif"
                  onChange={handleFileSelect}
                  className="hidden"
                />
              </label>
            </div>
            <p className="text-xs text-secondary mt-2">{t('form.imageHelp')}</p>
          </div>

          <Switch
            id="inStock"
            checked={formData.inStock}
            onChange={(checked) =>
              setFormData({ ...formData, inStock: checked })
            }
            label={t('form.inStockLabel')}
          />
        </form>
      </Modal>

      <ConfirmModal {...modalProps} />
    </div>
  );
}
