// Diagnostic only: compares the Meta files captured per vantage and greps them for consent/geo logic.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const HERE = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(HERE, 'out');
const BODIES = path.join(OUT, 'bodies');
const idxFile = path.join(OUT, 'bodies-index.json');
if (!fs.existsSync(idxFile)) {
  console.log('no bodies-index.json; nothing to analyze');
  process.exit(0);
}
const idx = JSON.parse(fs.readFileSync(idxFile, 'utf8'));
const full = [];
const P = (s = '') => {
  console.log(s);
  full.push(s);
};
const KW = [
  'consent', 'revoke', 'grant', 'gdpr', 'tcf', '__tcfapi', 'googleConsent', 'consentMode', 'gcm', 'dataLayer',
  'ad_storage', 'eea', 'europe', 'isEU', 'region', 'protectedDataMode', 'prohibitedSources', 'firstPartyCookies', 'cookie',
  'prohibitedPixels', 'lockWebpage', 'blockReason', 'source_category', 'traffic_permissions', 'unavailable', 'locks.lock', 'isLocked',
  'google_tag_data', 'ics', 'usercentrics', 'onetrust', 'cookiebot', 'cmp', 'geo', 'country', 'IABConsent', 'dataProcessingOptions', 'LDU',
];
const WORDISH = new Set(['eea', 'gcm', 'tcf', 'ics', 'cmp', 'geo', 'LDU', 'grant', 'region', 'europe', 'country']);

P('===== CAPTURED META FILES (unique by vantage/kind/path/sha) =====');
const seen = new Map();
for (const e of idx) {
  const u = new URL(e.url);
  const k = `${e.vantage}|${e.kind}|${u.pathname}|${e.sha256}`;
  if (!seen.has(k)) seen.set(k, { ...e, n: 0, path: u.pathname, query: u.search });
  seen.get(k).n++;
}
for (const e of seen.values())
  P(`${e.vantage.padEnd(6)} ${e.kind.padEnd(4)} ${e.path.padEnd(48)} status=${e.status} size=${String(e.size).padStart(7)} sha256=${e.sha256} seen=${e.n}x`);

P('\n===== RESPONSE HEADERS (first per vantage/path) =====');
const hseen = new Set();
for (const e of idx) {
  const u = new URL(e.url);
  const k = `${e.vantage}|${u.pathname}`;
  if (hseen.has(k)) continue;
  hseen.add(k);
  const h = e.headers || {};
  const pick = Object.fromEntries(
    Object.entries(h).filter(([n]) => /^(content-type|content-length|cache-control|expires|etag|last-modified|vary|x-fb-|cross-origin|permissions-policy|document-policy|origin-agent|reporting|alt-svc|date|timing-allow|x-content|strict|content-security-policy-report-only)/i.test(n)).map(([n, v]) => [n, String(v).slice(0, 160)]),
  );
  P(`${e.vantage} ${u.pathname}${u.search.slice(0, 200)}\n   ${JSON.stringify(pick)}`);
}

const bySha = new Map();
for (const e of idx) {
  if (!bySha.has(e.sha256)) bySha.set(e.sha256, { sha: e.sha256, size: e.size, who: new Set(), paths: new Set() });
  const b = bySha.get(e.sha256);
  b.who.add(`${e.vantage}/${e.kind}`);
  b.paths.add(new URL(e.url).pathname);
}
const read = (sha) => fs.readFileSync(path.join(BODIES, `${sha}.bin`), 'utf8');

function grep(text, limitPerKw) {
  const out = [];
  for (const kw of KW) {
    const re = new RegExp(WORDISH.has(kw) ? `(?<![A-Za-z])${kw}(?![a-z])` : kw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
    const hits = [];
    let m;
    while ((m = re.exec(text))) hits.push(m.index);
    const snippets = [];
    const used = new Set();
    let lastI = -1e9;
    for (const i of hits) {
      if (i - lastI < 220) continue;
      const s = text.slice(Math.max(0, i - 130), i + 170).replace(/\s+/g, ' ');
      const key = s.slice(100, 200);
      if (used.has(key)) continue;
      used.add(key);
      lastI = i;
      snippets.push(s);
      if (snippets.length >= limitPerKw) break;
    }
    out.push({ kw, count: hits.length, snippets });
  }
  return out;
}

P('\n===== CONFIG STATEMENTS PER DISTINCT signals/config BODY =====');
const cfgs = [...bySha.values()].filter((b) => [...b.paths].some((p) => /signals\/config/.test(p)));
const stmts = (t) =>
  t
    .split(/;\s*(?=(?:config\.set|fbq\.set|fbq\.loadPlugin|instance\.optIn|instance\.configLoaded|fbq\.registerPlugin|fbq\.__|instance\.))/)
    .map((s) => s.trim())
    .filter(Boolean);
for (const c of cfgs) {
  const t = read(c.sha);
  P(`\n--- config sha=${c.sha.slice(0, 16)} size=${c.size} vantages=[${[...c.who].join(', ')}]`);
  const interesting = stmts(t).filter((s) => /^(config\.set|fbq\.set|fbq\.loadPlugin|instance\.optIn|instance\.configLoaded|instance\.)/.test(s));
  for (const s of interesting) P(`   ${s.slice(0, 700)}`);
}

P('\n===== CONFIG DIFFS (statement sets), all pairs of distinct bodies =====');
for (let i = 0; i < cfgs.length; i++)
  for (let j = i + 1; j < cfgs.length; j++) {
    const a = cfgs[i], b = cfgs[j];
    const sa = new Set(stmts(read(a.sha))), sb = new Set(stmts(read(b.sha)));
    const onlyA = [...sa].filter((x) => !sb.has(x)), onlyB = [...sb].filter((x) => !sa.has(x));
    P(`\n--- A=${a.sha.slice(0, 12)} [${[...a.who].join(', ')}]  vs  B=${b.sha.slice(0, 12)} [${[...b.who].join(', ')}]`);
    P(`   only in A (${onlyA.length}):`);
    for (const s of onlyA.slice(0, 25)) P(`     ${s.slice(0, 900)}`);
    P(`   only in B (${onlyB.length}):`);
    for (const s of onlyB.slice(0, 25)) P(`     ${s.slice(0, 900)}`);
  }

P('\n===== KEYWORD GREP: signals/config bodies =====');
for (const c of cfgs) {
  P(`\n--- config sha=${c.sha.slice(0, 16)} vantages=[${[...c.who].join(', ')}]`);
  for (const g of grep(read(c.sha), 6)) {
    if (!g.count) continue;
    P(` "${g.kw}" x${g.count}`);
    for (const s of g.snippets) P(`     …${s}…`);
  }
}

P('\n===== KEYWORD GREP: fbevents.js and other facebook.net scripts =====');
const others = [...bySha.values()].filter((b) => ![...b.paths].some((p) => /signals\/config/.test(p)));
for (const c of others) {
  const t = read(c.sha);
  P(`\n--- ${[...c.paths].join(',')} sha=${c.sha.slice(0, 16)} size=${c.size} vantages=[${[...c.who].join(', ')}]`);
  const vm = t.match(/version\s*[:=]\s*"(\d+\.\d+\.\d+)"/);
  if (vm) P(` version string: ${vm[1]}`);
  for (const g of grep(t, 4)) {
    if (!g.count) {
      P(` "${g.kw}" x0`);
      continue;
    }
    P(` "${g.kw}" x${g.count}`);
    for (const s of g.snippets) P(`     …${s}…`);
  }
}
fs.writeFileSync(path.join(OUT, 'analysis.txt'), full.join('\n'));
