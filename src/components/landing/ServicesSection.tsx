"use client";

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import Image from 'next/image';
import { cdn } from '@/lib/cdn';
import { MobiGlasButton } from '@/components/ui/mobiglas';

const services = [
  {
    id: 'hauling',
    title: 'HAULING & CARGO',
    icon: cdn('/Aydo_Corp_logo_Silver.png'),
    description: 'Our hauling and cargo management technicians provide the expertise and manpower to handle your cargo needs efficiently and securely.',
    details: [
      'Secure cargo transport across all systems',
      'Advanced tracking technology',
      'Specialized handling for sensitive materials',
      'Warehouse management solutions',
      'Customs clearance assistance'
    ]
  },
  {
    id: 'transport',
    title: 'PERSONNEL TRANSPORT',
    icon: cdn('/Aydo_Corp_logo_Silver.png'),
    description: 'Our pilots ensure you reach your destination safely and speedily, with premium transport options for individuals and groups.',
    details: [
      'VIP shuttle services',
      'Group transportation',
      'Emergency evacuation operations',
      'Luxury accommodations available',
      'Scheduled route services'
    ]
  },
  {
    id: 'requisition',
    title: 'RESOURCE REQUISITION',
    icon: cdn('/Aydo_Corp_logo_Silver.png'),
    description: 'Our sourcing specialists scour the stars for exactly what you need, with our industrial subsidiary providing resources in bulk.',
    details: [
      'Raw material sourcing',
      'Rare item procurement',
      'Bulk resource acquisition',
      'Just-in-time delivery options',
      'Market price optimization'
    ]
  },
  {
    id: 'towing',
    title: 'TOWING & RECOVERY',
    icon: cdn('/Aydo_Corp_logo_Silver.png'),
    description: "Whether you're stuck adrift or need salvaged ships moved elsewhere, our specialized towing equipment and experienced crew have you covered.",
    details: [
      'Emergency response teams',
      'Deep space recovery',
      'Salvage transport',
      'Specialized equipment for all ship sizes',
      '24/7 distress call response'
    ]
  }
];

export default function ServicesSection() {
  const [activeService, setActiveService] = useState<string | null>(null);
  
  return (
    <section id="services" className="relative min-h-screen flex items-center justify-center py-16">
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
            <h2 className="mg-title text-3xl md:text-4xl mb-2">OUR SERVICES</h2>
            <div className="w-full h-1 bg-gradient-to-r from-transparent via-[rgba(var(--mg-primary),0.6)] to-transparent"></div>
          </div>
          <p className="mt-4 text-[rgba(var(--mg-text),0.7)] max-w-3xl mx-auto">
            Aydo Intergalactic Corporation offers comprehensive logistics solutions tailored to your specific needs. 
            Explore our services below and discover how we can help your operation thrive.
          </p>
        </motion.div>
        
        {/* Services Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {services.map((service, index) => (
            <motion.div
              key={service.id}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: index * 0.1 }}
              className="relative"
            >
              <motion.div 
                className={`mg-container p-6 h-full cursor-pointer transition-all duration-300 ${
                  activeService === service.id ? 'border-[rgba(var(--mg-primary),0.6)]' : 'border-[rgba(var(--mg-primary),0.2)]'
                }`}
                whileHover={{ 
                  borderColor: 'rgba(var(--mg-primary),0.6)', 
                  boxShadow: '0 0 15px rgba(var(--mg-primary),0.15)' 
                }}
                onClick={() => setActiveService(activeService === service.id ? null : service.id)}
              >
                <div className="flex items-start">
                  <div className="mr-4 relative">
                    <div className="w-12 h-12 relative">
                      <Image
                        src={service.icon || cdn('/icon-placeholder.png')}
                        alt={service.title}
                        width={48}
                        height={48}
                        className="object-contain"
                      />
                    </div>
                    <div className="absolute -top-1 -left-1 w-14 h-14 rounded-full border border-[rgba(var(--mg-primary),0.3)] pointer-events-none"></div>
                  </div>
                  
                  <div className="flex-1">
                    <div className="flex justify-between items-center mb-2">
                      <h3 className="text-base md:text-lg font-quantify tracking-wide text-[rgba(var(--mg-primary),0.9)]">
                        {service.title}
                      </h3>
                      <motion.div 
                        animate={{ rotate: activeService === service.id ? 45 : 0 }}
                        transition={{ duration: 0.3 }}
                        className="w-6 h-6 flex items-center justify-center border border-[rgba(var(--mg-primary),0.3)] rounded-full"
                      >
                        <span className="block w-3 h-0.5 bg-[rgba(var(--mg-primary),0.8)]"></span>
                        <span className={`block w-0.5 h-3 bg-[rgba(var(--mg-primary),0.8)] absolute transition-opacity ${
                          activeService === service.id ? 'opacity-0' : 'opacity-100'
                        }`}></span>
                      </motion.div>
                    </div>
                    
                    <p className="text-sm text-[rgba(var(--mg-text),0.7)]">
                      {service.description}
                    </p>
                    
                    <AnimatePresence>
                      {activeService === service.id && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          transition={{ duration: 0.3 }}
                        >
                          <div className="mt-4 pt-4 border-t border-[rgba(var(--mg-primary),0.15)]">
                            <ul className="space-y-2">
                              {service.details.map((detail, i) => (
                                <motion.li 
                                  key={i}
                                  initial={{ opacity: 0, x: -10 }}
                                  animate={{ opacity: 1, x: 0 }}
                                  transition={{ duration: 0.2, delay: i * 0.05 }}
                                  className="flex items-center text-sm text-[rgba(var(--mg-text),0.8)]"
                                >
                                  <span className="mr-2 w-1.5 h-1.5 bg-[rgba(var(--mg-primary),0.7)] rounded-full"></span>
                                  {detail}
                                </motion.li>
                              ))}
                            </ul>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          ))}
        </div>
        
        {/* CTA */}
        <motion.div 
          className="mt-16 text-center"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.3 }}
        >
          <div className="mg-container p-6 max-w-3xl mx-auto">
            <h3 className="text-lg md:text-xl text-[rgba(var(--mg-text),0.9)] mb-4">
              Need a custom solution for your specific requirements?
            </h3>
            <MobiGlasButton
              variant="primary"
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.98 }}
              className="mx-auto"
            >
              CONTACT OUR SPECIALISTS
            </MobiGlasButton>
          </div>
        </motion.div>
      </div>
    </section>
  );
} 