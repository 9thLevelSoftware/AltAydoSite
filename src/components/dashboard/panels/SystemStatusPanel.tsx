'use client';

import { motion } from 'motion/react';
import Image from 'next/image';
import MobiGlasPanel from '@/components/ui/mobiglas/MobiGlasPanel';

interface SystemStat {
  name: string;
  value: string | number;
  status: 'optimal' | 'warning' | 'critical' | 'inactive';
  icon?: string;
}

const SystemStatusPanel = () => {
  // Sample system statistics
  const systemStats: SystemStat[] = [
    {
      name: 'NETWORK SYSTEMS',
      value: 'ONLINE',
      status: 'optimal',
      icon: 'M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z'
    },
    {
      name: 'FLEET READINESS',
      value: '92%',
      status: 'optimal',
      icon: 'M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a1 1 0 001 1h1M5 17a2 2 0 104 0m-4 0a2 2 0 114 0m6 0a2 2 0 104 0m-4 0a2 2 0 114 0'
    },
    {
      name: 'SHIELD CAPACITY',
      value: '86%',
      status: 'warning',
      icon: 'M20.618 5.984A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z'
    },
    {
      name: 'QUANTUM FUEL',
      value: '64%',
      status: 'warning',
      icon: 'M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z'
    },
    {
      name: 'CARGO SYSTEMS',
      value: 'STANDBY',
      status: 'inactive',
      icon: 'M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4'
    }
  ];
  
  // Get status color
  const getStatusColor = (status: SystemStat['status']) => {
    switch (status) {
      case 'optimal':
        return 'success';
      case 'warning':
        return 'warning';
      case 'critical':
        return 'danger';
      case 'inactive':
        return 'text';
      default:
        return 'text';
    }
  };
  
  // System status icon
  const StatusIcon = ({ status }: { status: SystemStat['status'] }) => {
    const colorClass = {
      optimal: 'text-[rgba(var(--mg-success),0.9)]',
      warning: 'text-[rgba(var(--mg-warning),0.9)]',
      critical: 'text-[rgba(var(--mg-danger),0.9)]',
      inactive: 'text-[rgba(var(--mg-text),0.4)]'
    };
    
    return (
      <div className={`w-2 h-2 rounded-full ${colorClass[status]} animate-pulse`}></div>
    );
  };
  
  // Icon for the panel header
  const headerIcon = (
    <div className="w-5 h-5 relative">
      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-[rgba(var(--mg-primary),0.9)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    </div>
  );
  
  // Right content for the panel header
  const headerRight = (
    <div className="text-xs text-[rgba(var(--mg-text),0.6)] flex items-center">
      <span className="mg-flicker">LIVE</span>
      <div className="w-1.5 h-1.5 rounded-full bg-[rgba(var(--mg-success),0.8)] ml-2 animate-pulse"></div>
    </div>
  );

  return (
    <MobiGlasPanel 
      title="SYSTEM STATUS" 
      icon={headerIcon}
      rightContent={headerRight}
      animationDelay={0.1}
    >
      <div className="space-y-4">
        {/* System overview */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="relative bg-[rgba(var(--mg-panel-dark),0.4)] p-3 rounded-sm border border-[rgba(var(--mg-primary),0.2)]">
            <div className="text-xs text-[rgba(var(--mg-text),0.6)] mb-1">SYSTEMS ONLINE</div>
            <div className="text-xl font-quantify text-[rgba(var(--mg-success),0.9)]">5/5</div>
          </div>
          <div className="relative bg-[rgba(var(--mg-panel-dark),0.4)] p-3 rounded-sm border border-[rgba(var(--mg-primary),0.2)]">
            <div className="text-xs text-[rgba(var(--mg-text),0.6)] mb-1">STATUS</div>
            <div className="text-xl font-quantify text-[rgba(var(--mg-primary),0.9)]">NOMINAL</div>
          </div>
        </div>
        
        {/* System stats */}
        <div>
          {systemStats.map((stat, index) => (
            <motion.div 
              key={stat.name}
              className="flex items-center justify-between py-2 border-b border-[rgba(var(--mg-primary),0.1)] last:border-0"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 + (index * 0.1) }}
            >
              <div className="flex items-center">
                <StatusIcon status={stat.status} />
                <div className="flex items-center ml-3">
                  {stat.icon && (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2 text-[rgba(var(--mg-text),0.7)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={stat.icon} />
                    </svg>
                  )}
                  <span className="text-sm text-[rgba(var(--mg-text),0.9)]">{stat.name}</span>
                </div>
              </div>
              <div className={`text-sm font-quantify text-[rgba(var(--mg-${getStatusColor(stat.status)}),0.9)]`}>
                {stat.value}
              </div>
            </motion.div>
          ))}
        </div>
        
        {/* Scanline effect */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute w-full h-0.5 bg-[rgba(var(--mg-primary),0.1)] animate-scan opacity-50"></div>
        </div>
      </div>
    </MobiGlasPanel>
  );
};

export default SystemStatusPanel; 