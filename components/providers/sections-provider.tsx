'use client';

import { createContext, useContext } from 'react';

// Which content sections have something published (owner, 2026-10-12): the
// header and footer hide the link of an empty section, and it comes back by
// itself once something is published there. Filled in by the locale layout
// from lib/sitemap-sections.ts; null means "unknown", and then every link
// shows, as before.
const SECTION_PATHS = ['/services', '/blog', '/authors', '/countries', '/seasonal', '/reviews'];

const SectionsContext = createContext<string[] | null>(null);

export function SectionsProvider({
  visible,
  children,
}: {
  visible: string[] | null;
  children: React.ReactNode;
}) {
  return <SectionsContext.Provider value={visible}>{children}</SectionsContext.Provider>;
}

/** Drops links to content sections that have nothing published. */
export function useVisibleLinks<T extends { href: string }>(links: T[]): T[] {
  const visible = useContext(SectionsContext);
  if (!visible) return links;
  return links.filter((link) => !SECTION_PATHS.includes(link.href) || visible.includes(link.href));
}
