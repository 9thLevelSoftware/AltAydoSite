'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import Image from 'next/image';
import { cdn } from '@/lib/cdn';
import DashboardBreadcrumbs from '@/components/dashboard/DashboardBreadcrumbs';

interface CertificationItem {
  id: string;
  title: string;
  description: string;
  items: string[];
  category: 'employee' | 'aydoexpress' | 'empyrion' | 'security';
}

function CertificationCard({ cert, isExpanded, onToggle }: {
  cert: CertificationItem;
  isExpanded: boolean;
  onToggle: () => void;
}) {
  const categoryColors = {
    employee: 'rgba(var(--mg-primary),0.7)',
    aydoexpress: 'rgba(0,210,255,0.7)',
    empyrion: 'rgba(255,165,0,0.7)',
    security: 'rgba(255,100,100,0.7)'
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="bg-[rgba(var(--mg-panel-dark),0.6)] border border-[rgba(var(--mg-primary),0.2)] rounded-sm relative overflow-hidden"
    >
      <div 
        className="absolute left-0 top-0 bottom-0 w-1"
        style={{ backgroundColor: categoryColors[cert.category] }}
      ></div>
      
      <div className="ml-2 p-4">
        <button
          onClick={onToggle}
          className="w-full text-left hover:bg-[rgba(var(--mg-primary),0.1)] transition-colors rounded-sm p-2 -m-2"
        >
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-quantify tracking-wider text-[rgba(var(--mg-primary),0.9)]">
              {cert.title}
            </h3>
            <motion.div
              animate={{ rotate: isExpanded ? 180 : 0 }}
              transition={{ duration: 0.2 }}
              className="text-[rgba(var(--mg-primary),0.7)]"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </motion.div>
          </div>
          
          <p className="text-sm text-[rgba(var(--mg-text),0.8)] mt-2">
            {cert.description}
          </p>
        </button>
        
        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="overflow-hidden"
            >
              <div className="mt-4 pt-4 border-t border-[rgba(var(--mg-primary),0.2)]">
                <h4 className="text-sm font-quantify tracking-wider text-[rgba(var(--mg-text),0.9)] mb-3">
                  Items of note for the trainee to learn and pass cert:
                </h4>
                <ul className="space-y-2">
                  {cert.items.map((item, index) => (
                    <li key={index} className="text-sm text-[rgba(var(--mg-text),0.7)] flex items-start">
                      <span className="text-[rgba(var(--mg-primary),0.6)] mr-2 mt-1 text-xs">•</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

export default function CertificationsPage() {
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  
  const toggleExpanded = (id: string) => {
    const newExpanded = new Set(expandedItems);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedItems(newExpanded);
  };

  // Employee Evaluation Certifications - Required for intern to employee promotion
  const employeeEvaluationCerts: CertificationItem[] = [
    {
      id: 'small-ship-flight',
      title: 'Small Ship Flight',
      description: 'Trainee demonstrates the ability to safely fly and land a small ship to and from a space station and landing zone.',
      items: [
        'Can turn on and off the power and engines',
        'Has a basic understanding of ship MFDs and switching between them',
        'Can turn the ship lights on and off',
        'Knows how to contact the ATC with keybindings, the mobiGlass, and MFD',
        'Can properly lift off and land (while also using VTOL if applicable, as well as extending/retracting landing gear at the appropriate times)',
        'Knows how to scan',
        'Has general basic awareness'
      ],
      category: 'employee'
    },
    {
      id: 'basic-firearms',
      title: 'Basic Firearms',
      description: 'Trainee demonstrates the ability to load/reload a firearm as well as being able to properly shoot at a target.',
      items: [
        'Knows where to obtain weapons',
        'Knows how to equip ammo',
        'Knows how to equip weapon',
        'Can properly load the weapon and shoot at target',
        'Is able to reload and consolidate mags'
      ],
      category: 'employee'
    },
    {
      id: 'turret-operation',
      title: 'Turret Operation',
      description: 'Trainee demonstrates the ability to operate a turret with adequate performance.',
      items: [
        'Knows to turn on turret',
        'Knows how to switch modes (e.g. gyro mode)',
        'Is able to target and switch targets quickly',
        'Is able to listen to pilot&apos;s commands during chaotic moments'
      ],
      category: 'employee'
    },
    {
      id: 'basic-first-aid',
      title: 'Basic First Aid',
      description: 'Trainee demonstrates the ability to use the medpen to heal and revive.',
      items: [
        'Should know what the medpen looks like (red injector) and how to equip it',
        'Learns how to inject oneself to heal, as well as to inject others to heal and/or revive them'
      ],
      category: 'employee'
    },
    {
      id: 'multi-tool-usage',
      title: 'Multi-Tool Usage',
      description: 'Trainee demonstrates the ability to use the multi-tool in its various capacities.',
      items: [
        'Is aware of the various attachments for the multi-tool and what they&apos;re used for: Cutter, Mining beam, Tractor beam, Salvage/repair beam, Medical beam',
        'Is aware of the dedicated salvage/repair and tractor beam tools',
        'Demonstrates the ability to switch out attachment heads'
      ],
      category: 'employee'
    }
  ];

  // AydoExpress Subsidiary Certifications
  const aydoExpressCerts: CertificationItem[] = [
    {
      id: 'large-ship-flight',
      title: 'Large Ship Flight',
      description: 'Trainee demonstrates the ability to safely fly and land a large ship to and from a space station and landing zone. Trainee needs the small ship cert in order to obtain this one.',
      items: [
        'The only item to note is that the trainee is able to deal with the ungainly nature of larger ships as opposed to smaller ones',
        'No real special training required other than a review of the proper skills gone over in the small ship cert training'
      ],
      category: 'aydoexpress'
    },
    {
      id: 'cargo-handler',
      title: 'Cargo Handler',
      description: 'Trainee demonstrates the ability to move around cargo in an orderly and safe fashion.',
      items: [
        'Knows the limits of the tractor beam devices and appropriate use cases for them (including the ATLS suit)',
        'Learns appropriate handling of cargo when working alone or with others; safety is prioritized, as well as efficiency',
        'Organization skills are a must, it&apos;s not just about throwing boxes wherever'
      ],
      category: 'aydoexpress'
    },
    {
      id: 'transporter',
      title: 'Transporter',
      description: 'Trainee demonstrates the ability to move around passengers in a ship or ground vehicle in an orderly and safe fashion.',
      items: [
        'Is able to direct passengers to the appropriate seating in a firm manner to encourage timely departures',
        'Is able to fly the ship in a careful and steady manner to avoid standing passengers from falling down [too much] as well as avoiding heavy Gs',
        'Has impeccable landing and takeoff skills for the smoothest flights possible, as well as quickly being able to determine flat [enough] landing spots to help ensure that'
      ],
      category: 'aydoexpress'
    },
    {
      id: 'trading-sourcing',
      title: 'Trading & Sourcing Specialist',
      description: 'Trainee demonstrates the ability to look up trading and item location data and have familiarization with the most common websites/tools that display such information.',
      items: [
        'Has a basic understanding of what commodities are and where to purchase/sell them',
        'Has a basic understanding of profit margins and that more expensive goods don&apos;t necessarily mean greater profits',
        'Learns about the more common tools/websites to figure out pricing of commodities and where best to source and sell them',
        'Is made aware of the niche player to player item market and its growing and future importance'
      ],
      category: 'aydoexpress'
    },
    {
      id: 'towing-single',
      title: 'Towing - Single',
      description: 'Trainee demonstrates the ability to safely tow a ship with the SRV.',
      items: [
        'Has the awareness skills to tow a ship without hitting things with it',
        'Is able to tow a ship into QT',
        'Can deposit a ship without damaging it'
      ],
      category: 'aydoexpress'
    },
    {
      id: 'towing-multi',
      title: 'Towing - Multi',
      description: 'Trainee demonstrates the ability to safely tow a ship with an SRV alongside other towers.',
      items: [
        'Same as above, with the only difference being the ability for good communication with the other towers',
        'Keeping their pathing in relatively straight, smooth lines to avoid dropping their load and/or hitting things with it'
      ],
      category: 'aydoexpress'
    }
  ];

  // Empyrion Industries Subsidiary Certifications
  const empyrionCerts: CertificationItem[] = [
    {
      id: 'ship-mining',
      title: 'Ship Mining',
      description: 'Trainee demonstrates the ability to successfully use a ship mining laser to crack a rock and then to extract the materials.',
      items: [
        'Knows how to activate mining mode and switch between fracturing and extraction',
        'Understands how to raise power level of laser to successfully fracture rock',
        'Is aware of the more common sites to get information on ores and refineries to maximize profits'
      ],
      category: 'empyrion'
    },
    {
      id: 'ground-mining',
      title: 'Ground Mining',
      description: 'Trainee demonstrates the ability to successfully use a vehicle/exosuit/handheld mining laser to crack a rock and then to extract the materials.',
      items: [
        'Same as above for ship mining'
      ],
      category: 'empyrion'
    },
    {
      id: 'ship-handheld-salvage',
      title: 'Ship & Handheld Salvage',
      description: 'Trainee demonstrates the ability to successfully use a salvage beam to strip the hull of a ship/vehicle and then to &apos;munch&apos; the ship after.',
      items: [
        'Knows how to activate salvaging mode and to switch between the tractor beam and salvaging beam',
        'Is aware of general guidelines for hull-stripping (being slow and steady)',
        'Understands how to &apos;hull munch&apos; after the ship/vehicle has been stripped'
      ],
      category: 'empyrion'
    },
    {
      id: 'hand-repair',
      title: 'Hand Repair',
      description: 'Trainee demonstrates the ability to load the repair device with material in order to make patch repairs on a ship/vehicle.',
      items: [
        'Uses understanding of how multitools work in order to load it with a can of reclaimed material and then spray it on the part of their ship/vehicle they want to repair'
      ],
      category: 'empyrion'
    },
    {
      id: 'refueling',
      title: 'Refueling',
      description: 'Trainee demonstrates the ability to successfully refuel a ship as well as being able to give clear and concise instructions to those refueling to help aid that process.',
      items: [
        'Has awareness of the different nozzle and tank types',
        'Knows how to start the initiation/docking process for refueling recipient',
        'Is able to manage the MFD to properly refuel the ship without dumping fuel outside',
        'Is able to personally dock and refuel oneself to be able to direct to others what they need to do to refuel'
      ],
      category: 'empyrion'
    },
    {
      id: 'surveyor',
      title: 'Surveyor',
      description: 'Trainee demonstrates the ability to seek out ideal land and resources.',
      items: [
        'Has the capacity to be good with remembering locations and knowing the &quot;lay of the land&quot; (essentially, knows specific regions of space…preferably an entire star system…quite well)',
        'Learns about the more common tools/websites to use for helping in finding locations',
        'Has the ability to concisely log location info to be able to share with others',
        'Is aware that the future of surveying will involve base-building and thus surveying activities will need to be done with that in mind'
      ],
      category: 'empyrion'
    }
  ];

  // Midnight Security Subsidiary Certifications
  const securityCerts: CertificationItem[] = [
    {
      id: 'flight-patrol',
      title: 'Flight Patrol',
      description: 'Trainee demonstrates the ability to have adequate awareness skills and the ability to perform offensive and defensive security operations.',
      items: [
        'Knows how to scan and target',
        'Knows how to switch and set fire-groups',
        'Has a basic understanding of ship components and weapons (i.e. the difference of the effects ballistic weapons have vs laser ones)',
        'Knows how and when to use countermeasures',
        'Knows how to use missiles',
        'Is able to put weapons on target with effectiveness',
        'Is able to follow positioning commands and operate as a team player without devolving into lone-wolf behavior'
      ],
      category: 'security'
    },
    {
      id: 'ground-patrol',
      title: 'Ground Patrol',
      description: 'Trainee demonstrates the ability to have adequate awareness skills and the ability to perform offensive and defensive security operations.',
      items: [
        'Able to follow chain of command',
        'Understands and adheres to key squad roles: Leader/officer, Pointman, Assault, Machine-gunner/support, Grenadier/heavy weapons specialist, Marksman, Medic',
        'Is able to perform basic tactical maneuvers: Cover/suppression, Moving as a unit in formation, Basic CQB (i.e. clearing corners and covering doorways)',
        'Keeps in mind to not flag friendlies and holding weapon lowered when not in active combat'
      ],
      category: 'security'
    },
    {
      id: 'first-responder',
      title: 'First Responder',
      description: 'Trainee demonstrates the ability to use all of the medical injectors for their appropriate usage as well as using the med-gun.',
      items: [
        'Has understanding of what all injectors/medications look like and what they do:',
        '• MedPen / Hemozal: Restores health and stops bleeding, recovers from incapacitated state',
        '• DetoxPen / Resurgera: Revives overdosed person (if not incapacitated), doubles decay rate of Blood Drug Level',
        '• AdrenaPen / Demexatrine: Reduces concussion symptoms, normalizes weapon handling and movement speed',
        '• CorticoPen / Sterogen: Reduces vision and hearing symptoms, normalizes stamina',
        '• DeconPen / Canoiodide: Reduces injuries from radiation',
        '• OpioPen / Roxaphen: Reduces pain symptoms, normalizes movement ability',
        'Is able to use the proper medication for the needed injury',
        'Knows how to use the med-gun in lieu of carrying individual injectors'
      ],
      category: 'security'
    },
    {
      id: 'high-risk-transporter',
      title: 'High-Risk Transporter',
      description: 'Trainee demonstrates the ability to transport passengers and/or vehicles in dangerous environments.',
      items: [
        'Must be able to multi-task and receive instruction on the fly depending on changing conditions in the hazard area',
        'Landings and takeoffs are able to be conducted in a speedy, but still safe, manner'
      ],
      category: 'security'
    }
  ];

  return (
    <div className="min-h-screen bg-black bg-opacity-95 p-6 relative">
      <div className="absolute inset-0 bg-holo-grid bg-[length:50px_50px] opacity-5 pointer-events-none"></div>
      <div className="hexagon-bg absolute inset-0 opacity-5 pointer-events-none"></div>

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
          <h1 className="mg-title text-2xl sm:text-3xl lg:text-4xl mb-4">Career Development - Certifications</h1>
          <div className="h-1 w-20 bg-gradient-to-r from-transparent via-[rgba(var(--mg-primary),0.7)] to-transparent"></div>
        </motion.div>

        {/* Employee Evaluation Certifications */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="mg-panel bg-[rgba(var(--mg-panel-dark),0.4)] p-6 rounded-sm relative mb-8"
        >
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-[rgba(var(--mg-primary),0.4)] to-transparent"></div>
          
          <h2 className="mg-subtitle text-xl mb-4">Employee Evaluation Certifications</h2>
          <p className="text-[rgba(var(--mg-text),0.8)] mb-6 leading-relaxed">
            In order to rank up from an intern to be an employee in a subsidiary, we require all prospects to take a short evaluation of 15 - 30 minutes to test on basic skills. This evaluation can be waived if the evaluator has already been made aware of competence in said skills; however, if the prospect is not proficient during the process, the evaluator will act as an instructor to ensure that the evaluation is able to be passed during that session. If a prospect is unsure of one&apos;s competency, they should note that the session will take longer. Below are the following certifications to be completed:
          </p>
          
          <div className="space-y-4">
            {employeeEvaluationCerts.map((cert) => (
              <CertificationCard
                key={cert.id}
                cert={cert}
                isExpanded={expandedItems.has(cert.id)}
                onToggle={() => toggleExpanded(cert.id)}
              />
            ))}
          </div>
        </motion.div>

        {/* Subsidiary Certifications Introduction */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.4 }}
          className="mg-panel bg-[rgba(var(--mg-panel-dark),0.4)] p-6 rounded-sm relative mb-8"
        >
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-[rgba(var(--mg-primary),0.4)] to-transparent"></div>
          
          <h2 className="mg-subtitle text-xl mb-4">Subsidiary Certifications</h2>
          <p className="text-[rgba(var(--mg-text),0.8)] mb-6 leading-relaxed">
            In order to participate in a preferred role during our larger, more structured operations that we typically hold on a month to month basis, we require subsidiary employees to earn certifications showing competency in specific skills. Like with the employee evaluations, these are avenues to either learn or be evaluated in a skill, so if you&apos;re already familiar with certain things then we will merely ask for proof of competency and the evaluation process will be waived. Below are our current, available certifications (note, you do not have to be in a subsidiary to get subsidiary-specific certifications, any employee is eligible to earn all of them):
          </p>
        </motion.div>

        {/* AydoExpress Certifications */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.6 }}
          className="mg-panel bg-[rgba(var(--mg-panel-dark),0.4)] p-6 rounded-sm relative mb-8"
        >
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-[rgba(0,210,255,0.4)] to-transparent"></div>
          
          <div className="flex items-center mb-6">
            <div className="h-10 w-10 relative mr-4 rounded-sm overflow-hidden">
              <Image 
                src={cdn('/Aydo_Express.png')} 
                alt="AydoExpress Logo" 
                fill 
                className="object-contain"
              />
            </div>
            <h3 className="mg-subtitle text-xl">AydoExpress Certifications</h3>
          </div>
          
          <div className="space-y-4">
            {aydoExpressCerts.map((cert) => (
              <CertificationCard
                key={cert.id}
                cert={cert}
                isExpanded={expandedItems.has(cert.id)}
                onToggle={() => toggleExpanded(cert.id)}
              />
            ))}
          </div>
        </motion.div>

        {/* Empyrion Industries Certifications */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.8 }}
          className="mg-panel bg-[rgba(var(--mg-panel-dark),0.4)] p-6 rounded-sm relative mb-8"
        >
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-[rgba(255,165,0,0.4)] to-transparent"></div>
          
          <div className="flex items-center mb-6">
            <div className="h-10 w-10 relative mr-4 rounded-sm overflow-hidden">
              <Image 
                src={cdn('/Empyrion_Industries.png')} 
                alt="Empyrion Industries Logo" 
                fill 
                className="object-contain"
              />
            </div>
            <h3 className="mg-subtitle text-xl">Empyrion Industries Certifications</h3>
          </div>
          
          <div className="space-y-4">
            {empyrionCerts.map((cert) => (
              <CertificationCard
                key={cert.id}
                cert={cert}
                isExpanded={expandedItems.has(cert.id)}
                onToggle={() => toggleExpanded(cert.id)}
              />
            ))}
          </div>
        </motion.div>

        {/* Midnight Security Certifications */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, delay: 1.0 }}
          className="mg-panel bg-[rgba(var(--mg-panel-dark),0.4)] p-6 rounded-sm relative mb-8"
        >
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-[rgba(255,100,100,0.4)] to-transparent"></div>
          
          <div className="flex items-center mb-6">
            <div className="h-10 w-10 relative mr-4 rounded-sm overflow-hidden">
              <Image src={cdn('/New_Midnight_Security.png')} alt="Midnight Security Logo" fill className="object-contain" />
            </div>
            <h3 className="mg-subtitle text-xl">Midnight Security Certifications</h3>
          </div>
          
          <div className="space-y-4">
            {securityCerts.map((cert) => (
              <CertificationCard
                key={cert.id}
                cert={cert}
                isExpanded={expandedItems.has(cert.id)}
                onToggle={() => toggleExpanded(cert.id)}
              />
            ))}
          </div>
        </motion.div>
        
        <div className="mt-6 text-center text-xs text-[rgba(var(--mg-text),0.6)]">
          AYDO INTERGALACTIC CORPORATION - CAREER DEVELOPMENT
        </div>
      </div>
    </div>
  );
}
