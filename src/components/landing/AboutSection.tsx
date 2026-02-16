"use client";

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import Image from 'next/image';
import { cdn } from '@/lib/cdn';

const aboutTabs = [
  {
    id: 'background',
    title: 'BACKGROUND',
    content: `Based in the Ellis system on the planet Green, the Aydo Intergalactic Corporation (more commonly referred to as "AydoCorp") is an amalgamation of not only several companies within the system but also containing subsidiaries in a multitude of other systems. Aptly named due to its headquarters located in the city of Aydo, the corporation had its humble beginnings as a small one-man delivery company run by none other than the current CEO, Christoff Revan. Over the years the company would grow and expand, what was once known as "Aydo City Delivery" eventually became "Aydo Amalgamated Industries" after a merger with Seahorse Fisheries, based out of Neo Taurii on Kampos. After acquiring multiple subsidiaries and having greater expansions, the company would transform into the corporation we now know as "AydoCorp", serving many clients throughout human and alien space.`,
    image: cdn('/spacebg.jpg')
  },
  {
    id: 'mission',
    title: 'OUR MISSION',
    content: `AydoCorp strives to provide the most reliable, efficient, and secure logistics and transportation services across known space. We maintain the highest standards of integrity, innovation, and customer satisfaction in every operation we undertake. Our mission is to connect worlds and businesses through seamless logistics solutions, empowering commerce and cooperation throughout human and alien space. We are committed to sustainable practices, technological advancement, and the professional development of our team members.`,
    image: cdn('/logisticsoffice.jpg')
  },
  {
    id: 'fleet',
    title: 'OUR FLEET',
    content: `AydoCorp maintains a diverse and modern fleet of vessels designed to meet any transportation need. From nimble personnel shuttles to massive cargo haulers, our ships are equipped with the latest technology and maintained to the highest standards. Each vessel undergoes rigorous safety inspections and is operated by experienced crews trained to handle any situation. Our specialized ships include deep space freighters, system hoppers, luxury personnel transports, heavy towing vessels, and rapid response ships.`,
    image: cdn('/sc_cargo.jpeg')
  },
  {
    id: 'team',
    title: 'OUR TEAM',
    content: `The true strength of AydoCorp lies in our exceptional team members. Each employee is selected for their expertise, dedication, and commitment to excellence. Our diverse workforce brings together specialists from across known space, creating a rich tapestry of knowledge and experience. We invest heavily in ongoing training and professional development, ensuring our team remains at the cutting edge of logistics best practices. From pilots to cargo specialists, administrators to engineers, every member of the AydoCorp family plays a vital role in our continued success.`,
    image: cdn('/AydoOffice1.png')
  }
];

export default function AboutSection() {
  const [activeTab, setActiveTab] = useState('background');
  
  const currentTab = aboutTabs.find(tab => tab.id === activeTab) || aboutTabs[0];
  
  return (
    <section id="about" className="relative min-h-screen flex items-center justify-center py-16">
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
            <h2 className="mg-title text-3xl md:text-4xl mb-2">ABOUT AYDOCORP</h2>
            <div className="w-full h-1 bg-gradient-to-r from-transparent via-[rgba(var(--mg-primary),0.6)] to-transparent"></div>
          </div>
        </motion.div>
        
        {/* About Content */}
        <div className="mg-container p-1">
          {/* Tabs */}
          <div className="flex flex-wrap border-b border-[rgba(var(--mg-primary),0.2)]">
            {aboutTabs.map((tab) => (
              <motion.button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-3 text-xs md:text-sm font-quantify tracking-wide relative ${
                  activeTab === tab.id 
                    ? 'text-[rgba(var(--mg-primary),1)]' 
                    : 'text-[rgba(var(--mg-text),0.7)] hover:text-[rgba(var(--mg-text),0.9)]'
                }`}
                whileHover={{ backgroundColor: 'rgba(var(--mg-primary),0.05)' }}
              >
                {tab.title}
                {activeTab === tab.id && (
                  <motion.div 
                    className="absolute bottom-0 left-0 w-full h-0.5 bg-[rgba(var(--mg-primary),0.8)]"
                    layoutId="activeTabLine"
                  />
                )}
              </motion.button>
            ))}
          </div>
          
          {/* Tab Content */}
          <div className="p-6">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.3 }}
                className="flex flex-col md:flex-row"
              >
                <div className="md:w-1/2 md:pr-8 mb-6 md:mb-0">
                  <div className="relative w-full h-64 md:h-80 overflow-hidden rounded">
                    <Image
                      src={currentTab.image || cdn('/placeholder.jpg')}
                      alt={currentTab.title}
                      fill
                      className="object-cover"
                    />
                    <div className="absolute inset-0 border border-[rgba(var(--mg-primary),0.3)]"></div>
                    <div className="absolute inset-0 bg-gradient-to-t from-[rgba(0,0,0,0.7)] to-transparent"></div>
                    
                    {/* Corner decorations */}
                    <div className="absolute top-0 left-0 w-6 h-6 border-l border-t border-[rgba(var(--mg-primary),0.6)]"></div>
                    <div className="absolute top-0 right-0 w-6 h-6 border-r border-t border-[rgba(var(--mg-primary),0.6)]"></div>
                    <div className="absolute bottom-0 left-0 w-6 h-6 border-l border-b border-[rgba(var(--mg-primary),0.6)]"></div>
                    <div className="absolute bottom-0 right-0 w-6 h-6 border-r border-b border-[rgba(var(--mg-primary),0.6)]"></div>
                  </div>
                </div>
                
                <div className="md:w-1/2">
                  <h3 className="text-lg md:text-xl text-[rgba(var(--mg-primary),0.9)] mb-4 font-quantify">
                    {currentTab.title}
                  </h3>
                  
                  <div className="text-sm md:text-base text-[rgba(var(--mg-text),0.8)] leading-relaxed">
                    <p>{currentTab.content}</p>
                  </div>
                </div>
              </motion.div>
            </AnimatePresence>
          </div>
          
          {/* Subfooter with stats */}
          <div className="mt-8 grid grid-cols-2 md:grid-cols-4 gap-4 p-4 border-t border-[rgba(var(--mg-primary),0.2)]">
            <StatsItem number="15+" label="SYSTEMS SERVICED" />
            <StatsItem number="3426+" label="SHIPMENTS COMPLETED" />
            <StatsItem number="98.7%" label="DELIVERY SUCCESS RATE" />
            <StatsItem number="24/7" label="SUPPORT AVAILABILITY" />
          </div>
        </div>
      </div>
    </section>
  );
}

function StatsItem({ number, label }: { number: string; label: string }) {
  return (
    <motion.div 
      className="text-center"
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.6 }}
    >
      <div className="text-2xl md:text-3xl font-bold text-[rgba(var(--mg-primary),1)] mb-1">
        {number}
      </div>
      <div className="text-xs text-[rgba(var(--mg-text),0.6)] tracking-wider">
        {label}
      </div>
    </motion.div>
  );
} 