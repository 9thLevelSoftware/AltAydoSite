'use client';

import React from 'react';
import Image from 'next/image';
import { cdn } from '@/lib/cdn';
import { motion } from 'motion/react';

export default function SubsidiariesTab() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
      className="space-y-8"
    >
      <p className="text-[rgba(var(--mg-text),0.8)] mb-6 leading-relaxed">
        The subsidiaries at AydoCorp are subsets of the organization designed to cater to specific
        gameplay loops and career paths. Our goal with subsidiaries is to always keep the feeling of
        a tight-knit community even as the organization grows. Being part of a subsidiary means you
        focus on the gameplay you enjoy most while having value within a smaller group of members,
        all while still having the support of AydoCorp at large.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* AydoExpress */}
        <div className="mg-container p-0.5">
          <div className="relative p-4 bg-[rgba(var(--mg-background),0.8)]">
            <div className="flex items-center mb-4">
              <div className="relative w-16 h-16">
                <Image
                  src={cdn('/images/New_Aydo_Express.png')}
                  alt="AydoExpress Logo"
                  width={64}
                  height={64}
                  className="object-contain w-16 h-16"
                />
              </div>
              <div>
                <h3 className="mg-title text-xl">AYDO EXPRESS</h3>
                <div className="mg-subtitle text-xs">LOGISTICS & TRANSPORT DIVISION</div>
              </div>
            </div>

            <p className="text-sm text-[rgba(var(--mg-text),0.8)] mb-4">
              The bread and butter of the organization, AydoExpress deals with cargo hauling and
              personnel transport. Gameplay offered includes trading, deliveries, transport, and
              general hauling operations that are critical to the organization&apos;s function.
            </p>

            <div className="relative mt-4 overflow-hidden rounded-md h-48">
              <div className="relative w-full h-full">
                <Image
                  src={cdn('/images/hull_e.png')}
                  alt="AydoExpress Fleet"
                  fill
                  className="object-cover"
                  sizes="(max-width: 768px) 100vw, 33vw"
                />
              </div>
              <div className="absolute inset-0 bg-black bg-opacity-30"></div>
              <div className="absolute bottom-0 left-0 right-0 p-2 bg-black bg-opacity-50">
                <p className="text-[rgba(var(--mg-primary),1)] text-xs text-center">
                  AydoExpress Transport Vessel
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Empyrion Industries */}
        <div className="mg-container p-0.5">
          <div className="relative p-4 bg-[rgba(var(--mg-background),0.8)]">
            <div className="flex items-center mb-4">
              <div className="relative w-16 h-16">
                <Image
                  src={cdn('/New_Empyrion_Industries.PNG')}
                  alt="Empyrion Industries Logo"
                  width={64}
                  height={64}
                  className="object-contain w-16 h-16"
                />
              </div>
              <div>
                <h3 className="mg-title text-xl">EMPYRION INDUSTRIES</h3>
                <div className="mg-subtitle text-xs">RESOURCE & INDUSTRIAL DIVISION</div>
              </div>
            </div>

            <p className="text-sm text-[rgba(var(--mg-text),0.8)] mb-4">
              Keeping the coffers full, Empyrion Industries deals with industrial gameplay to
              sustain the organization with resources and profits. Gameplay offered includes mining
              and salvaging operations, as well as refueling and resource processing.
            </p>

            <div className="relative mt-4 overflow-hidden rounded-md h-48">
              <div className="relative w-full h-full">
                <Image
                  src={cdn('/images/reclaimer.png')}
                  alt="Empyrion Industries Operations"
                  fill
                  className="object-cover"
                  sizes="(max-width: 768px) 100vw, 33vw"
                />
              </div>
              <div className="absolute inset-0 bg-black bg-opacity-30"></div>
              <div className="absolute bottom-0 left-0 right-0 p-2 bg-black bg-opacity-50">
                <p className="text-[rgba(var(--mg-primary),1)] text-xs text-center">
                  Empyrion Industries Salvage Vessel
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Midnight Security */}
        <div className="mg-container p-0.5">
          <div className="relative p-4 bg-[rgba(var(--mg-background),0.8)]">
            <div className="flex items-center mb-4">
              <div className="relative w-16 h-16">
                <Image
                  src={cdn('/images/New_Midnight_Security.png')}
                  alt="Midnight Security Logo"
                  width={64}
                  height={64}
                  className="object-contain w-16 h-16"
                />
              </div>
              <div>
                <h3 className="mg-title text-xl">MIDNIGHT SECURITY</h3>
                <div className="mg-subtitle text-xs">
                  INTERNAL SECURITY & RISK MANAGEMENT DIVISION
                </div>
              </div>
            </div>

            <p className="text-sm text-[rgba(var(--mg-text),0.8)] mb-4">
              The in-house corporate security division tasked with protecting AydoCorp assets,
              personnel, data, and critical operations. Specialized in escort services, threat
              assessment, and internal security protocols.
            </p>

            <div className="relative mt-4 overflow-hidden rounded-md h-48">
              <div className="relative w-full h-full">
                <Image
                  src={cdn('/gladius.png')}
                  alt="Midnight Security Combat Ship"
                  fill
                  className="object-cover"
                  sizes="(max-width: 768px) 100vw, 33vw"
                />
              </div>
              <div className="absolute inset-0 bg-black bg-opacity-30"></div>
              <div className="absolute bottom-0 left-0 right-0 p-2 bg-black bg-opacity-50">
                <p className="text-[rgba(var(--mg-primary),1)] text-xs text-center">
                  Midnight Security Combat Ship
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
