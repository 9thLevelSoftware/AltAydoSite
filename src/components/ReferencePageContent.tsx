'use client';

import React from 'react';
import MobiGlasButton from '@/components/ui/mobiglas/MobiGlasButton';

const ReferencePageContent = () => {
  return (
    <div className="container mx-auto px-4 py-10">
      <div className="mg-container mb-8 p-6 scan-glow">
        <h1 className="mg-title text-3xl mb-4">Futuristic UI Design</h1>
        <p className="mg-text mb-6">
          Our website features a Star Citizen Mobiglass-inspired interface with holographic elements, dynamic visualizations, and an immersive space environment. The design principles focus on creating a futuristic, sci-fi aesthetic while maintaining usability.
        </p>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div className="mg-container p-4 holo-element card-3d">
            <h2 className="mg-subtitle text-xl mb-2">Holographic Interface</h2>
            <p className="text-sm opacity-80">
              Our design incorporates translucent holographic elements with a vibrant cyan-blue color palette for a futuristic feel. The interfaces feature dynamic light effects, subtle animations, and an immersive spatial layout.
            </p>
          </div>
          
          <div className="mg-container p-4 holo-element card-3d">
            <h2 className="mg-subtitle text-xl mb-2">Technological Elements</h2>
            <p className="text-sm opacity-80">
              We utilize grid patterns, hexagonal shapes, data visualizations, and futuristic typography to create a cohesive advanced technological aesthetic throughout the website.
            </p>
          </div>
        </div>
      </div>
      
      <div className="mg-container p-6 mb-12">
        <h2 className="mg-title text-xl mb-4">Design Elements</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="mg-container p-4 hologram-3d">
            <h3 className="mg-subtitle mb-2">Space Backdrop</h3>
            <p className="text-xs opacity-80">
              Dynamic starfield effect with parallax motion, nebula clouds, and subtle grid overlays to create depth and atmosphere.
            </p>
            <div className="mt-4 w-full h-24 relative overflow-hidden rounded">
              <div className="absolute inset-0 bg-[rgba(var(--mg-dark),0.7)]"></div>
              <div className="absolute inset-0 mg-grid-bg opacity-30"></div>
              <div className="absolute inset-0 hexagon-bg"></div>
              <div className="data-point absolute" style={{ top: '30%', left: '20%' }}></div>
              <div className="data-point absolute" style={{ top: '60%', left: '70%' }}></div>
              <div className="data-point absolute" style={{ top: '40%', left: '50%' }}></div>
            </div>
          </div>
          
          <div className="mg-container p-4 hologram-3d">
            <h3 className="mg-subtitle mb-2">UI Components</h3>
            <p className="text-xs opacity-80">
              Holographic panels, buttons with interactive effects, and dynamic containers with subtle animations.
            </p>
            <div className="mt-4 flex gap-2">
              <MobiGlasButton variant="primary" size="sm" className="text-xs">ACTION</MobiGlasButton>
              <div className="mg-container p-2 text-xs flex-1 flex items-center justify-center">DATA</div>
            </div>
          </div>
          
          <div className="mg-container p-4 hologram-3d">
            <h3 className="mg-subtitle mb-2">Visual Effects</h3>
            <p className="text-xs opacity-80">
              Scan lines, holographic glitches, data streams, and animated elements throughout the interface.
            </p>
            <div className="mt-4 w-full h-8 relative overflow-hidden">
              <div className="absolute inset-0 bg-[rgba(var(--mg-dark),0.5)]"></div>
              <div className="holo-scan absolute inset-0"></div>
              <div className="mg-progress-pulse absolute inset-0"></div>
            </div>
          </div>
        </div>
      </div>
      
      <div className="mg-container p-6 scan-glow">
        <h2 className="mg-title text-2xl mb-4">Interactive Experience</h2>
        <p className="mg-text mb-4">
          Our UI design incorporates various interactive elements for an immersive experience:
        </p>
        
        <ul className="space-y-4 mb-8">
          <li className="flex items-start animation-delay-150">
            <div className="data-point mt-1 mr-3 opacity-70"></div>
            <p className="opacity-80 reference-card p-2">Holographic displays with depth and translucency</p>
          </li>
          <li className="flex items-start animation-delay-300">
            <div className="data-point mt-1 mr-3 opacity-70"></div>
            <p className="opacity-80 reference-card p-2">Dynamic data visualization with real-time updates</p>
          </li>
          <li className="flex items-start animation-delay-150">
            <div className="data-point mt-1 mr-3 opacity-70"></div>
            <p className="opacity-80 reference-card p-2">Space-themed backgrounds with stars, nebulae, and grid patterns</p>
          </li>
          <li className="flex items-start animation-delay-300">
            <div className="data-point mt-1 mr-3 opacity-70"></div>
            <p className="opacity-80 reference-card p-2">Hexagonal design elements for a futuristic aesthetic</p>
          </li>
          <li className="flex items-start animation-delay-450">
            <div className="data-point mt-1 mr-3 opacity-70"></div>
            <p className="opacity-80 reference-card p-2">Interactive elements that respond to user actions</p>
          </li>
        </ul>
        
        <p className="mg-text opacity-90 hologram-flicker">
          These design elements work together to create an immersive experience that transports users into a futuristic space environment.
        </p>
      </div>
    </div>
  );
};

export default ReferencePageContent; 