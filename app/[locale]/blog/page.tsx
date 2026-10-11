import { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import BlogCard from '@/components/seo/blog-card';
import Breadcrumb from '@/components/seo/breadcrumb';
import EmptyState from '@/components/seo/empty-state';
import JsonLd from '@/components/seo/json-ld';
import PageHeader from '@/components/seo/page-header';
import PageShell from '@/components/seo/page-shell';
import { buildBreadcrumbSchema, pageMetadata } from '@/lib/seo';
import { getSeoBlogPosts, pick } from '@/lib/seo-content';
import { SITE_URL } from '@/lib/site';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  return pageMetadata(locale, 'blog', '/blog');
}

export default async function BlogPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const [t, tc, allPosts] = await Promise.all([
    getTranslations({ locale, namespace: 'seoPages.blog' }),
    getTranslations({ locale, namespace: 'seoPages.common' }),
    getSeoBlogPosts(),
  ]);

  const posts = allPosts
    .filter((p) => p.isActive && pick(p.title, locale))
    .sort(
      (a, b) =>
        new Date(b.datePublished || 0).getTime() -
        new Date(a.datePublished || 0).getTime(),
    );
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
          SITE_URL,
        )}
      />
      <PageShell>
        <Breadcrumb items={[{ label: tc('home'), href: '/' }, { label: t('pageTitle') }]} />
        <PageHeader title={t('pageTitle')} description={t('pageDescription')} />

        {posts.length === 0 ? (
          <EmptyState message={tc('empty')} />
        ) : (
          <div className="space-y-14">
            {categories.map((category) => (
              <section key={category}>
                <div className="mb-6 flex items-center gap-4">
                  <h2 className="shrink-0 text-2xl font-bold text-foreground">
                    {categoryLabel(category)}
                  </h2>
                  <span aria-hidden="true" className="h-px flex-1 bg-stroke/30" />
                </div>
                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
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
            ))}
          </div>
        )}
      </PageShell>
    </>
  );
}
