import { ThemeProvider } from 'next-themes';

export default function OurThemeProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ThemeProvider
      attribute="class"
      themes={['light', 'dark']}
      enableSystem={false}
      defaultTheme="dark"
      storageKey="manasik-theme"
    >
      {children}
    </ThemeProvider>
  );
}
