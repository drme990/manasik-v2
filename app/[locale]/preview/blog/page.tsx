import type { Metadata } from 'next';
import BlogArticle from '@/components/seo/blog-article';
import PageShell from '@/components/seo/page-shell';
import PreviewBar from '@/components/seo/preview/preview-bar';
import { getSeoPreview, pick, type SeoBlogPost } from '@/lib/seo-content';

// The dashboard «eye» (owner, 2026-10-12): an article as it is in the editor,
// in the site's real page. Reached only with the token the dashboard makes;
// never indexed, never cached, not in the sitemap.
export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  robots: { index: false, follow: false, nocache: true },
};

const TEXT = {
  ar: { label: 'معاينة · غير منشورة', noLang: 'لا يوجد نص عربي بعد', expired: 'انتهت صلاحية المعاينة. افتحها من جديد من اللوحة.' },
  en: { label: 'Preview · not published', noLang: 'No English text yet', expired: 'This preview has expired. Open it again from the dashboard.' },
};

export default async function BlogPreviewPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { locale } = await params;
  const query = await searchParams;
  const text = TEXT[locale === 'en' ? 'en' : 'ar'];
  const token = typeof query.token === 'string' ? query.token : '';
  const preview = token ? await getSeoPreview(token) : null;

  if (!preview || preview.entity !== 'blog') {
    return (
      <PageShell narrow>
        <p className="py-24 text-center text-lg text-secondary">{text.expired}</p>
      </PageShell>
    );
  }

  const doc = preview.doc as Partial<SeoBlogPost>;
  const post: SeoBlogPost = {
    _id: 'preview',
    slug: doc.slug || 'preview',
    category: doc.category || '',
    platform: preview.platform,
    title: doc.title || { ar: '', en: '' },
    description: doc.description || { ar: '', en: '' },
    keywords: { ar: [], en: [] },
    content: doc.content || { ar: '', en: '' },
    excerpt: doc.excerpt || { ar: '', en: '' },
    coverImage: doc.coverImage || '',
    authorId: doc.authorId || null,
    // An unpublished post shows today's date, as it would on the day it goes live.
    datePublished: doc.datePublished || new Date().toISOString(),
    dateModified: doc.dateModified || doc.datePublished || new Date().toISOString(),
    faqs: (doc.faqs || []).filter(Boolean),
    relatedServiceSlug: doc.relatedServiceSlug || null,
    isActive: true,
  };

  return (
    <>
      <PreviewBar label={text.label} note={pick(post.title, locale) ? undefined : text.noLang} />
      <BlogArticle post={post} locale={locale} />
    </>
  );
}
