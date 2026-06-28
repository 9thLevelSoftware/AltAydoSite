'use client';

import React, { useEffect, useState } from 'react';
import { StatusIndicator } from '@/components/ui/mobiglas';

export default function SystemStatusBar() {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex justify-between items-center py-2 px-3 sm:px-4 bg-[rgba(var(--mg-panel-dark),0.5)] border-t border-b border-[rgba(var(--mg-primary),0.2)] mb-4 sm:mb-6 text-xs sm:text-sm">
      <div className="flex items-center space-x-4">
        <StatusIndicator status="online" label="SYSTEM ONLINE" size="sm" withPulse />
        <div className="hidden md:block">
          <StatusIndicator status="active" label="SECURE CONNECTION" size="sm" />
        </div>
      </div>

      <div className="flex items-center space-x-3">
        <div className="text-xs text-[rgba(var(--mg-text),0.7)]">
          {now.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
          })}
        </div>
        <div className="text-xs font-mono text-[rgba(var(--mg-primary),0.8)] mg-flicker">
          {now.toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: false,
          })}
        </div>
      </div>
    </div>
  );
}
