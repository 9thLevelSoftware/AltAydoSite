import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';

// Protected routes that require authentication
const protectedRoutes = ['/dashboard', '/userprofile', '/admin'];

/**
 * Generate a cryptographically random, base64-encoded nonce for CSP.
 * Uses Web Crypto + btoa, both available in the Edge runtime (no Buffer).
 */
function generateNonce(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}

/**
 * Build the Content-Security-Policy. In production, inline scripts are allowed
 * ONLY via a per-request nonce (no 'unsafe-inline'); same-origin chunk scripts
 * are covered by 'self', and the Cloudflare Insights beacon by its explicit
 * host. 'strict-dynamic' is intentionally NOT used: it would disable the host
 * allowlist and block the un-nonced Cloudflare-injected beacon. In development,
 * 'unsafe-inline'/'unsafe-eval' are retained because Next's HMR requires them.
 */
function buildCsp(nonce: string, isDev: boolean): string {
  const scriptSrc = isDev
    ? "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://static.cloudflareinsights.com"
    : `script-src 'self' 'nonce-${nonce}' https://static.cloudflareinsights.com`;

  return [
    "default-src 'self'",
    scriptSrc,
    // Inline styles are required by framer-motion/animation; styles are not the
    // script-injection vector being closed here, so 'unsafe-inline' is retained.
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' blob: data: https://cdn.fleetyards.net https://api.fleetyards.net https://fleetyards.net https://storage.fltyrd.net https://images.aydocorp.space https://aydocorp.space https://cdn.discordapp.com",
    "font-src 'self'",
    "connect-src 'self' https://discord.com https://cdn.discordapp.com https://cloudflareinsights.com",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
  ].join('; ');
}

/**
 * Attach the nonce-based CSP to a pass-through response. The nonce is also set
 * on the forwarded request headers so Next.js injects it into its own inline
 * bootstrap/hydration scripts. CSP is defined here (not in next.config.js) so
 * the value can carry a per-request nonce.
 */
function withCsp(request: NextRequest): NextResponse {
  const nonce = generateNonce();
  const isDev = process.env.NODE_ENV !== 'production';
  const csp = buildCsp(nonce, isDev);

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-nonce', nonce);
  requestHeaders.set('Content-Security-Policy', csp);

  const response = NextResponse.next({ request: { headers: requestHeaders } });
  response.headers.set('Content-Security-Policy', csp);
  return response;
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Check if the pathname is a protected route
  const isProtectedRoute = protectedRoutes.some((route) => pathname.startsWith(route));

  if (isProtectedRoute) {
    try {
      // Preserve the full target (path + query) so the user lands where they
      // intended after logging in. This is a relative value, so there is no
      // open-redirect risk.
      const callbackUrl = pathname + request.nextUrl.search;

      // Get the session token using NextAuth
      const token = await getToken({
        req: request,
        secret: process.env.NEXTAUTH_SECRET,
      });

      // If not authenticated, redirect to login
      if (!token) {
        const url = new URL('/login', request.url);
        url.searchParams.set('callbackUrl', callbackUrl);
        return NextResponse.redirect(url);
      }

      // Authorization: admin routes require an admin claim. The page-level
      // check in src/app/admin/page.tsx remains the final authority; this is a
      // first-line guard so non-admins never reach admin pages at all.
      if (pathname.startsWith('/admin')) {
        const isAdmin =
          token.role === 'admin' ||
          (typeof token.clearanceLevel === 'number' && token.clearanceLevel >= 4);

        if (!isAdmin) {
          // Authenticated but not authorized — send them to their dashboard.
          return NextResponse.redirect(new URL('/dashboard', request.url));
        }
      }

      // User is authenticated (and authorized for admin routes), allow it
      return withCsp(request);
    } catch (error) {
      console.error('Error in authentication middleware:', error);
      // On error, redirect to login as a fallback
      const url = new URL('/login', request.url);
      url.searchParams.set('callbackUrl', pathname + request.nextUrl.search);
      url.searchParams.set('error', 'AuthError'); // Typo corrected
      return NextResponse.redirect(url);
    }
  }

  // Not a protected route, continue as normal (still apply the CSP nonce).
  return withCsp(request);
}

// Specify which routes this middleware should run on
export const config = {
  matcher: [
    // Match all paths except for:
    // - API routes (/api/*)
    // - Static files (_next/static/*)
    // - Image optimization (_next/image/*)
    // - Static files in the public directory (favicon.ico, images, assets, etc)
    '/((?!api|_next/static|_next/image|favicon.ico|images|assets|fonts|.*\.png|.*\.jpg|.*\.jpeg|.*\.gif|.*\.svg|.*\.webp|.*\.ico|.*\.woff|.*\.woff2|.*\.ttf|.*\.otf).*)',
  ],
};
