'use client';

import { useEffect, useState } from 'react';
import { Product } from '@/types/Product';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import Image from 'next/image';
import Table from '@/components/ui/table';
import Modal from '@/components/ui/modal';
import Dropdown from '@/components/ui/dropdown';
import Switch from '@/components/ui/switch';

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
    price: '',
    currency: 'SAR',
    inStock: true,
    image: '',
  });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>('');
  const [uploading, setUploading] = useState(false);

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
        alert(data.error || 'Failed to upload image');
        return null;
      }
    } catch (error) {
      console.error('Error uploading image:', error);
      alert('Failed to upload image');
      return null;
    } finally {
      setUploading(false);
    }
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
        ar: [],
        en: [],
      },
      price: parseFloat(formData.price),
      currency: formData.currency,
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
        fetchProducts();
        closeModal();
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to save product');
      }
    } catch (error) {
      console.error('Error saving product:', error);
      alert('Failed to save product');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this product?')) return;

    try {
      const res = await fetch(`/api/products/${id}`, { method: 'DELETE' });
      if (res.ok) {
        fetchProducts();
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to delete product');
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
        price: product.price.toString(),
        currency: product.currency,
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
        price: '',
        currency: 'SAR',
        inStock: true,
        image: '',
      });
      setImagePreview('');
    }
    setSelectedFile(null);
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingProduct(null);
  };

  const columns = [
    {
      header: 'Image',
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
      header: 'Name (AR)',
      accessor: (product: Product) => (
        <span className="font-medium">{product.name.ar}</span>
      ),
    },
    {
      header: 'Price',
      accessor: (product: Product) => (
        <span>
          {product.price} {product.currency}
        </span>
      ),
    },
    {
      header: 'In Stock',
      accessor: (product: Product) => (
        <span
          className={`px-2 py-1 rounded-full text-xs font-medium ${
            product.inStock
              ? 'bg-success/10 text-success'
              : 'bg-error/10 text-error'
          }`}
        >
          {product.inStock ? 'In Stock' : 'Out of Stock'}
        </span>
      ),
    },
    {
      header: 'Actions',
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

  const currencyOptions = [
    { label: 'SAR', value: 'SAR' },
    { label: 'USD', value: 'USD' },
    { label: 'EUR', value: 'EUR' },
    { label: 'AED', value: 'AED' },
    { label: 'EGP', value: 'EGP' },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-2">Products</h1>
          <p className="text-secondary">Manage your products</p>
        </div>
        <button
          onClick={() => openModal()}
          className="flex items-center gap-2 px-4 py-2 bg-success text-white rounded-lg hover:bg-success/90 transition-colors"
        >
          <Plus size={20} />
          Add Product
        </button>
      </div>

      {/* Products Table */}
      <Table
        columns={columns}
        data={products}
        loading={loading}
        emptyMessage="No products found. Create your first product!"
      />

      {/* Modal */}
      <Modal
        isOpen={showModal}
        onClose={closeModal}
        title={editingProduct ? 'Edit Product' : 'Add Product'}
        size="lg"
        footer={
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={closeModal}
              className="flex-1 py-2 bg-background border border-stroke rounded-lg hover:bg-stroke/10 transition-colors font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              form="product-form"
              disabled={uploading}
              className="flex-1 py-2 bg-success text-white rounded-lg hover:bg-success/90 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {uploading
                ? 'Uploading...'
                : editingProduct
                  ? 'Update Product'
                  : 'Add Product'}
            </button>
          </div>
        }
      >
        <form id="product-form" onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">
                Name (Arabic) *
              </label>
              <input
                type="text"
                required
                value={formData.name_ar}
                onChange={(e) =>
                  setFormData({ ...formData, name_ar: e.target.value })
                }
                className="w-full px-4 py-2 rounded-lg border border-stroke bg-background focus:outline-none focus:border-success"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">
                Name (English) *
              </label>
              <input
                type="text"
                required
                value={formData.name_en}
                onChange={(e) =>
                  setFormData({ ...formData, name_en: e.target.value })
                }
                className="w-full px-4 py-2 rounded-lg border border-stroke bg-background focus:outline-none focus:border-success"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              Description (Arabic) *
            </label>
            <textarea
              required
              rows={3}
              value={formData.description_ar}
              onChange={(e) =>
                setFormData({ ...formData, description_ar: e.target.value })
              }
              className="w-full px-4 py-2 rounded-lg border border-stroke bg-background focus:outline-none focus:border-success"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              Description (English) *
            </label>
            <textarea
              required
              rows={3}
              value={formData.description_en}
              onChange={(e) =>
                setFormData({ ...formData, description_en: e.target.value })
              }
              className="w-full px-4 py-2 rounded-lg border border-stroke bg-background focus:outline-none focus:border-success"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Price *</label>
              <input
                type="number"
                required
                step="0.01"
                value={formData.price}
                onChange={(e) =>
                  setFormData({ ...formData, price: e.target.value })
                }
                className="w-full px-4 py-2 rounded-lg border border-stroke bg-background focus:outline-none focus:border-success"
              />
            </div>
            <Dropdown
              label="Currency *"
              value={formData.currency}
              options={currencyOptions}
              onChange={(value) =>
                setFormData({ ...formData, currency: value })
              }
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              Product Image
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
                    {selectedFile ? selectedFile.name : 'Choose Image'}
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
            <p className="text-xs text-secondary mt-2">
              Accepted: JPEG, PNG, WebP, GIF (Max 5MB)
            </p>
          </div>

          <Switch
            id="inStock"
            checked={formData.inStock}
            onChange={(checked) =>
              setFormData({ ...formData, inStock: checked })
            }
            label="In Stock"
          />
        </form>
      </Modal>
    </div>
  );
}
