import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/**
 * Whether the payment page (EasyKash) lets itself be shown inside this site, so the site can open it in its own
 * sheet instead of leaving for it. The page is asked for once and only its headers are read: X-Frame-Options and
 * the CSP's frame-ancestors. Any doubt (another host, an error, a slow answer) says no, and the site then goes to
 * the payment page as it always did. The answer for a host is kept for a while, so a payment is rarely slowed.
 */
const TTL_MS = 10 * 60 * 1000;
const kept = new Map<string, { frameable: boolean; reason: string; at: number }>();

const allowedHost = (host: string) => host === 'easykash.net' || host.endsWith('.easykash.net');

/** '' when this site may show the page; otherwise why not. */
function frameBlock(headers: Headers): string {
  const xfo = (headers.get('x-frame-options') || '').trim().toLowerCase();
  if (xfo) return `x-frame-options: ${xfo}`; // DENY, SAMEORIGIN, or the obsolete ALLOW-FROM: none allows this site
  const csp = headers.get('content-security-policy') || '';
  const m = /(?:^|;)\s*frame-ancestors\s*([^;]*)/i.exec(csp);
  if (!m) return '';
  const sources = m[1].trim().split(/\s+/).filter(Boolean);
  if (sources.length === 0 || sources.includes("'none'")) return 'frame-ancestors: none';
  const ok = sources.some((s) => s === '*' || s === 'https:' || /(^|\.|\/\/|\*\.)manasik\.net$/i.test(s.replace(/\/$/, '')));
  return ok ? '' : `frame-ancestors: ${sources.join(' ')}`;
}

export async function GET(request: NextRequest) {
  const raw = request.nextUrl.searchParams.get('u') || '';
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return NextResponse.json({ frameable: false, reason: 'bad url' });
  }
  if (url.protocol !== 'https:' || !allowedHost(url.hostname)) {
    return NextResponse.json({ frameable: false, reason: 'not the payment host' });
  }

  const key = url.hostname;
  const hit = kept.get(key);
  if (hit && Date.now() - hit.at < TTL_MS) return NextResponse.json({ frameable: hit.frameable, reason: hit.reason });

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 3000);
  try {
    const res = await fetch(url.toString(), {
      method: 'GET',
      redirect: 'follow',
      signal: controller.signal,
      cache: 'no-store',
      headers: { 'user-agent': request.headers.get('user-agent') || 'Mozilla/5.0', accept: 'text/html' },
    });
    try {
      await res.body?.cancel();
    } catch {
      // the body is not needed
    }
    let finalHostOk = true;
    try {
      finalHostOk = allowedHost(new URL(res.url).hostname);
    } catch {
      finalHostOk = false;
    }
    const block = frameBlock(res.headers);
    const reason = !res.ok ? `status ${res.status}` : !finalHostOk ? 'left the payment host' : block;
    const frameable = !reason;
    kept.set(key, { frameable, reason, at: Date.now() });
    return NextResponse.json({ frameable, reason });
  } catch (e) {
    return NextResponse.json({ frameable: false, reason: e instanceof Error && e.name === 'AbortError' ? 'slow' : 'error' });
  } finally {
    clearTimeout(timer);
  }
}
