import { notFound } from 'next/navigation';
import { headers } from 'next/headers';
import Container from '@/components/layout/container';
import Footer from '@/components/layout/footer';
import Header from '@/components/layout/header';
import BackButton from '@/components/shared/back-button';
import GoToTop from '@/components/shared/go-to-top';
import WhatsAppButton from '@/components/shared/whats-app-button';
import { Product } from '@/types/Product';
import { Metadata } from 'next';
import { trackViewContent } from '@/lib/fb-capi';
import ProductDetailsClient from './product-details-client';

async function getProduct(id: string): Promise<Product | null> {
  try {
    const backendUrl = process.env.BACKEND_URL;
    const res = await fetch(`${backendUrl}/api/products/${id}`, {
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
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const product = await getProduct(slug);

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
  const canonicalPath = product.slug;
  const canonicalUrl = `https://www.manasik.net/products/${canonicalPath}`;

  return {
    title: `${productName} | مؤسسة مناسك`,
    description: `${productDescription} - السعر: ${productPrice}`,
    keywords: [
      product.name.ar,
      product.name.en,
      'مناسك',
      'عقيقة',
      'أضاحي',
      'حج البدل',
      'عمرة البدل',
    ],
    openGraph: {
      title: `${productName} | مؤسسة مناسك`,
      description: productDescription,
      url: canonicalUrl,
      siteName: 'Manasik',
      type: 'website',
      images: product.images?.[0] ? [product.images[0]] : [],
    },
    twitter: {
      card: 'summary_large_image',
      title: `${productName} | مؤسسة مناسك`,
      description: productDescription,
      images: product.images?.[0] ? [product.images[0]] : [],
    },
    alternates: {
      canonical: canonicalUrl,
    },
  };
}

export default async function ProductDetailsPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const product = await getProduct(slug);

  if (!product) {
    notFound();
  }

  const hdrs = await headers();
  const ip =
    hdrs.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    hdrs.get('x-real-ip') ||
    '';
  const ua = hdrs.get('user-agent') || '';

  const lowestPrice = product.sizes?.length
    ? Math.min(...product.sizes.map((s) => s.price))
    : 0;
  const canonicalPath = product.slug;

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
    url: `https://www.manasik.net/products/${canonicalPath}`,
    sku: product.slug,
    category: 'Religious Services',
  };

  trackViewContent({
    productId: product._id,
    productName: product.name.en || product.name.ar,
    value: lowestPrice,
    currency: product.baseCurrency || 'SAR',
    sourceUrl: `https://www.manasik.net/products/${canonicalPath}`,
    userData: { client_ip_address: ip, client_user_agent: ua },
  }).catch(() => {});

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
