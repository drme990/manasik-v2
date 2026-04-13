import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const COUNTRY_HEADER_CANDIDATES = [
  'x-vercel-ip-country',
  'cf-ipcountry',
  'cloudfront-viewer-country',
  'x-country-code',
] as const;

function normalizeCountryCode(raw: string | null): string | null {
  if (!raw) return null;

  const code = raw.trim().toUpperCase();
  if (!/^[A-Z]{2}$/.test(code)) return null;
  if (code === 'XX' || code === 'ZZ') return null;

  return code;
}

export async function GET(request: NextRequest) {
  const countryCode = COUNTRY_HEADER_CANDIDATES.reduce<string | null>(
    (resolved, headerName) => {
      if (resolved) return resolved;
      return normalizeCountryCode(request.headers.get(headerName));
    },
    null,
  );

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
