'use client';

import React, { useState } from 'react';
import { motion } from 'motion/react';

interface ResourceLink {
  id: string;
  title: string;
  url: string;
  category: string;
  description?: string;
}

// Resource links from Discord useful links channel
const resourceLinks: ResourceLink[] = [
  // AydoCorp Official Links
  {
    id: 'rsi-webpage',
    title: 'AydoCorp RSI Organization Page',
    url: 'https://robertsspaceindustries.com/orgs/AYDOCORP',
    category: 'official',
    description: 'Official RSI organization page for Aydo Intergalactic Corporation',
  },
  {
    id: 'discord-invite',
    title: 'AydoCorp Discord Server',
    url: 'https://discord.gg/aydocorp',
    category: 'official',
    description: 'Join our community Discord server',
  },
  {
    id: 'youtube-page',
    title: 'AydoCorp Official YouTube',
    url: 'https://www.youtube.com/watch?v=09tIsGZ6-ec',
    category: 'official',
    description: 'Official YouTube channel for AydoCorp',
  },
  {
    id: 'suggestions-box',
    title: 'AydoCorp Suggestions Box',
    url: 'https://forms.gle/fS7Ho1YD6Zk9DQCT8',
    category: 'official',
    description: 'Submit suggestions and feedback to AydoCorp leadership',
  },
  {
    id: 'staff-application',
    title: 'AydoCorp Staff Application',
    url: 'https://forms.gle/yfxcfCYVTKDxVXc58',
    category: 'official',
    description: 'Apply for staff positions within AydoCorp',
  },
  {
    id: 'fleetyards-invite',
    title: 'AydoCorp Fleetyards Fleet',
    url: 'https://fltyrd.net/fi/YWOm5AoNlg/',
    category: 'official',
    description: 'Join our organization fleet on Fleetyards',
  },

  // Logistics and Trade Links
  {
    id: 'aaron-halo-routes',
    title: 'Aaron Halo Mining Routes',
    url: 'https://cstone.space/resources/knowledge-base/36-refinery-to-aaron-halo-mining-routes',
    category: 'logistics',
    description: 'Mining routes from refineries to Aaron Halo',
  },
  {
    id: 'ark-starmap',
    title: 'ARK Starmap',
    url: 'https://robertsspaceindustries.com/starmap',
    category: 'references',
    description: 'Official Star Citizen star map and navigation tool',
  },

  // Tools
  {
    id: 'erkul-games',
    title: 'Erkul Games',
    url: 'https://www.erkul.games/',
    category: 'ships',
    description: 'Ship loadout calculator and configuration tool',
  },
  {
    id: 'eva-community',
    title: 'EVA Community',
    url: 'https://eva.community/',
    category: 'community',
    description: 'Star Citizen community platform and tools',
  },
  {
    id: 'fleetyards',
    title: 'Fleetyards',
    url: 'https://fleetyards.net/',
    category: 'ships',
    description: 'Fleet management and ship database',
  },
  {
    id: 'galactapedia',
    title: 'Galactapedia',
    url: 'https://robertsspaceindustries.com/galactapedia',
    category: 'references',
    description: 'Official Star Citizen lore and universe encyclopedia',
  },
  {
    id: 'gallog-trading',
    title: 'Gallog Trading',
    url: 'https://www.gallog.co/trading',
    category: 'logistics',
    description: 'Trading routes and commodity price tracking',
  },
  {
    id: 'interdiction-calculator',
    title: 'Interdiction Calculator',
    url: 'https://snareplan.dolus.eu/',
    category: 'tools',
    description: 'Calculate interdiction points and routes',
  },
  {
    id: 'item-finder',
    title: 'Item Finder',
    url: 'https://finder.cstone.space/',
    category: 'tools',
    description: 'Find items and their locations in Star Citizen',
  },
  {
    id: 'daymar-rally-official',
    title: 'Official Daymar Rally Website',
    url: 'https://www.daymarrally.com/',
    category: 'racing',
    description: 'Official website for the Daymar Rally racing event',
  },
  {
    id: 'refinery-calculator',
    title: 'Refinery/Mining Calculator',
    url: 'https://regolith.rocks/',
    category: 'logistics',
    description: 'Calculate mining yields and refinery outputs',
  },
  {
    id: 'rsi-ship-matrix',
    title: 'RSI Ship Matrix',
    url: 'https://robertsspaceindustries.com/ship-matrix',
    category: 'ships',
    description: 'Official ship specifications and comparison tool',
  },
  {
    id: 'sc-trade-tools',
    title: 'SC-Trade Tools',
    url: 'https://sc-trade.tools/home',
    category: 'logistics',
    description: 'Comprehensive trading tools and route optimization',
  },
  {
    id: 'scr-daymar-rally',
    title: 'SCR Daymar Rally',
    url: 'https://scr.gg/event/daymar-rally/',
    category: 'racing',
    description: 'Daymar Rally section of Star Citizen Racing',
  },
  {
    id: 'server-status',
    title: 'Server Status',
    url: 'https://status.robertsspaceindustries.com/',
    category: 'tools',
    description: 'Official RSI server status and service monitoring',
  },
  {
    id: 'spectrum',
    title: 'Spectrum',
    url: 'https://robertsspaceindustries.com/spectrum/community/SC',
    category: 'community',
    description: 'Official Star Citizen community forums',
  },
  {
    id: 'star-citizen-racing',
    title: 'Star Citizen Racing',
    url: 'https://www.scr.gg/',
    category: 'racing',
    description: 'Premier Star Citizen racing community and events',
  },
  {
    id: 'starjump-fleetviewer',
    title: 'Starjump Fleetviewer (Hangar.link)',
    url: 'https://hangar.link/',
    category: 'ships',
    description: 'Recommended fleet management and hangar viewing tool',
  },
  {
    id: 'starship42',
    title: 'Starship42 Fleetviewer',
    url: 'https://starship42.com/',
    category: 'ships',
    description: 'Fleet management and ship visualization tool',
  },
  {
    id: 'travel-guide',
    title: 'Travel Guide (VerseGuide)',
    url: 'https://verseguide.com/',
    category: 'references',
    description: 'Comprehensive travel and location guide for Star Citizen',
  },
  {
    id: 'uex-corp',
    title: 'UEX Corp',
    url: 'https://uexcorp.space/',
    category: 'logistics',
    description: 'Trading platform and market analysis tools',
  },
];

export default function ResourcesPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedLetter, setSelectedLetter] = useState<string | null>(null);

  // Generate alphabet for filter
  const alphabet = Array.from({ length: 26 }, (_, i) => String.fromCharCode(65 + i));

  // Filter links based on search term and selected letter
  const filteredLinks = resourceLinks.filter((link: ResourceLink) => {
    const matchesSearch =
      searchTerm === '' ||
      link.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (link.description && link.description.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesLetter =
      selectedLetter === null || link.title.charAt(0).toUpperCase() === selectedLetter;

    return matchesSearch && matchesLetter;
  });

  return (
    <div className="min-h-screen bg-black bg-opacity-95 p-6 relative">
      {/* Holographic background effects */}
      <div className="absolute inset-0 bg-holo-grid bg-[length:50px_50px] opacity-5 pointer-events-none"></div>
      <div className="hexagon-bg absolute inset-0 opacity-5 pointer-events-none"></div>

      <div className="max-w-4xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="mb-8"
        >
          <h1 className="mg-title text-2xl sm:text-3xl lg:text-4xl mb-4">Resources</h1>
          <div className="h-1 w-20 bg-gradient-to-r from-transparent via-[rgba(var(--mg-primary),0.7)] to-transparent"></div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="mg-panel bg-[rgba(var(--mg-panel-dark),0.4)] p-6 rounded-sm relative mb-8"
        >
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-[rgba(var(--mg-primary),0.4)] to-transparent"></div>

          {/* Search bar */}
          <div className="relative mb-6">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5 text-[rgba(var(--mg-text),0.6)]"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
            </div>
            <input
              type="text"
              placeholder="Search resources..."
              className="w-full pl-10 pr-4 py-2 bg-[rgba(var(--mg-panel-dark),0.8)] border border-[rgba(var(--mg-primary),0.3)] rounded-sm focus:ring-1 focus:ring-[rgba(var(--mg-primary),0.5)] focus:border-[rgba(var(--mg-primary),0.5)] outline-none mg-text text-sm"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          {/* A-Z Filter */}
          <div className="flex flex-wrap mb-6 gap-1">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className={`w-8 h-8 flex items-center justify-center rounded-sm ${selectedLetter === null ? 'bg-[rgba(var(--mg-primary),0.2)] text-[rgba(var(--mg-primary),0.9)]' : 'bg-[rgba(var(--mg-panel-dark),0.5)] text-[rgba(var(--mg-text),0.8)]'}`}
              onClick={() => setSelectedLetter(null)}
            >
              All
            </motion.button>
            {alphabet.map((letter) => (
              <motion.button
                key={letter}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className={`w-8 h-8 flex items-center justify-center rounded-sm ${selectedLetter === letter ? 'bg-[rgba(var(--mg-primary),0.2)] text-[rgba(var(--mg-primary),0.9)]' : 'bg-[rgba(var(--mg-panel-dark),0.5)] text-[rgba(var(--mg-text),0.8)]'}`}
                onClick={() => setSelectedLetter(letter)}
              >
                {letter}
              </motion.button>
            ))}
          </div>

          {/* Resources List */}
          <div className="space-y-4">
            {filteredLinks.length > 0 ? (
              filteredLinks.map((link: ResourceLink) => (
                <motion.div
                  key={link.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4 }}
                  className="bg-[rgba(var(--mg-panel-dark),0.6)] border border-[rgba(var(--mg-primary),0.2)] p-4 rounded-sm relative overflow-hidden group"
                >
                  {/* Category indicator */}
                  <div
                    className={`absolute left-0 top-0 bottom-0 w-1 ${
                      link.category === 'official'
                        ? 'bg-[rgba(var(--mg-primary),0.7)]'
                        : link.category === 'logistics'
                          ? 'bg-[rgba(255,165,0,0.7)]'
                          : link.category === 'ships'
                            ? 'bg-[rgba(var(--mg-accent),0.7)]'
                            : link.category === 'tools'
                              ? 'bg-[rgba(200,200,100,0.7)]'
                              : link.category === 'community'
                                ? 'bg-[rgba(128,255,128,0.7)]'
                                : link.category === 'racing'
                                  ? 'bg-[rgba(255,100,100,0.7)]'
                                  : link.category === 'references'
                                    ? 'bg-[rgba(180,130,255,0.7)]'
                                    : 'bg-[rgba(150,150,150,0.7)]'
                    }`}
                  ></div>

                  <div className="ml-2">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-quantify tracking-wider text-[rgba(var(--mg-primary),0.9)]">
                        {link.title}
                      </h3>
                      <span className="text-xs px-2 py-1 rounded-sm bg-[rgba(var(--mg-panel-dark),0.8)] text-[rgba(var(--mg-text),0.6)] capitalize">
                        {link.category}
                      </span>
                    </div>

                    {link.description && (
                      <p className="text-sm text-[rgba(var(--mg-text),0.8)] mt-1">
                        {link.description}
                      </p>
                    )}

                    <div className="mt-3">
                      <a
                        href={link.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center px-3 py-1 rounded-sm bg-[rgba(var(--mg-panel-dark),0.8)] border border-[rgba(var(--mg-primary),0.4)] text-sm text-[rgba(var(--mg-primary),0.9)] hover:bg-[rgba(var(--mg-primary),0.2)] transition-colors"
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="h-4 w-4 mr-1"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={1.5}
                            d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                          />
                        </svg>
                        Visit
                      </a>
                    </div>
                  </div>

                  {/* Hover effect */}
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-[rgba(var(--mg-primary),0.05)] to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>
                </motion.div>
              ))
            ) : (
              <div className="text-center py-8">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-12 w-12 mx-auto text-[rgba(var(--mg-text),0.3)]"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1}
                    d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <p className="mt-4 text-[rgba(var(--mg-text),0.6)]">
                  No resources match your search criteria
                </p>
              </div>
            )}
          </div>

          {/* Submission notice */}
          <div className="mt-8 p-4 border border-dashed border-[rgba(var(--mg-primary),0.3)] rounded-sm">
            <div className="flex items-center">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5 text-[rgba(var(--mg-primary),0.7)] mr-2"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <p className="text-sm text-[rgba(var(--mg-text),0.7)]">
                Have a link to add? Submit it through the{' '}
                <a
                  href="https://forms.gle/fS7Ho1YD6Zk9DQCT8"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[rgba(var(--mg-primary),0.9)] underline hover:text-[rgba(var(--mg-primary),1)] transition-colors"
                >
                  AydoCorp Suggestions Box
                </a>{' '}
                and an administrator will review it for inclusion.
              </p>
            </div>
          </div>

          {/* Animated data stream */}
          <div className="absolute inset-x-0 bottom-0 h-px">
            <motion.div
              className="h-full bg-gradient-to-r from-transparent via-[rgba(var(--mg-primary),0.8)] to-transparent"
              animate={{
                x: ['-100%', '100%'],
              }}
              transition={{
                duration: 3,
                repeat: Infinity,
                ease: 'linear',
              }}
            />
          </div>
        </motion.div>

        <div className="mt-6 text-center text-xs text-[rgba(var(--mg-text),0.6)]">
          AYDO INTERGALACTIC CORPORATION - INTERNAL ARCHIVES
        </div>
      </div>
    </div>
  );
}
