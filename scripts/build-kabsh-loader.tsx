/**
 * Writes the loading mark to public/brand/ as two static SVG files (light and
 * dark theme) so pages reference it as an image instead of carrying ~150 KB
 * of inline SVG each time it appears (SEO D12-a, owner 2026-10-12).
 *
 * Run after any change to components/brand/kabsh-loading-svg.tsx:
 *   npx tsx scripts/build-kabsh-loader.tsx
 */
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import KabshLoadingSvg from '../components/brand/kabsh-loading-svg';

const markup = renderToStaticMarkup(createElement(KabshLoadingSvg, { size: 84 }))
  .replace('<svg ', '<svg xmlns="http://www.w3.org/2000/svg" ');

// An <img> cannot read the page's CSS variables, so each theme gets its own
// file with the colours the variables resolve to (globals.css: .dark sets
// --kabsh-3 and --kabsh-shadow; the light theme uses the fallbacks).
const light = markup.replace(/var\(--kabsh-[a-z0-9]+, *(#[0-9a-fA-F]{3,8})\)/g, '$1');
const dark = markup
  .replace(/var\(--kabsh-3, *#[0-9a-fA-F]{3,8}\)/g, '#9cc2ff')
  .replace(/var\(--kabsh-shadow, *#[0-9a-fA-F]{3,8}\)/g, '#000000')
  .replace(/var\(--kabsh-[a-z0-9]+, *(#[0-9a-fA-F]{3,8})\)/g, '$1');

const out = join(__dirname, '..', 'public', 'brand');
writeFileSync(join(out, 'kabsh-loading-light.svg'), light);
writeFileSync(join(out, 'kabsh-loading-dark.svg'), dark);
console.log('written', light.length, dark.length);
