'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion } from 'motion/react';

export default function DashboardBreadcrumbs() {
  const pathname = usePathname();
  
  // Split pathname into segments
  const segments = pathname.split('/').filter(Boolean);
  
  // If we are just on /dashboard, don't show breadcrumbs or just show "Dashboard"
  if (segments.length <= 1 && segments[0] === 'dashboard') {
    return null;
  }

  // Map segments to breadcrumb items
  const breadcrumbs = segments.map((segment, index) => {
    const href = '/' + segments.slice(0, index + 1).join('/');
    
    // Format label: replace hyphens with spaces, capitalize
    const label = segment
      .replace(/-/g, ' ')
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');

    return { href, label };
  });

  return (
    <motion.nav 
      className="flex items-center space-x-2 text-xs mb-4 font-quantify tracking-wide"
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.5 }}
    >
      {breadcrumbs.map((crumb, index) => {
        const isLast = index === breadcrumbs.length - 1;
        
        return (
          <div key={crumb.href} className="flex items-center">
            {index > 0 && (
              <span className="mx-2 text-[rgba(var(--mg-primary),0.4)]">/</span>
            )}
            
            {isLast ? (
              <span className="text-[rgba(var(--mg-primary),0.9)] drop-shadow-[0_0_2px_rgba(var(--mg-primary),0.5)]">
                {crumb.label}
              </span>
            ) : (
              <Link 
                href={crumb.href}
                className="text-[rgba(var(--mg-text),0.6)] hover:text-[rgba(var(--mg-primary),0.8)] transition-colors"
              >
                {crumb.label}
              </Link>
            )}
          </div>
        );
      })}
    </motion.nav>
  );
}