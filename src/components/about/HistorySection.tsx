'use client';

import React from 'react';
import Image from 'next/image';
import { cdn } from '@/lib/cdn';
import { motion } from 'motion/react';
import TimelineNode from './TimelineNode';

interface HistorySectionProps {
  connectionComplete: boolean;
}

export default function HistorySection({ connectionComplete }: HistorySectionProps) {
  if (!connectionComplete) return null;

  return (
    <section className="py-16 bg-gradient-to-b from-black to-gray-900 relative overflow-hidden">
      {/* Background effects */}
      <div className="absolute inset-0 mg-grid-bg opacity-5"></div>
      <div className="absolute inset-0 circuit-bg opacity-10"></div>
      <div className="absolute inset-0 holo-noise opacity-10"></div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="relative"
        >
          <div className="mg-header text-center mb-16">
            <motion.h2
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="mg-title text-3xl font-quantify tracking-wider text-[rgba(var(--mg-primary),1)]"
            >
              CORPORATE TIMELINE
              <motion.div
                className="w-full h-0.5 mt-2"
                style={{
                  background:
                    'linear-gradient(to right, transparent, rgba(0, 215, 255, 0.6), transparent)',
                }}
                initial={{ scaleX: 0 }}
                animate={{ scaleX: 1 }}
                transition={{ duration: 0.8, delay: 0.2 }}
              ></motion.div>
            </motion.h2>

            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.3 }}
              className="text-[rgba(var(--mg-text),0.7)] max-w-3xl mx-auto mt-4"
            >
              Trace the evolution of AydoCorp from its humble origins to its current position as an
              interstellar logistics powerhouse.
            </motion.p>
          </div>

          {/* Interactive Timeline */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="relative">
              <div className="relative border-l border-[rgba(var(--mg-primary),0.3)] ml-2 pl-6 py-6">
                {/* Timeline nodes */}
                <TimelineNode
                  year="2940"
                  title="FOUNDING"
                  subtitle="Aydo City Delivery"
                  content="The corporation had its humble beginnings as a small one-man delivery company founded by CEO Christoff Revan after his honorable discharge from the UEE Navy."
                  delay={0.1}
                />

                <TimelineNode
                  year="2943"
                  title="First Expansion"
                  subtitle="Aydo Amalgamated Industries"
                  content="After a merger with Seahorse Fisheries based out of Neo Taurii on Kampos, Aydo City Delivery was renamed to Aydo Amalgamated Industries, marking the first significant expansion."
                  delay={0.2}
                />

                <TimelineNode
                  year="2945"
                  title="INTERSTELLAR LAUNCH"
                  subtitle="First System Jump"
                  content="Acquisition of the first Hull-series freighter marks AydoCorp's entry into interstellar shipping, establishing routes to neighboring Stanton system."
                  delay={0.3}
                />

                <TimelineNode
                  year="2945"
                  title="Corporate Formation"
                  subtitle="Aydo Intergalactic Corporation"
                  content={
                    'After acquiring multiple subsidiaries and having greater expansions, the company would transform into the corporation we now know as "AydoCorp", serving many clients throughout human and even alien space.'
                  }
                  delay={0.4}
                />

                <TimelineNode
                  year="2948"
                  title="Security Partnership"
                  subtitle="Rogue Squadron Security"
                  content="Formed security partnership with Rogue Squadron to provide enhanced security for valuable shipments and escort services for high-profile transports."
                  delay={0.5}
                />

                <TimelineNode
                  year="2951"
                  title="Present Day"
                  subtitle="Expanding Operations"
                  content="Today, AydoCorp continues to expand its reach across systems, with operations in both human and alien space, focusing on transportation, logistics, and resource consolidation."
                  delay={0.6}
                />

                {/* Present day indicator */}
                <motion.div
                  className="relative mb-0 pl-0"
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 1.1 }}
                  viewport={{ once: true }}
                >
                  <div className="flex items-center">
                    <motion.div
                      className="w-3 h-3 rounded-full mr-4"
                      style={{ backgroundColor: 'rgba(0, 215, 255, 0.8)' }}
                      animate={{
                        scale: [1, 1.2, 1],
                        boxShadow: [
                          '0 0 0 0 rgba(0, 215, 255, 0.4)',
                          '0 0 0 10px rgba(0, 215, 255, 0)',
                          '0 0 0 0 rgba(0, 215, 255, 0)',
                        ],
                      }}
                      transition={{
                        duration: 2,
                        repeat: Infinity,
                        repeatType: 'loop',
                      }}
                    />
                    <div>
                      <div className="text-[rgba(var(--mg-primary),1)] text-sm font-quantify">
                        PRESENT DAY
                      </div>
                      <div className="text-[rgba(var(--mg-text),0.6)] text-xs">
                        GALACTIC PRESENCE
                      </div>
                    </div>
                  </div>
                </motion.div>
              </div>
            </div>

            <div>
              <motion.div
                className="mg-container mb-4"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5, delay: 0.3 }}
              >
                <div className="p-4">
                  <h2 className="mg-subtitle text-lg mb-3">CORPORATE HISTORY</h2>
                  <p className="text-sm text-[rgba(var(--mg-text),0.8)] leading-relaxed mb-4">
                    Over the years the company would grow and expand, what was once known as
                    &quot;Aydo City Delivery&quot; eventually became &quot;Aydo Amalgamated
                    Industries&quot; after a merger with Seahorse Fisheries, which was based out of
                    Neo Taurii on Kampos.
                  </p>

                  <p className="text-sm text-[rgba(var(--mg-text),0.8)] leading-relaxed">
                    After acquiring multiple subsidiaries and having greater expansions, the company
                    would transform into the corporation we now know as &quot;AydoCorp&quot;,
                    serving many clients throughout human and even alien space.
                  </p>

                  <div className="flex items-center justify-between mt-4 text-[rgba(var(--mg-text),0.7)] text-xs">
                    <div className="flex items-center">
                      <motion.div
                        className="w-2 h-2 rounded-full bg-[rgba(var(--mg-primary),0.8)] mr-2"
                        animate={{
                          scale: [1, 1.3, 1],
                          opacity: [0.7, 1, 0.7],
                        }}
                        transition={{ duration: 2, repeat: Infinity }}
                      ></motion.div>
                      <span>HISTORICAL RECORD AUTHENTICATED</span>
                    </div>
                    <span className="text-[rgba(var(--mg-primary),0.9)]">CONFIDENCE: 98.7%</span>
                  </div>
                </div>
              </motion.div>

              <div className="grid grid-cols-1 gap-4">
                <motion.div
                  className="relative overflow-hidden rounded mg-container p-0.5"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.7 }}
                >
                  <div className="h-48 relative">
                    <div className="relative w-full h-full">
                      <Image
                        src={cdn('/images/AydoOffice1.png')}
                        alt="AydoCorp Headquarters"
                        fill
                        className="object-cover"
                        sizes="(max-width: 768px) 100vw, 50vw"
                      />
                    </div>
                    <div className="absolute inset-0 bg-black bg-opacity-30"></div>
                    <motion.div
                      className="absolute inset-0 border border-[rgba(var(--mg-primary),0.4)]"
                      animate={{
                        boxShadow: [
                          'inset 0 0 0px rgba(0, 215, 255, 0.2)',
                          'inset 0 0 20px rgba(0, 215, 255, 0.4)',
                          'inset 0 0 0px rgba(0, 215, 255, 0.2)',
                        ],
                      }}
                      transition={{ duration: 2, repeat: Infinity }}
                    ></motion.div>
                    <div className="absolute bottom-0 left-0 right-0 p-2 bg-black bg-opacity-50">
                      <p className="text-[rgba(var(--mg-primary),1)] text-xs text-center">
                        AydoCorp Headquarters - Aydo City, Planet Green, Ellis System
                      </p>
                    </div>
                  </div>
                </motion.div>

                <motion.div
                  className="relative overflow-hidden rounded mg-container p-0.5"
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.8, delay: 1.0 }}
                  viewport={{ once: true }}
                >
                  <motion.div
                    className="relative h-48"
                    whileHover={{ scale: 1.03 }}
                    transition={{ duration: 0.3 }}
                  >
                    <div className="relative w-full h-full">
                      <Image
                        src={cdn('/images/hull_e.png')}
                        alt="AydoCorp Fleet"
                        fill
                        className="object-cover"
                        sizes="(max-width: 768px) 100vw, 33vw"
                      />
                    </div>
                    <div className="absolute inset-0 bg-gradient-to-t from-black via-black/70 to-transparent"></div>

                    {/* Animated scanning effect overlay */}
                    <motion.div
                      className="absolute inset-0 overflow-hidden pointer-events-none"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ duration: 0.5, delay: 1.2 }}
                    >
                      <motion.div
                        className="absolute top-0 w-full h-1"
                        style={{
                          background:
                            'linear-gradient(to right, transparent, rgba(0, 215, 255, 0.4), transparent)',
                        }}
                        animate={{
                          top: ['0%', '100%', '0%'],
                        }}
                        transition={{
                          duration: 4,
                          repeat: Infinity,
                          ease: 'linear',
                        }}
                      />
                    </motion.div>

                    <div className="absolute bottom-0 left-0 w-full p-4">
                      <motion.h3
                        className="text-base font-quantify tracking-wider text-[rgba(var(--mg-primary),0.9)]"
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.5, delay: 1.3 }}
                      >
                        CORPORATE FLEET
                      </motion.h3>

                      <div className="flex items-center justify-between mt-2 text-xs">
                        <div className="flex items-center">
                          <span className="text-[rgba(var(--mg-primary),0.9)] mr-1">VESSELS:</span>
                          <motion.span
                            className="text-[rgba(var(--mg-accent),1)]"
                            animate={{
                              textShadow: [
                                '0 0 5px rgba(0, 215, 255, 0.5)',
                                '0 0 10px rgba(0, 215, 255, 0.8)',
                                '0 0 5px rgba(0, 215, 255, 0.5)',
                              ],
                            }}
                            transition={{ duration: 2, repeat: Infinity }}
                          >
                            48
                          </motion.span>
                        </div>

                        <div className="flex items-center">
                          <span className="text-[rgba(var(--mg-primary),0.9)] mr-1">SYSTEMS:</span>
                          <motion.span
                            className="text-[rgba(var(--mg-accent),1)]"
                            animate={{
                              textShadow: [
                                '0 0 5px rgba(0, 215, 255, 0.5)',
                                '0 0 10px rgba(0, 215, 255, 0.8)',
                                '0 0 5px rgba(0, 215, 255, 0.5)',
                              ],
                            }}
                            transition={{ duration: 2, repeat: Infinity, delay: 0.5 }}
                          >
                            15+
                          </motion.span>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                </motion.div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
