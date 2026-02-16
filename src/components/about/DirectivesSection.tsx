'use client';

import React from 'react';
import { motion } from 'motion/react';
import DirectiveCard from './DirectiveCard';
import { ScanlineEffect } from '@/components/ui/mobiglas';

interface DirectivesSectionProps {
  connectionComplete: boolean;
}

export default function DirectivesSection({ connectionComplete }: DirectivesSectionProps) {
  if (!connectionComplete) return null;

  return (
    <section className="py-16 bg-gradient-to-b from-gray-900 to-black relative overflow-hidden">
      {/* Background elements */}
      <div className="absolute inset-0 mg-grid-bg opacity-5"></div>
      <div className="absolute inset-0 circuit-bg opacity-10"></div>
      <div className="absolute inset-0 holo-noise opacity-10"></div>

      {/* Floating particles */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {Array.from({ length: 30 }).map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-1 h-1 rounded-full"
            style={{
              backgroundColor: i % 3 === 0
                ? 'rgba(0, 215, 255, 0.5)'
                : i % 3 === 1
                  ? 'rgba(30, 250, 255, 0.5)'
                  : 'rgba(255, 255, 255, 0.5)',
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
            }}
            animate={{
              y: [0, -15, 0],
              opacity: [0.2, 0.8, 0.2],
            }}
            transition={{
              duration: 3 + Math.random() * 5,
              repeat: Infinity,
              delay: Math.random() * 5,
            }}
          />
        ))}
      </div>

      {/* Animated scan lines */}
      <ScanlineEffect variant="cross" speed="slow" opacity="low" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
        >
          <div className="mg-header text-center mb-10">
            <motion.h2
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5 }}
              className="mg-title text-3xl font-quantify tracking-wider text-[rgba(var(--mg-primary),1)]"
            >
              <motion.span
                initial={{ filter: "blur(8px)" }}
                animate={{ filter: "blur(0px)" }}
                transition={{ duration: 0.8 }}
              >
                OPERATIONAL DIRECTIVES
              </motion.span>
              <motion.div
                className="w-full h-0.5 mt-2 bg-gradient-to-r from-transparent via-[rgba(var(--mg-primary),0.6)] to-transparent"
                initial={{ scaleX: 0 }}
                animate={{ scaleX: 1 }}
                transition={{ duration: 0.8, delay: 0.3 }}
              ></motion.div>
            </motion.h2>
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.8, delay: 0.4 }}
              className="text-[rgba(var(--mg-text),0.7)] max-w-3xl mx-auto mt-4"
            >
              At AydoCorp, our operational goals are guided by these key directives that shape our approach to interstellar logistics and corporate conduct.
            </motion.p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Card 1 */}
            <DirectiveCard
              icon={<path d="M13 10V3L4 14h7v7l9-11h-7z" />}
              title="Logistics Excellence"
              description="Providing comprehensive logistics solutions across the Star Citizen universe, ensuring cargo reaches its destination safely and efficiently."
              items={[
                "Real-time cargo tracking",
                "Multi-system route optimization",
                "99.7% delivery success rate"
              ]}
              delay={0.1}
            />

            {/* Card 2 */}
            <DirectiveCard
              icon={<path d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />}
              title="Community First"
              description="Building a cohesive community of professionals guided by our CEO's philosophy that it's better to play together."
              items={[
                "Collaborative work culture",
                "Cross-divisional teams",
                "Employee advancement programs"
              ]}
              delay={0.2}
            />

            {/* Card 3 */}
            <DirectiveCard
              icon={<path d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />}
              title="Innovation"
              description="Pushing boundaries in space logistics through our specialized divisions and research initiatives."
              items={[
                "Racing team technology transfer",
                "Advanced navigation systems",
                "R&D investment in quantum tech"
              ]}
              delay={0.3}
            />
          </div>
        </motion.div>
      </div>
    </section>
  );
}