import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';

// Protected routes that require authentication
const protectedRoutes = ['/dashboard', '/userprofile', '/admin'];

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
      return NextResponse.next();
    } catch (error) {
      console.error('Error in authentication middleware:', error);
      // On error, redirect to login as a fallback
      const url = new URL('/login', request.url);
      url.searchParams.set('callbackUrl', pathname + request.nextUrl.search);
      url.searchParams.set('error', 'AuthError'); // Typo corrected
      return NextResponse.redirect(url);
    }
  }

  // Not a protected route, continue as normal
  return NextResponse.next();
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
