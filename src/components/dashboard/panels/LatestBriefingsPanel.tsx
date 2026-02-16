'use client';

import { motion } from 'motion/react';
import Image from 'next/image';
import MobiGlasPanel from '@/components/ui/mobiglas/MobiGlasPanel';

interface Briefing {
  id: string;
  title: string;
  content: string;
  author: string;
  authorTitle: string;
  date: string;
  category: 'operations' | 'security' | 'corporate' | 'financial';
  isUnread?: boolean;
}

const LatestBriefingsPanel = () => {
  // Sample briefings
  const briefings: Briefing[] = [
    {
      id: 'brief-001',
      title: 'SECURITY PROTOCOL UPDATE',
      content: 'All employees are required to update their security credentials by the end of the month. This includes biometric rescans and new authentication keys for vessel access.',
      author: 'Director Harrington',
      authorTitle: 'Head of Security',
      date: '2951-08-12',
      category: 'security',
      isUnread: true
    },
    {
      id: 'brief-002',
      title: 'Q3 FINANCIAL PROJECTIONS',
      content: 'Our Q3 projections show a 15% increase in logistics revenue. Mining operations continue to exceed expectations with the implementation of new extraction technologies.',
      author: 'CFO Laurens',
      authorTitle: 'Chief Financial Officer',
      date: '2951-08-10',
      category: 'financial'
    },
    {
      id: 'brief-003',
      title: 'NEW TRADE ROUTES ESTABLISHED',
      content: 'We have established new trade routes through the Aaron Halo, increasing efficiency by 22%. All captains should download the latest navigation data.',
      author: 'Commander Chen',
      authorTitle: 'Fleet Operations',
      date: '2951-08-09',
      category: 'operations'
    }
  ];
  
  // Get category icon
  const getCategoryIcon = (category: Briefing['category']) => {
    switch (category) {
      case 'operations':
        return 'M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0z';
      case 'security':
        return 'M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z';
      case 'corporate':
        return 'M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4';
      case 'financial':
        return 'M9 8h6m-5 0a3 3 0 110 6H9l3 3m-3-6h6m6 1a9 9 0 11-18 0 9 9 0 0118 0z';
      default:
        return 'M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z';
    }
  };
  
  // Get category color
  const getCategoryColor = (category: Briefing['category']) => {
    switch (category) {
      case 'operations':
        return 'primary';
      case 'security':
        return 'warning';
      case 'corporate':
        return 'text';
      case 'financial':
        return 'success';
      default:
        return 'primary';
    }
  };
  
  // Icon for the panel header
  const headerIcon = (
    <div className="w-5 h-5 relative">
      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-[rgba(var(--mg-primary),0.9)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    </div>
  );
  
  // Right content for the panel header
  const headerRight = (
    <div className="text-xs text-[rgba(var(--mg-text),0.6)] flex items-center">
      <div className="w-1.5 h-1.5 rounded-full bg-[rgba(var(--mg-warning),0.8)] mr-1"></div>
      <span>1 UNREAD</span>
    </div>
  );

  return (
    <MobiGlasPanel
      title="LATEST BRIEFINGS"
      icon={headerIcon}
      rightContent={headerRight}
      animationDelay={0.3}
      accentColor="primary"
      corners={['tl', 'br']}
    >
      <div className="space-y-4">
        {/* Briefings list */}
        {briefings.map((briefing, index) => (
          <motion.div
            key={briefing.id}
            className={`bg-[rgba(var(--mg-panel-dark),0.4)] border rounded-sm overflow-hidden relative ${
              briefing.isUnread 
                ? 'border-[rgba(var(--mg-warning),0.4)]' 
                : 'border-[rgba(var(--mg-primary),0.15)]'
            }`}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 + (index * 0.1) }}
          >
            {/* Unread indicator */}
            {briefing.isUnread && (
              <div className="absolute top-0 right-0">
                <div className="w-0 h-0 border-t-8 border-r-8 border-t-[rgba(var(--mg-warning),0.7)] border-r-[rgba(var(--mg-warning),0.7)] border-l-transparent border-b-transparent"></div>
              </div>
            )}
            
            {/* Briefing header */}
            <div className="flex items-center px-3 py-2 border-b border-[rgba(var(--mg-primary),0.1)]">
              <div className="mr-2">
                <div className={`w-5 h-5 flex items-center justify-center rounded-full bg-[rgba(var(--mg-${getCategoryColor(briefing.category)}),0.1)] border border-[rgba(var(--mg-${getCategoryColor(briefing.category)}),0.3)]`}>
                  <svg xmlns="http://www.w3.org/2000/svg" className={`h-3 w-3 text-[rgba(var(--mg-${getCategoryColor(briefing.category)}),0.9)]`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={getCategoryIcon(briefing.category)} />
                  </svg>
                </div>
              </div>
              <div className="flex-grow">
                <div className="font-quantify text-sm text-[rgba(var(--mg-primary),0.9)]">{briefing.title}</div>
                <div className="text-[10px] text-[rgba(var(--mg-text),0.6)] flex items-center">
                  <span>{briefing.date}</span>
                  <span className="mx-1">•</span>
                  <span>{briefing.category.toUpperCase()}</span>
                </div>
              </div>
            </div>
            
            {/* Briefing content */}
            <div className="p-3">
              <p className="text-xs text-[rgba(var(--mg-text),0.8)] line-clamp-2 mb-2">
                {briefing.content}
              </p>
              <div className="flex items-center text-[10px] text-[rgba(var(--mg-text),0.6)] mt-1">
                <span className="font-medium">{briefing.author}</span>
                <span className="mx-1">•</span>
                <span>{briefing.authorTitle}</span>
              </div>
            </div>
          </motion.div>
        ))}
        
        {/* View all button */}
        <motion.button
          className="w-full py-2 px-3 bg-[rgba(var(--mg-primary),0.1)] border border-[rgba(var(--mg-primary),0.3)] rounded-sm text-sm text-[rgba(var(--mg-primary),0.9)] font-quantify tracking-wide flex items-center justify-center"
          whileHover={{ 
            backgroundColor: 'rgba(var(--mg-primary), 0.15)',
            borderColor: 'rgba(var(--mg-primary), 0.4)',
            boxShadow: '0 0 10px rgba(var(--mg-primary), 0.1)'
          }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
          </svg>
          VIEW ALL BRIEFINGS
        </motion.button>
      </div>
    </MobiGlasPanel>
  );
};

export default LatestBriefingsPanel; 