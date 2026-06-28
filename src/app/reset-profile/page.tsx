import { notFound } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/auth';
import { UserSession } from '@/lib/auth';
import ResetProfileComponent from '@/components/profile/ResetProfileComponent';

// Server component: gate this destructive route server-side so it cannot be
// reached by simply spoofing NODE_ENV on the client. Requires both a build/
// feature-flag opt-in and an authenticated session (a user may only reset
// their own profile). The reset itself is performed against the authenticated
// session's own profile via the PUT /api/profile endpoint.
export default async function ResetProfilePage() {
  // Build/feature gate: this tooling route is only available outside of
  // production unless explicitly enabled via feature flag.
  const featureEnabled =
    process.env.NODE_ENV !== 'production' || process.env.ENABLE_PROFILE_RESET === 'true';

  if (!featureEnabled) {
    notFound();
  }

  // Authorization gate: only an authenticated user may reach this route.
  // Ownership is enforced server-side here and again by the /api/profile
  // endpoint, which operates on the current session's own profile.
  const session = (await getServerSession(authOptions)) as UserSession | null;

  if (!session?.user?.id) {
    notFound();
  }

  return <ResetProfileComponent />;
}
