'use client';

import React, { useState } from 'react';
import { motion } from 'motion/react';
import Image from 'next/image';
import { cdn } from '@/lib/cdn';

interface PointActivity {
  activity: string;
  points: number;
  description?: string;
}

interface RankData {
  name: string;
  abbreviation: string;
  points: number;
  generalRank: string;
  timeRequirement?: string;
}

interface RewardItem {
  name: string;
  description?: string;
}

interface RankRewards {
  rank: string;
  generalRank: string;
  everyone?: RewardItem[];
  aydoexpress?: RewardItem[];
  empyrion?: RewardItem[];
  security?: RewardItem[];
}

export default function AdvancementPage() {
  const [activeTab, setActiveTab] = useState<'points' | 'pathway' | 'rewards'>('points');

  const pointActivities: PointActivity[] = [
    { activity: 'Recruit initial (bring in a prospective hire / potential new member)', points: 1 },
    { activity: 'Trainee (when being evaluated for certifications)', points: 2 },
    { activity: 'General activity', points: 2 },
    { activity: 'Recruit member (when a PH brought in becomes an intern)', points: 4 },
    { activity: 'Official/structured event', points: 4 },
    { activity: 'Earning certification', points: 5 },
    { activity: 'Performance bonus (based on level of distinction during an activity)', points: 5, description: 'or 10 at management discretion' },
    { activity: 'Trainer (per training session, not per members trained)', points: 7 },
    { activity: 'Employee of the quarter', points: 10 },
    { activity: '1 year employment anniversary', points: 25 }
  ];

  const subsidiaryRanks: RankData[] = [
    { name: 'Trainee', abbreviation: 'E', points: 25, generalRank: 'Employee' },
    { name: 'Standard Hire', abbreviation: 'E', points: 75, generalRank: 'Employee', timeRequirement: '1 month minimum at Employee level' },
    { name: 'Experienced Hire', abbreviation: 'E', points: 150, generalRank: 'Employee' },
    { name: 'Seasoned Hire', abbreviation: 'SE', points: 250, generalRank: 'Senior Employee', timeRequirement: '3 months minimum at Senior Employee level' },
    { name: 'Veteran Hire', abbreviation: 'SE', points: 400, generalRank: 'Senior Employee' },
    { name: 'Team Leader', abbreviation: 'S', points: 600, generalRank: 'Supervisor', timeRequirement: '6 months minimum at Supervisor level' },
    { name: 'Unit Leader', abbreviation: 'M', points: 850, generalRank: 'Manager', timeRequirement: '6 months minimum at Manager level' },
    { name: 'Vice Director', abbreviation: 'M', points: 1150, generalRank: 'Manager' },
    { name: 'Director', abbreviation: 'D', points: 1500, generalRank: 'Director' }
  ];

  const currentRewards: RankRewards[] = [
    {
      rank: 'Trainee',
      generalRank: 'E',
      everyone: [{ name: 'Formal attire set' }]
    },
    {
      rank: 'Standard Hire',
      generalRank: 'E',
      everyone: [
        { name: '50k aUEC promotion bonus' },
        { name: '⅛ scu box' }
      ],
      aydoexpress: [
        { name: 'Aril Armor Set (Blue)' },
        { name: 'Pyro Multi-Tool w/ tractor attachment' },
        { name: 'Maxlift Tractor' },
        { name: 'Set of clothing' }
      ],
      empyrion: [
        { name: 'Aril Armor Set (Yellow)' },
        { name: 'Pyro Multi-Tool w/ mining attachment' },
        { name: 'Cambrio SRT' },
        { name: 'Set of clothing' }
      ],
      security: [
        { name: 'ADP Medium Armor Set (Black)' },
        { name: 'S38 Pistol' },
        { name: 'P4-R w/ 2x holosight' },
        { name: 'Set of clothing' }
      ]
    },
    {
      rank: 'Experienced Hire',
      generalRank: 'E',
      aydoexpress: [{ name: 'ATLS' }],
      empyrion: [{ name: 'ATLS GEO' }],
      security: [{ name: 'Cyclone' }]
    },
    {
      rank: 'Seasoned Hire',
      generalRank: 'SE',
      everyone: [{ name: 'TBD' }]
    },
    {
      rank: 'Veteran Hire',
      generalRank: 'SE',
      aydoexpress: [{ name: 'C1' }],
      empyrion: [{ name: 'Prospector/Vulture' }],
      security: [{ name: 'Gladius' }]
    },
    {
      rank: 'Team Leader',
      generalRank: 'S',
      everyone: [{ name: 'TBD' }]
    },
    {
      rank: 'Unit Leader',
      generalRank: 'M',
      aydoexpress: [{ name: 'Freelancer MAX' }],
      empyrion: [{ name: 'SRV/Mole' }],
      security: [{ name: 'Hornet Mk II' }]
    },
    {
      rank: 'Vice Director',
      generalRank: 'M',
      everyone: [{ name: 'TBD' }]
    },
    {
      rank: 'Director',
      generalRank: 'D',
      everyone: [{ name: 'TBD' }]
    }
  ];

  const futureRewards = [
    {
      rank: 'Prospective Member (PM)',
      rewards: ['Communal housing, free for 2 weeks', 'Storage, free for 2 weeks']
    },
    {
      rank: 'Intern (I)',
      rewards: ['Shared dorm', 'Private storage*', 'Facility discounts*', 'Free equipment and services access (refinery/crafting/clinic/etc.)*']
    },
    {
      rank: 'Trainee (E)',
      rewards: ['N/A']
    },
    {
      rank: 'Standard Hire (E)',
      rewards: ['Prefab apartment', 'Reserved landing pad*']
    },
    {
      rank: 'Experienced Hire (E)',
      rewards: ['N/A']
    },
    {
      rank: 'Seasoned Hire (SE)',
      rewards: ['Priority aid (for things like personal contracts and other activities)*']
    },
    {
      rank: 'Veteran Hire (SE)',
      rewards: ['Custom apartment', 'Private garage*']
    },
    {
      rank: 'Team Leader (S)',
      rewards: ['Small, private facility*']
    },
    {
      rank: 'Unit Leader (M)',
      rewards: ['Free rehousing (if desired)']
    },
    {
      rank: 'Vice Director (M)',
      rewards: ['Custom house', 'Medium-sized private facility*', 'Management luxury passenger liner access*']
    },
    {
      rank: 'Director (D)',
      rewards: ['Small manor or large penthouse', 'Large private hangar (external)*', 'Large private facility*', 'Security team (NPCs)', 'Capital ship']
    },
    {
      rank: 'Board Member (BM)',
      rewards: ['Villa estate and large penthouse']
    }
  ];

  return (
    <div className="min-h-screen bg-black bg-opacity-95 p-6 relative">
      {/* Background effects */}
      <div className="absolute inset-0 bg-holo-grid bg-[length:50px_50px] opacity-5 pointer-events-none"></div>
      <div className="hexagon-bg absolute inset-0 opacity-5 pointer-events-none"></div>

      <div className="max-w-6xl mx-auto">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="mb-8"
        >
          <h1 className="mg-title text-2xl sm:text-3xl lg:text-4xl mb-4">Career Development - Rank Advancement</h1>
          <div className="h-1 w-20 bg-gradient-to-r from-transparent via-[rgba(var(--mg-primary),0.7)] to-transparent"></div>
        </motion.div>

        {/* Navigation Tabs */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="mb-8"
        >
          <div className="flex flex-wrap gap-2 sm:gap-4">
            {[
              { id: 'points' as const, label: 'Point System' },
              { id: 'pathway' as const, label: 'Promotion Pathway' },
              { id: 'rewards' as const, label: 'Rewards & Compensation' }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-2 rounded-sm border transition-all font-quantify tracking-wider text-sm ${
                  activeTab === tab.id
                    ? 'bg-[rgba(var(--mg-primary),0.2)] border-[rgba(var(--mg-primary),0.6)] text-[rgba(var(--mg-primary),0.9)]'
                    : 'bg-[rgba(var(--mg-panel-dark),0.4)] border-[rgba(var(--mg-primary),0.2)] text-[rgba(var(--mg-text),0.7)] hover:border-[rgba(var(--mg-primary),0.4)]'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </motion.div>

        {/* Point System Section */}
        {activeTab === 'points' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="space-y-6"
          >
            <div className="mg-panel bg-[rgba(var(--mg-panel-dark),0.4)] p-6 rounded-sm relative">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-[rgba(var(--mg-primary),0.4)] to-transparent"></div>
              
              <h2 className="mg-subtitle text-xl mb-4">Point System</h2>
              <p className="text-[rgba(var(--mg-text),0.8)] mb-6 leading-relaxed">
                In order to earn greater rewards and move up through the corporation, one must first become an employee in a subsidiary. Established employees can then start moving up the ranks via our point system; such points can be accrued many different ways, such as from earning certifications or attending events. Your general corporate rank is tied to your subsidiary ranking progression, one cannot go up without the other; as such, each subsidiary shares a similar ranking system, though there may be some horizontal promotional opportunities that are different to each one.
              </p>

              <div className="grid gap-4 md:grid-cols-2">
                {pointActivities.map((activity, index) => (
                  <div key={index} className="bg-[rgba(var(--mg-panel-dark),0.6)] border border-[rgba(var(--mg-primary),0.2)] rounded-sm p-4">
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="text-[rgba(var(--mg-text),0.9)] font-quantify text-sm tracking-wider flex-1 mr-3">
                        {activity.activity}
                      </h3>
                      <span className="text-[rgba(var(--mg-primary),0.8)] font-bold text-lg">
                        {activity.points}
                      </span>
                    </div>
                    {activity.description && (
                      <p className="text-xs text-[rgba(var(--mg-text),0.6)]">{activity.description}</p>
                    )}
                  </div>
                ))}
              </div>

              <div className="mt-6 p-4 bg-[rgba(var(--mg-accent),0.1)] border border-[rgba(var(--mg-accent),0.3)] rounded-sm">
                <h3 className="text-[rgba(var(--mg-accent),0.9)] font-quantify text-sm tracking-wider mb-2">POINT CAPS</h3>
                <ul className="space-y-1 text-sm text-[rgba(var(--mg-text),0.8)]">
                  <li>• Cap of 20 points for general and official event attendance per month</li>
                  <li>• Cap of 2 certification evaluations per month (apart from the initial evaluation where you earn 5 in order to become an employee)</li>
                </ul>
              </div>
            </div>
          </motion.div>
        )}

        {/* Promotion Pathway Section */}
        {activeTab === 'pathway' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="space-y-6"
          >
            <div className="mg-panel bg-[rgba(var(--mg-panel-dark),0.4)] p-6 rounded-sm relative">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-[rgba(var(--mg-primary),0.4)] to-transparent"></div>
              
              <h2 className="mg-subtitle text-xl mb-6">Promotion Pathway</h2>

              {/* General Corporate Ranks */}
              <div className="mb-8">
                <h3 className="text-lg font-quantify tracking-wider text-[rgba(var(--mg-text),0.9)] mb-4">General Corporate Ranks & Acronyms</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
                  {['Intern (I)', 'Employee (E)', 'Senior Employee (SE)', 'Supervisor (S)', 'Manager (M)', 'Director (D)', 'Board Member (BM)'].map((rank, index) => (
                    <div key={index} className="bg-[rgba(var(--mg-panel-dark),0.6)] border border-[rgba(var(--mg-primary),0.2)] rounded-sm p-3 text-center">
                      <span className="text-sm font-quantify tracking-wider text-[rgba(var(--mg-primary),0.8)]">{rank}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Subsidiary Ranks */}
              <div className="mb-6">
                <h3 className="text-lg font-quantify tracking-wider text-[rgba(var(--mg-text),0.9)] mb-4">Subsidiary Ranks & Point Requirements</h3>
                <div className="space-y-3">
                  {subsidiaryRanks.map((rank, index) => (
                    <div key={index} className="bg-[rgba(var(--mg-panel-dark),0.6)] border border-[rgba(var(--mg-primary),0.2)] rounded-sm p-4">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-2">
                        <div className="flex items-center space-x-4">
                          <h4 className="font-quantify tracking-wider text-[rgba(var(--mg-primary),0.9)]">
                            {rank.name} ({rank.abbreviation})
                          </h4>
                          <span className="text-sm text-[rgba(var(--mg-text),0.7)]">
                            → {rank.generalRank}
                          </span>
                        </div>
                        <span className="text-[rgba(var(--mg-accent),0.8)] font-bold text-lg">
                          {rank.points} points
                        </span>
                      </div>
                      {rank.timeRequirement && (
                        <p className="text-xs text-[rgba(var(--mg-text),0.6)]">{rank.timeRequirement}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div className="p-4 bg-[rgba(var(--mg-accent),0.1)] border border-[rgba(var(--mg-accent),0.3)] rounded-sm">
                <h3 className="text-[rgba(var(--mg-accent),0.9)] font-quantify text-sm tracking-wider mb-2">IMPORTANT NOTES</h3>
                <ul className="space-y-1 text-sm text-[rgba(var(--mg-text),0.8)]">
                  <li>• The rank names above are a stand-in naming convention, each subsidiary has different names but they all share the same number of basic ranks</li>
                  <li>• To move up past the intern level concerning general ranks, you need to rank up in your respective subsidiary</li>
                  <li>• Time requirements ensure more steady and fair promotions</li>
                </ul>
              </div>
            </div>
          </motion.div>
        )}

        {/* Rewards & Compensation Section */}
        {activeTab === 'rewards' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="space-y-6"
          >
            {/* Current Rewards */}
            <div className="mg-panel bg-[rgba(var(--mg-panel-dark),0.4)] p-6 rounded-sm relative">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-[rgba(var(--mg-primary),0.4)] to-transparent"></div>
              
              <h2 className="mg-subtitle text-xl mb-6">Current Rewards & Compensation</h2>
              
              <div className="space-y-6">
                {currentRewards.map((reward, index) => (
                  <div key={index} className="bg-[rgba(var(--mg-panel-dark),0.6)] border border-[rgba(var(--mg-primary),0.2)] rounded-sm p-4">
                    <h3 className="font-quantify tracking-wider text-[rgba(var(--mg-primary),0.9)] text-lg mb-4">
                      {reward.rank} ({reward.generalRank})
                    </h3>
                    
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                      {reward.everyone && (
                        <div>
                          <h4 className="text-sm font-quantify tracking-wider text-[rgba(var(--mg-text),0.9)] mb-2">Everyone</h4>
                          <ul className="space-y-1">
                            {reward.everyone.map((item, idx) => (
                              <li key={idx} className="text-sm text-[rgba(var(--mg-text),0.7)]">• {item.name}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                      
                      {reward.aydoexpress && (
                        <div>
                          <h4 className="text-sm font-quantify tracking-wider text-[rgba(0,210,255,0.8)] mb-2 flex items-center">
                            <Image src={cdn('/Aydo_Express.png')} alt="AydoExpress" width={16} height={16} className="mr-2" />
                            AydoExpress
                          </h4>
                          <ul className="space-y-1">
                            {reward.aydoexpress.map((item, idx) => (
                              <li key={idx} className="text-sm text-[rgba(var(--mg-text),0.7)]">• {item.name}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                      
                      {reward.empyrion && (
                        <div>
                          <h4 className="text-sm font-quantify tracking-wider text-[rgba(255,165,0,0.8)] mb-2 flex items-center">
                            <Image src={cdn('/Empyrion_Industries.png')} alt="Empyrion" width={16} height={16} className="mr-2" />
                            Empyrion Industries
                          </h4>
                          <ul className="space-y-1">
                            {reward.empyrion.map((item, idx) => (
                              <li key={idx} className="text-sm text-[rgba(var(--mg-text),0.7)]">• {item.name}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                      
                      {reward.security && (
                        <div>
                          <h4 className="text-sm font-quantify tracking-wider text-[rgba(255,100,100,0.8)] mb-2 flex items-center">
                            <Image src={cdn('/New_Midnight_Security.png')} alt="Midnight Security" width={16} height={16} className="mr-2" />
                            Midnight Security
                          </h4>
                          <ul className="space-y-1">
                            {reward.security.map((item, idx) => (
                              <li key={idx} className="text-sm text-[rgba(var(--mg-text),0.7)]">• {item.name}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Future Rewards */}
            <div className="mg-panel bg-[rgba(var(--mg-panel-dark),0.4)] p-6 rounded-sm relative">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-[rgba(var(--mg-accent),0.4)] to-transparent"></div>
              
              <h2 className="mg-subtitle text-xl mb-4">Prospective Future Rewards</h2>
              <p className="text-[rgba(var(--mg-text),0.8)] mb-6 leading-relaxed">
                As things like crafting and base-building gameplay come into the game:
              </p>
              
              <div className="space-y-4">
                {futureRewards.map((reward, index) => (
                  <div key={index} className="bg-[rgba(var(--mg-panel-dark),0.6)] border border-[rgba(var(--mg-accent),0.2)] rounded-sm p-4">
                    <h3 className="font-quantify tracking-wider text-[rgba(var(--mg-accent),0.9)] mb-2">
                      {reward.rank}
                    </h3>
                    <ul className="space-y-1">
                      {reward.rewards.map((item, idx) => (
                        <li key={idx} className="text-sm text-[rgba(var(--mg-text),0.7)]">• {item}</li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>

              <div className="mt-6 p-4 bg-[rgba(var(--mg-accent),0.1)] border border-[rgba(var(--mg-accent),0.3)] rounded-sm">
                <p className="text-xs text-[rgba(var(--mg-text),0.7)]">
                  <strong>NOTE:</strong> All items marked with an * are applicable for said rank and higher.
                </p>
              </div>
            </div>
          </motion.div>
        )}
        
        <div className="mt-8 text-center text-xs text-[rgba(var(--mg-text),0.6)]">
          AYDO INTERGALACTIC CORPORATION - CAREER DEVELOPMENT
        </div>
      </div>
    </div>
  );
}
