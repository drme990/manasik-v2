import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;

  if (!token) {
    return NextResponse.json(
      { success: false, error: 'Invalid pay link token' },
      { status: 400 },
    );
  }

  const upstreamUrl = new URL(
    `/api/payment/links/custom/${encodeURIComponent(token)}`,
    request.nextUrl.origin,
  );

  const upstream = await fetch(upstreamUrl.toString(), {
    method: 'GET',
    redirect: 'manual',
    cache: 'no-store',
  });

  const location = upstream.headers.get('location');
  if (location && upstream.status >= 300 && upstream.status < 400) {
    return NextResponse.redirect(location, { status: upstream.status });
  }

  const body = await upstream.text();
  return new NextResponse(body, {
    status: upstream.status,
    headers: {
      'content-type':
        upstream.headers.get('content-type') || 'application/json',
    },
  });
}
