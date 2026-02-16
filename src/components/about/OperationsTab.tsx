'use client';

import React from 'react';
import { motion } from 'motion/react';
import DirectiveCard from './DirectiveCard';

export default function OperationsTab() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
      className="grid grid-cols-1 md:grid-cols-3 gap-6"
    >
      <DirectiveCard
        icon={<path d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2h2a2 2 0 002-2v-1a2 2 0 012-2h1.945M5 20h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2 2v9a2 2 0 002 2z" />}
        title="Transport & Shipping"
        description="Safe transportation of goods throughout human and alien space"
        items={[
          "Regular shipments of cargo on behalf of client companies",
          "Secure transport with onboard security for all large shipments",
          "Top-of-the-line fighter craft escorts for valuable commodities",
          "Service routes throughout Sol-Terra trading sectors",
          "Operations in Xi'an and Banu systems"
        ]}
        delay={0.1}
      />

      <DirectiveCard
        icon={<path d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />}
        title="Resource Consolidation"
        description="Enhanced efficiency for client business operations"
        items={[
          "Supervision of client operations for better cohesion",
          "Resource management and allocation services",
          "Logistical planning and implementation",
          "Operational efficiency consulting",
          "Supply chain management and optimization"
        ]}
        delay={0.2}
      />

      <DirectiveCard
        icon={<path d="M12 14l9-5-9-5-9 5 9 5z" />}
        title="Personnel Transport"
        description="Safe and speedy transport services for staff and clients"
        items={[
          "Transportation for all AIC staff and client employees",
          "Private charter services available upon request",
          "Civilian transport on cargo vessels (space available basis)",
          "VIP transportation with enhanced security measures",
          "Interspecies cultural liaison services for alien space travel"
        ]}
        delay={0.3}
      />
    </motion.div>
  );
}