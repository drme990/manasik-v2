import { Metadata } from 'next';
import PaymentStatusPage from './_client';

export const metadata: Metadata = {
  title: { absolute: 'Payment Status | Manasik Foundation' },
  robots: {
    index: false,
    follow: false,
  },
};

export default function Page() {
  return <PaymentStatusPage />;
}
