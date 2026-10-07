// Diagnostic only: per-circuit survey of what Meta's signals/config returns for
// the pixel on www.manasik.net from many Tor exits, together with geo hints
// (the site's own Vercel geo, and how Meta-owned sites localise for that IP).
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawn, execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';
const execFileP = promisify(execFile);
const HERE = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(HERE, 'out');
const BODIES = path.join(OUT, 'bodies');
fs.mkdirSync(BODIES, { recursive: true });
const PIXEL = '1545349236553470';
const BOGUS = '1234567890123456';
const SITE = 'https://www.manasik.net';
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36';
const T0 = Date.now();
const DEADLINE = Number(process.env.SURVEY_DEADLINE_MS || 600000);
const log = (...a) => console.log(`[${((Date.now() - T0) / 1000).toFixed(1)}s]`, ...a);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const sha = (b) => crypto.createHash('sha256').update(b).digest('hex');
const CFG = (id, domain) =>
  `https://connect.facebook.net/signals/config/${id}?v=2.9.415&r=stable&domain=${encodeURIComponent(domain)}&hme=a4c28c8787325ac3f8f9eac68364f47df2a8c4266e43177443e5d7f6289c9774&ex_m=117%2C240%2C170%2C27%2C81%2C82%2C161%2C77%2C76%2C11%2C180%2C101%2C20%2C152%2C140%2C46%2C84%2C89%2C148`;

async function curl(port, circ, url, extra = [], buffer = false) {
  const args = ['-sS', '--compressed', '--max-time', '30', '-A', UA, ...extra];
  if (port) args.push('--socks5-hostname', `127.0.0.1:${port}`, '--proxy-user', `c${circ}:x`);
  args.push(url);
  try {
    const { stdout } = await execFileP('curl', args, { maxBuffer: 64 * 1024 * 1024, encoding: buffer ? 'buffer' : 'utf8' });
    return stdout;
  } catch (e) {
    return buffer ? null : `CURL_ERR ${String(e.stderr || e.message).slice(0, 200)}`;
  }
}
async function cfg(port, circ, id, domain) {
  const body = await curl(port, circ, CFG(id, domain), ['-e', `https://${domain}/`], true);
  if (!body) return { error: true };
  const t = body.toString('utf8');
  const h = sha(body);
  const f = path.join(BODIES, `${h}.bin`);
  if (!fs.existsSync(f)) fs.writeFileSync(f, body);
  const m = t.match(/config\.set\("\d+", "prohibitedPixels", (\{[^}]*\})\)/);
  return { size: body.length, sha: h.slice(0, 12), prohibited: m ? m[1] : null, fpc: /"FirstPartyCookies", true/.test(t) };
}
async function probe(label, port, circ) {
  const row = { label, circ };
  const [ipRaw, geoRaw, c1, c2, c3, c4, metaHdr, fbHtml, igHtml] = await Promise.all([
    port ? curl(port, circ, 'https://check.torproject.org/api/ip') : curl(null, 0, 'https://api.country.is/'),
    curl(port, circ, `${SITE}/api/geo/detect`),
    cfg(port, circ, PIXEL, 'www.manasik.net'),
    cfg(port, circ, PIXEL, 'example.com'),
    cfg(port, circ, BOGUS, 'www.manasik.net'),
    cfg(port, circ, PIXEL, 'diag.manasik.net'),
    curl(port, circ, 'https://www.meta.com/', ['-o', '/dev/null', '-D', '-']),
    curl(port, circ, 'https://www.facebook.com/', ['-H', 'Accept: text/html']),
    curl(port, circ, 'https://www.instagram.com/', ['-H', 'Accept: text/html']),
  ]);
  row.exitIp = (ipRaw.match(/"IP":"([^"]+)"/) || ipRaw.match(/"ip":"([^"]+)"/) || [])[1] || ipRaw.slice(0, 60);
  row.vercelCountry = (geoRaw.match(/"countryCode":"?([A-Z]{2}|null)/) || [])[1] || geoRaw.slice(0, 40);
  row.cfgSite = c1;
  row.cfgOtherDomain = c2;
  row.cfgBogusPixelSameDomain = c3;
  row.cfgSubdomain = c4;
  row.metaCom = `${(metaHdr.match(/^HTTP\/\S+ (\d+)/m) || [])[1] || '?'} ${(metaHdr.match(/^location: *(\S+)/im) || [])[1] || ''}`.slice(0, 80);
  const pick = (html) => ({
    len: html.length,
    lang: (html.match(/<html[^>]*\blang="([^"]+)"/) || [])[1] || null,
    cc: [...new Set((html.match(/"(?:country_code|countryCode|country|geo_country|ip_country|user_country)":"([A-Z]{2})"/g) || []).slice(0, 6))],
    locale: [...new Set((html.match(/"(?:locale|language_code)":"([a-zA-Z_-]{2,6})"/g) || []).slice(0, 4))],
  });
  row.fb = pick(fbHtml);
  row.ig = pick(igHtml);
  return row;
}
const fmt = (r) =>
  `${r.label.padEnd(8)} c${r.circ} ip=${String(r.exitIp).padEnd(15)} vercel=${r.vercelCountry} | site-cfg: ${r.cfgSite.error ? 'ERR' : `${r.cfgSite.size} ${r.cfgSite.prohibited ? 'PROHIBITED ' + r.cfgSite.prohibited : 'ok'}`} | other-domain: ${r.cfgOtherDomain.error ? 'ERR' : r.cfgOtherDomain.prohibited ? 'PROHIBITED' : 'ok'} | subdomain: ${r.cfgSubdomain.error ? 'ERR' : r.cfgSubdomain.prohibited ? 'PROHIBITED' : 'ok'} | bogus-pixel@site: ${r.cfgBogusPixelSameDomain.error ? 'ERR' : `${r.cfgBogusPixelSameDomain.size} ${r.cfgBogusPixelSameDomain.prohibited ? 'PROHIBITED' : 'ok'}`} | meta.com=${r.metaCom} fb.lang=${r.fb.lang} fb.cc=${r.fb.cc.join('/')} ig.lang=${r.ig.lang} ig.cc=${r.ig.cc.join('/')} ig.loc=${r.ig.locale.join('/')}`;

async function torUp(port, cc, seed, timeoutMs = 75000) {
  const dir = `/tmp/tors-${port}-${cc || 'seed'}`;
  fs.mkdirSync(`${dir}/data`, { recursive: true });
  if (seed) {
    for (const f of fs.readdirSync(seed)) if (/^cached-/.test(f)) fs.copyFileSync(path.join(seed, f), `${dir}/data/${f}`);
  }
  fs.chmodSync(`${dir}/data`, 0o700);
  const rc = path.join(dir, 'torrc');
  fs.writeFileSync(
    rc,
    `SocksPort 127.0.0.1:${port}\nDataDirectory ${dir}/data\n${cc ? `ExitNodes {${cc}}\nStrictNodes 1\n` : ''}Log notice stdout\nClientOnly 1\n`,
  );
  const p = spawn('tor', ['-f', rc], { stdio: ['ignore', 'pipe', 'pipe'] });
  let ok = false;
  let buf = '';
  p.stdout.on('data', (d) => {
    buf += d;
    if (/Bootstrapped 100%/.test(buf)) ok = true;
  });
  const start = Date.now();
  while (!ok && Date.now() - start < timeoutMs && p.exitCode === null) await sleep(300);
  if (!ok) {
    p.kill();
    return { proc: null, why: buf.split('\n').filter(Boolean).slice(-2).join(' | ').slice(0, 240) };
  }
  return { proc: p, dataDir: `${dir}/data`, ms: Date.now() - start };
}

const rows = [];
rows.push(await probe('runner', null, 0));
log(fmt(rows[0]));
const seedTor = await torUp(9099, null, null, 120000);
log(`seed tor: ${seedTor.proc ? `ok in ${seedTor.ms}ms` : `FAILED ${seedTor.why}`}`);
await sleep(3000); // let it cache descriptors
const seedDir = seedTor.dataDir || null;

// [country, circuits]
const PLAN = [
  ['de', 6], ['nl', 6], ['gb', 5], ['fr', 4], ['us', 4], ['ch', 3], ['se', 3], ['at', 3], ['pl', 3],
  ['be', 2], ['ie', 2], ['dk', 2], ['fi', 2], ['no', 2], ['es', 2], ['it', 2], ['pt', 2], ['gr', 2], ['cz', 2], ['ro', 2],
  ['lu', 2], ['hu', 2], ['bg', 2], ['is', 2], ['lt', 2], ['lv', 2], ['ee', 2], ['hr', 2], ['sk', 2], ['si', 2],
  ['ca', 3], ['tr', 2], ['ua', 2], ['md', 2], ['rs', 2], ['al', 2], ['za', 2], ['il', 2], ['ae', 2], ['eg', 2], ['sa', 2],
  ['sg', 2], ['jp', 2], ['hk', 2], ['in', 2], ['au', 2], ['br', 2], ['mx', 2], ['kr', 2], ['my', 2], ['id', 2], ['ru', 2],
];
let idx = 0;
const failures = [];
async function worker(w) {
  while (idx < PLAN.length && Date.now() - T0 < DEADLINE) {
    const my = idx++;
    const [cc, n] = PLAN[my];
    const port = 9100 + my;
    const t = await torUp(port, cc, seedDir, 60000);
    if (!t.proc) {
      failures.push(`${cc}: ${t.why}`);
      log(`tor {${cc}} no bootstrap: ${(t.why || '').slice(-110)}`);
      continue;
    }
    const got = await Promise.all(Array.from({ length: n }, (_, c) => probe(cc.toUpperCase(), port, c + 1).catch((e) => ({ label: cc.toUpperCase(), circ: c + 1, error: String(e).slice(0, 100) }))));
    const seen = new Set();
    for (const r of got) {
      if (r.error) {
        log(`${cc} c${r.circ} probe error ${r.error}`);
        continue;
      }
      r.dupExit = seen.has(r.exitIp);
      seen.add(r.exitIp);
      rows.push(r);
      log(fmt(r));
    }
    t.proc.kill();
  }
}
await Promise.all([1, 2, 3, 4, 5].map(worker));
if (seedTor.proc) seedTor.proc.kill();
fs.writeFileSync(path.join(OUT, 'survey.json'), JSON.stringify({ generatedAt: new Date().toISOString(), rows, failures }, null, 1));

console.log('\n===== CIRCUIT SURVEY: pixel config for www.manasik.net by exit =====');
for (const r of rows) console.log(fmt(r));
console.log(`\nno-bootstrap: ${failures.map((f) => f.split(':')[0]).join(',') || 'none'}`);
const uniq = new Map();
for (const r of rows) if (!r.cfgSite.error) uniq.set(r.exitIp, r);
const by = {};
for (const r of uniq.values()) {
  const k = r.vercelCountry;
  by[k] = by[k] || { prohibited: 0, ok: 0 };
  by[k][r.cfgSite.prohibited ? 'prohibited' : 'ok']++;
}
console.log('\n===== BY VERCEL-DETECTED COUNTRY (unique exit IPs): prohibited / ok =====');
for (const k of Object.keys(by).sort()) console.log(`${k}: prohibited=${by[k].prohibited} ok=${by[k].ok}`);
process.stdout.write('', () => setTimeout(() => process.exit(0), 300));
