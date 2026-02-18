import { NextRequest, NextResponse } from 'next/server';

// Maps the second URL segment under /admin to an AdminPage key
const PAGE_MAP: Record<string, string> = {
  products: 'products',
  orders: 'orders',
  coupons: 'coupons',
  countries: 'countries',
  users: 'users',
  referrals: 'referrals',
  logs: 'activityLogs',
  'payment-settings': 'paymentSettings',
};

interface JwtPayload {
  userId: string;
  role: string;
  allowedPages?: string[];
  exp?: number;
}

// Edge-compatible base64url → base64 conversion
function b64url(str: string): string {
  return str
    .replace(/-/g, '+')
    .replace(/_/g, '/')
    .padEnd(str.length + ((4 - (str.length % 4)) % 4), '=');
}

// Verify an HS256 JWT using the Web Crypto API (Edge-compatible)
async function verifyJwt(
  token: string,
  secret: string,
): Promise<JwtPayload | null> {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const [header, payload, sig] = parts;

    const key = await crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['verify'],
    );

    const valid = await crypto.subtle.verify(
      'HMAC',
      key,
      Uint8Array.from(atob(b64url(sig)), (c) => c.charCodeAt(0)),
      new TextEncoder().encode(`${header}.${payload}`),
    );

    if (!valid) return null;

    const decoded: JwtPayload = JSON.parse(atob(b64url(payload)));

    // Check token expiry
    if (decoded.exp && Date.now() / 1000 > decoded.exp) return null;

    return decoded;
  } catch {
    return null;
  }
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get('admin-token')?.value;

  // If user is on login page and has a valid token, redirect to admin dashboard
  if (pathname === '/admin/login') {
    if (token) {
      return NextResponse.redirect(new URL('/admin', request.url));
    }
    return NextResponse.next();
  }

  // No token → redirect to login
  if (!token) {
    return NextResponse.redirect(new URL('/admin/login', request.url));
  }

  const secret = process.env.JWT_SECRET;
  if (!secret) {
    return NextResponse.redirect(new URL('/admin/login', request.url));
  }

  const payload = await verifyJwt(token, secret);

  // Invalid or expired token → clear cookie and redirect to login
  if (!payload) {
    const response = NextResponse.redirect(
      new URL('/admin/login', request.url),
    );
    response.cookies.delete('admin-token');
    return response;
  }

  // Super admins can access every admin route
  if (payload.role === 'super_admin') {
    return NextResponse.next();
  }

  // For regular admins, enforce per-page permissions
  // e.g. /admin/products/new → segments[1] = 'products'
  const segments = pathname.split('/').filter(Boolean);
  const pageSegment = segments[1]; // undefined for /admin (dashboard)

  if (pageSegment) {
    const pageKey = PAGE_MAP[pageSegment];
    if (pageKey && !payload.allowedPages?.includes(pageKey)) {
      // No permission → redirect to dashboard
      return NextResponse.redirect(new URL('/admin', request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*'],
};
