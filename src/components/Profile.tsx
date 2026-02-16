'use client';

import { useSession, signOut } from 'next-auth/react';
import { motion } from 'motion/react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';

export default function Profile() {
  const { data: session, status } = useSession();
  const user = session?.user;
  const pathname = usePathname();
  
  // Hide on protected pages which have their own headers (except dashboard and userprofile)
  const isProtectedPage = pathname?.startsWith('/admin');
  
  // Only render when authenticated and not on protected pages 
  if (status !== 'authenticated' || isProtectedPage) {
    return null;
  }

  // Handle the sign out action
  const handleSignOut = async () => {
    await signOut({ callbackUrl: '/' });
  };

  return (
    <div className="w-full bg-[rgba(0,10,20,0.6)] z-50" data-profile-header="true">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex justify-end py-1">
        <motion.div 
          className="flex items-center space-x-2"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3 }}
        >
          <div className="text-xs tracking-wider flex items-center">
            <span className="text-[rgba(var(--mg-text),0.7)]">Welcome,</span>
            <Link href="/userprofile" className="ml-1 text-[rgba(var(--mg-primary),1)] hover:text-[rgba(var(--mg-primary),0.8)] transition-colors">
              {user?.name || 'User'}
            </Link>
          </div>
          <button 
            onClick={handleSignOut}
            className="text-xs tracking-wider text-white hover:text-white transition-colors duration-200"
          >
            Sign Out
          </button>
        </motion.div>
      </div>
    </div>
  );
} 