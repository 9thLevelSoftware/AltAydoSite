'use client';

import React, { useState } from 'react';
import { motion } from 'motion/react';

interface HolographicButtonProps {
  onClick: () => void;
  children: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'danger' | 'success';
  size?: 'sm' | 'md' | 'lg';
  icon?: React.ReactNode;
  disabled?: boolean;
  fullWidth?: boolean;
  type?: 'button' | 'submit' | 'reset';
  className?: string;
}

const HolographicButton: React.FC<HolographicButtonProps> = ({
  onClick,
  children,
  variant = 'primary',
  size = 'md',
  icon,
  disabled = false,
  fullWidth = false,
  type = 'button',
  className = '',
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const [isPressed, setIsPressed] = useState(false);
  
  // Get variant styles
  const getVariantStyles = () => {
    switch (variant) {
      case 'secondary':
        return {
          border: 'border-[rgba(var(--mg-secondary),0.3)]',
          hoverBorder: 'rgba(var(--mg-secondary),0.6)',
          color: 'text-[rgba(var(--mg-secondary),0.9)]',
          glow: 'rgba(var(--mg-secondary), 0.5)',
          gradientColor: 'rgba(var(--mg-secondary),0.8)',
          activeGlow: 'rgba(var(--mg-secondary), 0.7)'
        };
      case 'danger':
        return {
          border: 'border-[rgba(var(--mg-danger),0.3)]',
          hoverBorder: 'rgba(var(--mg-danger),0.6)',
          color: 'text-[rgba(var(--mg-danger),0.9)]',
          glow: 'rgba(var(--mg-danger), 0.5)',
          gradientColor: 'rgba(var(--mg-danger),0.8)',
          activeGlow: 'rgba(var(--mg-danger), 0.7)'
        };
      case 'success':
        return {
          border: 'border-[rgba(var(--mg-success),0.3)]',
          hoverBorder: 'rgba(var(--mg-success),0.6)',
          color: 'text-[rgba(var(--mg-success),0.9)]',
          glow: 'rgba(var(--mg-success), 0.5)',
          gradientColor: 'rgba(var(--mg-success),0.8)',
          activeGlow: 'rgba(var(--mg-success), 0.7)'
        };
      default: // primary
        return {
          border: 'border-[rgba(var(--mg-primary),0.3)]',
          hoverBorder: 'rgba(var(--mg-primary),0.6)',
          color: 'text-[rgba(var(--mg-primary),0.9)]',
          glow: 'rgba(var(--mg-primary), 0.5)',
          gradientColor: 'rgba(var(--mg-primary),0.8)',
          activeGlow: 'rgba(var(--mg-primary), 0.7)'
        };
    }
  };
  
  // Get size styles
  const getSizeStyles = () => {
    switch (size) {
      case 'sm':
        return 'py-1 px-3 text-xs';
      case 'lg':
        return 'py-3 px-6 text-base';
      default: // md
        return 'py-2 px-4 text-sm';
    }
  };
  
  const variantStyles = getVariantStyles();
  const sizeStyles = getSizeStyles();
  
  return (
    <motion.button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`
        holo-element
        bg-[rgba(var(--mg-panel-dark),0.7)]
        border
        ${variantStyles.border}
        ${variantStyles.color}
        ${sizeStyles}
        font-quantify
        tracking-wider
        relative
        overflow-hidden
        ${fullWidth ? 'w-full' : ''}
        ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
        ${className}
      `}
      onHoverStart={() => setIsHovered(true)}
      onHoverEnd={() => setIsHovered(false)}
      onTapStart={() => setIsPressed(true)}
      onTap={() => setIsPressed(false)}
      onTapCancel={() => setIsPressed(false)}
      whileHover={!disabled ? { 
        scale: 1.05,
        borderColor: variantStyles.hoverBorder,
        boxShadow: `0 0 15px ${variantStyles.glow}`
      } : {}}
      whileTap={!disabled ? { scale: 0.95 } : {}}
    >
      {/* Background gradients */}
      <motion.div 
        className="absolute inset-0 bg-gradient-to-r from-transparent via-[rgba(var(--mg-primary),0.1)] to-transparent opacity-0"
        animate={{ opacity: isHovered ? 1 : 0 }}
        transition={{ duration: 0.3 }}
      />
      
      {/* Scanning effect */}
      <div className="absolute inset-0 overflow-hidden">
        <motion.div
          className="absolute h-full w-[50%] bg-gradient-to-r from-transparent via-white to-transparent opacity-0"
          initial={{ x: '-100%', opacity: 0 }}
          animate={{ 
            x: isHovered ? '200%' : '-100%',
            opacity: isHovered ? 0.07 : 0
          }}
          transition={{ duration: 0.8, ease: "easeInOut" }}
        />
      </div>
      
      {/* Horizontal lines */}
      <motion.div
        className={`absolute left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-[${variantStyles.gradientColor}] to-transparent`}
        animate={{ 
          opacity: isHovered ? 1 : 0,
          boxShadow: isHovered ? `0 0 4px 1px ${variantStyles.glow}` : '0 0 0 0 transparent'
        }}
        style={{ top: 0 }}
      />
      <motion.div
        className={`absolute left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-[${variantStyles.gradientColor}] to-transparent`}
        animate={{ 
          opacity: isHovered ? 1 : 0,
          boxShadow: isHovered ? `0 0 4px 1px ${variantStyles.glow}` : '0 0 0 0 transparent'
        }}
        style={{ bottom: 0 }}
      />
      
      {/* Corner decorations */}
      <div className="absolute top-0 right-0 w-[15px] h-[15px]">
        <motion.div 
          className={`absolute top-0 right-0 w-[2px] h-[8px] bg-[${variantStyles.gradientColor}]`}
          animate={{ 
            height: isHovered ? 10 : 8,
            opacity: isPressed ? 1 : 0.6
          }}
        />
        <motion.div 
          className={`absolute top-0 right-0 w-[8px] h-[2px] bg-[${variantStyles.gradientColor}]`}
          animate={{ 
            width: isHovered ? 10 : 8,
            opacity: isPressed ? 1 : 0.6
          }}
        />
      </div>
      <div className="absolute bottom-0 left-0 w-[15px] h-[15px]">
        <motion.div 
          className={`absolute bottom-0 left-0 w-[2px] h-[8px] bg-[${variantStyles.gradientColor}]`}
          animate={{ 
            height: isHovered ? 10 : 8,
            opacity: isPressed ? 1 : 0.6
          }}
        />
        <motion.div 
          className={`absolute bottom-0 left-0 w-[8px] h-[2px] bg-[${variantStyles.gradientColor}]`}
          animate={{ 
            width: isHovered ? 10 : 8,
            opacity: isPressed ? 1 : 0.6
          }}
        />
      </div>
      
      {/* Button content */}
      <div className="relative z-10 flex items-center justify-center">
        {icon && (
          <motion.span 
            className="mr-2 flex-shrink-0"
            animate={{ scale: isPressed ? 0.9 : 1 }}
          >
            {icon}
          </motion.span>
        )}
        
        <motion.span
          animate={{ 
            textShadow: isHovered 
              ? `0 0 8px ${variantStyles.glow}` 
              : '0 0 0px transparent'
          }}
        >
          {children}
        </motion.span>
        
        {/* Active indicator dot */}
        {isHovered && (
          <motion.span
            className={`absolute -right-1 -top-1 w-1.5 h-1.5 rounded-full bg-[${variantStyles.gradientColor}]`}
            initial={{ scale: 0, opacity: 0 }}
            animate={{ 
              scale: 1, 
              opacity: 1,
              boxShadow: [
                `0 0 0 0 ${variantStyles.activeGlow}`,
                `0 0 0 4px ${variantStyles.activeGlow}`,
                `0 0 0 0 ${variantStyles.activeGlow}`
              ]
            }}
            transition={{ 
              scale: { duration: 0.2 },
              opacity: { duration: 0.2 },
              boxShadow: { duration: 1.5, repeat: Infinity }
            }}
          />
        )}
      </div>
      
      {/* Pulse effect on press */}
      {isPressed && (
        <motion.div
          className="absolute inset-0 bg-white"
          initial={{ opacity: 0.2 }}
          animate={{ opacity: 0 }}
          transition={{ duration: 0.5 }}
        />
      )}
    </motion.button>
  );
};

export default HolographicButton; 