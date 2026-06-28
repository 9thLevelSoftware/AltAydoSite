'use client';

import React from 'react';
import { motion } from 'motion/react';
import { MobiGlasPanel } from '@/components/ui/mobiglas';

const benefits = [
  {
    title: 'Career Development',
    description:
      'Access to advanced training programs, professional certifications, and clear advancement pathways within our organization.',
    icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01',
  },
  {
    title: 'Corporate Culture',
    description:
      'Join a dynamic team of professionals dedicated to excellence in interstellar logistics and transportation.',
    icon: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z',
  },
  {
    title: 'Advanced Resources',
    description:
      'Work with cutting-edge technology and infrastructure supporting our interstellar operations.',
    icon: 'M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z',
  },
  {
    title: 'Operational Experience',
    description:
      'Gain hands-on experience in various aspects of interstellar logistics and transportation.',
    icon: 'M13 10V3L4 14h7v7l9-11h-7z',
  },
];

interface BenefitsSectionProps {
  hoveredIndex: number | null;
  setHoveredIndex: (index: number | null) => void;
}

export default function BenefitsSection({ hoveredIndex, setHoveredIndex }: BenefitsSectionProps) {
  return (
    <section className="py-16 bg-gradient-to-b from-black to-[rgba(var(--mg-background),0.7)]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          transition={{ duration: 0.8 }}
          viewport={{ once: true }}
          className="text-center mb-12"
        >
          <MobiGlasPanel variant="dark" padding="sm" className="inline-block mb-4">
            <h2 className="mg-title text-2xl font-bold">WHY CHOOSE AYDOCORP?</h2>
          </MobiGlasPanel>

          <motion.div
            className="h-[1px] bg-gradient-to-r from-transparent via-[rgba(var(--mg-primary),0.3)] to-transparent mx-auto mt-2 mb-6"
            initial={{ width: '0%' }}
            whileInView={{ width: '60%' }}
            transition={{ duration: 1.2, delay: 0.3 }}
            viewport={{ once: true }}
          />

          <p className="text-[rgba(var(--mg-text),0.8)] max-w-2xl mx-auto">
            Join an elite team of professionals making their mark across the universe with
            cutting-edge technology and visionary leadership.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {benefits.map((benefit, index) => {
            const isHovered = hoveredIndex === index;

            return (
              <motion.div
                key={benefit.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.15 }}
                viewport={{ once: true }}
                onMouseEnter={() => setHoveredIndex(index)}
                onMouseLeave={() => setHoveredIndex(null)}
                onFocus={() => setHoveredIndex(index)}
                onBlur={() => setHoveredIndex(null)}
                onClick={() => setHoveredIndex(isHovered ? null : index)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    setHoveredIndex(isHovered ? null : index);
                  }
                }}
                tabIndex={0}
                role="button"
                aria-pressed={isHovered}
                aria-label={`${benefit.title} benefit details`}
                className="cursor-pointer h-full focus:outline-none focus-visible:ring-1 focus-visible:ring-[rgba(var(--mg-primary),0.6)] rounded"
              >
                <MobiGlasPanel
                  variant="dark"
                  withScanline={isHovered}
                  cornerAccents
                  padding="md"
                  className="h-full"
                >
                  <div className="flex items-start mb-4">
                    <motion.div
                      className="mr-4 mt-1"
                      animate={{
                        rotate: isHovered ? [0, 5, 0, -5, 0] : 0,
                      }}
                      transition={{ duration: 5, repeat: isHovered ? Infinity : 0 }}
                    >
                      <motion.div
                        className="w-10 h-10 rounded-full flex items-center justify-center"
                        style={{
                          backgroundColor: 'rgba(0, 215, 255, 0.1)',
                          borderColor: 'rgba(0, 215, 255, 0.3)',
                          borderWidth: '1px',
                        }}
                        animate={{
                          boxShadow: isHovered
                            ? [
                                '0 0 0px rgba(0, 215, 255, 0.2)',
                                '0 0 10px rgba(0, 215, 255, 0.5)',
                                '0 0 0px rgba(0, 215, 255, 0.2)',
                              ]
                            : '0 0 0px rgba(0, 215, 255, 0)',
                        }}
                        transition={{
                          duration: 2,
                          repeat: isHovered ? Infinity : 0,
                          repeatType: 'reverse',
                        }}
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="h-5 w-5 text-[rgba(var(--mg-primary),1)]"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          strokeWidth="1.5"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" d={benefit.icon} />
                        </svg>
                      </motion.div>
                    </motion.div>

                    <div>
                      <h3 className="mg-subtitle text-lg font-bold mb-2">{benefit.title}</h3>
                      <p className="text-sm text-[rgba(var(--mg-text),0.7)]">
                        {benefit.description}
                      </p>
                    </div>
                  </div>

                  <motion.div
                    className="mt-3 pt-3 text-xs text-[rgba(var(--mg-text),0.6)]"
                    style={{
                      borderTopWidth: '1px',
                      borderTopStyle: 'solid',
                      borderTopColor: isHovered
                        ? 'rgba(0, 215, 255, 0.6)'
                        : 'rgba(0, 215, 255, 0.2)',
                    }}
                    transition={{ duration: 0.3 }}
                  >
                    <span className="mg-flicker">
                      {isHovered ? '// ACCESSING DETAILS' : '// SELECT FOR MORE INFO'}
                    </span>
                  </motion.div>
                </MobiGlasPanel>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
