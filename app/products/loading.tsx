import { PageLoading } from '@/components/ui/loading';
import Header from '@/components/layout/header';
import Footer from '@/components/layout/footer';

export default function ProductLoading() {
  return (
    <>
      <Header />
      <main className="grid-bg min-h-screen">
        <PageLoading />
      </main>
      <Footer />
    </>
  );
}
