'use client';

import React, { useState, useEffect } from 'react';
import JoinStatusBar from '@/components/join/JoinStatusBar';
import JoinHero from '@/components/join/JoinHero';
import BenefitsSection from '@/components/join/BenefitsSection';
import VisionSection from '@/components/join/VisionSection';
import JoinCTA from '@/components/join/JoinCTA';

export default function Join() {
  const [time, setTime] = useState<Date | null>(null);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  useEffect(() => {
    setTime(new Date());

    const timer = setInterval(() => {
      setTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  return (
    <>
      <JoinStatusBar time={time} />
      <JoinHero />
      <BenefitsSection hoveredIndex={hoveredIndex} setHoveredIndex={setHoveredIndex} />
      <VisionSection />
      <JoinCTA />
    </>
  );
}
