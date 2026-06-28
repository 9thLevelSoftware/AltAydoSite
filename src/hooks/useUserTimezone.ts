import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';

export function useUserTimezone(): {
  timezone: string;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
} {
  const { data: session, status } = useSession();
  const [timezone, setTimezone] = useState<string>('UTC');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchUserTimezone = useCallback(async () => {
    if (status === 'loading') {
      return; // Wait for session to settle
    }

    if (status !== 'authenticated') {
      // User not logged in, use UTC as default
      setTimezone('UTC');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const response = await fetch('/api/profile', {
        headers: {
          'Cache-Control': 'no-cache',
        },
        credentials: 'include',
      });

      if (!response.ok) {
        console.warn(`Failed to fetch profile: ${response.status}`);
        setTimezone('UTC');
        setError(`Failed to fetch profile: ${response.status}`);
        return;
      }

      const profileData = await response.json();

      // Use user's timezone or fallback to UTC
      const newTimezone = profileData.timezone || 'UTC';
      console.log('Fetched user timezone:', newTimezone);
      setTimezone(newTimezone);
      setError(null);
    } catch (err) {
      console.warn('Failed to fetch user timezone, using UTC:', err);
      setTimezone('UTC');
      setError(err instanceof Error ? err.message : 'Failed to fetch timezone');
    } finally {
      setLoading(false);
    }
  }, [status]);

  useEffect(() => {
    // Key the fetch to auth status + user identity rather than a one-shot guard,
    // so the timezone loads once the session settles and refetches on an account
    // switch. fetchUserTimezone early-returns while status === 'loading'
    // (hooks-&-ty-14).
    fetchUserTimezone();
  }, [status, session?.user?.email, fetchUserTimezone]);

  return {
    timezone,
    loading,
    error,
    refetch: fetchUserTimezone,
  };
}
