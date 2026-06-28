import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '../api/auth/auth';

export const metadata: Metadata = {
  title: 'Debug Profile | AydoCorp',
};

/**
 * Feature/build gate for the debug profile route.
 *
 * The route is disabled by default and only routable when explicitly enabled:
 *   - In non-production environments it is available for local debugging.
 *   - In production it requires `ENABLE_DEBUG_PROFILE=true`, so the debug UI is
 *     never reachable in deployed builds unless an operator opts in.
 */
function isDebugRouteEnabled(): boolean {
  if (process.env.ENABLE_DEBUG_PROFILE === 'true') return true;
  return process.env.NODE_ENV !== 'production';
}

export default async function DebugProfileLayout({ children }: { children: React.ReactNode }) {
  // Build/feature-flag gate -- fail closed (404) when the route is not enabled
  // so the debug UI is never exposed in deployed builds by default.
  if (!isDebugRouteEnabled()) {
    notFound();
  }

  // Server-side authorization. Mirrors the admin gate used in
  // src/app/admin/page.tsx and /api/storage-status. Fail closed when the
  // role/clearance claims are missing. notFound() (rather than redirect) avoids
  // confirming the existence of the debug route to unauthorized users.
  const session = await getServerSession(authOptions);
  const isAdmin = session?.user?.role === 'admin' || (session?.user?.clearanceLevel ?? 0) >= 4;

  if (!isAdmin) {
    notFound();
  }

  return children;
}
