import GreenBlur from '@/components/shared/green-blur';

export default function ProductsPageLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <GreenBlur />
      {children}
    </>
  );
}
