import { Metadata } from 'next';
import { getLocale, getTranslations } from 'next-intl/server';
import Container from '@/components/layout/container';
import Footer from '@/components/layout/footer';
import Header from '@/components/layout/header';
import GoToTop from '@/components/shared/go-to-top';
import WhatsAppButton from '@/components/shared/whats-app-button';
import BlogCard from '@/components/seo/blog-card';
import Breadcrumb from '@/components/seo/breadcrumb';
import JsonLd from '@/components/seo/json-ld';
import { buildBreadcrumbSchema, getSeoMetadata } from '@/lib/seo';
import { getSeoBlogPosts } from '@/lib/seo-content';

const BASE_URL = (
  process.env.BASE_URL || 'https://www.manasik.net'
).replace(/\/$/, '');

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'seoPages.blog' });
  const brand = locale === 'ar' ? 'مؤسسة مناسك' : 'Manasik Foundation';

  return getSeoMetadata({
    locale,
    path: '/blog',
    title: `${t('pageTitle')} | ${brand}`,
    description: t('pageDescription'),
  });
}

export default async function BlogPage() {
  const locale = await getLocale();
  const t = await getTranslations('seoPages.blog');
  const tc = await getTranslations('seoPages.common');

  const posts = (await getSeoBlogPosts()).filter((p) => p.isActive);
  const categories = [...new Set(posts.map((p) => p.category))];

  const categoryLabel = (cat: string) =>
    t.has(`categories.${cat}`)
      ? t(`categories.${cat}`)
      : cat.replace(/-/g, ' ');

  return (
    <>
      <JsonLd
        data={buildBreadcrumbSchema(
          locale,
          [
            { name: tc('home'), path: '/' },
            { name: t('pageTitle'), path: '/blog' },
          ],
          BASE_URL,
        )}
      />
      <Header />
      <main className="grid-bg min-h-screen">
        <Container className="py-8">
          <Breadcrumb
            items={[
              { label: tc('home'), href: '/' },
              { label: t('pageTitle') },
            ]}
          />
          <div className="text-center mb-10">
            <h1 className="text-4xl font-bold text-foreground mb-3">
              {t('pageTitle')}
            </h1>
            <p className="text-secondary max-w-2xl mx-auto">
              {t('pageDescription')}
            </p>
          </div>

          {posts.length === 0 ? (
            <p className="text-center text-secondary">{tc('empty')}</p>
          ) : (
            categories.map((category) => (
              <section key={category} className="mb-10">
                <h2 className="text-2xl font-bold text-foreground mb-5">
                  {categoryLabel(category)}
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                  {posts
                    .filter((p) => p.category === category)
                    .map((post) => (
                      <BlogCard
                        key={post._id}
                        post={post}
                        locale={locale}
                        readMoreLabel={tc('readMore')}
                        categoryLabel={categoryLabel(post.category)}
                      />
                    ))}
                </div>
              </section>
            ))
          )}
        </Container>
      </main>
      <Footer />
      <WhatsAppButton />
      <GoToTop />
    </>
  );
}
