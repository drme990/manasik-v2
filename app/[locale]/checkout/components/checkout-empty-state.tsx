'use client';

import Button from '@/components/ui/button';
import Container from '@/components/layout/container';
import Footer from '@/components/layout/footer';
import { AlertCircle } from 'lucide-react';

type CheckoutEmptyStateProps = {
  title: string;
  message: string;
  buttonLabel: string;
  buttonHref: string;
};

export default function CheckoutEmptyState({
  title,
  message,
  buttonLabel,
  buttonHref,
}: CheckoutEmptyStateProps) {
  return (
    <>
      <main className="grid-bg min-h-screen flex items-center justify-center">
        <Container>
          <div className="max-w-md mx-auto text-center py-16">
            <div className="w-20 h-20 mx-auto rounded-full bg-error/10 flex items-center justify-center mb-6">
              <AlertCircle size={40} className="text-error" />
            </div>
            <h1 className="text-2xl font-bold mb-3">{title}</h1>
            <p className="text-secondary mb-6">{message}</p>
            <Button variant="primary" href={buttonHref}>
              {buttonLabel}
            </Button>
          </div>
        </Container>
      </main>
      <Footer />
    </>
  );
}
