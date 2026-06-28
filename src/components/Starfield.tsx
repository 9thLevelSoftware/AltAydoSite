'use client';

import { useEffect, useRef, useState } from 'react';

// Enhanced Star Citizen Mobiglass inspired space environment with autonomous animations
const MobiGlassStarfield = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  const animationPointsRef = useRef({
    x1: 0,
    y1: 0,
    x2: 0,
    y2: 0,
    t: 0,
  });

  // Check for reduced motion preference
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
      setPrefersReducedMotion(mediaQuery.matches);

      const handleChange = (e: MediaQueryListEvent) => {
        setPrefersReducedMotion(e.matches);
      };

      mediaQuery.addEventListener('change', handleChange);
      return () => mediaQuery.removeEventListener('change', handleChange);
    }
  }, []);

  useEffect(() => {
    const updateDimensions = () => {
      setDimensions({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    };

    window.addEventListener('resize', updateDimensions);
    updateDimensions();

    return () => window.removeEventListener('resize', updateDimensions);
  }, []);

  // Remove mouse tracking and set autonomous animation points
  useEffect(() => {
    // Initialize animation points reference
    animationPointsRef.current = {
      x1: dimensions.width * 0.3,
      y1: dimensions.height * 0.3,
      x2: dimensions.width * 0.7,
      y2: dimensions.height * 0.7,
      t: 0,
    };
  }, [dimensions]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // If user prefers reduced motion, don't animate
    if (prefersReducedMotion) {
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // Draw a simple static starfield instead
      const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = dimensions.width * pixelRatio;
      canvas.height = dimensions.height * pixelRatio;
      canvas.style.width = dimensions.width + 'px';
      canvas.style.height = dimensions.height + 'px';
      // Scale so all drawing below uses CSS-pixel coordinates
      ctx.scale(pixelRatio, pixelRatio);

      // Static gradient background (CSS-pixel coordinates after scaling)
      const gradient = ctx.createLinearGradient(0, 0, 0, dimensions.height);
      gradient.addColorStop(0, '#000a1a');
      gradient.addColorStop(1, '#001428');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, dimensions.width, dimensions.height);

      // Draw static stars
      const staticStars = 50;
      ctx.fillStyle = 'rgba(200, 220, 255, 0.8)';
      for (let i = 0; i < staticStars; i++) {
        const x = Math.random() * dimensions.width;
        const y = Math.random() * dimensions.height;
        const size = Math.random() * 1.5 + 0.5;
        ctx.beginPath();
        ctx.arc(x, y, size, 0, Math.PI * 2);
        ctx.fill();
      }

      return; // Don't start animation
    }

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas dimensions with pixel ratio optimization
    const pixelRatio = Math.min(window.devicePixelRatio || 1, 2); // Cap at 2x for performance
    canvas.width = dimensions.width * pixelRatio;
    canvas.height = dimensions.height * pixelRatio;
    canvas.style.width = dimensions.width + 'px';
    canvas.style.height = dimensions.height + 'px';
    // Scale so all drawing below uses CSS-pixel coordinates
    ctx.scale(pixelRatio, pixelRatio);

    // World dimensions in CSS pixels (must match the scaled coordinate space)
    const worldWidth = dimensions.width;
    const worldHeight = dimensions.height;

    // Optimized particle counts for better performance
    const STAR_COUNT = 120; // Reduced from 200
    const NEBULA_COUNT = 2; // Reduced from 3
    const GRID_LINE_COUNT = 8; // Reduced from 12
    const DATA_STREAM_COUNT = 3; // Reduced from 4
    const HEX_GLOW_COUNT = 5; // Reduced from 8
    const HOLOGRAM_CIRCLES_COUNT = 2; // Reduced from 3

    interface Star {
      x: number;
      y: number;
      z: number;
      size: number;
      color: string;
      pulse: number;
      pulseSpeed: number;
    }

    interface Nebula {
      x: number;
      y: number;
      radius: number;
      color: string;
      opacity: number;
      pulse: number;
    }

    interface GridLine {
      direction: 'horizontal' | 'vertical';
      position: number;
      speed: number;
      width: number;
      color: string;
      opacity: number;
    }

    interface DataStream {
      x: number;
      y: number;
      height: number;
      speed: number;
      active: boolean;
      opacity: number;
      color: string;
      timer: number;
      maxTime: number;
    }

    interface HexGlow {
      x: number;
      y: number;
      size: number;
      opacity: number;
      maxOpacity: number;
      speed: number;
      active: boolean;
      angle: number;
      rotationSpeed: number;
    }

    interface HologramCircle {
      centerX: number;
      centerY: number;
      radius: number;
      width: number;
      speed: number;
      opacity: number;
      segmentLength: number;
      segmentSpacing: number;
      rotation: number;
    }

    // Generate stars with z-depth for parallax effect - more vibrant, brighter blues
    const stars: Star[] = Array.from({ length: STAR_COUNT }, () => ({
      x: Math.random() * worldWidth,
      y: Math.random() * worldHeight,
      z: Math.random() * 3,
      size: Math.random() * 1.5 + 0.3, // Slightly larger stars
      color: `rgba(${Math.random() * 30 + 220}, ${Math.random() * 120 + 155}, 255, ${Math.random() * 0.5 + 0.5})`, // Brighter blue tones
      pulse: Math.random() * Math.PI * 2,
      pulseSpeed: Math.random() * 0.01 + 0.005,
    }));

    // Generate nebulas/gas clouds - larger, more vibrant with better coloring
    const nebulas: Nebula[] = Array.from({ length: NEBULA_COUNT }, () => ({
      x: Math.random() * worldWidth,
      y: Math.random() * worldHeight,
      radius: Math.random() * 400 + 250, // Larger clouds for more immersion
      color: `rgba(0, ${Math.random() * 140 + 140}, ${Math.random() * 175 + 120}, 0.04)`, // More vibrant blues
      opacity: Math.random() * 0.04 + 0.02, // Slightly more visible
      pulse: Math.random() * Math.PI * 2,
    }));

    // Generate holographic grid lines - more precise, brighter
    const gridLines: GridLine[] = [];

    // Horizontal grid lines
    for (let i = 0; i < GRID_LINE_COUNT; i++) {
      gridLines.push({
        direction: 'horizontal',
        position: Math.random() * worldHeight,
        speed: Math.random() * 0.1 + 0.05,
        width: 0.5,
        color: `rgba(0, ${Math.random() * 120 + 170}, 255, ${Math.random() * 0.06 + 0.03})`, // Brighter, more visible
        opacity: Math.random() * 0.08 + 0.03, // More vibrant
      });
    }

    // Vertical grid lines
    for (let i = 0; i < GRID_LINE_COUNT; i++) {
      gridLines.push({
        direction: 'vertical',
        position: Math.random() * worldWidth,
        speed: Math.random() * 0.1 + 0.05,
        width: 0.5,
        color: `rgba(0, ${Math.random() * 120 + 170}, 255, ${Math.random() * 0.06 + 0.03})`, // Brighter, more visible
        opacity: Math.random() * 0.08 + 0.03, // More vibrant
      });
    }

    // Data streams - more pronounced and defined
    const dataStreams: DataStream[] = Array.from({ length: DATA_STREAM_COUNT }, () => ({
      x: Math.random() * worldWidth,
      y: -100,
      height: Math.random() * 180 + 120, // Longer streams
      speed: Math.random() * 2.5 + 1.5, // Slightly faster for more activity
      active: false,
      opacity: 0.6, // More visible
      color: `rgba(0, ${Math.random() * 120 + 170}, 255, 0.6)`, // Brighter blue
      timer: 0,
      maxTime: Math.random() * 180 + 220,
    }));

    // Auto-animated hex glows positioned around the canvas autonomously
    const hexGlows: HexGlow[] = Array.from({ length: HEX_GLOW_COUNT }, () => ({
      x: Math.random() * worldWidth,
      y: Math.random() * worldHeight,
      size: Math.random() * 35 + 25, // Larger hexagons
      opacity: 0,
      maxOpacity: Math.random() * 0.12 + 0.06, // More visible
      speed: Math.random() * 0.12 + 0.06, // Faster response
      active: Math.random() > 0.5, // Some start active
      angle: Math.random() * Math.PI * 2,
      rotationSpeed: (Math.random() - 0.5) * 0.012, // Faster rotation
    }));

    // New holographic circles that orbit around focal points
    const hologramCircles: HologramCircle[] = Array.from(
      { length: HOLOGRAM_CIRCLES_COUNT },
      () => ({
        centerX: worldWidth / 2 + (Math.random() - 0.5) * worldWidth * 0.5,
        centerY: worldHeight / 2 + (Math.random() - 0.5) * worldHeight * 0.5,
        radius: Math.random() * 150 + 100,
        width: Math.random() + 0.5,
        speed: Math.random() * 0.001 + 0.0005,
        opacity: Math.random() * 0.1 + 0.05,
        segmentLength: Math.PI / (Math.random() * 8 + 4), // Length of each segment
        segmentSpacing: Math.PI / (Math.random() * 12 + 8), // Space between segments
        rotation: Math.random() * Math.PI * 2,
      })
    );

    const drawStars = () => {
      stars.forEach((star) => {
        // Calculate pulse factor - more pronounced
        star.pulse += star.pulseSpeed;
        const pulseFactor = Math.sin(star.pulse) * 0.25 + 0.8; // More dynamic pulsing

        // Draw star
        ctx.beginPath();
        ctx.arc(star.x, star.y, star.size * pulseFactor, 0, Math.PI * 2);

        // Enhanced star glow effect - more vibrant
        const gradient = ctx.createRadialGradient(
          star.x,
          star.y,
          0,
          star.x,
          star.y,
          star.size * 4 * pulseFactor // Larger glow radius
        );

        gradient.addColorStop(0, star.color);
        gradient.addColorStop(1, 'rgba(0, 10, 40, 0)');

        ctx.fillStyle = gradient;
        ctx.fill();
      });
    };

    const drawNebulas = () => {
      nebulas.forEach((nebula) => {
        // Pulsing effect - very slow and subtle but more noticeable
        nebula.pulse += 0.003;
        const pulseFactor = Math.sin(nebula.pulse) * 0.12 + 0.9;

        // Draw nebula with enhanced coloring
        const gradient = ctx.createRadialGradient(
          nebula.x,
          nebula.y,
          0,
          nebula.x,
          nebula.y,
          nebula.radius * pulseFactor
        );

        gradient.addColorStop(0, nebula.color);
        gradient.addColorStop(
          0.7,
          `rgba(0, ${Math.random() * 80 + 100}, ${Math.random() * 120 + 100}, 0.02)`
        );
        gradient.addColorStop(1, 'rgba(0, 10, 40, 0)');

        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(nebula.x, nebula.y, nebula.radius * pulseFactor, 0, Math.PI * 2);
        ctx.fill();
      });
    };

    const drawGridLines = () => {
      gridLines.forEach((line) => {
        if (line.direction === 'horizontal') {
          line.position += line.speed;
          if (line.position > worldHeight) {
            line.position = 0;
          }

          ctx.beginPath();
          ctx.strokeStyle = line.color;
          ctx.lineWidth = line.width;
          ctx.globalAlpha = line.opacity;
          ctx.moveTo(0, line.position);
          ctx.lineTo(worldWidth, line.position);
          ctx.stroke();
          ctx.globalAlpha = 1;
        } else {
          line.position += line.speed;
          if (line.position > worldWidth) {
            line.position = 0;
          }

          ctx.beginPath();
          ctx.strokeStyle = line.color;
          ctx.lineWidth = line.width;
          ctx.globalAlpha = line.opacity;
          ctx.moveTo(line.position, 0);
          ctx.lineTo(line.position, worldHeight);
          ctx.stroke();
          ctx.globalAlpha = 1;
        }
      });
    };

    const drawDataStreams = () => {
      ctx.lineWidth = 1;

      // Randomly activate new data streams
      const inactiveStreams = dataStreams.filter((stream) => !stream.active);
      if (inactiveStreams.length > 0 && Math.random() < 0.005) {
        const streamToActivate =
          inactiveStreams[Math.floor(Math.random() * inactiveStreams.length)];
        streamToActivate.active = true;
        streamToActivate.timer = 0;
        streamToActivate.x = Math.random() * worldWidth;
      }

      dataStreams.forEach((stream) => {
        if (stream.active) {
          stream.timer++;

          // Reset stream if it's been active for too long
          if (stream.timer > stream.maxTime) {
            stream.active = false;
            stream.y = -100;
            return;
          }

          stream.y += stream.speed;

          // Reset stream position when it goes off screen
          if (stream.y > worldHeight) {
            stream.y = -100;
            stream.x = Math.random() * worldWidth;
          }

          const segments = 12;
          const segmentHeight = stream.height / segments;

          // Draw data stream segments
          for (let i = 0; i < segments; i++) {
            const segOpacity = (1 - i / segments) * stream.opacity;
            ctx.strokeStyle = stream.color.replace('0.6', segOpacity.toString());

            // Draw segment
            ctx.beginPath();
            ctx.moveTo(stream.x, stream.y - i * segmentHeight);
            ctx.lineTo(stream.x, stream.y - (i + 0.8) * segmentHeight);
            ctx.stroke();
          }
        }
      });
    };

    const drawHexGrid = (x: number, y: number, size: number, opacity: number, angle: number) => {
      ctx.strokeStyle = `rgba(0, 180, 255, ${opacity})`;
      ctx.lineWidth = 0.5;

      // Draw hex grid centered at the specified point
      ctx.beginPath();
      for (let i = 0; i < 6; i++) {
        const a = angle + (Math.PI / 3) * i;
        const nextA = angle + (Math.PI / 3) * ((i + 1) % 6);

        ctx.moveTo(x + Math.cos(a) * size, y + Math.sin(a) * size);

        ctx.lineTo(x + Math.cos(nextA) * size, y + Math.sin(nextA) * size);
      }

      // Draw internal hex pattern
      for (let i = 0; i < 6; i += 2) {
        const a = angle + (Math.PI / 3) * i;

        ctx.moveTo(x, y);
        ctx.lineTo(x + Math.cos(a) * size, y + Math.sin(a) * size);
      }

      ctx.stroke();
    };

    const drawHexGlows = () => {
      // Autonomous animation of hex glows
      hexGlows.forEach((hex) => {
        // Slowly move hex glows in a pattern
        const time = Date.now() / 5000;
        hex.x += Math.sin(time + hex.angle) * 0.3;
        hex.y += Math.cos(time + hex.angle * 0.7) * 0.3;

        // Keep hex glows within bounds
        if (hex.x < 0) hex.x = worldWidth;
        if (hex.x > worldWidth) hex.x = 0;
        if (hex.y < 0) hex.y = worldHeight;
        if (hex.y > worldHeight) hex.y = 0;

        // Update rotation
        hex.angle += hex.rotationSpeed;

        // Update opacity for pulsing effect
        if (hex.active) {
          hex.opacity += hex.speed;
          if (hex.opacity > hex.maxOpacity) {
            hex.opacity = hex.maxOpacity;
            hex.active = Math.random() <= 0.995;
          }
        } else {
          hex.opacity -= hex.speed;
          if (hex.opacity < 0) {
            hex.opacity = 0;
            hex.active = Math.random() > 0.995;
            if (hex.active) {
              // Choose a new position
              hex.x = Math.random() * worldWidth;
              hex.y = Math.random() * worldHeight;
            }
          }
        }

        // Draw hex grid
        if (hex.opacity > 0) {
          drawHexGrid(hex.x, hex.y, hex.size, hex.opacity, hex.angle);
        }
      });
    };

    const drawHologramCircles = () => {
      hologramCircles.forEach((circle) => {
        // Update rotation
        circle.rotation += circle.speed;

        // Draw segmented circles
        ctx.strokeStyle = `rgba(0, 180, 255, ${circle.opacity})`;
        ctx.lineWidth = circle.width;

        // Draw multiple segments along the circle
        for (let i = 0; i < Math.PI * 2; i += circle.segmentLength + circle.segmentSpacing) {
          const startAngle = i + circle.rotation;
          const endAngle = i + circle.segmentLength + circle.rotation;

          ctx.beginPath();
          ctx.arc(circle.centerX, circle.centerY, circle.radius, startAngle, endAngle);
          ctx.stroke();
        }
      });
    };

    // Draw auto-animating focus points
    const drawFocusPoints = () => {
      // Update animation time
      animationPointsRef.current.t += 0.003;
      const t = animationPointsRef.current.t;

      // Calculate smooth circular paths for animation points
      const x1 = dimensions.width * 0.5 + Math.sin(t) * dimensions.width * 0.3;
      const y1 = dimensions.height * 0.5 + Math.cos(t * 0.7) * dimensions.height * 0.3;

      const x2 = dimensions.width * 0.5 + Math.sin(t * 0.8 + Math.PI) * dimensions.width * 0.25;
      const y2 = dimensions.height * 0.5 + Math.cos(t * 0.5 + Math.PI) * dimensions.height * 0.25;

      // Draw connection between points
      ctx.beginPath();
      ctx.strokeStyle = 'rgba(0, 180, 255, 0.2)';
      ctx.lineWidth = 0.5;
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();

      // Draw focus points
      [
        { x: x1, y: y1, size: 5 },
        { x: x2, y: y2, size: 4 },
      ].forEach((point) => {
        // Outer glow
        const gradient = ctx.createRadialGradient(
          point.x,
          point.y,
          0,
          point.x,
          point.y,
          point.size * 5
        );

        gradient.addColorStop(0, 'rgba(0, 180, 255, 0.4)');
        gradient.addColorStop(1, 'rgba(0, 10, 40, 0)');

        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(point.x, point.y, point.size * 5, 0, Math.PI * 2);
        ctx.fill();

        // Inner point
        ctx.fillStyle = 'rgba(0, 220, 255, 0.8)';
        ctx.beginPath();
        ctx.arc(point.x, point.y, point.size * 0.5, 0, Math.PI * 2);
        ctx.fill();
      });

      // Store the current points for reference
      animationPointsRef.current = {
        x1,
        y1,
        x2,
        y2,
        t,
      };
    };

    // Main animation loop with proper cleanup
    let animationFrameId: number;

    // FPS cap constants for performance optimization
    const TARGET_FPS = 30;
    const FRAME_INTERVAL = 1000 / TARGET_FPS; // ~33.33ms
    let lastFrameTime = 0;

    const animate = (timestamp: number) => {
      animationFrameId = requestAnimationFrame(animate);

      const elapsed = timestamp - lastFrameTime;
      if (elapsed < FRAME_INTERVAL) return; // Skip this frame

      lastFrameTime = timestamp - (elapsed % FRAME_INTERVAL); // Prevent drift

      // Clear canvas (CSS-pixel coordinates after scaling)
      ctx.clearRect(0, 0, worldWidth, worldHeight);

      drawStars();
      drawNebulas();
      drawGridLines();
      drawDataStreams();
      drawHexGlows();
      drawHologramCircles();
      drawFocusPoints();
    };

    // Start animation
    requestAnimationFrame(animate);

    // Cleanup function to cancel animation frame
    return () => {
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }
    };
  }, [dimensions, prefersReducedMotion]);

  return (
    <canvas
      ref={canvasRef}
      className="fixed top-0 left-0 w-full h-full z-0"
      style={{ pointerEvents: 'none' }}
    />
  );
};

export default MobiGlassStarfield;
