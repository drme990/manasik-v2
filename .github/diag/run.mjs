// Diagnostic only: observes how the Meta pixel behaves on www.manasik.net and on
// local synthetic pages from a US vantage (direct) and from EU/UK vantages (Tor
// exits). Read-only against the live site. Not part of the application.
import { chromium } from 'playwright';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawn, execFile } from 'node:child_process';
import { promisify } from 'node:util';
const execFileP = promisify(execFile);
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(HERE, 'out');
const BODIES = path.join(OUT, 'bodies');
fs.mkdirSync(BODIES, { recursive: true });

const PIXEL = '1545349236553470';
const SITE = 'https://www.manasik.net';
const SYN_HOST = 'diag.localtest.me';
const SYN_PORT = 8080;
const SYN = `http://${SYN_HOST}:${SYN_PORT}`;
const DRY = process.env.DIAG_DRY === '1';
const ONLY = (process.env.DIAG_ONLY || '').split(',').filter(Boolean); // vantage filter
const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36';
const EU_SET = new Set(
  'AT BE BG HR CY CZ DK EE FI FR DE GR HU IE IT LV LT LU MT NL PL PT RO SK SI ES SE IS NO LI GB GG JE IM CH'.split(' '),
);
const T0 = Date.now();
const log = (...a) => console.log(`[${((Date.now() - T0) / 1000).toFixed(1)}s]`, ...a);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const sha = (b) => crypto.createHash('sha256').update(b).digest('hex');

// ───────────────────────── synthetic pages ─────────────────────────
const BASE = `!function(f,b,e,v,n,t,s)
{if(f.fbq)return;n=f.fbq=function(){n.callMethod?
n.callMethod.apply(n,arguments):n.queue.push(arguments)};
if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
n.queue=[];t=b.createElement(e);t.async=!0;
t.src=v;s=b.getElementsByTagName(e)[0];
s.parentNode.insertBefore(t,s)}(window, document,'script',
'https://connect.facebook.net/en_US/fbevents.js');`;
const REGIONS = [...EU_SET].map((c) => `'${c}'`).join(',');
// Same text the site renders from components/shared/google-tag.tsx (main).
const SITE_GCM_DEFAULTS = `
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('consent', 'default', {
    ad_storage: 'denied', analytics_storage: 'denied', ad_user_data: 'denied', ad_personalization: 'denied',
    wait_for_update: 500,
    region: [${REGIONS}]
  });
  gtag('consent', 'default', {
    ad_storage: 'granted', analytics_storage: 'granted', ad_user_data: 'granted', ad_personalization: 'granted'
  });`;
const S4_TRUE = fs.readFileSync(path.join(HERE, 's4-true.inline.js'), 'utf8');
const S4_FALSE = fs.readFileSync(path.join(HERE, 's4-false.inline.js'), 'utf8');
const html = (title, ...scripts) =>
  `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>${title}</title>\n` +
  scripts.map((s) => (s.startsWith('<') ? s : `<script>\n${s}\n</script>`)).join('\n') +
  `\n</head><body><h1>${title}</h1><p style="height:3000px">diagnostic page</p></body></html>`;
const PAGES = {
  // S1: plain base code only
  '/s1.html': html('S1 plain', `${BASE}\nfbq('init', '${PIXEL}');\nfbq('track', 'PageView');`),
  // S2: Google Consent Mode default all-denied (stub only, no gtag.js) BEFORE the base code
  '/s2.html': html(
    'S2 gcm-denied-stub',
    `window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('consent', 'default', {ad_storage:'denied', analytics_storage:'denied', ad_user_data:'denied', ad_personalization:'denied'});`,
    `${BASE}\nfbq('init', '${PIXEL}');\nfbq('track', 'PageView');`,
  ),
  // S2b: the site's own head order: Meta base code, then the site's Consent Mode defaults + real gtag.js
  '/s2b.html': html(
    'S2b site-order gcm+gtag.js',
    `${BASE}\nfbq('init', '${PIXEL}');\nfbq('track', 'PageView');`,
    SITE_GCM_DEFAULTS,
    `<script async src="https://www.googletagmanager.com/gtag/js?id=AW-18346838035"></script>`,
    `window.dataLayer = window.dataLayer || [];\nfunction gtag(){dataLayer.push(arguments);}\ngtag('js', new Date());\ngtag('config', 'AW-18346838035');`,
  ),
  // S3: revoke before init, grant after 5 s
  '/s3.html': html(
    'S3 revoke-then-grant',
    `${BASE}\nfbq('consent', 'revoke');\nfbq('init', '${PIXEL}');\nfbq('track', 'PageView');\nsetTimeout(function(){ fbq('consent', 'grant'); window.__grantedAt = Date.now(); }, 5000);`,
  ),
  // S3b: revoke before init, never grant (control)
  '/s3b.html': html(
    'S3b revoke-only',
    `${BASE}\nfbq('consent', 'revoke');\nfbq('init', '${PIXEL}');\nfbq('track', 'PageView');`,
  ),
  // S4: exact inline script rendered by components/shared/meta-pixel.tsx @ fix/meta-consent-eu (4d006bc)
  '/s4t.html': html('S4 fix consentRequired=true', S4_TRUE),
  '/s4f.html': html('S4 fix consentRequired=false', S4_FALSE),
  // S5: grant before init ("always-grant" mode of the fix)
  '/s5.html': html(
    'S5 grant-before-init',
    `${BASE}\nfbq('consent', 'grant');\nfbq('init', '${PIXEL}');\nfbq('track', 'PageView');`,
  ),
};
function startServer() {
  return new Promise((resolve) => {
    const srv = http.createServer((req, res) => {
      const p = new URL(req.url, SYN).pathname;
      if (PAGES[p]) {
        res.writeHead(200, { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' });
        res.end(PAGES[p]);
      } else {
        res.writeHead(404);
        res.end('nf');
      }
    });
    srv.listen(SYN_PORT, '127.0.0.1', () => resolve(srv));
  });
}

// ───────────────────────── tor ─────────────────────────
const torProcs = [];
async function curlTor(port, url, extra = []) {
  try {
    const { stdout } = await execFileP(
      'curl',
      ['-sS', '--max-time', '40', '--socks5-hostname', `127.0.0.1:${port}`, '-A', UA, ...extra, url],
      { encoding: 'utf8', maxBuffer: 16 * 1024 * 1024 },
    );
    return stdout;
  } catch (e) {
    return `CURL_ERR ${String(e.stderr || e.message).slice(0, 300)}`;
  }
}
async function siteGeo(port) {
  const out = await curlTor(port, `${SITE}/api/geo/detect`, ['-w', '\n%{http_code}']);
  const m = out.match(/"countryCode":"?([A-Z]{2}|null)/);
  const status = (out.match(/\n(\d{3})$/) || [])[1];
  return { status, country: m ? m[1] : null, raw: out.slice(0, 160).replace(/\s+/g, ' ') };
}
async function torIp(port) {
  const out = await curlTor(port, 'https://check.torproject.org/api/ip');
  try {
    return JSON.parse(out);
  } catch {
    return { raw: out.slice(0, 100) };
  }
}
async function torUp(port, cc, timeoutMs = 150000) {
  const dir = `/tmp/tor-${port}-${cc}`;
  fs.mkdirSync(`${dir}/data`, { recursive: true });
  const seed = '/tmp/tors-9099-seed/data'; // left by survey.mjs: cached consensus speeds up bootstrap
  if (fs.existsSync(seed)) for (const f of fs.readdirSync(seed)) if (/^cached-/.test(f)) fs.copyFileSync(path.join(seed, f), `${dir}/data/${f}`);
  fs.chmodSync(`${dir}/data`, 0o700);
  const rc = path.join(dir, 'torrc');
  fs.writeFileSync(
    rc,
    `SocksPort 127.0.0.1:${port}\nDataDirectory ${dir}/data\nExitNodes {${cc}}\nStrictNodes 1\nLog notice stdout\nClientOnly 1\nMaxCircuitDirtiness 1800\n`,
  );
  const p = spawn('tor', ['-f', rc], { stdio: ['ignore', 'pipe', 'pipe'] });
  let ok = false;
  let buf = '';
  p.stdout.on('data', (d) => {
    buf += d;
    if (/Bootstrapped 100%/.test(buf)) ok = true;
  });
  const start = Date.now();
  while (!ok && Date.now() - start < timeoutMs && p.exitCode === null) await sleep(400);
  if (!ok) {
    p.kill();
    return { proc: null, why: buf.split('\n').filter(Boolean).slice(-2).join(' | ').slice(0, 300) };
  }
  return { proc: p };
}
async function startTor(port, countries) {
  for (const cc of countries) {
    log(`tor[${port}] starting with exit {${cc}}`);
    const { proc: p, why } = await torUp(port, cc);
    if (!p) {
      log(`tor[${port}] {${cc}} did not bootstrap: ${why}`);
      continue;
    }
    let good = null;
    for (let attempt = 0; attempt < 3 && !good; attempt++) {
      const geo = await siteGeo(port);
      const ip = await torIp(port);
      log(`tor[${port}] {${cc}} attempt ${attempt}: site geo=${JSON.stringify(geo)} torcheck=${JSON.stringify(ip)}`);
      if (geo.status === '200' && geo.country === cc.toUpperCase()) good = { cc, siteCountry: geo.country, ip: ip.IP || null, isTor: ip.IsTor };
      else await sleep(3000);
    }
    if (good) {
      torProcs.push(p);
      return good;
    }
    p.kill();
    await sleep(800);
  }
  return null;
}

// ───────────────────────── config survey (curl, many countries) ─────────────────────────
const CFG_URL = (domain) =>
  `https://connect.facebook.net/signals/config/${PIXEL}?v=2.9.415&r=stable&domain=${encodeURIComponent(domain)}&hme=a4c28c8787325ac3f8f9eac68364f47df2a8c4266e43177443e5d7f6289c9774&ex_m=117%2C240%2C170%2C27%2C81%2C82%2C161%2C77%2C76%2C11%2C180%2C101%2C20%2C152%2C140%2C46%2C84%2C89%2C148`;
const survey = [];
async function fetchCfg(port, domain) {
  const args = ['-sS', '--compressed', '--max-time', '40', '-A', UA, '-e', `https://${domain}/`];
  if (port) args.push('--socks5-hostname', `127.0.0.1:${port}`);
  args.push(CFG_URL(domain));
  let body;
  try {
    body = (await execFileP('curl', args, { maxBuffer: 64 * 1024 * 1024, encoding: 'buffer' })).stdout;
  } catch (e) {
    return { domain, error: String(e.stderr || e.message).slice(0, 160) };
  }
  const t = body.toString('utf8');
  const h = sha(body);
  const f = path.join(BODIES, `${h}.bin`);
  if (!fs.existsSync(f)) fs.writeFileSync(f, body);
  const m = t.match(/config\.set\("\d+", "prohibitedPixels", (\{[^}]*\})\)/);
  return {
    domain,
    size: body.length,
    sha256: h,
    prohibitedPixels: m ? m[1] : null,
    firstPartyCookies: /"FirstPartyCookies", true/.test(t),
    optIns: (t.match(/instance\.optIn\("\d+", "([A-Za-z]+)", true\)/g) || []).map((x) => x.match(/"([A-Za-z]+)", true/)[1]),
  };
}
const SURVEY_DOMAINS = ['www.manasik.net', 'manasik.net', 'diag.localtest.me'];
async function surveyPort(label, port, domains = SURVEY_DOMAINS) {
  const geo = port ? await siteGeo(port) : null;
  const row = { label, siteCountry: geo ? geo.country : 'runner', siteStatus: geo ? geo.status : null, configs: await Promise.all(domains.map((d) => fetchCfg(port, d))) };
  survey.push(row);
  log(
    `survey ${label} siteCountry=${row.siteCountry}: ` +
      row.configs.map((c) => `${c.domain}: ${c.error ? `ERR ${c.error}` : `size=${c.size} prohibitedPixels=${c.prohibitedPixels || 'no'} FPC=${c.firstPartyCookies}`}`).join(' | '),
  );
  return row;
}
async function runSurvey(countries, deadlineMs) {
  let i = 0;
  const worker = async (port) => {
    while (i < countries.length && Date.now() - T0 < deadlineMs) {
      const cc = countries[i++];
      const { proc, why } = await torUp(port, cc, 50000);
      if (!proc) {
        survey.push({ label: `tor-${cc}`, error: `no bootstrap: ${why}` });
        log(`survey tor-${cc}: no bootstrap (${(why || '').slice(0, 120)})`);
        continue;
      }
      try {
        await surveyPort(`tor-${cc}`, port);
      } catch (e) {
        log(`survey tor-${cc} error ${String(e).slice(0, 120)}`);
      }
      proc.kill();
      await sleep(500);
    }
  };
  await Promise.all([9060, 9061, 9062].map(worker));
}

// ───────────────────────── recording ─────────────────────────
const results = [];
const bodyIndex = [];
const savedNames = new Set();
const isFb = (u) => /^https?:\/\/([a-z0-9-]+\.)*(facebook\.net|facebook\.com|fbcdn\.net)\//i.test(u);

function parseTr(url, postData) {
  let u;
  try {
    u = new URL(url);
  } catch {
    return null;
  }
  const isTr = /facebook\.com$/.test(u.hostname) && /^\/(tr|privacy_sandbox)/.test(u.pathname);
  if (!isTr) return null;
  const params = {};
  for (const [k, v] of u.searchParams) params[k] = v;
  if (postData) {
    if (/Content-Disposition: form-data/i.test(postData)) {
      const re = /name="([^"]+)"\r?\n\r?\n([\s\S]*?)\r?\n--/g;
      let m;
      while ((m = re.exec(postData))) params[m[1]] = m[2];
    } else {
      try {
        for (const [k, v] of new URLSearchParams(postData)) params[k] = v;
      } catch {}
    }
  }
  return params;
}

function attach(ctx, rec, vantage) {
  const start = Date.now();
  const byReq = new Map();
  ctx.on('request', (r) => {
    const url = r.url();
    let host = '';
    try {
      host = new URL(url).hostname;
    } catch {}
    rec.hosts[host] = (rec.hosts[host] || 0) + 1;
    if (/[?&]gcs=/.test(url)) {
      try {
        const u = new URL(url);
        const key = `${u.hostname}${u.pathname.slice(0, 60)} gcs=${u.searchParams.get('gcs')} gcd=${u.searchParams.get('gcd')}`;
        if (!rec.google.includes(key)) rec.google.push(key);
      } catch {}
    }
    if (!isFb(url)) return;
    const u = new URL(url);
    const postData = r.postData() || null;
    const tr = parseTr(url, postData);
    const e = {
      t: Date.now() - start,
      method: r.method(),
      type: r.resourceType(),
      short: `${u.hostname}${u.pathname}`,
      url,
      postData: postData ? postData.slice(0, 4000) : null,
      status: null,
      failure: null,
    };
    if (tr) {
      e.ev = tr.ev || null;
      e.trParams = Object.fromEntries(Object.entries(tr).map(([k, v]) => [k, String(v).slice(0, 160)]));
    }
    byReq.set(r, e);
    rec.fb.push(e);
  });
  ctx.on('requestfailed', (r) => {
    const e = byReq.get(r);
    if (e) e.failure = r.failure()?.errorText || 'failed';
  });
  ctx.on('response', (resp) => {
    const r = resp.request();
    const e = byReq.get(r);
    if (!e) return;
    e.status = resp.status();
    const u = new URL(r.url());
    if (u.hostname.endsWith('facebook.net')) {
      const pr = (async () => {
        try {
          const body = await resp.body();
          const h = sha(body);
          e.sha256 = h;
          e.size = body.length;
          const f = path.join(BODIES, `${h}.bin`);
          if (!fs.existsSync(f)) fs.writeFileSync(f, body);
          const kind = rec.kind;
          const nice = `${vantage}__${kind}__${u.pathname.replace(/[^a-z0-9._-]+/gi, '_').replace(/^_/, '')}`;
          if (!savedNames.has(nice)) {
            savedNames.add(nice);
            fs.writeFileSync(path.join(BODIES, `${nice}.js`), body);
          }
          bodyIndex.push({
            vantage,
            scenario: rec.id,
            kind,
            url: r.url(),
            status: resp.status(),
            sha256: h,
            size: body.length,
            nice: `${nice}.js`,
            headers: resp.headers(),
          });
        } catch (err) {
          e.bodyErr = String(err).slice(0, 120);
        }
      })();
      rec._pending.push(pr);
    }
  });
}

// runs inside the page
function pageSnapshot() {
  const ser = (o, depth, seen) => {
    const t = typeof o;
    if (o === null) return null;
    if (t === 'undefined') return '__undefined__';
    if (t === 'number' || t === 'boolean') return o;
    if (t === 'string') return o.length > 200 ? o.slice(0, 200) + '…' : o;
    if (t === 'function') return '[fn]';
    if (t !== 'object') return String(o);
    if (o === window) return '[window]';
    if (typeof Node !== 'undefined' && o instanceof Node) return '[node]';
    if (seen.has(o)) return '[cycle]';
    if (depth <= 0) return Array.isArray(o) ? `[array ${o.length}]` : '[object]';
    seen.add(o);
    if (Array.isArray(o)) return o.slice(0, 15).map((x) => ser(x, depth - 1, seen));
    if (o instanceof Map) return { __map: [...o.entries()].slice(0, 15).map((x) => ser(x, depth - 1, seen)) };
    if (o instanceof Set) return { __set: [...o.values()].slice(0, 15).map((x) => ser(x, depth - 1, seen)) };
    const out = {};
    let n = 0;
    for (const k of Object.keys(o)) {
      if (n++ > 50) {
        out.__more = true;
        break;
      }
      try {
        out[k] = ser(o[k], depth - 1, seen);
      } catch (e) {
        out[k] = '[err]';
      }
    }
    return out;
  };
  const out = { href: location.href, title: document.title, typeofFbq: typeof window.fbq };
  const f = window.fbq;
  if (typeof f === 'function') {
    out.fbq = {
      version: f.version,
      loaded: f.loaded,
      queueLength: f.queue ? f.queue.length : null,
      typeofCallMethod: typeof f.callMethod,
      typeofGetState: typeof f.getState,
      keys: Object.keys(f),
    };
    try {
      out.fbq.getState = f.getState ? ser(f.getState(), 4, new Set()) : null;
    } catch (e) {
      out.fbq.getStateErr = String(e);
    }
    try {
      const prim = {};
      for (const k of Object.keys(f)) {
        const v = f[k];
        const t = typeof v;
        if (t === 'string' || t === 'number' || t === 'boolean') prim[k] = v;
        else if (v && t === 'object' && /consent|optin|opt_in|pending|lock|cookie|gat|privacy|dpo|ldu/i.test(k))
          prim[k] = ser(v, 3, new Set());
      }
      out.fbq.props = prim;
    } catch (e) {}
    try {
      if (f.instance) {
        const inst = {};
        for (const k of Object.keys(f.instance)) {
          const v = f.instance[k];
          const t = typeof v;
          if (t === 'function') continue;
          if (t !== 'object' || v === null) inst[k] = ser(v, 0, new Set());
          else if (/consent|optin|opt_in|lock|cookie|gat|privacy|dpo|ldu|pluginConfig/i.test(k))
            inst[k] = ser(v, 3, new Set());
          else inst[k] = Array.isArray(v) ? `[array ${v.length}]` : '[object]';
        }
        out.fbq.instance = inst;
      }
    } catch (e) {
      out.fbq.instanceErr = String(e);
    }
  }
  out.docCookie = document.cookie;
  try {
    out.lsConsent = localStorage.getItem('manasik-consent');
  } catch (e) {
    out.lsConsent = '[err]';
  }
  const b = document.querySelector('div[role="dialog"][aria-live="polite"]');
  out.banner = !!b;
  out.bannerButtons = b ? [...b.querySelectorAll('button')].map((x) => x.textContent.trim()) : null;
  try {
    out.gtagConsentCalls = (window.dataLayer || [])
      .filter((a) => a && a[0] === 'consent')
      .map((a) => [a[0], a[1], Object.assign({}, a[2], a[2] && a[2].region ? { region: `[${a[2].region.length} regions]` } : {})]);
  } catch (e) {}
  try {
    const ics = window.google_tag_data && window.google_tag_data.ics;
    if (ics && ics.entries) {
      out.googleIcs = {};
      for (const k of Object.keys(ics.entries)) {
        const en = ics.entries[k];
        out.googleIcs[k] = { default: en.default, update: en.update, implicit: en.implicit, region: en.region };
      }
      out.googleIcsUsedDefault = ics.usedDefault;
    }
  } catch (e) {}
  out.typeofTtq = typeof window.ttq;
  out.fbScripts = [...document.scripts].filter((s) => /facebook/.test(s.src)).map((s) => s.src.slice(0, 200));
  out.fbInline = [...document.scripts]
    .filter((s) => !s.src && /fbq\(/.test(s.textContent))
    .map((s) => s.textContent.replace(/\s+/g, ' ').slice(0, 1400));
  out.heldFlag = window.__manasikMetaPageViewHeld;
  out.fbqCalls = window.__diagFbqCalls || null;
  out.webdriver = navigator.webdriver;
  out.tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
  out.lang = navigator.language;
  return out;
}

async function snap(rec, page, ctx, label) {
  let s;
  try {
    s = await page.evaluate(pageSnapshot);
  } catch (e) {
    s = { evalError: String(e).slice(0, 200) };
  }
  let cookies = [];
  try {
    cookies = (await ctx.cookies())
      .filter((c) => /^(_fbp|_fbc|_ttp|_ga.*|_scid|_gcl.*|manasik-consent|_tt_.*|_gid)$/.test(c.name))
      .map((c) => ({ name: c.name, domain: c.domain, value: c.value.slice(0, 70), expires: Math.round(c.expires) }));
  } catch (e) {}
  s.cookies = cookies;
  s.atMs = Date.now() - rec.startedAt;
  s.fbRequestsSoFar = rec.fb.length;
  s.trSoFar = rec.fb.filter((e) => e.ev !== undefined).map((e) => `${e.method} ${e.short} ev=${e.ev} -> ${e.status ?? e.failure ?? 'pending'}`);
  rec.snaps[label] = s;
  return s;
}

function mkRec(vantage, id, kind, url) {
  return {
    vantage,
    id,
    kind,
    url,
    startedAt: Date.now(),
    doc: null,
    fb: [],
    google: [],
    hosts: {},
    console: [],
    pageErrors: [],
    snaps: {},
    notes: [],
    _pending: [],
  };
}

const FBQ_SPY = () => {
  // Wrap window.fbq in a Proxy that records every call without changing behaviour.
  window.__diagFbqCalls = [];
  let real;
  const t0 = Date.now();
  try {
    Object.defineProperty(window, 'fbq', {
      configurable: true,
      get() {
        return real;
      },
      set(v) {
        if (typeof v !== 'function') {
          real = v;
          return;
        }
        real = new Proxy(v, {
          apply(target, thisArg, args) {
            try {
              let a;
              try {
                a = JSON.stringify(Array.from(args)).slice(0, 300);
              } catch (e) {
                a = '[unserializable]';
              }
              const st = (new Error().stack || '').split('\n').slice(2, 5).map((x) => x.trim().slice(0, 140));
              window.__diagFbqCalls.push({ t: Date.now() - t0, args: a, stack: st });
            } catch (e) {}
            return Reflect.apply(target, thisArg, args);
          },
        });
      },
    });
  } catch (e) {
    window.__diagFbqCalls.push({ err: String(e) });
  }
};

async function withPage(V, id, kind, url, fn, opts = {}) {
  const rec = mkRec(V.name, id, kind, url);
  results.push(rec);
  log(`▶ ${V.name} ${id} ${url}`);
  let ctx;
  try {
    ctx = await V.browser.newContext({
      userAgent: UA,
      viewport: { width: 1366, height: 800 },
      locale: V.locale,
      timezoneId: V.tz,
      ignoreHTTPSErrors: false,
    });
    if (DRY) await dryRoutes(ctx);
    // Synthetic pages served under real hostnames (browser-side only; the live site never sees these requests).
    await ctx.route(/^https:\/\/[^/]+\/__diag\/[a-z0-9]+\.html$/, (route) => {
      const p = '/' + route.request().url().split('/__diag/')[1];
      if (PAGES[p]) return route.fulfill({ status: 200, contentType: 'text/html; charset=utf-8', body: PAGES[p] });
      return route.fulfill({ status: 404, body: 'nf' });
    });
    if (opts.spy) await ctx.addInitScript(FBQ_SPY);
    attach(ctx, rec, V.name);
    const page = await ctx.newPage();
    page.on('console', (m) => {
      if (m.type() === 'error' || (m.type() === 'warning' && /pixel|fbq|facebook|consent/i.test(m.text())))
        rec.console.push(`${m.type()}: ${m.text().slice(0, 300)}`);
    });
    page.on('pageerror', (e) => rec.pageErrors.push(String(e).slice(0, 300)));
    let resp = null;
    try {
      resp = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 90000 });
    } catch (e) {
      rec.notes.push(`goto error: ${String(e).slice(0, 200)}`);
    }
    if (resp) {
      const h = resp.headers();
      rec.doc = {
        status: resp.status(),
        finalUrl: resp.url(),
        server: h['server'],
        vercelId: h['x-vercel-id'],
        mitigated: h['x-vercel-mitigated'],
        cache: h['x-vercel-cache'],
      };
    }
    await page.waitForLoadState('load', { timeout: 45000 }).catch(() => rec.notes.push('load event not reached in 45s'));
    await fn(page, ctx, rec);
    await Promise.allSettled(rec._pending);
  } catch (e) {
    rec.notes.push(`scenario error: ${String(e).slice(0, 300)}`);
  } finally {
    delete rec._pending;
    if (ctx) await ctx.close().catch(() => {});
  }
  log(`■ ${V.name} ${id} done: ${line(rec)}`);
  return rec;
}

async function settle(page, ms = 15000) {
  await page.waitForTimeout(Math.round(ms / 2));
  await page.mouse.wheel(0, 1500).catch(() => {});
  await page.waitForTimeout(Math.round(ms / 2));
}

// ───────────────────────── scenarios ─────────────────────────
function liveScenarios(V) {
  const S = [];
  const base = async (page, ctx, rec) => {
    await settle(page, 15000);
    const s = await snap(rec, page, ctx, 't15');
    try {
      rec.geoDetect = await page.evaluate(async () => {
        try {
          const r = await fetch('/api/geo/detect', { cache: 'no-store' });
          return `${r.status} ${(await r.text()).slice(0, 200)}`;
        } catch (e) {
          return `err ${e}`;
        }
      });
    } catch (e) {}
    return s;
  };
  const tag = V.eu ? 'B' : 'A';
  S.push(() => withPage(V, `${tag}-en`, 'live', `${SITE}/en`, base));
  if (V.full) {
    S.push(() => withPage(V, `${tag}-ar`, 'live', `${SITE}/ar`, base));
    if (V.eu) S.push(() => withPage(V, 'B-de', 'live', `${SITE}/de`, base));
    S.push(() => withPage(V, `${tag}-en-spy`, 'live', `${SITE}/en`, base, { spy: true }));
    S.push(() => withPage(V, V.eu ? 'C-fbclid' : 'A-fbclid', 'live', `${SITE}/en?fbclid=IwAR0diagTEST123`, base));
  }
  if (V.full && V.eu) {
    S.push(() =>
      withPage(V, 'D-accept', 'live', `${SITE}/en`, async (page, ctx, rec) => {
        await base(page, ctx, rec);
        try {
          await page
            .locator('div[role="dialog"][aria-live="polite"] button')
            .filter({ hasText: /Accept all|قبول الكل/ })
            .first()
            .click({ timeout: 8000 });
          rec.notes.push('clicked Accept');
        } catch (e) {
          rec.notes.push(`accept click failed: ${String(e).slice(0, 160)}`);
        }
        await page.waitForTimeout(10000);
        await snap(rec, page, ctx, 'afterAccept');
        try {
          await page.goto(`${SITE}/en/privacy`, { waitUntil: 'domcontentloaded', timeout: 90000 });
          await page.waitForLoadState('load', { timeout: 45000 }).catch(() => {});
        } catch (e) {
          rec.notes.push(`nav error: ${String(e).slice(0, 160)}`);
        }
        await settle(page, 12000);
        await snap(rec, page, ctx, 'afterNav');
      }),
    );
  }
  {
    S.push(() =>
      withPage(V, 'E-fbqGrant+PV', 'live', `${SITE}/en`, async (page, ctx, rec) => {
        await base(page, ctx, rec);
        await page.evaluate(() => {
          window.fbq('consent', 'grant');
          window.fbq('track', 'PageView');
        });
        await page.waitForTimeout(10000);
        await snap(rec, page, ctx, 'afterGrant');
      }),
    );
  }
  if (V.full) {
    S.push(() =>
      withPage(V, 'E2-fbqGrantOnly', 'live', `${SITE}/en`, async (page, ctx, rec) => {
        await base(page, ctx, rec);
        await page.evaluate(() => window.fbq('consent', 'grant'));
        await page.waitForTimeout(10000);
        await snap(rec, page, ctx, 'afterGrant');
      }),
    );
    S.push(() =>
      withPage(V, 'F-gtagGrant', 'live', `${SITE}/en`, async (page, ctx, rec) => {
        await base(page, ctx, rec);
        await page.evaluate(() =>
          window.gtag('consent', 'update', {
            ad_storage: 'granted',
            ad_user_data: 'granted',
            ad_personalization: 'granted',
            analytics_storage: 'granted',
          }),
        );
        await page.waitForTimeout(10000);
        await snap(rec, page, ctx, 'afterGtagGrant');
      }),
    );
    S.push(() =>
      withPage(V, 'H-extraPVOnly', 'live', `${SITE}/en`, async (page, ctx, rec) => {
        await base(page, ctx, rec);
        await page.evaluate(() => window.fbq('track', 'PageView'));
        await page.waitForTimeout(10000);
        await snap(rec, page, ctx, 'afterExtraPV');
      }),
    );
  }
  return S;
}

// What lib/consent.ts grantAllConsent() does on the fix branch, run from the page.
const SIM_ACCEPT = () => {
  const choice = {
    ad_storage: 'granted',
    analytics_storage: 'granted',
    ad_user_data: 'granted',
    ad_personalization: 'granted',
    decidedAt: new Date().toISOString(),
  };
  localStorage.setItem('manasik-consent', JSON.stringify(choice));
  document.cookie = `manasik-consent=${encodeURIComponent(JSON.stringify(choice))}; max-age=${365 * 24 * 60 * 60}; path=/; SameSite=Lax`;
  if (window.gtag)
    window.gtag('consent', 'update', {
      ad_storage: 'granted',
      analytics_storage: 'granted',
      ad_user_data: 'granted',
      ad_personalization: 'granted',
    });
  if (window.fbq) {
    try {
      window.fbq('consent', 'grant');
    } catch (e) {}
  }
  if (window.fbq && window.__manasikMetaPageViewHeld) {
    window.__manasikMetaPageViewHeld = false;
    try {
      window.fbq('track', 'PageView');
    } catch (e) {}
  }
};

function synScenarios(V) {
  const simple = (id, p, origin = SYN, kind = 'syn') => () =>
    withPage(V, id, kind, `${origin}${p}`, async (page, ctx, rec) => {
      await settle(page, 14000);
      await snap(rec, page, ctx, 'final');
    });
  const fixAccept = (id, url, kind) => () =>
    withPage(V, id, kind, url, async (page, ctx, rec) => {
      await page.waitForTimeout(8000);
      await snap(rec, page, ctx, 'held');
      await page.evaluate(SIM_ACCEPT);
      await page.waitForTimeout(10000);
      await snap(rec, page, ctx, 'afterAccept');
      rec.reloadMarker = rec.fb.length;
      await page.reload({ waitUntil: 'load', timeout: 60000 }).catch((e) => rec.notes.push(`reload: ${String(e).slice(0, 100)}`));
      await page.waitForTimeout(10000);
      await snap(rec, page, ctx, 'afterReload');
    });
  const S = [simple('S1', '/s1.html')];
  // R*: same synthetic pages, but served to the browser under the real site origin
  S.push(simple('R1-www', '/__diag/s1.html', 'https://www.manasik.net', 'rsyn-www'));
  if (V.full) {
    S.push(simple('R1-apex', '/__diag/s1.html', 'https://manasik.net', 'rsyn-apex'));
    S.push(simple('R1-sub', '/__diag/s1.html', 'https://diag.manasik.net', 'rsyn-sub'));
    S.push(simple('R5-www-grantFirst', '/__diag/s5.html', 'https://www.manasik.net', 'rsyn-www'));
    S.push(fixAccept('R4-www-fixTrue', 'https://www.manasik.net/__diag/s4t.html', 'rsyn-www'));
  }
  if (V.full) {
    S.push(simple('S2', '/s2.html'));
    S.push(simple('S2b', '/s2b.html'));
    S.push(() =>
      withPage(V, 'S3', 'syn', `${SYN}/s3.html`, async (page, ctx, rec) => {
        await page.waitForTimeout(3500);
        await snap(rec, page, ctx, 'beforeGrant');
        await page.waitForTimeout(12000);
        await snap(rec, page, ctx, 'final');
      }),
    );
    S.push(simple('S3b', '/s3b.html'));
    S.push(fixAccept('S4-true', `${SYN}/s4t.html`, 'syn'));
    S.push(simple('S4-false', '/s4f.html'));
    S.push(simple('S5', '/s5.html'));
  }
  return S;
}

async function ipCheck(V, label) {
  const ctx = await V.browser.newContext({ userAgent: UA });
  const page = await ctx.newPage();
  const out = {};
  for (const [k, u] of [
    ['ipinfo', 'https://ipinfo.io/json'],
    ['cftrace', 'https://www.cloudflare.com/cdn-cgi/trace'],
    ['ifconfigco', 'https://ifconfig.co/json'],
    ['countryis', 'https://api.country.is/'],
    ['ipwhois', 'https://ipwho.is/'],
    ['sitegeo', `${SITE}/api/geo/detect`],
  ]) {
    try {
      await page.goto(u, { timeout: 45000, waitUntil: 'domcontentloaded' });
      const txt = await page.evaluate(() => document.body.innerText);
      if (k === 'cftrace') {
        out.cftrace = { ip: (txt.match(/ip=(.*)/) || [])[1], loc: (txt.match(/loc=(.*)/) || [])[1] };
      } else if (k === 'sitegeo') {
        out.sitegeo = txt.slice(0, 120);
      } else {
        const j = JSON.parse(txt);
        out[k] = { ip: j.ip, country: j.country || j.country_iso || j.country_code, city: j.city, org: j.org || j.asn_org || (j.connection && j.connection.isp) };
      }
    } catch (e) {
      out[k] = { error: String(e).slice(0, 150) };
    }
  }
  await ctx.close();
  log(`IP check ${V.name} (${label}): ${JSON.stringify(out)}`);
  V.ip = V.ip || {};
  V.ip[label] = out;
  return out;
}

async function pool(tasks, n) {
  let i = 0;
  await Promise.all(
    Array.from({ length: n }, async () => {
      while (i < tasks.length) {
        const t = tasks[i++];
        try {
          await t();
        } catch (e) {
          log('task error', String(e).slice(0, 200));
        }
      }
    }),
  );
}

// ───────────────────────── dry-run stubs (local plumbing test only) ─────────────────────────
async function dryRoutes(ctx) {
  await ctx.route(/connect\.facebook\.net\/en_US\/fbevents\.js/, (r) =>
    r.fulfill({
      contentType: 'application/javascript',
      body: `(function(){var f=window.fbq;var revoked=false,q=[];function send(ev){var i=new Image();i.src='https://www.facebook.com/tr/?id=${PIXEL}&ev='+ev;document.cookie='_fbp=fb.1.'+Date.now()+'.1; path=/';}
f.callMethod=function(m,a){if(m==='consent'){revoked=(a==='revoke');if(!revoked){q.splice(0).forEach(send)}}else if(m==='track'){revoked?q.push(a):send(a)}};f.getState=function(){return {pixels:[{id:'${PIXEL}'}]}};
var old=f.queue.splice(0);old.forEach(function(x){f.callMethod.apply(f,x)});})();`,
    }),
  );
  await ctx.route(/www\.facebook\.com\//, (r) => r.fulfill({ status: 200, contentType: 'image/gif', body: '' }));
  await ctx.route(/googletagmanager\.com/, (r) => r.fulfill({ status: 200, contentType: 'application/javascript', body: '' }));
}

// ───────────────────────── summary ─────────────────────────
function evCounts(list) {
  const m = {};
  for (const e of list) {
    const k = `${e.ev}${e.status === 200 ? '' : `(${e.status ?? e.failure ?? 'pending'})`}`;
    m[k] = (m[k] || 0) + 1;
  }
  return Object.entries(m)
    .map(([k, v]) => `${k}x${v}`)
    .join(',');
}
function line(rec) {
  const lastKey = Object.keys(rec.snaps).pop();
  const last = rec.snaps[lastKey] || {};
  const first = rec.snaps[Object.keys(rec.snaps)[0]] || {};
  const fbev = rec.fb.filter((e) => /fbevents\.js/.test(e.short));
  const cfg = rec.fb.filter((e) => /signals\/config/.test(e.short));
  const tr = rec.fb.filter((e) => e.ev !== undefined && /^www\.facebook\.com\/tr/.test(e.short));
  const ps = rec.fb.filter((e) => e.ev !== undefined && /privacy_sandbox/.test(e.short));
  const st = (l) => (l.length ? l.map((e) => e.status ?? e.failure ?? 'pending').join('/') : 'none');
  const ck = (n) => ((last.cookies || []).some((c) => c.name === n) ? 'Y' : 'n');
  return [
    `doc=${rec.doc ? rec.doc.status : '-'}${rec.doc?.mitigated ? `(mitigated:${rec.doc.mitigated})` : ''}`,
    `banner=${first.banner ? 'Y' : 'n'}`,
    `fbevents=${st(fbev)}`,
    `config=${st(cfg)}`,
    `tr=${tr.length}[${evCounts(tr)}]`,
    `psb=${ps.length}`,
    `_fbp=${ck('_fbp')}`,
    `_fbc=${ck('_fbc')}`,
    `_ttp=${ck('_ttp')}`,
    `fbq=${last.typeofFbq}${last.fbq ? `/cm:${last.fbq.typeofCallMethod}/q:${last.fbq.queueLength}` : ''}`,
    `errs=${rec.pageErrors.length}p/${rec.console.length}c`,
    rec.notes.length ? `notes=${rec.notes.join('; ')}` : '',
  ]
    .filter(Boolean)
    .join(' ');
}

// ───────────────────────── main ─────────────────────────
const server = await startServer();
log(`synthetic server on ${SYN}`);

const vantages = [];
const launch = (proxyPort) =>
  chromium.launch({
    headless: true,
    channel: DRY ? undefined : 'chromium',
    args: [
      '--disable-blink-features=AutomationControlled',
      `--host-resolver-rules=MAP ${SYN_HOST} 127.0.0.1`,
      ...(DRY ? ['--no-proxy-server'] : []),
    ],
    proxy: proxyPort ? { server: `socks5://127.0.0.1:${proxyPort}`, bypass: `${SYN_HOST},127.0.0.1,localhost` } : undefined,
  });

const want = (n) => !ONLY.length || ONLY.includes(n);
if (want('US'))
  vantages.push({ name: 'US', eu: false, full: true, tz: 'America/Los_Angeles', locale: 'en-US', browser: await launch(null), conc: 3 });
if (!DRY) {
  const torDefs = [
    { name: 'EU', port: 9050, countries: ['de', 'nl', 'se', 'ie', 'at'], eu: true, full: true, tz: 'Europe/Berlin', locale: 'de-DE', conc: 3 },
    { name: 'UK', port: 9051, countries: ['gb'], eu: true, full: true, tz: 'Europe/London', locale: 'en-GB', conc: 3 },
    { name: 'EU2', port: 9053, countries: ['fr', 'es', 'it', 'pl', 'be'], eu: true, full: false, tz: 'Europe/Paris', locale: 'fr-FR', conc: 2 },
    { name: 'TORUS', port: 9052, countries: ['us'], eu: false, full: false, tz: 'America/New_York', locale: 'en-US', conc: 2 },
    { name: 'NL', port: 9054, countries: ['nl'], eu: true, full: false, tz: 'Europe/Amsterdam', locale: 'nl-NL', conc: 2 },
    { name: 'TORCA', port: 9055, countries: ['ca'], eu: false, full: false, tz: 'America/Toronto', locale: 'en-CA', conc: 2 },
  ].filter((d) => want(d.name));
  const started = await Promise.all(torDefs.map((d) => startTor(d.port, d.countries)));
  for (let i = 0; i < torDefs.length; i++) {
    const d = torDefs[i];
    if (!started[i]) {
      log(`!! vantage ${d.name}: no usable Tor exit (tried ${d.countries.join(',')})`);
      results.push({ vantage: d.name, id: 'TOR-FAILED', kind: 'meta', notes: [`no usable exit among ${d.countries.join(',')}`], fb: [], snaps: {}, pageErrors: [], console: [] });
      continue;
    }
    vantages.push({ ...d, tor: started[i], browser: await launch(d.port) });
  }
}

const surveyPromise = DRY || process.env.DIAG_SKIP_SURVEY === '1'
  ? Promise.resolve()
  : (async () => {
      try {
        await surveyPort('runner-direct', null, [...SURVEY_DOMAINS, 'diag.manasik.net', 'example.com']);
        for (const V of vantages) if (V.tor) await surveyPort(`${V.name}-tor-${V.tor.cc}`, V.port, [...SURVEY_DOMAINS, 'diag.manasik.net', 'example.com']);
        await runSurvey(
          ['fr', 'nl', 'se', 'ie', 'es', 'it', 'pl', 'at', 'be', 'dk', 'fi', 'no', 'ch', 'ro', 'cz', 'lu', 'ca', 'sg', 'jp', 'au', 'br', 'tr', 'in', 'za', 'ua', 'md', 'hk', 'mx'],
          Number(process.env.DIAG_SURVEY_DEADLINE_MS || 420000),
        );
      } catch (e) {
        log(`survey error ${String(e).slice(0, 200)}`);
      }
    })();

await Promise.all(
  vantages.map(async (V) => {
    try {
      await ipCheck(V, 'start');
      // synthetic first (fast), then live
      await pool([...synScenarios(V), ...liveScenarios(V)], V.conc);
      await ipCheck(V, 'end');
    } catch (e) {
      log(`vantage ${V.name} error: ${String(e).slice(0, 300)}`);
    }
  }),
);

await surveyPromise;
for (const V of vantages) await V.browser.close().catch(() => {});
for (const p of torProcs) p.kill();
server.close();

const meta = {
  generatedAt: new Date().toISOString(),
  vantages: vantages.map((V) => ({ name: V.name, tor: V.tor || null, ip: V.ip, tz: V.tz, locale: V.locale })),
};
fs.writeFileSync(path.join(OUT, 'results.json'), JSON.stringify({ meta, results, survey }, null, 1));
fs.writeFileSync(path.join(OUT, 'bodies-index.json'), JSON.stringify(bodyIndex, null, 1));

console.log('\n===== VANTAGES =====');
console.log(JSON.stringify(meta, null, 1));
console.log('\n===== CONFIG SURVEY (curl) =====');
for (const r of survey)
  console.log(
    `${String(r.label).padEnd(14)} siteCountry=${r.siteCountry ?? '-'} ` +
      (r.error || r.configs.map((c) => `${c.domain}: ${c.error ? 'ERR' : `size=${c.size} prohibited=${c.prohibitedPixels || 'no'}`}`).join(' | ')),
  );
console.log('\n===== SUMMARY =====');
for (const r of results) console.log(`${String(r.vantage).padEnd(6)} ${String(r.id).padEnd(16)} ${r.kind === 'meta' ? r.notes.join(';') : line(r)}`);

console.log('\n===== DETAILS =====');
for (const r of results) {
  if (r.kind === 'meta') continue;
  console.log(`\n--- ${r.vantage} ${r.id} ${r.url}`);
  console.log(` doc: ${JSON.stringify(r.doc)} geoDetect: ${r.geoDetect ?? '-'}`);
  for (const e of r.fb) {
    const tp = e.trParams
      ? ` ev=${e.ev} keys=[${Object.keys(e.trParams).join(',')}]` +
        ['cdl', 'coo', 'gdpr', 'dpo', 'fbp', 'fbc', 'it', 'rqm', 'ler', 'cs_est', 'pm', 'hrl'].map((k) => (e.trParams[k] !== undefined ? ` ${k}=${e.trParams[k].slice(0, 60)}` : '')).join('')
      : '';
    const u = new URL(e.url);
    const q = e.trParams ? '' : u.search.slice(0, 220);
    console.log(` fb t=${e.t} ${e.method} ${e.short}${q} -> ${e.status ?? ''}${e.failure ? ` FAIL ${e.failure}` : ''}${e.size ? ` size=${e.size} sha=${e.sha256.slice(0, 12)}` : ''}${tp}`);
  }
  console.log(` google gcs: ${JSON.stringify(r.google)}`);
  console.log(` hosts: ${Object.entries(r.hosts).map(([h, n]) => `${h}:${n}`).join(' ')}`);
  if (r.pageErrors.length) console.log(` pageErrors: ${JSON.stringify(r.pageErrors)}`);
  if (r.console.length) console.log(` console: ${JSON.stringify(r.console.slice(0, 12))}`);
  if (r.notes.length) console.log(` notes: ${JSON.stringify(r.notes)}`);
  for (const [k, s] of Object.entries(r.snaps)) {
    const c = (s.cookies || []).map((x) => `${x.name}=${x.value.slice(0, 40)}@${x.domain}`).join(' ; ');
    console.log(
      ` snap[${k}] at=${s.atMs}ms banner=${s.banner} buttons=${JSON.stringify(s.bannerButtons)} typeofFbq=${s.typeofFbq} ttq=${s.typeofTtq} held=${s.heldFlag} ls=${s.lsConsent ? 'set' : 'none'} tz=${s.tz} webdriver=${s.webdriver}`,
    );
    console.log(`   cookies: ${c || '(none)'}`);
    console.log(`   tr so far: ${JSON.stringify(s.trSoFar)}`);
    if (s.fbq) console.log(`   fbq: ${JSON.stringify(s.fbq).slice(0, 2500)}`);
    if (s.gtagConsentCalls) console.log(`   gtag consent calls: ${JSON.stringify(s.gtagConsentCalls).slice(0, 700)}`);
    if (s.googleIcs) console.log(`   google ics: ${JSON.stringify(s.googleIcs).slice(0, 700)} usedDefault=${s.googleIcsUsedDefault}`);
    if (s.fbqCalls) console.log(`   fbq calls (spy): ${JSON.stringify(s.fbqCalls).slice(0, 3000)}`);
    if (k === Object.keys(r.snaps)[0] && s.fbInline) console.log(`   fb inline: ${JSON.stringify(s.fbInline).slice(0, 1500)}`);
    if (s.evalError) console.log(`   evalError: ${s.evalError}`);
  }
}
log('done');
process.stdout.write('', () => setTimeout(() => process.exit(0), 300));
