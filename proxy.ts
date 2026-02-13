import { NextRequest, NextResponse } from 'next/server';

// Middleware runs on Edge Runtime - we do a quick cookie check here.
// Full JWT verification happens in API routes via requireAuth.

// Routes that should redirect to /admin if already has token
const AUTH_ROUTES = ['/admin/login'];

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get('admin-token')?.value;

  // If user is on login page and has a token, redirect to admin dashboard
  if (AUTH_ROUTES.some((route) => pathname === route)) {
    if (token) {
      return NextResponse.redirect(new URL('/admin', request.url));
    }
    return NextResponse.next();
  }

  // If accessing any other /admin route without token, redirect to login
  if (!token) {
    return NextResponse.redirect(new URL('/admin/login', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*'],
};
