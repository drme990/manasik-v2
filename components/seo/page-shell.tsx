import Container from '@/components/layout/container';
import Footer from '@/components/layout/footer';
import Header from '@/components/layout/header';
import GoToTop from '@/components/shared/go-to-top';
import WhatsAppButton from '@/components/shared/whats-app-button';
import { cn } from '@/lib/utils';

// Shared chrome for all SEO pages: header, grid background, container,
// footer and floating actions. `narrow` is for long-form reading pages.
export default function PageShell({
  children,
  narrow = false,
}: {
  children: React.ReactNode;
  narrow?: boolean;
}) {
  return (
    <>
      <Header />
      <main className="grid-bg min-h-screen">
        <Container className={cn('py-8 md:py-12', narrow && 'max-w-4xl')}>
          {children}
        </Container>
      </main>
      <Footer />
      <WhatsAppButton />
      <GoToTop />
    </>
  );
}
