import { notFound } from 'next/navigation';
import Image from 'next/image';
import Container from '@/components/layout/container';
import Footer from '@/components/layout/footer';
import Header from '@/components/layout/header';
import BackButton from '@/components/shared/back-button';
import GoToTop from '@/components/shared/go-to-top';
import WhatsAppButton from '@/components/shared/whats-app-button';
import ProductPrice from '@/components/shared/product-price';
import Button from '@/components/ui/button';
import { Product } from '@/types/Product';
import { Check } from 'lucide-react';
import { Metadata } from 'next';

async function getProduct(id: string): Promise<Product | null> {
  try {
    const baseUrl = process.env.BASE_URL;
    const res = await fetch(`${baseUrl}/api/products/${id}`, {
      next: { revalidate: 60 },
    });

    if (!res.ok) {
      return null;
    }

    const data = await res.json();
    return data.success ? data.data : null;
  } catch (error) {
    console.error('Error fetching product:', error);
    return null;
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const product = await getProduct(id);

  if (!product) {
    return {
      title: 'المنتج غير موجود',
    };
  }

  const productName = product.name.ar;
  const productDescription = product.description?.ar || productName;
  const productPrice = `${product.price} ${product.currency}`;

  return {
    title: productName,
    description: `${productDescription} - السعر: ${productPrice}`,
    openGraph: {
      title: productName,
      description: productDescription,
      images: product.image ? [product.image] : [],
    },
    alternates: {
      canonical: `https://www.manasik.net/products/${id}`,
    },
  };
}

export default async function ProductDetailsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const product = await getProduct(id);

  if (!product) {
    notFound();
  }

  const features = product.features?.ar ?? [];
  const otherEntries = product.other
    ? Object.entries(product.other as Record<string, unknown>)
    : [];

  return (
    <>
      <Header />
      <main className="grid-bg min-h-screen">
        <Container>
          <div className="flex items-center gap-3 pt-8 mb-8">
            <BackButton />
          </div>

          <div className="flex flex-col gap-10 pb-20">
            {/* Product Image */}
            {product.image ? (
              <div className="relative w-full aspect-4/3 rounded-site overflow-hidden border border-stroke">
                <Image
                  src={product.image}
                  alt={product.name.ar}
                  fill
                  className="object-cover"
                  sizes="(max-width: 768px) 100vw, 50vw"
                  priority
                  unoptimized
                />
              </div>
            ) : (
              <div className="w-full aspect-4/3 rounded-site bg-card-bg border border-stroke flex items-center justify-center">
                <span className="text-secondary">لا توجد صورة</span>
              </div>
            )}

            {/* Product Info */}
            <div className="flex flex-col gap-8">
              {/* Name & Price */}
              <div className="flex flex-col gap-3">
                <h1 className="text-2xl md:text-3xl font-bold leading-tight">
                  {product.name.ar}
                </h1>
                <ProductPrice
                  prices={product.prices}
                  defaultPrice={product.price}
                  defaultCurrency={product.currency}
                  className="text-success font-bold text-2xl"
                />
              </div>

              {/* Stock Status */}
              <div className="flex items-center gap-2">
                <span
                  className={`inline-block w-2.5 h-2.5 rounded-full ${
                    product.inStock ? 'bg-success' : 'bg-error'
                  }`}
                />
                <span className="text-sm text-secondary">
                  {product.inStock ? 'متوفر' : 'غير متوفر'}
                </span>
              </div>

              {/* Description */}
              <div className="flex flex-col gap-3">
                <h2 className="text-lg font-semibold">الوصف</h2>
                <p className="text-secondary leading-relaxed text-sm">
                  {product.description.ar}
                </p>
              </div>

              {/* Features */}
              {features.length > 0 && (
                <div className="flex flex-col gap-4">
                  <h2 className="text-lg font-semibold">المميزات</h2>
                  <ul className="flex flex-col gap-2">
                    {features.map((feature, index) => (
                      <li
                        key={index}
                        className="flex items-start gap-2 text-sm text-secondary"
                      >
                        <Check
                          size={16}
                          className="text-success mt-0.5 shrink-0"
                        />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Other Details */}
              {otherEntries.length > 0 && (
                <div className="flex flex-col gap-3">
                  <h2 className="text-lg font-semibold">تفاصيل إضافية</h2>
                  <div className="grid grid-cols-1 gap-2">
                    {otherEntries.map(([key, value]) => (
                      <div
                        key={key}
                        className="flex items-center justify-between py-2 px-4 rounded-site bg-card-bg border border-stroke"
                      >
                        <span className="text-sm font-medium capitalize">
                          {key}
                        </span>
                        <span className="text-sm text-secondary">
                          {String(value)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* CTA */}
              <Button
                variant="primary"
                size="lg"
                className="w-full mt-4"
                href={`/checkout?product=${product._id}`}
              >
                اطلب الآن
              </Button>
            </div>
          </div>
        </Container>
      </main>
      <Footer />
      <GoToTop />
      <WhatsAppButton />
    </>
  );
}
