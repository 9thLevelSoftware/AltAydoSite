'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import OrgChart, { ChartNodeData } from '@/components/dashboard/OrgChart';

// Demo/feature flag: the org hierarchies below are curated sample data and are not
// yet sourced from an authoritative org model/API. Until a real data source is wired,
// the route stays behind an explicit demo flag, which also drives the "DEMO DATA" badge.
// Set NEXT_PUBLIC_ORG_HIERARCHY_DEMO="false" once the data is backed by the real org model.
const IS_DEMO_DATA = process.env.NEXT_PUBLIC_ORG_HIERARCHY_DEMO !== 'false';

// Sample organizational data structures - Clean corporate hierarchy for testing
const corporateHierarchy: ChartNodeData = {
  id: 'ceo',
  level: 'executive',
  front: { title: 'Chief Executive Officer' },
  back: { loreName: 'Supreme Commander', handle: 'AydoCorp_CEO' },
  children: [
    {
      id: 'cto',
      level: 'board',
      front: { title: 'Chief Technology Officer' },
      back: { loreName: 'Tech Overlord', handle: 'AydoCorp_CTO' },
      children: [],
    },
    {
      id: 'coo',
      level: 'board',
      front: { title: 'Chief Operations Officer' },
      back: { loreName: 'Operations Commander', handle: 'AydoCorp_COO' },
      children: [
        {
          id: 'eiDir',
          level: 'director',
          front: { title: 'Empyrion Industries Director' },
          back: { loreName: 'Mining Magnate', handle: 'EI_Director' },
          children: [],
        },
        {
          id: 'aeDir',
          level: 'director',
          front: { title: 'AydoExpress Director' },
          back: { loreName: 'Cargo Master', handle: 'AE_Director' },
          children: [],
        },
        {
          id: 'msDir',
          level: 'director',
          front: { title: 'Midnight Security Director' },
          back: { loreName: 'Shadow Commander', handle: 'MS_Director' },
          children: [],
        },
      ],
    },
    {
      id: 'cmo',
      level: 'board',
      front: { title: 'Chief Marketing Officer' },
      back: { loreName: 'Voice of AydoCorp', handle: 'AydoCorp_CMO' },
      children: [],
    },
    {
      id: 'cso',
      level: 'board',
      front: { title: 'Chief Security Officer' },
      back: { loreName: 'Shield Master', handle: 'AydoCorp_CSO' },
      children: [],
    },
  ],
};

const empyrionHierarchy: ChartNodeData = {
  id: 'eiDirector',
  level: 'executive',
  front: { title: 'Director' },
  back: { loreName: 'Mining Emperor', handle: 'EI_Director' },
  children: [
    {
      id: 'eiShipCaptain',
      level: 'board',
      front: { title: 'Ship Captain' },
      back: { loreName: 'Fleet Commander', handle: 'EI_Captain' },
      children: [
        {
          id: 'eiCrew',
          level: 'director',
          front: { title: 'Crew' },
          back: { loreName: 'Rock Breakers', handle: 'EI_Crew' },
          children: [
            {
              id: 'eiSeasonal',
              level: 'manager',
              front: { title: 'Seasonal Hire' },
              back: { loreName: 'Temp Workers', handle: 'EI_Temps' },
              children: [],
            },
          ],
        },
      ],
    },
  ],
};

// AydoExpress hierarchy translated from the provided org chart
// Upper Management → Lower Management → Employee → Intern
const aydoExpressHierarchy: ChartNodeData = {
  id: 'aeDirector',
  level: 'executive',
  front: { title: 'Director' },
  back: {},
  children: [
    {
      id: 'aeSubDirector',
      level: 'board',
      front: { title: 'Sub-Director' },
      back: {},
      children: [
        {
          id: 'aeSupervisor',
          level: 'director',
          front: { title: 'Supervisor' },
          back: {},
          children: [
            {
              id: 'aeLoadmaster',
              level: 'manager',
              front: { title: 'Loadmaster' },
              back: {},
              children: [
                {
                  id: 'aeSeniorServiceAgent',
                  level: 'staff',
                  front: { title: 'Senior Service Agent' },
                  back: {},
                  children: [
                    {
                      id: 'aeAssociate',
                      level: 'staff',
                      front: { title: 'Associate' },
                      back: {},
                      children: [
                        {
                          id: 'aeTrainee',
                          level: 'staff',
                          front: { title: 'Trainee' },
                          back: {},
                          children: [],
                        },
                      ],
                    },
                  ],
                },
                {
                  id: 'aeServiceAgent',
                  level: 'staff',
                  front: { title: 'Service Agent' },
                  back: {},
                  children: [], // Linked to Associate via extra connection
                },
              ],
            },
          ],
        },
      ],
    },
  ],
};

const midnightSecurityHierarchy: ChartNodeData = {
  id: 'msDirector',
  level: 'executive',
  front: { title: 'Director' },
  back: {},
  children: [
    // Assistant Director appears on same row as Director (peer) and connects directly
    {
      id: 'msAssistantDirector',
      level: 'executive',
      front: { title: 'Assistant Director' },
      back: {},
      children: [],
    },

    // Top-of-branch heads (still Upper Management, but shown below Dir/AD within same container)
    {
      id: 'msHeadPilot',
      level: 'board',
      front: { title: 'Head Pilot' },
      back: {},
      children: [
        {
          id: 'msFlightLead',
          level: 'director',
          front: { title: 'Flight Lead' },
          back: {},
          children: [
            {
              id: 'msElementLead',
              level: 'director',
              front: { title: 'Element Lead' },
              back: {},
              children: [
                {
                  id: 'msSeasonedPilot',
                  level: 'manager',
                  front: { title: 'Seasoned Pilot' },
                  back: {},
                  children: [
                    {
                      id: 'msPilot',
                      level: 'staff',
                      front: { title: 'Pilot' },
                      back: {},
                      children: [],
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
    },
    {
      id: 'msSquadLead',
      level: 'board',
      front: { title: 'Squad Lead (Marines)' },
      back: {},
      children: [
        {
          id: 'msTeamLead',
          level: 'director',
          front: { title: 'Team Lead' },
          back: {},
          children: [
            {
              id: 'msVeteranMarine',
              level: 'director',
              front: { title: 'Veteran Marine' },
              back: {},
              children: [
                {
                  id: 'msSeasonedMarine',
                  level: 'manager',
                  front: { title: 'Seasoned Marine' },
                  back: {},
                  children: [
                    {
                      id: 'msExperiencedMarine',
                      level: 'manager',
                      front: { title: 'Experienced Marine' },
                      back: {},
                      children: [
                        {
                          id: 'msMarine',
                          level: 'staff',
                          front: { title: 'Marine' },
                          back: {},
                          children: [
                            {
                              id: 'msMarineTrainee',
                              level: 'staff',
                              front: { title: 'Marine Trainee' },
                              back: {},
                              children: [],
                            },
                          ],
                        },
                      ],
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
    },
    {
      id: 'msEngineeringManager',
      level: 'board',
      front: { title: 'Engineering Manager' },
      back: {},
      children: [
        {
          id: 'msEngineeringLead',
          level: 'director',
          front: { title: 'Engineering Lead' },
          back: {},
          children: [
            {
              id: 'msVeteranEngineer',
              level: 'director',
              front: { title: 'Veteran Engineer' },
              back: {},
              children: [
                {
                  id: 'msSeasonedEngineer',
                  level: 'manager',
                  front: { title: 'Seasoned Engineer' },
                  back: {},
                  children: [
                    {
                      id: 'msExperiencedEngineer',
                      level: 'manager',
                      front: { title: 'Experienced Engineer' },
                      back: {},
                      children: [
                        {
                          id: 'msEngineer',
                          level: 'staff',
                          front: { title: 'Engineer' },
                          back: {},
                          children: [
                            {
                              id: 'msEngineerTrainee',
                              level: 'staff',
                              front: { title: 'Engineer Trainee' },
                              back: {},
                              children: [],
                            },
                          ],
                        },
                      ],
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
    },
    {
      id: 'msGunneryManager',
      level: 'board',
      front: { title: 'Gunnery Manager' },
      back: {},
      children: [
        {
          id: 'msGunneryLead',
          level: 'director',
          front: { title: 'Gunnery Lead' },
          back: {},
          children: [
            {
              id: 'msVeteranGunner',
              level: 'director',
              front: { title: 'Veteran Gunner' },
              back: {},
              children: [
                {
                  id: 'msSeasonedGunner',
                  level: 'manager',
                  front: { title: 'Seasoned Gunner' },
                  back: {},
                  children: [
                    {
                      id: 'msExperiencedGunner',
                      level: 'manager',
                      front: { title: 'Experienced Gunner' },
                      back: {},
                      children: [
                        {
                          id: 'msGunner',
                          level: 'staff',
                          front: { title: 'Gunner' },
                          back: {},
                          children: [
                            {
                              id: 'msGunnerTrainee',
                              level: 'staff',
                              front: { title: 'Gunner Trainee' },
                              back: {},
                              children: [],
                            },
                          ],
                        },
                      ],
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
    },
  ],
};

// Navigation Tabs component
const NavigationTabs: React.FC<{
  activeTab: string;
  onTabChange: (tab: string) => void;
}> = ({ activeTab, onTabChange }) => {
  const tabs = [
    { id: 'corporate', label: 'Corporate', icon: '📋' },
    { id: 'empyrion', label: 'Empyrion Industries', icon: '⛏️' },
    { id: 'aydoexpress', label: 'AydoExpress', icon: '🚚' },
    { id: 'midnight', label: 'Midnight Security', icon: '🛡️' },
  ];

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mb-8">
      <div className="flex flex-wrap gap-2 p-1 bg-[rgba(var(--mg-panel-dark),0.6)] rounded-lg border border-[rgba(var(--mg-primary),0.3)]">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={`flex items-center gap-2 px-4 py-3 rounded-md font-medium text-sm transition-all ${
              activeTab === tab.id
                ? 'bg-[rgba(var(--mg-primary),0.8)] text-black shadow-lg'
                : 'text-[rgba(var(--mg-text),0.7)] hover:bg-[rgba(var(--mg-primary),0.2)] hover:text-[rgba(var(--mg-text),0.9)]'
            }`}
          >
            <span>{tab.icon}</span>
            <span className="hidden sm:inline">{tab.label}</span>
            <span className="sm:hidden">{tab.label.split(' ')[0]}</span>
          </button>
        ))}
      </div>
    </motion.div>
  );
};

export default function HierarchyPage() {
  const [activeTab, setActiveTab] = useState('corporate');

  const getCurrentHierarchy = () => {
    switch (activeTab) {
      case 'corporate':
        return corporateHierarchy;
      case 'empyrion':
        return empyrionHierarchy;
      case 'aydoexpress':
        return aydoExpressHierarchy;
      case 'midnight':
        return midnightSecurityHierarchy;
      default:
        return corporateHierarchy;
    }
  };

  const getTabTitle = () => {
    switch (activeTab) {
      case 'corporate':
        return 'AydoCorp Corporate Structure';
      case 'empyrion':
        return 'Empyrion Industries Hierarchy';
      case 'aydoexpress':
        return 'AydoExpress Organization';
      case 'midnight':
        return 'Midnight Security Command Structure';
      default:
        return 'Organizational Chart';
    }
  };

  // Dynamic header resolver to allow unlimited levels with custom labeling per level
  const getHeaderResolver = () => {
    if (activeTab === 'aydoexpress') {
      // Map level indices to section labels for AydoExpress chart
      const labelByLevel: Record<number, string> = {
        0: 'Upper Management', // Director
        1: 'Upper Management', // Sub-Director
        2: 'Lower Management', // Supervisor
        3: 'Lower Management', // Loadmaster
        4: 'Employee', // Senior Service Agent + Service Agent
        5: 'Employee', // Associate
        6: 'Intern', // Trainee
      };
      return (levelIndex: number) => labelByLevel[levelIndex] || `Level ${levelIndex + 1}`;
    }
    if (activeTab === 'midnight') {
      // Midnight Security sections per diagram. Upper Mgmt includes Dir/AD and the top tier of each branch.
      const labelByLevel: Record<number, string> = {
        0: 'Upper Management', // Director, Assistant Director
        1: 'Upper Management', // Head Pilot, Squad Lead, Engineering Manager, Gunnery Manager
        2: 'Lower Management', // Leads
        3: 'Lower Management', // Element Lead / Veteran roles
        4: 'Employee', // Seasoned roles
        5: 'Employee', // Experienced roles
        6: 'Employee', // Base roles (Marine/Engineer/Gunner)
        7: 'Intern', // Trainees
      };
      return (levelIndex: number) => labelByLevel[levelIndex] || `Level ${levelIndex + 1}`;
    }
    return undefined;
  };

  // Extra connections to support multi-parent relationships (e.g., Service Agent → Associate)
  const getExtraConnections = () => {
    if (activeTab !== 'aydoexpress') return [] as Array<{ from: string; to: string }>;
    return [{ from: 'aeServiceAgent', to: 'aeAssociate' }];
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[rgb(var(--mg-background))] via-[rgb(0,8,20)] to-[rgb(var(--mg-dark))] relative">
      {/* Holographic grid background */}
      <div className="absolute inset-0 mg-grid-bg opacity-20 pointer-events-none" />

      {/* Floating particles effect */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {[...Array(12)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-1 h-1 bg-[rgba(var(--mg-primary),0.3)] rounded-full"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
            }}
            animate={{
              y: [0, -20, 0],
              opacity: [0.3, 0.8, 0.3],
            }}
            transition={{
              duration: 4 + Math.random() * 4,
              repeat: Infinity,
              delay: Math.random() * 2,
            }}
          />
        ))}
      </div>

      <div className="relative z-10 w-full px-4 py-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8 max-w-4xl mx-auto"
        >
          <h1 className="mg-title text-3xl md:text-4xl font-bold mb-3">
            Organizational Hierarchy
            {IS_DEMO_DATA && (
              <span className="ml-3 inline-block align-middle text-xs px-2 py-0.5 rounded-sm border border-[rgba(var(--mg-warning),0.5)] bg-[rgba(var(--mg-warning),0.1)] text-[rgba(var(--mg-warning),0.9)] font-sans font-medium tracking-wide">
                DEMO DATA
              </span>
            )}
          </h1>
          <p className="mg-subtitle text-base opacity-80">
            Dynamic organizational charts powered by the new OrgChart component. Click on cards to
            reveal additional information and explore the structure.
          </p>
        </motion.div>

        {/* Navigation Tabs */}
        <div className="max-w-4xl mx-auto mb-6">
          <NavigationTabs activeTab={activeTab} onTabChange={setActiveTab} />
        </div>

        {/* Chart Title */}
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="mb-6 text-center max-w-4xl mx-auto"
        >
          <h2 className="mg-subtitle text-xl font-medium">{getTabTitle()}</h2>
        </motion.div>

        {/* Org Chart Container with Uniform Spacing */}
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.3 }}
            className="w-full pb-4"
          >
            <OrgChart
              tree={getCurrentHierarchy()}
              className="w-full"
              headerResolver={getHeaderResolver()}
              extraConnections={getExtraConnections()}
              peerWithParentIds={activeTab === 'midnight' ? [] : []}
              nodeOffsets={
                activeTab === 'midnight' ? { msAssistantDirector: { y: 0, x: -120 } } : {}
              }
              isolateRowIds={activeTab === 'midnight' ? ['msAssistantDirector'] : []}
              anchorXToId={
                activeTab === 'midnight' ? { msAssistantDirector: 'msGunneryManager' } : {}
              }
            />
          </motion.div>
        </AnimatePresence>

        {/* Color Coding Reference */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="mt-12 mg-panel bg-[rgba(var(--mg-panel-dark),0.3)] p-4 sm:p-6 rounded-lg max-w-4xl mx-auto"
        >
          <h3 className="mg-title text-lg font-medium mb-4 text-center">Level Color Coding</h3>
          <div className="flex flex-wrap justify-center gap-6 mg-text text-sm">
            <div className="text-center">
              <span className="inline-block w-4 h-4 border-2 border-yellow-400 rounded mr-2"></span>
              <span className="text-yellow-400">Executive - Gold</span>
            </div>
            <div className="text-center">
              <span className="inline-block w-4 h-4 border-2 border-orange-400 rounded mr-2"></span>
              <span className="text-orange-400">Board - Orange</span>
            </div>
            <div className="text-center">
              <span className="inline-block w-4 h-4 border-2 border-green-400 rounded mr-2"></span>
              <span className="text-green-400">Management - Green</span>
            </div>
            <div className="text-center">
              <span className="inline-block w-4 h-4 border-2 border-purple-400 rounded mr-2"></span>
              <span className="text-purple-400">Employee - Bright Purple</span>
            </div>
            <div className="text-center">
              <span className="inline-block w-4 h-4 border-2 border-cyan-400 rounded mr-2"></span>
              <span className="text-cyan-400">Intern - Standard Cyan</span>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
