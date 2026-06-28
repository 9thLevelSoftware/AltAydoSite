'use client';

import React, { useState, useRef, useCallback, useEffect, useMemo, useId } from 'react';
import { motion } from 'motion/react';

// Data structure interface for org chart nodes
export interface ChartNodeData {
  id: string; // Unique ID for React keys and SVG path generation
  level: 'executive' | 'board' | 'director' | 'manager' | 'staff'; // Matches existing PersonCard prop
  front: {
    title: string;
  };
  back: {
    loreName?: string;
    handle?: string;
    // This can be expanded with more fields later
  };
  children: ChartNodeData[];
}

// Props interface for the main OrgChart component
interface OrgChartProps {
  tree: ChartNodeData;
  className?: string;
  // Optional additional connections to support multi-parent relationships
  extraConnections?: Array<{ from: string; to: string }>;
  // Optional resolver for dynamic header labels per level index
  headerResolver?: (levelIndex: number) => string;
  // Optional: render selected children on the same row as their parent (peers)
  peerWithParentIds?: string[];
  // Optional: per-node position offsets (pixels) to fine-tune layout inside containers
  nodeOffsets?: Record<string, { x?: number; y?: number }>;
  // Optional: force certain nodes to occupy an isolated row within their container
  isolateRowIds?: string[];
  // Optional: horizontally align a node's center X with another node's center X
  anchorXToId?: Record<string, string>;
}

// PersonCard component - extracted and enhanced from the original hierarchy page
interface PersonCardProps {
  title: string;
  loreName?: string;
  handle?: string;
  isFlippable?: boolean;
  className?: string;
  level?: 'executive' | 'board' | 'director' | 'manager' | 'staff';
  onHover?: (isHovered: boolean) => void;
  isFlipped: boolean;
  onFlip: () => void;
}

const PersonCard: React.FC<PersonCardProps> = ({
  title,
  loreName,
  handle,
  isFlippable = true,
  className = '',
  level = 'staff',
  onHover,
  isFlipped,
  onFlip,
}) => {
  const [isHovered, setIsHovered] = useState(false);

  const handleMouseEnter = () => {
    setIsHovered(true);
    onHover?.(true);
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
    onHover?.(false);
  };

  const handleClick = () => {
    if (isFlippable) {
      onFlip();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (!isFlippable) return;
    if (e.key === 'Enter' || e.key === ' ' || e.key === 'Spacebar') {
      e.preventDefault();
      handleClick();
    }
  };

  // Level-based styling
  const getLevelStyling = (level: string) => {
    switch (level) {
      case 'executive':
        return {
          border: 'border-yellow-400/60',
          borderColor: 'bg-yellow-400',
          glow: 'shadow-[0_0_15px_rgba(234,179,8,0.3)]',
          accent: 'bg-yellow-400/10',
        };
      case 'board':
        return {
          border: 'border-orange-400/70',
          borderColor: 'bg-orange-400',
          glow: 'shadow-[0_0_15px_rgba(251,146,60,0.4)]',
          accent: 'bg-orange-400/10',
        };
      case 'director':
      case 'manager':
      case 'management':
        return {
          border: 'border-green-400/60',
          borderColor: 'bg-green-400',
          glow: 'shadow-[0_0_10px_rgba(34,197,94,0.25)]',
          accent: 'bg-green-400/10',
        };
      case 'employee':
        return {
          border: 'border-fuchsia-400/70',
          borderColor: 'bg-fuchsia-400',
          glow: 'shadow-[0_0_12px_rgba(232,121,249,0.35)]',
          accent: 'bg-fuchsia-400/10',
        };
      case 'intern':
        return {
          border: 'border-primary/60',
          borderColor: 'bg-primary',
          glow: 'shadow-[0_0_8px_rgba(0,215,255,0.25)]',
          accent: 'bg-primary/8',
        };
      default:
        return {
          border: 'border-primary/40',
          borderColor: 'bg-primary',
          glow: 'shadow-[0_0_8px_rgba(0,215,255,0.2)]',
          accent: 'bg-primary/8',
        };
    }
  };

  const styling = getLevelStyling(level);

  return (
    <div
      className={`relative w-full h-24 sm:h-28 md:h-32 ${className} transition-transform duration-300 ${
        isHovered ? 'scale-105 -translate-y-2' : ''
      }`}
      style={{
        perspective: '1000px',
        filter: isHovered
          ? 'drop-shadow(0 8px 25px rgba(0, 215, 255, 0.15))'
          : 'drop-shadow(0 4px 15px rgba(0, 215, 255, 0.08))',
      }}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      role={isFlippable ? 'button' : undefined}
      tabIndex={isFlippable ? 0 : undefined}
      aria-pressed={isFlippable ? isFlipped : undefined}
    >
      <motion.div
        className="w-full h-full relative cursor-pointer"
        animate={{
          rotateY: isFlipped ? 180 : 0,
        }}
        transition={{
          duration: 0.8,
          ease: [0.4, 0, 0.2, 1],
        }}
        style={{
          transformStyle: 'preserve-3d',
          transformOrigin: 'center center',
          position: 'relative',
          zIndex: isFlipped ? 20 : 10,
        }}
      >
        {/* Front of card */}
        <div
          className={`absolute inset-0 w-full h-full mg-panel ${styling.border} ${styling.accent} rounded-sm flex flex-col justify-center items-center text-center p-4 transition-all duration-300 ${
            isHovered ? styling.glow : ''
          }`}
          style={{
            backfaceVisibility: 'hidden',
            transform: 'translateZ(0)',
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
          }}
        >
          {/* Enhanced corner decorations - all four corners */}
          <div className="absolute top-1 left-1 w-3 h-3">
            <div
              className={`absolute top-0 left-0 w-[1px] h-2 ${styling.borderColor} opacity-80`}
            ></div>
            <div
              className={`absolute top-0 left-0 w-2 h-[1px] ${styling.borderColor} opacity-80`}
            ></div>
          </div>
          <div className="absolute top-1 right-1 w-3 h-3">
            <div
              className={`absolute top-0 right-0 w-[1px] h-2 ${styling.borderColor} opacity-80`}
            ></div>
            <div
              className={`absolute top-0 right-0 w-2 h-[1px] ${styling.borderColor} opacity-80`}
            ></div>
          </div>
          <div className="absolute bottom-1 left-1 w-3 h-3">
            <div
              className={`absolute bottom-0 left-0 w-[1px] h-2 ${styling.borderColor} opacity-80`}
            ></div>
            <div
              className={`absolute bottom-0 left-0 w-2 h-[1px] ${styling.borderColor} opacity-80`}
            ></div>
          </div>
          <div className="absolute bottom-1 right-1 w-3 h-3">
            <div
              className={`absolute bottom-0 right-0 w-[1px] h-2 ${styling.borderColor} opacity-80`}
            ></div>
            <div
              className={`absolute bottom-0 right-0 w-2 h-[1px] ${styling.borderColor} opacity-80`}
            ></div>
          </div>

          <h3 className="mg-title text-xs sm:text-sm font-medium text-center leading-tight">
            {title}
          </h3>

          {/* Holographic scan line effect */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div
              className={`absolute top-0 left-0 w-full h-[1px] ${styling.borderColor} opacity-60`}
              style={{
                animation: isHovered ? 'scan-line 2s linear infinite' : 'none',
              }}
            />
            {/* Subtle holographic shimmer */}
            <div
              className="absolute inset-0 opacity-20"
              style={{
                background: `linear-gradient(45deg, transparent 30%, rgba(var(--mg-primary), 0.1) 50%, transparent 70%)`,
                animation: isHovered ? 'holo-shine 3s ease-in-out infinite' : 'none',
              }}
            />
          </div>

          {/* Level indicator with glow */}
          <div className="absolute top-2 left-2">
            <div
              className={`w-1.5 h-1.5 rounded-full ${styling.borderColor} opacity-70`}
              style={{
                boxShadow: isHovered ? `0 0 6px rgba(var(--mg-primary), 0.6)` : 'none',
              }}
            ></div>
          </div>
        </div>

        {/* Back of card */}
        <div
          className={`absolute inset-0 w-full h-full mg-panel ${styling.border} ${styling.accent} rounded-sm flex flex-col justify-center items-center text-center p-4 transition-all duration-300 ${
            isHovered ? styling.glow : ''
          }`}
          style={{
            backfaceVisibility: 'hidden',
            transform: 'rotateY(180deg) translateZ(0)',
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
          }}
        >
          {/* Enhanced corner decorations - all four corners */}
          <div className="absolute top-1 left-1 w-3 h-3">
            <div
              className={`absolute top-0 left-0 w-[1px] h-2 ${styling.borderColor} opacity-80`}
            ></div>
            <div
              className={`absolute top-0 left-0 w-2 h-[1px] ${styling.borderColor} opacity-80`}
            ></div>
          </div>
          <div className="absolute top-1 right-1 w-3 h-3">
            <div
              className={`absolute top-0 right-0 w-[1px] h-2 ${styling.borderColor} opacity-80`}
            ></div>
            <div
              className={`absolute top-0 right-0 w-2 h-[1px] ${styling.borderColor} opacity-80`}
            ></div>
          </div>
          <div className="absolute bottom-1 left-1 w-3 h-3">
            <div
              className={`absolute bottom-0 left-0 w-[1px] h-2 ${styling.borderColor} opacity-80`}
            ></div>
            <div
              className={`absolute bottom-0 left-0 w-2 h-[1px] ${styling.borderColor} opacity-80`}
            ></div>
          </div>
          <div className="absolute bottom-1 right-1 w-3 h-3">
            <div
              className={`absolute bottom-0 right-0 w-[1px] h-2 ${styling.borderColor} opacity-80`}
            ></div>
            <div
              className={`absolute bottom-0 right-0 w-2 h-[1px] ${styling.borderColor} opacity-80`}
            ></div>
          </div>

          <div className="space-y-1">
            {loreName && <p className="mg-subtitle text-xs opacity-80">{loreName}</p>}
            {handle && <p className="mg-text text-xs opacity-70">@{handle}</p>}
            {!loreName && !handle && (
              <p className="mg-text text-xs opacity-60">[Additional Info]</p>
            )}
          </div>

          {/* Holographic scan line effect */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div
              className={`absolute top-0 left-0 w-full h-[1px] ${styling.borderColor} opacity-60`}
              style={{
                animation: isHovered ? 'scan-line 2s linear infinite' : 'none',
              }}
            />
            {/* Subtle holographic shimmer */}
            <div
              className="absolute inset-0 opacity-20"
              style={{
                background: `linear-gradient(45deg, transparent 30%, rgba(var(--mg-primary), 0.1) 50%, transparent 70%)`,
                animation: isHovered ? 'holo-shine 3s ease-in-out infinite' : 'none',
              }}
            />
          </div>

          {/* Level indicator with glow */}
          <div className="absolute top-2 left-2">
            <div
              className={`w-1.5 h-1.5 rounded-full ${styling.borderColor} opacity-70`}
              style={{
                boxShadow: isHovered ? `0 0 6px rgba(var(--mg-primary), 0.6)` : 'none',
              }}
            ></div>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

// Main OrgChart component
const OrgChart: React.FC<OrgChartProps> = ({
  tree,
  className = '',
  extraConnections = [],
  headerResolver,
  peerWithParentIds = [],
  nodeOffsets = {},
  isolateRowIds = [],
  anchorXToId = {},
}) => {
  // State for managing flipped cards
  const [flippedNodes, setFlippedNodes] = useState<Record<string, boolean>>({});

  // Unique id for the SVG arrowhead marker (avoids collisions when multiple charts render)
  const markerId = useId();

  // Refs for SVG connector calculations
  const containerRef = useRef<HTMLDivElement | null>(null);
  const nodeRefs = useRef<Record<string, HTMLDivElement | null>>({});

  // SVG state for connectors
  const [paths, setPaths] = useState<Array<{ id: string; d: string; hasArrow?: boolean }>>([]);
  const [svgSize, setSvgSize] = useState<{ width: number; height: number }>({
    width: 0,
    height: 0,
  });

  // Dynamic offsets computed to anchor nodes horizontally to other nodes
  const [computedOffsets, setComputedOffsets] = useState<Record<string, { x: number; y: number }>>(
    {}
  );

  // Handle card flip
  const handleFlip = (nodeId: string) => {
    setFlippedNodes((prev) => ({ ...prev, [nodeId]: !prev[nodeId] }));
  };

  // Extract all levels from tree data
  const extractAllLevels = (treeData: ChartNodeData): ChartNodeData[][] => {
    const levels: ChartNodeData[][] = [];

    // Level 0: Root node (CEO/Director)
    levels.push([treeData]);

    // Recursively extract subsequent levels
    const extractLevel = (nodes: ChartNodeData[], currentLevel: number): void => {
      const nextLevelNodes: ChartNodeData[] = [];

      nodes.forEach((node) => {
        if (node.children && node.children.length > 0) {
          nextLevelNodes.push(...node.children);
        }
      });

      if (nextLevelNodes.length > 0) {
        levels[currentLevel + 1] = nextLevelNodes;
        extractLevel(nextLevelNodes, currentLevel + 1);
      }
    };

    extractLevel([treeData], 0);
    return levels;
  };

  // Determine row layout based on number of items
  const getRowLayout = (count: number): string => {
    if (count === 1) return 'flex justify-center items-center flex-1 pt-8';
    if (count <= 4) return 'flex justify-center items-center gap-8 flex-1 pt-8';
    return 'grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6 flex-1 pt-8';
  };

  // Group consecutive levels that share the same header label into a single container
  const buildGroups = (): Array<{
    label: string;
    levels: ChartNodeData[][];
    indices: number[];
  }> => {
    const groups: Array<{ label: string; levels: ChartNodeData[][]; indices: number[] }> = [];
    if (allLevels.length === 0) return groups;
    let currentLabel = getHeaderForLevel(0);
    let currentLevels: ChartNodeData[][] = [allLevels[0]];
    let currentIndices: number[] = [0];
    for (let i = 1; i < allLevels.length; i++) {
      const label = getHeaderForLevel(i);
      if (label === currentLabel) {
        currentLevels.push(allLevels[i]);
        currentIndices.push(i);
      } else {
        groups.push({ label: currentLabel, levels: currentLevels, indices: currentIndices });
        currentLabel = label;
        currentLevels = [allLevels[i]];
        currentIndices = [i];
      }
    }
    groups.push({ label: currentLabel, levels: currentLevels, indices: currentIndices });
    // Split rows so isolated nodes appear on their own row within the same container
    if (isolateRowIds.length > 0) {
      const iso = new Set(isolateRowIds);
      groups.forEach((group) => {
        const newLevels: ChartNodeData[][] = [];
        group.levels.forEach((row) => {
          const isolated = row.filter((n) => iso.has(n.id));
          const others = row.filter((n) => !iso.has(n.id));
          if (isolated.length > 0) {
            // Place the isolated row before the remaining items to keep it closer to the parent
            newLevels.push(isolated);
          }
          if (others.length > 0) {
            newLevels.push(others);
          }
        });
        group.levels = newLevels;
      });
    }

    return groups;
  };

  // Extract all levels dynamically
  const allLevels = useMemo(() => extractAllLevels(tree), [tree]);
  const recalcLockRef = useRef(false);
  const recalcConnectionsRef = useRef<() => void>();
  const recalcOffsetsRef = useRef<() => void>();

  // Header label resolver (was missing after refactor)
  const getHeaderForLevel = useCallback(
    (levelIndex: number): string => {
      if (headerResolver) return headerResolver(levelIndex);
      const levelNodes = allLevels[levelIndex];
      if (!levelNodes || levelNodes.length === 0) return `LEVEL ${levelIndex + 1}`;
      const nodeLevel = levelNodes[0].level;
      switch (nodeLevel) {
        case 'executive':
          return 'EXECUTIVE LEADERSHIP';
        case 'board':
          return 'BOARD OF DIRECTORS';
        case 'director':
          return 'DIRECTORS';
        case 'manager':
          return 'MANAGEMENT';
        case 'staff':
          return 'STAFF';
        default:
          return `LEVEL ${levelIndex + 1}`;
      }
    },
    [allLevels, headerResolver]
  );

  // Build tree map from ChartNodeData structure
  const buildTreeMap = useCallback((node: ChartNodeData): Record<string, string[]> => {
    const treeMap: Record<string, string[]> = {};

    const traverse = (currentNode: ChartNodeData) => {
      // Initialize this node's children array
      treeMap[currentNode.id] = currentNode.children.map((child) => child.id);

      // Recursively process children
      currentNode.children.forEach((child) => {
        traverse(child);
      });
    };

    traverse(node);
    return treeMap;
  }, []);

  // Compute horizontal anchor offsets so specified nodes align with their targets' center X.
  // Stored in a ref (see below) so it can be re-run from the same resize/scroll/settle path
  // as recalcConnections, keeping anchored nodes aligned when the container resizes.
  const recalcOffsets = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;
    const containerRect = container.getBoundingClientRect();
    const newOffsets: Record<string, { x: number; y: number }> = {};
    const TOLERANCE = 1; // px threshold to avoid jitter
    Object.entries(anchorXToId).forEach(([sourceId, targetId]) => {
      const srcEl = nodeRefs.current[sourceId];
      const tgtEl = nodeRefs.current[targetId];
      if (!srcEl || !tgtEl) return;
      const srcRect = srcEl.getBoundingClientRect();
      const tgtRect = tgtEl.getBoundingClientRect();
      const srcCenterX = srcRect.left - containerRect.left + srcRect.width / 2;
      const tgtCenterX = tgtRect.left - containerRect.left + tgtRect.width / 2;
      const deltaX = tgtCenterX - srcCenterX;
      const baseX = nodeOffsets[sourceId]?.x || 0;
      const baseY = nodeOffsets[sourceId]?.y || 0;
      // Round to integer to stabilize layout
      const desiredX = Math.round(baseX + deltaX);
      newOffsets[sourceId] = { x: desiredX, y: baseY };
    });
    setComputedOffsets((prev) => {
      let changed = false;
      const merged = { ...prev };
      Object.entries(newOffsets).forEach(([sourceId, off]) => {
        const prevOff = prev[sourceId];
        if (!prevOff || Math.abs(prevOff.x - off.x) > TOLERANCE) {
          merged[sourceId] = off;
          changed = true;
        }
      });
      if (!changed) return prev;
      // No immediate svg resize unless size truly changes; defer minimal
      requestAnimationFrame(() => {
        const rect = container.getBoundingClientRect();
        setSvgSize((p) =>
          p.width === Math.ceil(rect.width) && p.height === Math.ceil(container.scrollHeight)
            ? p
            : { width: Math.ceil(rect.width), height: Math.ceil(container.scrollHeight) }
        );
      });
      return merged;
    });
  }, [anchorXToId, nodeOffsets]); // eslint-disable-line react-hooks/exhaustive-deps

  // Keep a stable reference so the resize/scroll/settle path can call the latest version
  useEffect(() => {
    recalcOffsetsRef.current = recalcOffsets;
  }, [recalcOffsets]);

  // Recompute anchor offsets when the inputs or tree change
  useEffect(() => {
    recalcOffsets();
  }, [recalcOffsets, tree]);

  // Calculate SVG connectors with clean parent-child connections only
  const recalcConnections = useCallback(() => {
    if (recalcLockRef.current) return; // prevent re-entrant calls within same frame
    recalcLockRef.current = true;
    const container = containerRef.current;
    if (!container) {
      recalcLockRef.current = false;
      return;
    }

    const containerRect = container.getBoundingClientRect();
    setSvgSize((prev) =>
      prev.width === Math.ceil(containerRect.width) &&
      prev.height === Math.ceil(container.scrollHeight)
        ? prev
        : { width: Math.ceil(containerRect.width), height: Math.ceil(container.scrollHeight) }
    );

    // Helper functions to get element positions
    const getBottomCenter = (el: HTMLElement) => {
      const r = el.getBoundingClientRect();
      return {
        x: r.left - containerRect.left + r.width / 2,
        y: r.bottom - containerRect.top,
      };
    };

    const getTopCenter = (el: HTMLElement) => {
      const r = el.getBoundingClientRect();
      return {
        x: r.left - containerRect.left + r.width / 2,
        y: r.top - containerRect.top,
      };
    };

    // Compute the halfway Y between the parent container bottom and child container top
    const getMidYBetweenContainers = (
      parentEl: HTMLElement,
      childEl: HTMLElement,
      parentPosY: number,
      childPosY: number
    ) => {
      const parentContainer = parentEl.closest('.relative.border') as HTMLElement | null;
      const childContainer = childEl.closest('.relative.border') as HTMLElement | null;
      if (parentContainer && childContainer) {
        const pRect = parentContainer.getBoundingClientRect();
        const cRect = childContainer.getBoundingClientRect();
        const parentBottom = pRect.bottom - containerRect.top;
        const childTop = cRect.top - containerRect.top;
        // If the containers are different, bend at the halfway point between them
        if (pRect.top !== cRect.top || pRect.bottom !== cRect.bottom) {
          return parentBottom + (childTop - parentBottom) / 2;
        }
      }
      // Fallback: halfway between the two points
      return parentPosY + (childPosY - parentPosY) / 2;
    };

    // Build dynamic tree map from the data structure
    const treeMap = buildTreeMap(tree);

    const newPaths: Array<{ id: string; d: string; hasArrow?: boolean }> = [];

    // Create connections with branching inside target containers or grouped containers
    Object.entries(treeMap).forEach(([parentId, childIds]) => {
      if (childIds.length === 0) return;

      const parentEl = nodeRefs.current[parentId] as HTMLElement | null;
      if (!parentEl) return;

      const parentPos = getBottomCenter(parentEl);

      const peerSet = new Set(peerWithParentIds);
      const isolateSet = new Set(isolateRowIds);
      const peerChildren = childIds.filter((id) => peerSet.has(id));
      const isolateChildren = childIds.filter((id) => isolateSet.has(id));
      const branchChildren = childIds.filter((id) => !peerSet.has(id) && !isolateSet.has(id));

      if (branchChildren.length + peerChildren.length + isolateChildren.length === 1) {
        // Single child - direct connection
        const onlyChildId = childIds[0];
        const childEl = nodeRefs.current[onlyChildId] as HTMLElement | null;
        if (!childEl) return;

        const childPos = getTopCenter(childEl);

        if (Math.abs(parentPos.x - childPos.x) < 5) {
          const d = `M ${parentPos.x} ${parentPos.y} L ${childPos.x} ${childPos.y}`;
          newPaths.push({ id: `${parentId}-${onlyChildId}`, d, hasArrow: true });
        } else {
          const midY = getMidYBetweenContainers(parentEl, childEl, parentPos.y, childPos.y);
          const d = `M ${parentPos.x} ${parentPos.y} L ${parentPos.x} ${midY} L ${childPos.x} ${midY} L ${childPos.x} ${childPos.y}`;
          newPaths.push({ id: `${parentId}-${onlyChildId}`, d, hasArrow: true });
        }
      } else {
        // Direct connections for peers (same-row children)
        peerChildren.forEach((childId) => {
          const childEl = nodeRefs.current[childId] as HTMLElement | null;
          if (!childEl) return;
          const childPos = getTopCenter(childEl);
          if (Math.abs(parentPos.x - childPos.x) < 5) {
            const d = `M ${parentPos.x} ${parentPos.y} L ${childPos.x} ${childPos.y}`;
            newPaths.push({ id: `${parentId}-${childId}`, d, hasArrow: true });
          } else {
            const midY = getMidYBetweenContainers(parentEl, childEl, parentPos.y, childPos.y);
            const d = `M ${parentPos.x} ${parentPos.y} L ${parentPos.x} ${midY} L ${childPos.x} ${midY} L ${childPos.x} ${childPos.y}`;
            newPaths.push({ id: `${parentId}-${childId}`, d, hasArrow: true });
          }
        });

        // Direct connections for isolated children (own row, e.g., Assistant Director)
        isolateChildren.forEach((childId) => {
          const childEl = nodeRefs.current[childId] as HTMLElement | null;
          if (!childEl) return;
          const childPos = getTopCenter(childEl);
          if (Math.abs(parentPos.x - childPos.x) < 5) {
            const d = `M ${parentPos.x} ${parentPos.y} L ${childPos.x} ${childPos.y}`;
            newPaths.push({ id: `${parentId}-${childId}`, d, hasArrow: true });
          } else {
            const midY = getMidYBetweenContainers(parentEl, childEl, parentPos.y, childPos.y);
            const d = `M ${parentPos.x} ${parentPos.y} L ${parentPos.x} ${midY} L ${childPos.x} ${midY} L ${childPos.x} ${childPos.y}`;
            newPaths.push({ id: `${parentId}-${childId}`, d, hasArrow: true });
          }
        });

        // Branching to non-peer, non-isolated children only
        const childPositions = branchChildren
          .map((childId) => {
            const childEl = nodeRefs.current[childId] as HTMLElement | null;
            if (!childEl) return null;
            return { id: childId, pos: getTopCenter(childEl) };
          })
          .filter(Boolean) as Array<{ id: string; pos: { x: number; y: number } }>;

        if (childPositions.length === 0) return;
        const leftmostX = Math.min(...childPositions.map((cp) => cp.pos.x));
        const rightmostX = Math.max(...childPositions.map((cp) => cp.pos.x));
        // Center X of the child container (not the average of children)
        const firstChildEl = nodeRefs.current[
          branchChildren[0] || childIds[0]
        ] as HTMLElement | null;
        const targetContainer = firstChildEl
          ? (firstChildEl.closest('.relative.border') as HTMLElement | null)
          : null;
        const containerCenterX = targetContainer
          ? targetContainer.getBoundingClientRect().left -
            containerRect.left +
            targetContainer.getBoundingClientRect().width / 2
          : (leftmostX + rightmostX) / 2;

        // Determine branch Y midpoint between isolated row and first normal row if both exist
        const isoPositions = isolateChildren
          .map((id) => {
            const el = nodeRefs.current[id] as HTMLElement | null;
            return el ? getTopCenter(el) : null;
          })
          .filter(Boolean) as Array<{ x: number; y: number }>;
        const normalPositions = childPositions.map((cp) => cp.pos);

        let branchY: number;
        if (isoPositions.length > 0 && normalPositions.length > 0) {
          const isoBottoms = isolateChildren
            .map((id) => {
              const el = nodeRefs.current[id] as HTMLElement | null;
              return el ? getBottomCenter(el) : null;
            })
            .filter(Boolean) as Array<{ x: number; y: number }>;
          const isoBottomY = Math.max(...isoBottoms.map((p) => p.y));
          const normalMinY = Math.min(...normalPositions.map((p) => p.y));
          branchY = isoBottomY + (normalMinY - isoBottomY) / 2;
        } else {
          // Fallback: place branch halfway between the target container's top and the top of its child tiles
          const minChildY = Math.min(...childPositions.map((cp) => cp.pos.y));
          if (targetContainer) {
            const targetRect = targetContainer.getBoundingClientRect();
            const containerTop = targetRect.top - containerRect.top;
            branchY = containerTop + (minChildY - containerTop) / 2;
          } else {
            branchY = parentPos.y + (minChildY - parentPos.y) / 2;
          }
        }

        // Trunk from parent to child container top-center, with a bend at halfway between containers
        let trunkPath: string;
        const midYBetweenContainers = (() => {
          if (targetContainer) {
            const parentContainer = (nodeRefs.current[parentId] as HTMLElement | null)?.closest(
              '.relative.border'
            ) as HTMLElement | null;
            const pBottom = parentContainer
              ? parentContainer.getBoundingClientRect().bottom - containerRect.top
              : parentPos.y;
            const cTop = targetContainer.getBoundingClientRect().top - containerRect.top;
            return pBottom + (cTop - pBottom) / 2;
          }
          return parentPos.y + (branchY - parentPos.y) / 2;
        })();

        trunkPath = `M ${parentPos.x} ${parentPos.y} L ${parentPos.x} ${midYBetweenContainers} L ${containerCenterX} ${midYBetweenContainers} L ${containerCenterX} ${branchY}`;
        newPaths.push({ id: `${parentId}-trunk`, d: trunkPath, hasArrow: false });

        // Distribution line across all normal children
        const distributionPath = `M ${leftmostX} ${branchY} L ${rightmostX} ${branchY}`;
        newPaths.push({ id: `${parentId}-distribution`, d: distributionPath, hasArrow: false });

        // Individual lines from distribution to each normal child
        childPositions.forEach(({ id: childId, pos: childPos }) => {
          const childPath = `M ${childPos.x} ${branchY} L ${childPos.x} ${childPos.y}`;
          newPaths.push({ id: `${parentId}-${childId}`, d: childPath, hasArrow: true });
        });
      }
    });

    // Add extra connections (multi-parent / cross-level links)
    if (extraConnections && extraConnections.length > 0) {
      extraConnections.forEach(({ from, to }) => {
        const fromEl = nodeRefs.current[from] as HTMLElement | null;
        const toEl = nodeRefs.current[to] as HTMLElement | null;
        if (!fromEl || !toEl) return;

        const fromPos = getBottomCenter(fromEl);
        const toPos = getTopCenter(toEl);

        let d: string;
        if (Math.abs(fromPos.x - toPos.x) < 5) {
          d = `M ${fromPos.x} ${fromPos.y} L ${toPos.x} ${toPos.y}`;
        } else {
          const midY = fromPos.y + (toPos.y - fromPos.y) / 2;
          d = `M ${fromPos.x} ${fromPos.y} L ${fromPos.x} ${midY} L ${toPos.x} ${midY} L ${toPos.x} ${toPos.y}`;
        }

        newPaths.push({ id: `extra-${from}-${to}`, d, hasArrow: true });
      });
    }

    setPaths((prev) => {
      if (
        prev.length === newPaths.length &&
        prev.every(
          (p, i) =>
            p.d === newPaths[i].d && p.hasArrow === newPaths[i].hasArrow && p.id === newPaths[i].id
        )
      ) {
        // release lock and exit without change
        requestAnimationFrame(() => {
          recalcLockRef.current = false;
        });
        return prev; // no changes
      }
      requestAnimationFrame(() => {
        recalcLockRef.current = false;
      });
      return newPaths;
    });
  }, [tree, extraConnections, peerWithParentIds, isolateRowIds]); // eslint-disable-line react-hooks/exhaustive-deps

  // Keep a stable reference for effects - but only update when dependencies actually change
  useEffect(() => {
    recalcConnectionsRef.current = recalcConnections;
  }, [recalcConnections]);

  // Effect to handle resizing and recalculation with proper cleanup
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Settle delays for multiple recalculations
    const settleDelays = [50, 250, 600];

    // Use ref to get current functions without dependency.
    // Recompute anchor offsets first so connectors are drawn against the updated positions.
    const recalc = () => {
      recalcOffsetsRef.current?.();
      recalcConnectionsRef.current?.();
    };

    // Initial calculation
    recalc();

    // Set up resize observer for container
    const resizeObserver = new ResizeObserver(() => recalc());
    resizeObserver.observe(container);

    // Window resize handler
    const handleResize = () => recalc();
    window.addEventListener('resize', handleResize);

    // Scroll handler for recalculation
    const handleScroll = () => recalc();
    window.addEventListener('scroll', handleScroll, { passive: true });

    // RAF for immediate calculation
    const rafId = requestAnimationFrame(() => recalc());

    // Settle timers for stabilization
    const timers = settleDelays.map((ms) => setTimeout(() => recalc(), ms));

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('scroll', handleScroll);
      cancelAnimationFrame(rafId);
      timers.forEach(clearTimeout);
    };
  }, []); // Empty dependency array - use ref for stable access

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className={`space-y-12 ${className}`}
    >
      <div
        ref={containerRef}
        className="relative mg-panel bg-[rgba(var(--mg-panel-dark),0.45)] p-6 sm:p-8 rounded-lg overflow-hidden"
      >
        {/* Top accent line */}
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-[rgba(var(--mg-primary),0.4)] to-transparent"></div>

        {/* SVG overlay for connectors with arrows */}
        <svg
          className="absolute top-0 left-0 pointer-events-none z-0"
          width={svgSize.width}
          height={svgSize.height}
          style={{ overflow: 'visible' }}
        >
          {/* Arrow marker definitions */}
          <defs>
            <marker
              id={markerId}
              markerWidth="10"
              markerHeight="7"
              refX="9"
              refY="3.5"
              orient="auto"
            >
              <polygon
                points="0 0, 10 3.5, 0 7"
                fill="rgba(var(--mg-primary), 0.6)"
                stroke="rgba(var(--mg-primary), 0.6)"
                strokeWidth="1"
              />
            </marker>
          </defs>

          {paths.map((path) => (
            <path
              key={path.id}
              d={path.d}
              stroke="rgba(var(--mg-primary), 0.6)"
              strokeWidth="2"
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
              markerEnd={path.hasArrow ? `url(#${markerId})` : 'none'}
              style={{ transition: 'none', animation: 'none' }}
            />
          ))}
        </svg>

        {/* Render the org chart grouped by header label, expanding containers vertically when labels repeat */}
        <div className="w-full max-w-6xl mx-auto px-8">
          {buildGroups().map((group, gi) => (
            <div key={gi} className="w-full mt-12">
              <div className="relative border border-primary/10 bg-primary/3 rounded-lg p-12 flex flex-col">
                {/* Attached Header */}
                <div className="absolute -top-3 left-6 bg-mg-dark px-3">
                  <span className="text-primary text-xs font-medium tracking-wider opacity-70">
                    {group.label}
                  </span>
                </div>
                {/* Rows inside this group */}
                <div className="flex flex-col space-y-10">
                  {group.levels.map((levelData, rowIdx) => (
                    <div key={`${gi}-${rowIdx}`} className={getRowLayout(levelData.length)}>
                      {levelData.map((node) => (
                        <div key={node.id} className="flex flex-col items-center">
                          <div
                            className="w-56 z-10 flex-shrink-0"
                            ref={(el) => {
                              nodeRefs.current[node.id] = el;
                            }}
                            style={{
                              transform: `translate(${(nodeOffsets[node.id]?.x || 0) + (computedOffsets[node.id]?.x || 0)}px, ${(nodeOffsets[node.id]?.y || 0) + (computedOffsets[node.id]?.y || 0)}px)`,
                            }}
                          >
                            {(() => {
                              return (
                                <PersonCard
                                  title={node.front.title}
                                  loreName={node.back.loreName}
                                  handle={node.back.handle}
                                  level={node.level as any}
                                  onFlip={() => handleFlip(node.id)}
                                  isFlipped={flippedNodes[node.id]}
                                />
                              );
                            })()}
                          </div>
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </motion.div>
  );
};

export default OrgChart;
