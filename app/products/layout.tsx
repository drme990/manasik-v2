export default function ProductsPageLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <div className="gbf gbf-lg gbf-left overflow-x-clip" />
      <div className="gbf gbf-md gbf-right overflow-x-clip" />
      {children}
    </>
  );
}
