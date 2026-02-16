'use client';

import React from 'react';
import { motion } from 'motion/react';

export default function CorporateHistoryPage() {
  return (
    <div className="min-h-screen bg-black bg-opacity-95 p-6 relative">
      {/* Holographic background effects */}
      <div className="absolute inset-0 bg-holo-grid bg-[length:50px_50px] opacity-5 pointer-events-none"></div>
      <div className="hexagon-bg absolute inset-0 opacity-5 pointer-events-none"></div>

      <div className="max-w-4xl mx-auto">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="mb-8"
        >
          <h1 className="mg-title text-2xl sm:text-3xl lg:text-4xl mb-4">Corporate History</h1>
          <div className="h-1 w-20 bg-gradient-to-r from-transparent via-[rgba(var(--mg-primary),0.7)] to-transparent"></div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="mg-panel bg-[rgba(var(--mg-panel-dark),0.4)] p-6 rounded-sm relative"
        >
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-[rgba(var(--mg-primary),0.4)] to-transparent"></div>
          
          <div className="mg-text space-y-6">
            <p>
              Christoff Revan was born on August 14, 2924, in Neo Taurii, Kampos, to Senator Paulus Revan and his wife, Tyrenia. Raised in privilege, his early years were comfortable and full of promise. That changed abruptly after his eighth birthday, when his father was accused of bribery and tax evasion. Seeking redemption, Paulus invested the family&apos;s fortune into a nearly completed terraforming project—only for it to be destroyed in an eco-terrorist attack. With their finances ruined, Paulus took Tyrenia on a cruise aboard their luxury 890 Jump, the Markheim, hoping to shield her from the full extent of their losses. The ship never reached its destination. Vanduul raiders intercepted and annihilated it in the Vega system. No one survived.
            </p>
            
            <p>
              Left orphaned, Christoff was placed in a state-run boarding school. The transition from wealth to institutional care was harsh, but his resilience soon became apparent. At age 11, his exceptional test scores attracted the attention of UEE recruiters, who were scouring the empire for gifted youth due to increasing military pressures. Christoff was offered a place in a special pilot program and eagerly accepted, driven by a lifelong fascination with space. He graduated in 2941 and began active duty the following year, serving aboard the UEES Integrity. After four years of honorable service, he left the military in 2946.
            </p>
            
            <p>
              That same year, with the backing of investor Ike Days, Christoff founded Aydo City Delivery (ACD). Initially, the company struggled to gain traction in a market dominated by long-established players. The breakthrough came in 2947, when a tip about the poor living conditions of miners at Pinecone inspired Christoff to deliver high-end goods directly to the outpost. The venture was an immediate success. Demand soared, prompting the rapid expansion of the fleet and new contracts, including regular supply runs to Encole Station.
            </p>
            
            <p>
              By 2948, ACD had secured a distribution deal with Seahorse Fisheries, transporting seafood across the Ellis system. The relationship proved so lucrative that, in 2950, Christoff acquired a majority stake in the company, leading to a formal merger. To reflect its broader scope beyond delivery, ACD was renamed AydoExpress, and the parent company became Aydo Amalgamated Industries (AAI).
            </p>
            
            <p>
              Diversification efforts continued into 2951. Christoff acquired Empyrion Industries, an industrial firm based in Sol, after lengthy negotiations. Later that year, he learned that Midnight Security, a struggling security outfit run by his former rival Kirk Torrence, was up for sale. Christoff seized the opportunity, acquiring the firm at a discounted rate. Shortly after the purchase, the company was restructured and rebranded as Aydo Protective Services, shifting its focus to professional corporate protection.
            </p>
            
            <p>
              With a presence established in multiple star systems and a growing network of operations, the company was rebranded once again. In 2952, it officially became Aydo Intergalactic Corporation (AIC) under UEE recognition, reflecting its status as a full-spectrum interstellar enterprise.
            </p>
            
            <p>
              Today, AIC operates through several key subsidiaries:
            </p>
            
            <ul className="list-disc pl-6 space-y-2">
              <li>AydoExpress, specializing in logistics and personnel transport</li>
              <li>Empyrion Industries, focused on industrial production and resource operations</li>
              <li>Midnight Security, responsible for internal security and asset protection</li>
            </ul>
            
            <p>
              From a turbulent childhood to the helm of a multi-system conglomerate, Christoff Revan&apos;s journey is a story of adaptation, vision, and transformation—one that continues to shape AydoCorp&apos;s path into the stars.
            </p>
          </div>
          
          {/* Animated data stream */}
          <div className="absolute inset-x-0 bottom-0 h-px">
            <motion.div 
              className="h-full bg-gradient-to-r from-transparent via-[rgba(var(--mg-primary),0.8)] to-transparent"
              animate={{ 
                x: ['-100%', '100%'] 
              }}
              transition={{ 
                duration: 3, 
                repeat: Infinity,
                ease: "linear"
              }}
            />
          </div>
        </motion.div>
        
        <div className="mt-6 text-center text-xs text-[rgba(var(--mg-text),0.6)]">
          AYDO INTERGALACTIC CORPORATION - INTERNAL ARCHIVES
        </div>
      </div>
    </div>
  );
} 