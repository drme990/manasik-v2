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
  const productDescription =
    product.content?.ar
      ?.replace(/<[^>]*>/g, '')
      .slice(0, 160)
      .trim() || productName;
  const productPrice = `${product.sizes?.[0]?.price ?? 0} ${product.baseCurrency}`;

  return {
    title: productName,
    description: `${productDescription} - السعر: ${productPrice}`,
    openGraph: {
      title: productName,
      description: productDescription,
      images: product.images?.[0] ? [product.images[0]] : [],
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

  const lowestPrice = product.sizes?.length
    ? Math.min(...product.sizes.map((s) => s.price))
    : 0;

  const productJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.name.ar,
    description:
      product.content?.ar
        ?.replace(/<[^>]*>/g, '')
        .slice(0, 200)
        .trim() || product.name.ar,
    image: product.images?.[0] || 'https://www.manasik.net/logo-light.png',
    brand: {
      '@type': 'Organization',
      name: 'مؤسسة مناسك',
    },
    offers: {
      '@type': 'AggregateOffer',
      priceCurrency: product.baseCurrency || 'SAR',
      lowPrice: lowestPrice,
      offerCount: product.sizes?.length ?? 1,
      availability: product.isActive
        ? 'https://schema.org/InStock'
        : 'https://schema.org/OutOfStock',
      seller: {
        '@type': 'Organization',
        name: 'مؤسسة مناسك',
        url: 'https://www.manasik.net',
      },
    },
    url: `https://www.manasik.net/products/${id}`,
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(productJsonLd) }}
      />
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
