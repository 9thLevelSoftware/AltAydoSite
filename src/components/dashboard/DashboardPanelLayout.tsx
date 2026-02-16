'use client';

import React, { ReactNode } from 'react';
import { motion } from 'motion/react';

interface DashboardPanelLayoutProps {
  children: ReactNode;
}

const DashboardPanelLayout: React.FC<DashboardPanelLayoutProps> = ({ children }) => {
  // Container animation
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.1,
        duration: 0.5
      }
    }
  };
  
  // Child animation
  const childVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { 
      opacity: 1, 
      y: 0,
      transition: { duration: 0.5 }
    }
  };
  
  // Convert children to array
  const childrenArray = React.Children.toArray(children);
  
  return (
    <motion.div
      className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-6"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {childrenArray.map((child, index) => (
        <motion.div 
          key={index} 
          variants={childVariants} 
          className="h-full"
        >
          {child}
        </motion.div>
      ))}
    </motion.div>
  );
};

export default DashboardPanelLayout; 