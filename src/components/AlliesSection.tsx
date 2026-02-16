import React from 'react';
import { motion } from 'motion/react';
import Image from 'next/image';
import { cdn } from '@/lib/cdn';

const AlliesSection = () => {
  return (
    <motion.div 
      className="mg-container p-0.5 my-6"
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.8, delay: 0.2 }}
      viewport={{ once: true }}
    >
      <div className="p-4 bg-[rgba(var(--mg-background),0.8)]">
        <h3 className="mg-subtitle text-lg mb-3">STRATEGIC ALLIANCES</h3>
        <p className="text-sm text-[rgba(var(--mg-text),0.8)] leading-relaxed mb-4">
          AydoCorp maintains several crucial partnerships that strengthen its position in the interstellar logistics market. Our security alliance with Crusader Security provides essential protection for high-value shipments, while our trade agreements with Xi&apos;an and Banu merchants have opened new routes previously unavailable to human corporations.
        </p>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div className="relative overflow-hidden rounded h-36">
            <Image 
              src={cdn('/jan-urschel-a.jpg')} 
              alt="Banu Partnership" 
              fill
              className="object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent"></div>
            <div className="absolute bottom-0 left-0 p-3">
              <p className="text-[rgba(var(--mg-primary),1)] text-xs">
                Banu Defender - Cross-Species Security Fleet
              </p>
            </div>
            
            {/* Animated overlay effect */}
            <motion.div 
              className="absolute inset-0 border border-[rgba(var(--mg-primary),0.4)]"
              animate={{ 
                boxShadow: [
                  'inset 0 0 0px rgba(0, 215, 255, 0.2)',
                  'inset 0 0 20px rgba(0, 215, 255, 0.4)',
                  'inset 0 0 0px rgba(0, 215, 255, 0.2)'
                ]
              }}
              transition={{ duration: 2, repeat: Infinity }}
            ></motion.div>
          </div>
          
          <div className="relative overflow-hidden rounded h-36">
            <Image 
              src={cdn('/Firing_Concept.jpg')} 
              alt="Escort Fleet" 
              fill
              className="object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent"></div>
            <div className="absolute bottom-0 left-0 p-3">
              <p className="text-[rgba(var(--mg-primary),1)] text-xs">
                Aegis Sabre - Elite Escort Squadron
              </p>
            </div>
            
            {/* Animated overlay effect */}
            <motion.div 
              className="absolute inset-0 border border-[rgba(var(--mg-primary),0.4)]"
              animate={{ 
                boxShadow: [
                  'inset 0 0 0px rgba(0, 215, 255, 0.2)',
                  'inset 0 0 20px rgba(0, 215, 255, 0.4)',
                  'inset 0 0 0px rgba(0, 215, 255, 0.2)'
                ]
              }}
              transition={{ duration: 2, repeat: Infinity, delay: 0.5 }}
            ></motion.div>
          </div>
        </div>
        
        <div className="grid grid-cols-3 gap-2">
          <div className="p-2 bg-[rgba(var(--mg-background),0.6)] border border-[rgba(var(--mg-primary),0.3)]">
            <div className="text-center">
              <motion.div 
                className="text-lg font-bold text-[rgba(var(--mg-primary),1)]"
                animate={{ 
                  textShadow: [
                    '0 0 3px rgba(0, 215, 255, 0.3)',
                    '0 0 6px rgba(0, 215, 255, 0.6)',
                    '0 0 3px rgba(0, 215, 255, 0.3)'
                  ]
                }}
                transition={{ duration: 2, repeat: Infinity }}
              >
                14
              </motion.div>
              <div className="text-xs text-[rgba(var(--mg-text),0.7)]">Trading Partners</div>
            </div>
          </div>
          <div className="p-2 bg-[rgba(var(--mg-background),0.6)] border border-[rgba(var(--mg-primary),0.3)]">
            <div className="text-center">
              <motion.div 
                className="text-lg font-bold text-[rgba(var(--mg-primary),1)]"
                animate={{ 
                  textShadow: [
                    '0 0 3px rgba(0, 215, 255, 0.3)',
                    '0 0 6px rgba(0, 215, 255, 0.6)',
                    '0 0 3px rgba(0, 215, 255, 0.3)'
                  ]
                }}
                transition={{ duration: 2, repeat: Infinity, delay: 0.3 }}
              >
                6
              </motion.div>
              <div className="text-xs text-[rgba(var(--mg-text),0.7)]">Security Alliances</div>
            </div>
          </div>
          <div className="p-2 bg-[rgba(var(--mg-background),0.6)] border border-[rgba(var(--mg-primary),0.3)]">
            <div className="text-center">
              <motion.div 
                className="text-lg font-bold text-[rgba(var(--mg-primary),1)]"
                animate={{ 
                  textShadow: [
                    '0 0 3px rgba(0, 215, 255, 0.3)',
                    '0 0 6px rgba(0, 215, 255, 0.6)',
                    '0 0 3px rgba(0, 215, 255, 0.3)'
                  ]
                }}
                transition={{ duration: 2, repeat: Infinity, delay: 0.6 }}
              >
                3
              </motion.div>
              <div className="text-xs text-[rgba(var(--mg-text),0.7)]">Alien Species</div>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default AlliesSection; 