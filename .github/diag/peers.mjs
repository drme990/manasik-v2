// Diagnostic only (context): does Meta serve the same "prohibitedPixels" config
// to European IPs for other sites' pixels? Reads public pages/configs; sends no events.
import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';
import { spawn, execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';
const execFileP = promisify(execFile);
const HERE = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(HERE, 'out');
fs.mkdirSync(OUT, { recursive: true });
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36';
const T0 = Date.now();
const log = (...a) => console.log(`[${((Date.now() - T0) / 1000).toFixed(1)}s]`, ...a);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const CFG = (id, domain) =>
  `https://connect.facebook.net/signals/config/${id}?v=2.9.415&r=stable&domain=${encodeURIComponent(domain)}&hme=a4c28c8787325ac3f8f9eac68364f47df2a8c4266e43177443e5d7f6289c9774&ex_m=117%2C240%2C170%2C27%2C81%2C82%2C161%2C77%2C76%2C11%2C180%2C101%2C20%2C152%2C140%2C46%2C84%2C89%2C148`;
async function curl(args) {
  try {
    return (await execFileP('curl', ['-sS', '--compressed', '--max-time', '30', '-A', UA, ...args], { maxBuffer: 64 * 1024 * 1024 })).stdout;
  } catch (e) {
    return `CURL_ERR ${String(e.stderr || e.message).slice(0, 120)}`;
  }
}
const viaTor = (port, circ) => (port ? ['--socks5-hostname', `127.0.0.1:${port}`, '--proxy-user', `p${circ}:x`] : []);
async function cfg(port, circ, id, domain) {
  const t = await curl([...viaTor(port, circ), '-e', `https://${domain}/`, CFG(id, domain)]);
  if (t.startsWith('CURL_ERR')) return 'ERR';
  const m = t.match(/config\.set\("\d+", "prohibitedPixels", (\{[^}]*\})\)/);
  const real = /"FirstPartyCookies", true|"ProhibitedPixels", true|instance\.optIn\("\d+", "Gating"/.test(t);
  return `${m ? 'BLOCK ' + m[1] : 'ok'}${real ? '' : ' (generic/unknown pixel)'} [${t.length}]`;
}
async function torUp(port, cc) {
  const dir = `/tmp/torp-${port}-${cc}`;
  fs.mkdirSync(`${dir}/data`, { recursive: true });
  fs.chmodSync(`${dir}/data`, 0o700);
  fs.writeFileSync(`${dir}/torrc`, `SocksPort 127.0.0.1:${port}\nDataDirectory ${dir}/data\nExitNodes {${cc}}\nStrictNodes 1\nLog notice stdout\nClientOnly 1\n`);
  const p = spawn('tor', ['-f', `${dir}/torrc`], { stdio: ['ignore', 'pipe', 'pipe'] });
  let ok = false, buf = '';
  p.stdout.on('data', (d) => { buf += d; if (/Bootstrapped 100%/.test(buf)) ok = true; });
  const s = Date.now();
  while (!ok && Date.now() - s < 150000 && p.exitCode === null) await sleep(300);
  return ok ? p : null;
}
const SITES = [
  // the site under investigation (reference)
  ['www.manasik.net', 'reference'],
  // religious services / faith-based charities
  ['www.islamic-relief.org.uk', 'faith'], ['muslimhands.org.uk', 'faith'], ['humanappeal.org.uk', 'faith'], ['pennyappeal.org', 'faith'],
  ['www.muslimaid.org', 'faith'], ['www.launchgood.com', 'faith'], ['uwt.org', 'faith'], ['www.zakat.org', 'faith'], ['irusa.org', 'faith'],
  ['matwproject.org', 'faith'], ['www.islamichelp.org.uk', 'faith'], ['www.sktwelfare.org', 'faith'], ['www.alkhair.org', 'faith'],
  ['www.globalehsanrelief.org', 'faith'], ['www.ilmfeed.com', 'faith'], ['www.compassion.com', 'faith'], ['www.samaritanspurse.org', 'faith'],
  ['www.worldvision.org', 'faith'], ['www.chabad.org', 'faith'], ['www.biblegateway.com', 'faith'], ['www.christianaid.org.uk', 'faith'],
  ['www.tearfund.org', 'faith'], ['www.cafod.org.uk', 'faith'], ['www.aqiqah.com.my', 'faith'], ['www.qurbani.com', 'faith'],
  // neutral controls
  ['www.gymshark.com', 'control'], ['www.allbirds.com', 'control'], ['www.notonthehighstreet.com', 'control'], ['www.oxfam.org.uk', 'control'],
  ['www.savethechildren.org.uk', 'control'], ['www.redcross.org.uk', 'control'], ['www.unicef.org.uk', 'control'], ['www.wateraid.org', 'control'],
  ['www.muslimcharity.org.uk', 'faith'], ['www.orphansinneed.org.uk', 'faith'], ['www.ummahcharity.org', 'faith'], ['www.onenationuk.org', 'faith'],
  ['www.charityright.org.uk', 'faith'], ['www.readfoundation.org.uk', 'faith'], ['www.interpal.org', 'faith'], ['www.muslimglobalrelief.org', 'faith'],
  ['www.salvationarmy.org.uk', 'faith'], ['www.christianbook.com', 'faith'], ['www.hillsong.com', 'faith'], ['www.jewishvirtuallibrary.org', 'faith'],
  ['www.cancerresearchuk.org', 'control'], ['www.bhf.org.uk', 'control'], ['www.rspca.org.uk', 'control'], ['www.wwf.org.uk', 'control'],
  ['www.boohoo.com', 'control'], ['www.etsy.com', 'control'], ['www.decathlon.co.uk', 'control'], ['www.hellofresh.co.uk', 'control'],
  ['www.myprotein.com', 'control'], ['www.bloomandwild.com', 'control'], ['www.moonpig.com', 'control'], ['www.trainline.com', 'control'],
];
const found = [];
await Promise.all(
  SITES.map(async ([host, kind]) => {
    const out = await curl(['-L', '-w', '\n__EFF__%{url_effective}', `https://${host}/`]);
    const eff = (out.match(/__EFF__(\S+)/) || [])[1] || '';
    let effHost = host;
    try { effHost = new URL(eff).hostname; } catch {}
    const ids = new Set();
    for (const re of [/fbq\(\s*['"]init['"]\s*,\s*['"](\d{12,18})['"]/g, /facebook\.com\/tr\?id=(\d{12,18})/g, /["']?pixel_?[iI]d["']?\s*[:=]\s*["'](\d{14,18})["']/g, /facebook_pixel_id["']?\s*[:=]\s*["'](\d{14,18})/g]) {
      let m;
      while ((m = re.exec(out))) ids.add(m[1]);
    }
    found.push({ host, effHost, kind, ids: [...ids].slice(0, 2), htmlLen: out.length });
  }),
);
// second pass with a real browser (direct, US): catches pixels injected by tag managers
{
  const browser = await chromium.launch({ headless: true, channel: 'chromium', args: ['--disable-blink-features=AutomationControlled'] });
  let i = 0;
  const worker = async () => {
    while (i < found.length) {
      const f = found[i++];
      const ctx = await browser.newContext({ userAgent: UA, viewport: { width: 1366, height: 800 }, locale: 'en-US' });
      const seen = new Map();
      ctx.on('request', (r) => {
        const m = r.url().match(/connect\.facebook\.net\/signals\/config\/(\d+)\?.*?domain=([^&]+)/);
        if (m) seen.set(m[1], decodeURIComponent(m[2]));
      });
      try {
        const page = await ctx.newPage();
        await page.goto(`https://${f.host}/`, { waitUntil: 'domcontentloaded', timeout: 30000 });
        await page.waitForTimeout(9000);
      } catch (e) {
        f.browserErr = String(e).slice(0, 80);
      }
      await ctx.close().catch(() => {});
      for (const [id, dom] of seen) {
        if (!f.ids.includes(id)) f.ids.push(id);
        f.effHost = dom;
      }
      f.ids = f.ids.slice(0, 2);
    }
  };
  await Promise.all([1, 2, 3, 4, 5, 6].map(worker));
  await browser.close();
}
found.sort((a, b) => SITES.findIndex((s) => s[0] === a.host) - SITES.findIndex((s) => s[0] === b.host));
for (const f of found) log(`site ${f.host} -> ${f.effHost} (${f.kind}) html=${f.htmlLen} pixelIds=${f.ids.join(',') || '-'}`);
if (!found[0].ids.includes('1545349236553470')) found[0].ids = ['1545349236553470'];

const [fr, gb, us] = await Promise.all([torUp(9201, 'fr'), torUp(9202, 'gb'), torUp(9203, 'us')]);
log(`tor fr=${!!fr} gb=${!!gb} us=${!!us}`);
const geo = async (port) => ((await curl([...viaTor(port, 1), 'https://www.instagram.com/'])).match(/"country_code":"([A-Z]{2})"/) || [])[1] || '?';
log(`Meta-reported country: fr-exit=${fr ? await geo(9201) : '-'} gb-exit=${gb ? await geo(9202) : '-'} us-exit=${us ? await geo(9203) : '-'}`);
const rows = [];
for (const f of found) {
  for (const id of f.ids) {
    const [d, a, b, c] = await Promise.all([
      cfg(null, 0, id, f.effHost),
      fr ? cfg(9201, 1, id, f.effHost) : '-',
      gb ? cfg(9202, 1, id, f.effHost) : '-',
      us ? cfg(9203, 1, id, f.effHost) : '-',
    ]);
    const row = { host: f.effHost, kind: f.kind, id, runnerUS: d, torFR: a, torGB: b, torUS: c };
    rows.push(row);
    log(`${f.kind.padEnd(9)} ${f.effHost.padEnd(30)} ${id} | US-direct: ${d} | FR: ${a} | GB: ${b} | US-tor: ${c}`);
  }
}
for (const p of [fr, gb, us]) if (p) p.kill();
fs.writeFileSync(path.join(OUT, 'peers.json'), JSON.stringify({ found, rows }, null, 1));
process.stdout.write('', () => setTimeout(() => process.exit(0), 300));
