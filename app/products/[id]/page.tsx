import { notFound } from 'next/navigation';
import Container from '@/components/layout/container';
import Footer from '@/components/layout/footer';
import Header from '@/components/layout/header';
import BackButton from '@/components/shared/back-button';
import GoToTop from '@/components/shared/go-to-top';
import WhatsAppButton from '@/components/shared/whats-app-button';
import { Product } from '@/types/Product';
import { Metadata } from 'next';
import ProductDetailsClient from './product-details-client';

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

  return (
    <>
      <Header />
      <main className="grid-bg min-h-screen">
        <Container>
          <div className="flex items-center gap-3 pt-8 mb-8">
            <BackButton />
          </div>

          <ProductDetailsClient product={product} />
        </Container>
      </main>
      <Footer />
      <GoToTop />
      <WhatsAppButton />
    </>
  );
}
