'use client';

import React from 'react';
import { motion } from 'motion/react';

interface DataStreamBackgroundProps {
  opacity?: 'low' | 'medium' | 'high';
  speed?: 'slow' | 'medium' | 'fast';
}

/**
 * Animated data stream background effect - vertical lines with traveling dots
 * Creates an immersive sci-fi atmosphere
 */
const DataStreamBackground: React.FC<DataStreamBackgroundProps> = ({
  opacity = 'low',
  speed = 'medium',
}) => {
  const opacityMap = { low: 0.1, medium: 0.2, high: 0.3 };
  const speedMap = { slow: 8, medium: 5, fast: 3 };

  const opacityValue = opacityMap[opacity];
  const duration = speedMap[speed];

  // Generate 5 vertical data streams at random positions
  const streams = Array.from({ length: 5 }, (_, i) => ({
    id: i,
    left: `${15 + i * 20}%`,
    delay: i * 0.4,
  }));

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {streams.map((stream) => (
        <div
          key={stream.id}
          className="absolute top-0 bottom-0 w-px"
          style={{
            left: stream.left,
            background: `rgba(var(--mg-primary), ${opacityValue})`,
          }}
        >
          <motion.div
            className="w-2 h-2 rounded-full absolute left-1/2 -translate-x-1/2"
            style={{
              background: `rgba(var(--mg-primary), ${opacityValue * 3})`,
              boxShadow: `0 0 8px rgba(var(--mg-primary), ${opacityValue * 2})`,
            }}
            animate={{
              top: ['-10%', '110%'],
            }}
            transition={{
              duration,
              repeat: Infinity,
              delay: stream.delay,
              ease: 'linear',
            }}
          />
        </div>
      ))}
    </div>
  );
};

export default DataStreamBackground;
