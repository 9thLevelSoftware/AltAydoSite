'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useConfirmDialog } from '@/hooks/useConfirmDialog';
import { useToast } from '@/hooks/useToast';

export default function ResetProfileComponent() {
  const router = useRouter();
  const { confirm } = useConfirmDialog();
  const { toast } = useToast();
  const [message, setMessage] = useState('');
  const [isResetting, setIsResetting] = useState(false);
  const hasPrompted = useRef(false);

  useEffect(() => {
    if (hasPrompted.current) return;
    hasPrompted.current = true;

    const promptAndReset = async () => {
      const confirmed = await confirm({
        title: 'Reset Profile',
        message: 'This will reset all your profile data including fleet, preferences, and timezone. This action cannot be undone.',
        confirmLabel: 'Reset Everything',
        cancelLabel: 'Cancel',
        variant: 'danger'
      });

      if (!confirmed) {
        router.push('/userprofile');
        return;
      }

      setIsResetting(true);
      setMessage('Resetting profile data...');

      // 1. Clear localStorage profile keys
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('user_profile_')) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach(key => {
        localStorage.removeItem(key);
      });

      // Also clear session storage
      sessionStorage.clear();

      // 2. Reset server-side profile to defaults via PUT
      try {
        const res = await fetch('/api/profile', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            photo: null,
            payGrade: null,
            position: null,
            division: null,
            timezone: null,
            preferredGameplayLoops: [],
            bio: null,
            discordName: null,
            rsiAccountName: null,
          }),
        });

        if (res.ok) {
          toast.success('Profile reset successfully');
          setMessage(
            `Reset complete. Cleared server profile and ${keysToRemove.length} local cache(s). Redirecting...`
          );
        } else if (res.status === 401) {
          toast.info('Local profile cleared (not logged in)');
          setMessage(
            `Local reset complete. Removed ${keysToRemove.length} profile(s). Redirecting...`
          );
        } else {
          toast.error('Server profile reset failed -- local cache cleared');
          setMessage(
            `Partial reset. Local cache cleared but server reset failed. Redirecting...`
          );
        }
      } catch {
        toast.error('Could not reach server -- local cache cleared');
        setMessage(
          `Partial reset. Local cache cleared but server unreachable. Redirecting...`
        );
      }

      // Redirect back to the profile page after 2 seconds
      setTimeout(() => {
        router.push('/userprofile');
      }, 2000);
    };

    promptAndReset();
  }, [confirm, router, toast]);

  if (!isResetting) {
    return null;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[rgba(var(--mg-bg),1)]">
      <div className="mg-panel p-8 max-w-md w-full text-center">
        <h1 className="text-lg mb-4 text-[rgba(var(--mg-primary),0.9)]">{message}</h1>
        <div className="animate-pulse bg-[rgba(var(--mg-primary),0.1)] h-1 w-full rounded-full overflow-hidden">
          <div className="bg-[rgba(var(--mg-primary),0.5)] h-full w-1/2 rounded-full"></div>
        </div>
      </div>
    </div>
  );
}
