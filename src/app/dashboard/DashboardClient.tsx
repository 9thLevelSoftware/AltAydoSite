'use client';

import React from 'react';

export default function DashboardClient({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen relative">
      {/* Main content without top padding */}
      <main>{children}</main>
    </div>
  );
}
