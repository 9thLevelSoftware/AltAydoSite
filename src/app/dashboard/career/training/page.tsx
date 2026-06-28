'use client';

import React from 'react';
import { motion } from 'motion/react';
import Link from 'next/link';
import Image from 'next/image';
import { cdn } from '@/lib/cdn';
import DashboardBreadcrumbs from '@/components/dashboard/DashboardBreadcrumbs';

interface TrainingTrack {
  id: string;
  title: string;
  description: string;
  topics: string[];
  accent: string;
  logo?: string;
  logoAlt?: string;
}

interface TrainingStep {
  step: number;
  title: string;
  description: string;
}

interface LearningResource {
  title: string;
  description: string;
  href: string;
  external: boolean;
}

function TrackCard({ track }: { track: TrainingTrack }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="bg-[rgba(var(--mg-panel-dark),0.6)] border border-[rgba(var(--mg-primary),0.2)] rounded-sm relative overflow-hidden h-full"
    >
      <div
        className="absolute left-0 top-0 bottom-0 w-1"
        style={{ backgroundColor: track.accent }}
      ></div>

      <div className="ml-2 p-4">
        <div className="flex items-center mb-3">
          {track.logo && (
            <div className="h-9 w-9 relative mr-3 rounded-sm overflow-hidden flex-shrink-0">
              <Image
                src={cdn(track.logo)}
                alt={track.logoAlt || track.title}
                fill
                className="object-contain"
              />
            </div>
          )}
          <h3 className="text-lg font-quantify tracking-wider text-[rgba(var(--mg-primary),0.9)]">
            {track.title}
          </h3>
        </div>

        <p className="text-sm text-[rgba(var(--mg-text),0.8)] mb-4">{track.description}</p>

        <ul className="space-y-2">
          {track.topics.map((topic, index) => (
            <li key={index} className="text-sm text-[rgba(var(--mg-text),0.7)] flex items-start">
              <span className="text-[rgba(var(--mg-primary),0.6)] mr-2 mt-1 text-xs">•</span>
              <span>{topic}</span>
            </li>
          ))}
        </ul>
      </div>
    </motion.div>
  );
}

export default function TrainingPage() {
  const trainingTracks: TrainingTrack[] = [
    {
      id: 'employee-onboarding',
      title: 'Employee Onboarding',
      description:
        'Foundational skills every new hire is evaluated on before promotion from intern to employee.',
      topics: [
        'Small ship flight, takeoff and landing',
        'Basic firearms and turret operation',
        'Basic first aid with the medpen',
        'Multi-tool usage and attachment swapping',
      ],
      accent: 'rgba(var(--mg-primary),0.7)',
    },
    {
      id: 'aydoexpress',
      title: 'AydoExpress Logistics',
      description:
        'Cargo, passenger transport, trading and towing operations for the hauling subsidiary.',
      topics: [
        'Large ship flight and cargo handling',
        'Passenger transport and smooth flight discipline',
        'Trading, sourcing and profit-margin awareness',
        'Single and multi-ship towing with the SRV',
      ],
      accent: 'rgba(0,210,255,0.7)',
      logo: '/Aydo_Express.png',
      logoAlt: 'AydoExpress Logo',
    },
    {
      id: 'empyrion',
      title: 'Empyrion Industries',
      description:
        'Resource extraction, salvage, repair and refueling for the industrial subsidiary.',
      topics: [
        'Ship and ground mining workflows',
        'Ship and handheld salvage, including hull munching',
        'Hand repair and ship refueling procedures',
        'Surveying ideal land and resource locations',
      ],
      accent: 'rgba(255,165,0,0.7)',
      logo: '/Empyrion_Industries.png',
      logoAlt: 'Empyrion Industries Logo',
    },
    {
      id: 'security',
      title: 'Midnight Security',
      description: 'Offensive and defensive operations, combat medicine and high-risk transport.',
      topics: [
        'Flight patrol, targeting and fire-group management',
        'Ground patrol, squad roles and CQB basics',
        'First responder combat medicine',
        'High-risk transport in hazardous environments',
      ],
      accent: 'rgba(255,100,100,0.7)',
      logo: '/New_Midnight_Security.png',
      logoAlt: 'Midnight Security Logo',
    },
  ];

  const trainingSteps: TrainingStep[] = [
    {
      step: 1,
      title: 'Review the curriculum',
      description:
        'Browse the certification tracks to see the skills covered and the items you will be evaluated on.',
    },
    {
      step: 2,
      title: 'Request a session',
      description:
        'Reach out to a trainer or supervisor in the AydoCorp Discord to schedule an evaluation or hands-on training session.',
    },
    {
      step: 3,
      title: 'Train or evaluate',
      description:
        'Sessions run 15 to 30 minutes. If you are already proficient, your trainer will simply verify competency and waive the walkthrough.',
    },
    {
      step: 4,
      title: 'Earn your certification',
      description:
        'Pass the evaluation to unlock the certification and qualify for preferred roles during structured operations.',
    },
  ];

  const learningResources: LearningResource[] = [
    {
      title: 'Certification Catalog',
      description:
        'The full list of employee and subsidiary certifications with the exact items assessed for each.',
      href: '/dashboard/career/certifications',
      external: false,
    },
    {
      title: 'Career Advancement',
      description: 'Understand rank progression and how certifications factor into promotions.',
      href: '/dashboard/career/advancement',
      external: false,
    },
    {
      title: 'Star Citizen Reference',
      description:
        'Official RSI knowledge base for in-game mechanics referenced throughout training.',
      href: 'https://robertsspaceindustries.com/',
      external: true,
    },
  ];

  return (
    <div className="min-h-screen bg-black bg-opacity-95 p-4 md:p-6 relative">
      <div className="absolute inset-0 bg-holo-grid bg-[length:50px_50px] opacity-5 pointer-events-none" />
      <div className="hexagon-bg absolute inset-0 opacity-5 pointer-events-none" />

      <div className="max-w-6xl mx-auto">
        <div className="mb-6">
          <DashboardBreadcrumbs />
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="mb-8"
        >
          <h1 className="mg-title text-2xl sm:text-3xl lg:text-4xl mb-4">Training Center</h1>
          <div className="h-1 w-20 bg-gradient-to-r from-transparent via-[rgba(var(--mg-primary),0.7)] to-transparent" />
        </motion.div>

        {/* Intro */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="mg-panel bg-[rgba(var(--mg-panel-dark),0.4)] p-6 rounded-sm relative mb-8"
        >
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-[rgba(var(--mg-primary),0.4)] to-transparent" />

          <h2 className="mg-subtitle text-xl mb-4">Develop Your Skills</h2>
          <p className="text-[rgba(var(--mg-text),0.8)] leading-relaxed">
            AydoCorp&apos;s training program prepares every member for safe, effective operations
            across our subsidiaries. Browse the training tracks below, request a session with a
            trainer, and work toward the certifications that unlock preferred roles during our
            structured operations. Whether you are a brand new intern or a veteran looking to add a
            specialty, there is a path for you.
          </p>
        </motion.div>

        {/* Training Tracks */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.4 }}
          className="mg-panel bg-[rgba(var(--mg-panel-dark),0.4)] p-6 rounded-sm relative mb-8"
        >
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-[rgba(var(--mg-primary),0.4)] to-transparent" />

          <h2 className="mg-subtitle text-xl mb-6">Training Tracks</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {trainingTracks.map((track) => (
              <TrackCard key={track.id} track={track} />
            ))}
          </div>
        </motion.div>

        {/* How Training Works */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.6 }}
          className="mg-panel bg-[rgba(var(--mg-panel-dark),0.4)] p-6 rounded-sm relative mb-8"
        >
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-[rgba(var(--mg-primary),0.4)] to-transparent" />

          <h2 className="mg-subtitle text-xl mb-6">How Training Works</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {trainingSteps.map((step) => (
              <div
                key={step.step}
                className="bg-[rgba(var(--mg-panel-dark),0.6)] border border-[rgba(var(--mg-primary),0.2)] rounded-sm p-4 relative"
              >
                <div className="text-2xl font-quantify tracking-widest text-[rgba(var(--mg-primary),0.8)] mb-2">
                  {String(step.step).padStart(2, '0')}
                </div>
                <h3 className="text-sm font-quantify tracking-wider text-[rgba(var(--mg-text),0.9)] mb-2">
                  {step.title}
                </h3>
                <p className="text-xs text-[rgba(var(--mg-text),0.7)] leading-relaxed">
                  {step.description}
                </p>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Learning Resources */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.8 }}
          className="mg-panel bg-[rgba(var(--mg-panel-dark),0.4)] p-6 rounded-sm relative mb-8"
        >
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-[rgba(var(--mg-primary),0.4)] to-transparent" />

          <h2 className="mg-subtitle text-xl mb-6">Learning Resources</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {learningResources.map((resource) => {
              const cardClasses =
                'group bg-[rgba(var(--mg-panel-dark),0.6)] border border-[rgba(var(--mg-primary),0.2)] hover:border-[rgba(var(--mg-primary),0.5)] hover:bg-[rgba(var(--mg-primary),0.05)] transition-colors rounded-sm p-4 block h-full';

              const content = (
                <>
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-sm font-quantify tracking-wider text-[rgba(var(--mg-primary),0.9)]">
                      {resource.title}
                    </h3>
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-4 w-4 text-[rgba(var(--mg-primary),0.6)] group-hover:text-[rgba(var(--mg-primary),0.9)] transition-colors"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 5l7 7-7 7"
                      />
                    </svg>
                  </div>
                  <p className="text-xs text-[rgba(var(--mg-text),0.7)] leading-relaxed">
                    {resource.description}
                  </p>
                </>
              );

              return resource.external ? (
                <a
                  key={resource.title}
                  href={resource.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={cardClasses}
                >
                  {content}
                </a>
              ) : (
                <Link key={resource.title} href={resource.href} className={cardClasses}>
                  {content}
                </Link>
              );
            })}
          </div>
        </motion.div>

        {/* CTA */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, delay: 1.0 }}
          className="mg-panel bg-[rgba(var(--mg-panel-dark),0.4)] p-6 rounded-sm relative mb-8 text-center"
        >
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-[rgba(var(--mg-primary),0.4)] to-transparent" />

          <h2 className="mg-subtitle text-xl mb-3">Ready to get certified?</h2>
          <p className="text-sm text-[rgba(var(--mg-text),0.7)] max-w-2xl mx-auto mb-6">
            Review the full certification catalog to see exactly what each evaluation covers, then
            reach out to a trainer in the AydoCorp Discord to schedule your session.
          </p>
          <Link
            href="/dashboard/career/certifications"
            className="inline-flex items-center px-6 py-2 bg-[rgba(var(--mg-primary),0.15)] hover:bg-[rgba(var(--mg-primary),0.25)] border border-[rgba(var(--mg-primary),0.5)] rounded-sm text-sm font-quantify tracking-wider text-[rgba(var(--mg-primary),0.9)] transition-colors"
          >
            View Certifications
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-4 w-4 ml-2"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </Link>
        </motion.div>

        <div className="mt-6 text-center text-xs text-[rgba(var(--mg-text),0.6)]">
          AYDO INTERGALACTIC CORPORATION - CAREER DEVELOPMENT
        </div>
      </div>
    </div>
  );
}
