'use client';

import React from 'react';
import { motion } from 'motion/react';

interface TimelineNodeProps {
  year: string;
  title: string;
  subtitle: string;
  content: string;
  delay: number;
}

export default function TimelineNode({
  year,
  title,
  subtitle,
  content,
  delay
}: TimelineNodeProps) {
  return (
    <motion.div
      className="relative mb-12 pl-8 last:mb-0"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay }}
    >
      {/* Node */}
      <div
        className="absolute left-0 top-0 w-3 h-3 rounded-full"
        style={{
          backgroundColor: "rgba(0, 215, 255, 0.8)",
          transform: "translateX(-50%)",
          marginTop: "6px"
        }}
      />

      {/* Vertical line */}
      <div
        className="absolute left-0 top-0 w-[1px] h-full"
        style={{
          backgroundColor: "rgba(0, 215, 255, 0.3)",
          transform: "translateX(-50%)",
          height: "calc(100% + 12px)",
        }}
      />

      {/* Content */}
      <div>
        <div className="text-[rgba(var(--mg-primary),1)] text-sm font-quantify mb-1">{year} - {title}</div>
        <h3 className="text-base font-bold text-[rgba(var(--mg-text),0.9)] mb-2">{subtitle}</h3>
        <p className="text-sm text-[rgba(var(--mg-text),0.7)]">{content}</p>
      </div>
    </motion.div>
  );
}