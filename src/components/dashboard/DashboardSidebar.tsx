'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion } from 'motion/react';
import Image from 'next/image';
import { cdn } from '@/lib/cdn';

interface NavItem {
  name: string;
  href: string;
  icon: string;
  children?: NavItem[];
  badge?: string;
}

// Determine if an icon string is a URL (image) vs an SVG path data string
function isImageIcon(icon: string): boolean {
  return (
    icon.startsWith('http://') ||
    icon.startsWith('https://') ||
    icon.startsWith('/') ||
    icon.startsWith('data:')
  );
}

const navItems: NavItem[] = [
  {
    name: 'Dashboard',
    href: '/dashboard',
    icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6',
  },
  {
    name: 'Corporate Archives',
    href: '/dashboard/archives',
    icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z',
    children: [
      {
        name: 'Corporate History',
        href: '/dashboard/archives/history',
        icon: 'M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253',
      },
      {
        name: 'Hierarchy Chart',
        href: '/dashboard/archives/hierarchy',
        icon: 'M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2',
      },
      {
        name: 'Resources',
        href: '/dashboard/archives/resources',
        icon: 'M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10',
      },
    ],
  },
  {
    name: 'Subsidiaries',
    href: '/dashboard/subsidiaries',
    icon: 'M10.5 1.5H8.25A2.25 2.25 0 006 3.75v16.5a2.25 2.25 0 002.25 2.25h7.5A2.25 2.25 0 0018 20.25V3.75a2.25 2.25 0 00-2.25-2.25H13.5m-3 0V3h3V1.5m-3 0h3m-3 18.75h3',
    children: [
      {
        name: 'AydoExpress',
        href: '/dashboard/subsidiaries/express',
        icon: cdn('/images/New_Aydo_Express.png'),
      },
      {
        name: 'Empyrion Industries',
        href: '/dashboard/subsidiaries/empyrion',
        icon: cdn('/images/New_Empyrion_Industries.PNG'),
      },
      {
        name: 'Midnight Security',
        href: '/dashboard/subsidiaries/security',
        icon: cdn('/images/New_Midnight_Security.png'),
      },
    ],
  },
  {
    name: 'Career Development',
    href: '/dashboard/career',
    icon: 'M4.26 10.147a60.436 60.436 0 00-.491 6.347A48.627 48.627 0 0112 20.904a48.627 48.627 0 018.232-4.41 60.46 60.46 0 00-.491-6.347m-15.482 0a50.57 50.57 0 00-2.658-.813A59.905 59.905 0 0112 3.493a59.902 59.902 0 0110.399 5.84c-.896.248-1.783.52-2.658.814m-15.482 0A50.697 50.697 0 0112 13.489a50.702 50.702 0 017.74-3.342M6.75 15a.75.75 0 100-1.5.75.75 0 000 1.5zm0 0v-3.675A55.378 55.378 0 0112 8.443m-7.007 11.55A5.981 5.981 0 006.75 15.75v-1.5',
    children: [
      {
        name: 'Training Guides',
        href: '/dashboard/career/training',
        icon: 'M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25',
        badge: 'Coming Soon',
      },
      {
        name: 'Certifications',
        href: '/dashboard/career/certifications',
        icon: 'M9 12.75L11.25 15 15 9.75M21 12c0 1.268-.63 2.39-1.593 3.068a3.745 3.745 0 01-1.043 3.296 3.745 3.745 0 01-3.296 1.043A3.745 3.745 0 0112 21c-1.268 0-2.39-.63-3.068-1.593a3.746 3.746 0 01-3.296-1.043 3.745 3.745 0 01-1.043-3.296A3.745 3.745 0 013 12c0-1.268.63-2.39 1.593-3.068a3.745 3.745 0 011.043-3.296 3.746 3.746 0 013.296-1.043A3.746 3.746 0 0112 3c1.268 0 2.39.63 3.068 1.593a3.746 3.746 0 013.296 1.043 3.746 3.746 0 011.043 3.296A3.745 3.745 0 0121 12z',
      },
      {
        name: 'Rank Advancement',
        href: '/dashboard/career/advancement',
        icon: 'M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4',
        badge: 'Coming Soon',
      },
    ],
  },
  {
    name: 'Operations',
    href: '/dashboard/operations',
    icon: 'M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2',
    children: [
      {
        name: 'Mission Planner',
        href: '/dashboard/mission-planner',
        icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01',
      },
      {
        name: 'Fleet Database',
        href: '/dashboard/fleet-database',
        icon: 'M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0z M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a1 1 0 001 1h1M5 17a2 2 0 104 0m-4 0a2 2 0 114 0m6 0a2 2 0 104 0m-4 0a2 2 0 114 0',
        badge: 'New',
      },
      {
        name: 'Fleet Composition',
        href: '/dashboard/fleet-composition',
        icon: 'M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z',
        badge: 'New',
      },
    ],
  },
  {
    name: 'Events Calendar',
    href: '/dashboard/events',
    icon: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z',
  },
  {
    name: 'Finance Tracker',
    href: '/dashboard/finance-tracker',
    icon: 'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
    badge: 'New',
  },
];

interface DashboardSidebarProps {
  onNavigate?: () => void;
}

const DashboardSidebar = ({ onNavigate }: DashboardSidebarProps = {}) => {
  const pathname = usePathname();
  const [expandedItems, setExpandedItems] = useState<string[]>([]);

  const toggleExpand = (name: string) => {
    if (expandedItems.includes(name)) {
      setExpandedItems(expandedItems.filter((item) => item !== name));
    } else {
      setExpandedItems([...expandedItems, name]);
    }
  };

  const isActive = (href: string) => {
    if (href === '/dashboard' && pathname === '/dashboard') {
      return true;
    }
    return href !== '/dashboard' && (pathname === href || pathname.startsWith(href + '/'));
  };

  const isExpanded = (name: string) => {
    return (
      expandedItems.includes(name) ||
      navItems.some(
        (item) =>
          item.name === name &&
          item.children?.some(
            (child) => pathname === child.href || pathname.startsWith(child.href + '/')
          )
      )
    );
  };

  return (
    <div className="mg-panel bg-[rgba(var(--mg-panel-dark),0.4)] rounded-sm h-full overflow-hidden flex flex-col">
      <div className="p-4 border-b border-[rgba(var(--mg-primary),0.15)] flex items-center">
        <div className="h-6 w-6 relative mr-2">
          <Image
            src={cdn('/images/Aydo_Corp_logo_employees.png')}
            alt="AydoCorp Logo"
            fill
            className="object-contain"
          />
        </div>
        <h2 className="mg-subtitle text-sm tracking-wider">EMPLOYEE PORTAL</h2>
      </div>

      <div className="p-2 flex-grow overflow-y-auto custom-scrollbar">
        <ul className="space-y-1">
          {navItems.map((item) => (
            <li key={item.name}>
              {item.children ? (
                <div className="space-y-1">
                  <button
                    onClick={() => toggleExpand(item.name)}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-sm text-left text-sm ${
                      isActive(item.href)
                        ? 'bg-[rgba(var(--mg-primary),0.15)] text-[rgba(var(--mg-primary),0.9)]'
                        : 'hover:bg-[rgba(var(--mg-panel-dark),0.5)]'
                    }`}
                  >
                    <div className="flex items-center">
                      <div className="h-4 w-4 mr-2 relative">
                        {isImageIcon(item.icon) ? (
                          <Image src={item.icon} alt="icon" fill className="object-contain" />
                        ) : (
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            className="h-4 w-4"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={1}
                              d={item.icon}
                            />
                          </svg>
                        )}
                      </div>
                      <span>{item.name}</span>
                      {item.badge && (
                        <span className="ml-2 px-1.5 py-0.5 text-[11px] font-medium bg-[rgba(var(--mg-primary),0.2)] text-[rgba(var(--mg-primary),0.9)] rounded-sm">
                          {item.badge}
                        </span>
                      )}
                    </div>
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className={`h-4 w-4 transition-transform ${isExpanded(item.name) ? 'rotate-180' : ''}`}
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={1}
                        d="M19 9l-7 7-7-7"
                      />
                    </svg>
                  </button>

                  {isExpanded(item.name) && (
                    <motion.ul
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      transition={{ duration: 0.2 }}
                      className="ml-6 space-y-1"
                    >
                      {item.children.map((child) => (
                        <li key={child.name}>
                          <Link href={child.href} onClick={onNavigate}>
                            <div
                              className={`flex items-center px-3 py-2 rounded-sm text-sm ${
                                isActive(child.href)
                                  ? 'bg-[rgba(var(--mg-primary),0.15)] text-[rgba(var(--mg-primary),0.9)]'
                                  : 'hover:bg-[rgba(var(--mg-panel-dark),0.5)]'
                              }`}
                            >
                              <div className="h-4 w-4 mr-2 relative">
                                {isImageIcon(child.icon) ? (
                                  <Image
                                    src={child.icon}
                                    alt="icon"
                                    width={36}
                                    height={36}
                                    className="object-contain"
                                  />
                                ) : (
                                  <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    className="h-4 w-4"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    stroke="currentColor"
                                  >
                                    <path
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      strokeWidth={1}
                                      d={child.icon}
                                    />
                                  </svg>
                                )}
                              </div>
                              <span>{child.name}</span>
                              {child.badge && (
                                <span className="ml-2 px-1.5 py-0.5 text-[11px] font-medium bg-[rgba(var(--mg-primary),0.2)] text-[rgba(var(--mg-primary),0.9)] rounded-sm">
                                  {child.badge}
                                </span>
                              )}
                            </div>
                          </Link>
                        </li>
                      ))}
                    </motion.ul>
                  )}
                </div>
              ) : (
                <Link href={item.href} onClick={onNavigate}>
                  <div
                    className={`flex items-center px-3 py-2 rounded-sm text-sm ${
                      isActive(item.href)
                        ? 'bg-[rgba(var(--mg-primary),0.15)] text-[rgba(var(--mg-primary),0.9)]'
                        : 'hover:bg-[rgba(var(--mg-panel-dark),0.5)]'
                    }`}
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-4 w-4 mr-2"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={1}
                        d={item.icon}
                      />
                    </svg>
                    <span>{item.name}</span>
                    {item.badge && (
                      <span className="ml-2 px-1.5 py-0.5 text-[11px] font-medium bg-[rgba(var(--mg-primary),0.2)] text-[rgba(var(--mg-primary),0.9)] rounded-sm">
                        {item.badge}
                      </span>
                    )}
                  </div>
                </Link>
              )}
            </li>
          ))}
        </ul>
      </div>

      <div className="p-3 border-t border-[rgba(var(--mg-primary),0.15)] text-center">
        <div className="text-xs text-[rgba(var(--mg-text),0.6)]">
          AYDO INTERGALACTIC CORPORATION
        </div>
      </div>
    </div>
  );
};

export default DashboardSidebar;
