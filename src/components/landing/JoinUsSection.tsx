'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import Link from 'next/link';
import { MobiGlasButton } from '@/components/ui/mobiglas';

const positions = [
  {
    id: 'pilot',
    title: 'PILOT',
    description:
      'Join our elite team of pilots responsible for navigating the stars and ensuring safe transport of cargo and personnel.',
    requirements: [
      'Valid UEE Pilot License',
      'Minimum 2 years flight experience',
      'Clean flight record',
      'Adaptability to various ship types',
    ],
    benefits: [
      'Competitive salary',
      'Ship ownership program',
      'Advanced flight training',
      'Flexible scheduling',
    ],
  },
  {
    id: 'cargo',
    title: 'CARGO SPECIALIST',
    description:
      'Manage and optimize cargo operations, ensuring efficient loading, secure transport, and timely delivery of all shipments.',
    requirements: [
      'Logistics certification',
      'Experience with cargo management systems',
      'Strong organizational skills',
      'Problem-solving abilities',
    ],
    benefits: [
      'Performance bonuses',
      'Career advancement opportunities',
      'Specialized training',
      'Employee discount program',
    ],
  },
  {
    id: 'security',
    title: 'SECURITY OFFICER',
    description:
      'Protect our valuable cargo, personnel, and assets during transport and at our facilities across human and alien space.',
    requirements: [
      'Security clearance',
      'Combat training',
      'Threat assessment skills',
      'Team coordination experience',
    ],
    benefits: [
      'Hazard pay',
      'Advanced weapons training',
      'Premium health package',
      'Housing allowance',
    ],
  },
  {
    id: 'engineer',
    title: 'SHIP ENGINEER',
    description:
      'Maintain our fleet in peak operational condition, troubleshoot technical issues, and implement efficiency improvements.',
    requirements: [
      'Engineering certification',
      'Mechanical aptitude',
      'Diagnostic experience',
      'Familiarity with multiple ship systems',
    ],
    benefits: [
      'Technical skill bonuses',
      'Innovation rewards',
      'Advanced engineering courses',
      'Team project opportunities',
    ],
  },
];

export default function JoinUsSection() {
  const [activePosition, setActivePosition] = useState<string | null>(null);

  return (
    <section id="join" className="relative min-h-screen flex items-center justify-center py-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <motion.div
          className="text-center mb-16"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <div className="inline-block">
            <h2 className="mg-title text-3xl md:text-4xl mb-2">JOIN OUR TEAM</h2>
            <div className="w-full h-1 bg-gradient-to-r from-transparent via-[rgba(var(--mg-primary),0.6)] to-transparent"></div>
          </div>
          <p className="mt-4 text-[rgba(var(--mg-text),0.7)] max-w-3xl mx-auto">
            Aydo Intergalactic Corporation is always looking for talented individuals to join our
            growing operation. Explore our current openings and become part of our intergalactic
            family.
          </p>
        </motion.div>

        {/* Join Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left - Intro */}
          <motion.div
            className="lg:col-span-1"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <div className="mg-container p-6 h-full">
              <h3 className="text-lg md:text-xl text-[rgba(var(--mg-primary),0.9)] mb-4 font-quantify">
                WHY CHOOSE US?
              </h3>

              <div className="space-y-4 text-sm md:text-base text-[rgba(var(--mg-text),0.8)]">
                <p>
                  At Aydo Intergalactic Corporation, we believe our greatest asset is our people. We
                  foster a collaborative environment where innovation thrives and each team member
                  can make a meaningful impact.
                </p>

                <ul className="space-y-2">
                  <li className="flex items-start">
                    <span className="mr-2 mt-1 w-1.5 h-1.5 bg-[rgba(var(--mg-primary),0.7)] rounded-full"></span>
                    <span>Competitive compensation packages</span>
                  </li>
                  <li className="flex items-start">
                    <span className="mr-2 mt-1 w-1.5 h-1.5 bg-[rgba(var(--mg-primary),0.7)] rounded-full"></span>
                    <span>Ongoing professional development</span>
                  </li>
                  <li className="flex items-start">
                    <span className="mr-2 mt-1 w-1.5 h-1.5 bg-[rgba(var(--mg-primary),0.7)] rounded-full"></span>
                    <span>State-of-the-art equipment and technology</span>
                  </li>
                  <li className="flex items-start">
                    <span className="mr-2 mt-1 w-1.5 h-1.5 bg-[rgba(var(--mg-primary),0.7)] rounded-full"></span>
                    <span>Opportunities for interstellar travel</span>
                  </li>
                  <li className="flex items-start">
                    <span className="mr-2 mt-1 w-1.5 h-1.5 bg-[rgba(var(--mg-primary),0.7)] rounded-full"></span>
                    <span>Inclusive and diverse work culture</span>
                  </li>
                </ul>

                <div className="pt-4">
                  <Link href="/api/auth/login">
                    <MobiGlasButton
                      variant="primary"
                      fullWidth
                      whileHover={{ scale: 1.03 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      ACCESS EMPLOYEE PORTAL
                    </MobiGlasButton>
                  </Link>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Right - Open Positions */}
          <motion.div
            className="lg:col-span-2"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            <div className="mg-container p-6">
              <h3 className="text-lg md:text-xl text-[rgba(var(--mg-primary),0.9)] mb-6 font-quantify">
                OPEN POSITIONS
              </h3>

              <div className="space-y-4">
                {positions.map((position) => (
                  <motion.div
                    key={position.id}
                    className={`border border-[rgba(var(--mg-primary),0.2)] p-4 cursor-pointer transition-all duration-300 ${
                      activePosition === position.id ? 'bg-[rgba(var(--mg-primary),0.05)]' : ''
                    }`}
                    whileHover={{
                      borderColor: 'rgba(var(--mg-primary),0.4)',
                      backgroundColor: 'rgba(var(--mg-primary),0.03)',
                    }}
                    onClick={() =>
                      setActivePosition(activePosition === position.id ? null : position.id)
                    }
                  >
                    <div className="flex justify-between items-center">
                      <h4 className="text-[rgba(var(--mg-text),0.9)] font-medium">
                        {position.title}
                      </h4>
                      <motion.div
                        animate={{ rotate: activePosition === position.id ? 45 : 0 }}
                        transition={{ duration: 0.3 }}
                        className="w-6 h-6 flex items-center justify-center"
                      >
                        <span className="block w-3 h-0.5 bg-[rgba(var(--mg-primary),0.8)]"></span>
                        <span
                          className={`block w-0.5 h-3 bg-[rgba(var(--mg-primary),0.8)] absolute transition-opacity ${
                            activePosition === position.id ? 'opacity-0' : 'opacity-100'
                          }`}
                        ></span>
                      </motion.div>
                    </div>

                    <p className="text-sm text-[rgba(var(--mg-text),0.7)] mt-2">
                      {position.description}
                    </p>

                    <AnimatePresence>
                      {activePosition === position.id && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          transition={{ duration: 0.3 }}
                          className="overflow-hidden"
                        >
                          <div className="mt-4 pt-4 border-t border-[rgba(var(--mg-primary),0.15)] grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <h5 className="text-sm font-medium text-[rgba(var(--mg-primary),0.9)] mb-2">
                                Requirements
                              </h5>
                              <ul className="space-y-1">
                                {position.requirements.map((req, i) => (
                                  <motion.li
                                    key={i}
                                    initial={{ opacity: 0, x: -5 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ duration: 0.2, delay: i * 0.05 }}
                                    className="flex items-start text-xs text-[rgba(var(--mg-text),0.8)]"
                                  >
                                    <span className="mr-2 mt-1 w-1 h-1 bg-[rgba(var(--mg-primary),0.7)] rounded-full"></span>
                                    {req}
                                  </motion.li>
                                ))}
                              </ul>
                            </div>

                            <div>
                              <h5 className="text-sm font-medium text-[rgba(var(--mg-success),0.9)] mb-2">
                                Benefits
                              </h5>
                              <ul className="space-y-1">
                                {position.benefits.map((benefit, i) => (
                                  <motion.li
                                    key={i}
                                    initial={{ opacity: 0, x: -5 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ duration: 0.2, delay: i * 0.05 }}
                                    className="flex items-start text-xs text-[rgba(var(--mg-text),0.8)]"
                                  >
                                    <span className="mr-2 mt-1 w-1 h-1 bg-[rgba(var(--mg-success),0.7)] rounded-full"></span>
                                    {benefit}
                                  </motion.li>
                                ))}
                              </ul>
                            </div>
                          </div>

                          <div className="mt-4">
                            <Link href="/join" onClick={(e) => e.stopPropagation()}>
                              <motion.span
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                                className="inline-flex items-center text-sm text-[rgba(var(--mg-primary),0.9)] hover:text-[rgba(var(--mg-primary),1)]"
                              >
                                <span>Apply for this position</span>
                                <svg
                                  className="ml-1 w-4 h-4"
                                  viewBox="0 0 24 24"
                                  fill="none"
                                  xmlns="http://www.w3.org/2000/svg"
                                >
                                  <path
                                    d="M7 17L17 7M17 7H7M17 7V17"
                                    stroke="currentColor"
                                    strokeWidth="1.5"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                  />
                                </svg>
                              </motion.span>
                            </Link>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                ))}
              </div>

              <div className="mt-8 p-4 border border-dashed border-[rgba(var(--mg-primary),0.3)] text-center">
                <p className="text-sm text-[rgba(var(--mg-text),0.8)] mb-2">
                  Don&apos;t see a position that matches your skills?
                </p>
                <Link href="/join/recruitment-info">
                  <motion.span
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.98 }}
                    className="inline-block text-sm text-[rgba(var(--mg-primary),0.9)] hover:text-[rgba(var(--mg-primary),1)] underline"
                  >
                    Submit your general application
                  </motion.span>
                </Link>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
