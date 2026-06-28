'use client';

import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { MobiGlasPanel } from '@/components/ui/mobiglas';

const services = [
  {
    id: 'cargo-transport',
    title: 'Cargo Transport & Management',
    description:
      'End-to-end cargo transportation services across all major systems, featuring real-time tracking and advanced security protocols.',
    detailedDescription:
      'Our fleet of Hull-series vessels and specialized cargo haulers ensure your goods reach their destination safely and efficiently. With quantum-encrypted tracking and AI-driven logistics optimization, we deliver unmatched reliability in even the most challenging sectors.',
    icon: 'M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z',
    stats: [
      { label: 'Delivery Success Rate', value: '99.7%' },
      { label: 'Systems Covered', value: '17' },
      { label: 'Fleet Size', value: '48+' },
    ],
  },
  {
    id: 'executive-transit',
    title: 'Executive & Personnel Transit',
    description:
      'Premium transportation services with the highest standards of comfort and security for corporate personnel.',
    detailedDescription:
      'Our executive fleet offers discreet, secure, and luxurious transport for VIPs and corporate teams. From 890 Jump luxury cruisers to Phoenix executive transports, we provide a seamless experience with dedicated crew and comprehensive security protocols.',
    icon: 'M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z',
    stats: [
      { label: 'Client Satisfaction', value: '98.3%' },
      { label: 'Security Rating', value: 'A+' },
      { label: 'Concierge Staff', value: '35' },
    ],
  },
  {
    id: 'supply-chain',
    title: 'Supply Chain Solutions',
    description:
      'Comprehensive resource acquisition and logistics management tailored to your operational requirements.',
    detailedDescription:
      'From raw materials to finished products, our supply chain services integrate seamlessly with your operations. We employ advanced predictive analytics and strategic resource planning to optimize cost, reduce delays, and ensure continuous supply even in volatile markets.',
    icon: 'M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z',
    stats: [
      { label: 'Resource Types', value: '250+' },
      { label: 'Supply Accuracy', value: '99.4%' },
      { label: 'Partners', value: '73' },
    ],
  },
  {
    id: 'recovery',
    title: 'Recovery & Assistance',
    description:
      'Professional vessel recovery and assistance services, available continuously across all operational sectors.',
    detailedDescription:
      'When emergencies occur, our rapid response teams deploy within minutes. Equipped with advanced rescue vessels and specialty tools, we offer hull repairs, refueling, component replacement, and full recovery services — all backed by our "No Ship Left Behind" guarantee.',
    icon: 'M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3',
    stats: [
      { label: 'Response Time', value: '8.5 min' },
      { label: 'Success Rate', value: '97.6%' },
      { label: 'Coverage Area', value: '11 systems' },
    ],
  },
  {
    id: 'strategic-ops',
    title: 'Strategic Operations',
    description:
      'Collaborative ventures and partnerships for complex logistics operations requiring multi-party coordination.',
    detailedDescription:
      'For operations requiring exceptional coordination, our strategic services division provides comprehensive planning and execution. We specialize in high-value cargo movement, sensitive material transport, and multi-organizational logistics efforts across corporate and government sectors.',
    icon: 'M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2',
    stats: [
      { label: 'Classified Ops', value: '150+' },
      { label: 'Sectors', value: 'Corp/Gov' },
      { label: 'Clearance Level', value: 'Alpha-7' },
    ],
  },
];

interface ServiceOverviewProps {
  isScanning: boolean;
  scanComplete: boolean;
  activeService: string | null;
  setActiveService: (service: string | null) => void;
}

export default function ServiceOverview({
  isScanning,
  scanComplete,
  activeService,
  setActiveService,
}: ServiceOverviewProps) {
  if (isScanning || scanComplete) return null;

  return (
    <section className="relative py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, delay: 1.5 }}
        >
          <MobiGlasPanel
            variant="dark"
            withHologram
            cornerAccents
            padding="lg"
            className="mb-10 relative overflow-hidden"
          >
            <div className="relative z-10">
              <div className="mg-header text-center mb-6">
                <h3 className="mg-subtitle text-xl">SERVICE CAPABILITIES OVERVIEW</h3>
              </div>

              <div className="text-[rgba(var(--mg-text),0.8)] text-sm mb-6">
                <p className="max-w-4xl mx-auto text-center">
                  AydoCorp offers a comprehensive suite of logistics and transport services designed
                  for both corporate and individual clients. Our cutting-edge fleet and experienced
                  personnel ensure the highest standards of efficiency, security, and reliability
                  across all operational sectors.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mt-8">
                {services.map((service, index) => (
                  <motion.div
                    key={service.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 1.8 + index * 0.1 }}
                    whileHover={{ scale: 1.02 }}
                    className="cursor-pointer h-full focus:outline-none focus-visible:ring-2 focus-visible:ring-[rgba(var(--mg-primary),0.8)]"
                    role="button"
                    tabIndex={0}
                    aria-expanded={activeService === service.id}
                    aria-label={`${service.title} — toggle details`}
                    onClick={() =>
                      setActiveService(activeService === service.id ? null : service.id)
                    }
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        setActiveService(activeService === service.id ? null : service.id);
                      }
                    }}
                  >
                    <MobiGlasPanel
                      variant="dark"
                      cornerAccents
                      padding="md"
                      className="h-full relative overflow-hidden group"
                    >
                      <div className="flex items-start mb-4">
                        <div className="mr-3 mt-1">
                          <div className="w-10 h-10 rounded-full bg-[rgba(var(--mg-primary),0.1)] border border-[rgba(var(--mg-primary),0.3)] flex items-center justify-center">
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              className="h-5 w-5 text-[rgba(var(--mg-primary),1)]"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={1}
                                d={service.icon}
                              />
                            </svg>
                          </div>
                        </div>
                        <div>
                          <h3 className="mg-text text-lg font-bold mb-2">{service.title}</h3>
                          <p className="text-xs text-[rgba(var(--mg-text),0.7)]">
                            {service.description}
                          </p>
                        </div>
                      </div>

                      {/* Active state with details */}
                      <AnimatePresence>
                        {activeService === service.id && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            transition={{ duration: 0.3 }}
                            className="overflow-hidden"
                          >
                            <div className="pt-3 border-t border-[rgba(var(--mg-primary),0.2)]">
                              <p className="text-xs text-[rgba(var(--mg-text),0.6)] mb-4">
                                {service.detailedDescription}
                              </p>

                              <div className="grid grid-cols-3 gap-2 text-center">
                                {service.stats.map((stat, idx) => (
                                  <div key={idx} className="text-xs">
                                    <div className="text-[rgba(var(--mg-primary),1)] font-bold">
                                      {stat.value}
                                    </div>
                                    <div className="text-[rgba(var(--mg-text),0.5)] text-[10px]">
                                      {stat.label}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>

                      {/* View details prompt */}
                      <div
                        className={`mt-2 text-xs text-center text-[rgba(var(--mg-primary),0.7)] ${activeService === service.id ? 'hidden' : 'block'}`}
                      >
                        <span className="flex items-center justify-center">
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            className="h-3 w-3 mr-1"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M19 9l-7 7-7-7"
                            />
                          </svg>
                          EXPAND DETAILS
                        </span>
                      </div>
                    </MobiGlasPanel>
                  </motion.div>
                ))}
              </div>
            </div>
          </MobiGlasPanel>
        </motion.div>
      </div>
    </section>
  );
}
