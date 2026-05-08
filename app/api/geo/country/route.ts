import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const VERCEL_COUNTRY_HEADER = 'x-vercel-ip-country';
const VERCEL_IP_HEADER = 'x-vercel-ip-address';

function normalizeCountryCode(raw: string | null): string | null {
  if (!raw) return null;

  const code = raw.trim().toUpperCase();
  if (!/^[A-Z]{2}$/.test(code)) return null;
  if (code === 'XX' || code === 'ZZ') return null;

  return code;
}

function getClientIp(request: NextRequest): string | null {
  const direct = request.headers.get(VERCEL_IP_HEADER);
  if (direct && direct.trim()) return direct.trim();

  const forwarded = request.headers.get('x-forwarded-for');
  if (!forwarded) return null;

  const first = forwarded.split(',')[0]?.trim();
  return first || null;
}

async function getCountryFromCountryIs(ip: string): Promise<string | null> {
  try {
    const res = await fetch(`https://country.is/${encodeURIComponent(ip)}`, {
      cache: 'no-store',
    });
    if (!res.ok) return null;

    const data = (await res.json()) as { country?: string | null };
    return normalizeCountryCode(data.country ?? null);
  } catch {
    return null;
  }
}

export async function GET(request: NextRequest) {
  const countryFromVercel = normalizeCountryCode(
    request.headers.get(VERCEL_COUNTRY_HEADER),
  );

  const ip = getClientIp(request);
  const countryFromIp = ip ? await getCountryFromCountryIs(ip) : null;

  const countryCode = countryFromVercel ?? countryFromIp;

  return NextResponse.json(
    {
      success: true,
      data: {
        countryCode,
      },
    },
    {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate',
      },
    },
  );
}

