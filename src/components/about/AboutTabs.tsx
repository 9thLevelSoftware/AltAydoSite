'use client';

import React, { useState } from 'react';
import SubsidiariesTab from './SubsidiariesTab';
import OperationsTab from './OperationsTab';
import { MobiGlasPanel, MobiGlasButton } from '@/components/ui/mobiglas';

const TABS = [
  { id: 'subsidiaries', label: 'SUBSIDIARIES' },
  { id: 'operations', label: 'OPERATIONS' },
] as const;

type TabId = (typeof TABS)[number]['id'];

export default function AboutTabs() {
  const [activeTab, setActiveTab] = useState<TabId>('subsidiaries');

  // Roving Left/Right arrow navigation across the tablist (WAI-ARIA tabs pattern).
  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
    e.preventDefault();

    const currentIndex = TABS.findIndex((t) => t.id === activeTab);
    const offset = e.key === 'ArrowRight' ? 1 : -1;
    const nextTab = TABS[(currentIndex + offset + TABS.length) % TABS.length];

    setActiveTab(nextTab.id);
    // Tab triggers carry a stable id, so the element already exists in the DOM.
    document.getElementById(`about-tab-${nextTab.id}`)?.focus();
  };

  return (
    <section className="py-16 bg-black relative">
      <div className="max-w-7xl mx-auto px-4 relative z-10">
        <MobiGlasPanel variant="dark" withHologram cornerAccents padding="lg">
          {/* Tab navigation */}
          <div
            role="tablist"
            aria-label="About AydoCorp"
            onKeyDown={handleKeyDown}
            className="flex flex-wrap border-b border-[rgba(var(--mg-primary),0.3)] mb-8 gap-2"
          >
            {TABS.map((tab) => {
              const selected = activeTab === tab.id;
              return (
                <MobiGlasButton
                  key={tab.id}
                  id={`about-tab-${tab.id}`}
                  onClick={() => setActiveTab(tab.id)}
                  variant={selected ? 'primary' : 'ghost'}
                  size="md"
                  tabIndex={selected ? 0 : -1}
                  // MobiGlasButton forwards unknown props onto its underlying
                  // <motion.button> at runtime, but its props type does not
                  // declare ARIA tab attributes — cast to apply them.
                  {...({
                    role: 'tab',
                    'aria-selected': selected,
                    'aria-controls': `about-tabpanel-${tab.id}`,
                  } as Record<string, unknown>)}
                >
                  {tab.label}
                </MobiGlasButton>
              );
            })}
          </div>

          {/* Tab content */}
          {TABS.map((tab) => (
            <div
              key={tab.id}
              role="tabpanel"
              id={`about-tabpanel-${tab.id}`}
              aria-labelledby={`about-tab-${tab.id}`}
              hidden={activeTab !== tab.id}
              className="min-h-[400px]"
            >
              {activeTab === tab.id &&
                (tab.id === 'subsidiaries' ? <SubsidiariesTab /> : <OperationsTab />)}
            </div>
          ))}
        </MobiGlasPanel>
      </div>
    </section>
  );
}
