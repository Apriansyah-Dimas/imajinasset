import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import jwt from 'jsonwebtoken';

// Public routes that don't require authentication
const publicRoutes = ['/login', '/api/auth/login', '/api/auth/me', '/api/auth/logout'];

// Role-based route protection
const roleBasedRoutes = {
  '/admin': 'ADMIN',
  '/api/admin': 'ADMIN',
  '/so-asset': ['ADMIN', 'SO_ASSET_USER'],
  '/api/so-asset': ['ADMIN', 'SO_ASSET_USER'],
};

export function middleware(request: NextRequest) {
  // DISABLED MIDDLEWARE - Allow all routes for now
  // TODO: Re-enable middleware after fixing token verification

  const { pathname } = request.nextUrl;

  // Add CORS headers for cross-origin requests
  const response = NextResponse.next();

  // Handle cross-origin requests from Cloudflare tunnel
  const origin = request.headers.get('origin');
  const host = request.headers.get('host');

  if (origin && (origin.includes('imajinasset.biz.id') || host?.includes('imajinasset.biz.id'))) {
    response.headers.set('Access-Control-Allow-Origin', origin);
    response.headers.set('Access-Control-Allow-Credentials', 'true');
    response.headers.set('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    response.headers.set('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization');
  }

  // Only redirect to login if explicitly accessing login page
  if (pathname === '/') {
    // Allow dashboard access without middleware for now
    return response;
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|public|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
