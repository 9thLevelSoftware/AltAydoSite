'use client';

import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { MissionTemplateResponse } from '@/types/MissionTemplate';
import { HolographicBorder, CornerAccents, MobiGlasButton, MobiGlasPanel } from '../ui/mobiglas';

// Icons
const EditIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
  </svg>
);

const TrashIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
  </svg>
);

const ArrowRightIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
  </svg>
);

const TemplateIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
  </svg>
);

const ShipIcon = () => (
  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    {/* Pointed nose cone */}
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 2L9 6L15 6L12 2Z" />
    {/* Left side of rocket body - widens from nose to mid-body, then tapers */}
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 6Q8 9 8 10T9 14" />
    {/* Right side of rocket body - widens from nose to mid-body, then tapers */}
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 6Q16 9 16 10T15 14" />
    {/* Left fin */}
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14L7 18L9 14L12 14Z" />
    {/* Right fin */}
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14L17 18L15 14L12 14Z" />
    {/* Exhaust flames */}
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 18L10 21M12 18L12 22M14 18L14 21" />
  </svg>
);

const PersonIcon = () => (
  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
  </svg>
);

interface TemplateStripProps {
  template: MissionTemplateResponse;
  isExpanded: boolean;
  onToggleExpand: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onUseForMission: () => void;
}

/**
 * Calculate total resource counts from template rosters
 */
const calculateResourceCounts = (template: MissionTemplateResponse) => {
  const shipCount = template.shipRoster.reduce((sum, ship) => sum + ship.count, 0);
  const personnelCount = template.personnelRoster.reduce((sum, person) => sum + person.count, 0);
  return { shipCount, personnelCount };
};

/**
 * TemplateStrip - Expandable template card for mission template list
 * Displays collapsed summary, expands to show full details inline
 */
const TemplateStrip: React.FC<TemplateStripProps> = ({
  template,
  isExpanded,
  onToggleExpand,
  onEdit,
  onDelete,
  onUseForMission
}) => {
  const { shipCount, personnelCount } = calculateResourceCounts(template);
  
  return (
    <HolographicBorder isActive={isExpanded} intensity={isExpanded ? 'high' : 'medium'}>
      <motion.div
        initial={false}
        animate={{
          height: isExpanded ? 'auto' : '100px'
        }}
        transition={{ duration: 0.3, ease: 'easeInOut' }}
        className="overflow-hidden bg-gradient-to-br from-[rgba(var(--mg-panel-dark),0.6)] to-[rgba(var(--mg-panel-dark),0.3)] rounded-lg relative"
      >
        {/* Header - Always Visible (Clickable to expand/collapse) */}
        <div
          role="button"
          tabIndex={0}
          onClick={onToggleExpand}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              onToggleExpand();
            }
          }}
          aria-expanded={isExpanded}
          aria-label={`${isExpanded ? 'Collapse' : 'Expand'} ${template.name} template details`}
          className="group h-[100px] px-6 py-4 cursor-pointer hover:bg-[rgba(var(--mg-primary),0.05)] transition-colors relative focus:outline-none focus:ring-2 focus:ring-[rgba(var(--mg-primary),0.5)] focus:ring-inset"
        >
          {/* Circuit pattern overlay */}
          <div className="circuit-bg absolute inset-0 rounded-lg pointer-events-none opacity-30 group-hover:opacity-40 transition-opacity duration-300"></div>

          {/* Animated grid overlay */}
          <div className="absolute inset-0 rounded-lg pointer-events-none overflow-hidden opacity-10">
            <div className="absolute inset-0" style={{
              backgroundImage: 'linear-gradient(rgba(var(--mg-primary), 0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(var(--mg-primary), 0.3) 1px, transparent 1px)',
              backgroundSize: '20px 20px'
            }}></div>
          </div>

          <div className="relative z-10 flex items-center justify-between h-full">
            {/* Left: Icon + Name */}
            <div className="flex items-center space-x-4 flex-1">
              <div className="text-[rgba(var(--mg-primary),0.9)] drop-shadow-[0_0_8px_rgba(var(--mg-primary),0.6)] group-hover:drop-shadow-[0_0_12px_rgba(var(--mg-primary),0.8)] transition-all">
                <TemplateIcon />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-lg font-semibold text-[rgba(var(--mg-primary),0.9)] mb-1 truncate" title={template.name}>
                  {template.name}
                </h3>
                <div className="text-sm text-[rgba(var(--mg-text),0.6)]">
                  {template.operationType}
                </div>
              </div>
            </div>

            {/* Center: Primary Activity Badge */}
            <div className="hidden md:flex items-center space-x-3">
              <div className="relative px-3 py-1 rounded bg-[rgba(var(--mg-primary),0.2)] border border-[rgba(var(--mg-primary),0.4)] shadow-[0_0_15px_rgba(var(--mg-primary),0.3)]">
                <span className="text-sm text-[rgba(var(--mg-primary),0.9)] font-medium">
                  {template.primaryActivity}
                </span>
                {/* Subtle pulse effect */}
                <div className="absolute inset-0 rounded border border-[rgba(var(--mg-primary),0.6)] animate-pulse opacity-50"></div>
              </div>
            </div>

            {/* Right: Resources + Actions */}
            <div className="flex items-center space-x-4">
              {/* Resource Summary */}
              {(shipCount > 0 || personnelCount > 0) && (
                <div className="flex flex-col gap-1 text-xs text-[rgba(var(--mg-text),0.7)] min-w-[80px]">
                  {shipCount > 0 && (
                    <div className="flex items-center gap-1.5">
                      <div className="text-[rgba(var(--mg-primary),0.8)]">
                        <ShipIcon />
                      </div>
                      <span>×{shipCount}</span>
                    </div>
                  )}
                  {personnelCount > 0 && (
                    <div className="flex items-center gap-1.5">
                      <div className="text-[rgba(var(--mg-primary),0.8)]">
                        <PersonIcon />
                      </div>
                      <span>×{personnelCount}</span>
                    </div>
                  )}
                </div>
              )}
              {(shipCount === 0 && personnelCount === 0) && (
                <div className="text-xs text-[rgba(var(--mg-text),0.5)] italic min-w-[80px]">
                  No resources
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex space-x-1" onClick={(e) => e.stopPropagation()}>
                <MobiGlasButton
                  onClick={onEdit}
                  variant="ghost"
                  size="sm"
                  aria-label={`Edit ${template.name}`}
                >
                  <EditIcon />
                </MobiGlasButton>
                <MobiGlasButton
                  onClick={onDelete}
                  variant="ghost"
                  size="sm"
                  className="text-[rgba(var(--mg-danger),0.8)] hover:text-[rgba(var(--mg-danger),1)] hover:bg-[rgba(var(--mg-danger),0.2)]"
                  aria-label={`Delete ${template.name}`}
                >
                  <TrashIcon />
                </MobiGlasButton>
                {!isExpanded && (
                  <MobiGlasButton
                    onClick={onUseForMission}
                    variant="ghost"
                    size="sm"
                    className="text-[rgba(var(--mg-success),0.8)] hover:text-[rgba(var(--mg-success),1)] hover:bg-[rgba(var(--mg-success),0.2)]"
                    aria-label={`Use ${template.name} for new mission`}
                  >
                    <ArrowRightIcon />
                  </MobiGlasButton>
                )}
              </div>
            </div>
          </div>

          {/* Corner accents */}
          <CornerAccents variant="animated" color="primary" size="sm" />
        </div>

        {/* Expanded Content */}
        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.2, delay: 0.1 }}
              className="px-6 pb-6 space-y-4"
            >
              {/* Divider */}
              <div className="border-t border-[rgba(var(--mg-primary),0.2)]"></div>

              {/* Operation Details */}
              <div className="p-4 rounded border border-[rgba(var(--mg-primary),0.2)] bg-[rgba(var(--mg-panel-dark),0.4)]">
                <h4 className="text-sm font-semibold text-[rgba(var(--mg-primary),0.9)] mb-3 uppercase tracking-wide">
                  Operation Details
                </h4>
                <div className="space-y-2 text-sm">
                  <div>
                    <span className="text-[rgba(var(--mg-text),0.6)]">Type:</span>
                    <span className="ml-2 text-[rgba(var(--mg-text),0.9)]">{template.operationType}</span>
                  </div>
                  <div>
                    <span className="text-[rgba(var(--mg-text),0.6)]">Activities:</span>
                    <span className="ml-2 text-[rgba(var(--mg-text),0.9)]">
                      {template.primaryActivity} (Primary)
                      {template.secondaryActivity && `, ${template.secondaryActivity} (Secondary)`}
                      {template.tertiaryActivity && `, ${template.tertiaryActivity} (Tertiary)`}
                    </span>
                  </div>
                </div>
              </div>

              {/* Secondary/Tertiary Activity Badges */}
              {(template.secondaryActivity || template.tertiaryActivity) && (
                <div className="mt-4 p-3 rounded border border-[rgba(var(--mg-primary),0.15)] bg-[rgba(var(--mg-panel-dark),0.3)]">
                  <h5 className="text-xs font-semibold text-[rgba(var(--mg-text),0.6)] mb-2 uppercase tracking-wide">
                    Additional Activities
                  </h5>
                  <div className="flex flex-wrap gap-2">
                    {template.secondaryActivity && (
                      <div className="px-2 py-1 rounded bg-[rgba(var(--mg-primary),0.15)] border border-[rgba(var(--mg-primary),0.3)] shadow-[0_0_10px_rgba(var(--mg-primary),0.2)]">
                        <span className="text-xs text-[rgba(var(--mg-primary),0.8)] font-medium">
                          {template.secondaryActivity}
                        </span>
                      </div>
                    )}
                    {template.tertiaryActivity && (
                      <div className="px-2 py-1 rounded bg-[rgba(var(--mg-primary),0.15)] border border-[rgba(var(--mg-primary),0.3)] shadow-[0_0_10px_rgba(var(--mg-primary),0.2)]">
                        <span className="text-xs text-[rgba(var(--mg-primary),0.8)] font-medium">
                          {template.tertiaryActivity}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Ship Roster */}
              {template.shipRoster.length > 0 && (
                <MobiGlasPanel
                  variant="transparent"
                  padding="sm"
                  withGridBg={true}
                  cornerAccents={false}
                >
                  <h4 className="text-sm font-semibold text-[rgba(var(--mg-primary),0.9)] mb-3 uppercase tracking-wide">
                    Ship Roster
                  </h4>
                  <ul className="space-y-2">
                    {template.shipRoster.map((ship, index) => (
                      <li key={index} className="text-sm text-[rgba(var(--mg-text),0.9)] flex items-center break-words">
                        <span className="w-1.5 h-1.5 rounded-full bg-[rgba(var(--mg-primary),0.6)] mr-3 flex-shrink-0"></span>
                        <span>{ship.size} {ship.category} x{ship.count}</span>
                      </li>
                    ))}
                  </ul>
                </MobiGlasPanel>
              )}

              {/* Personnel Roster */}
              {template.personnelRoster.length > 0 && (
                <MobiGlasPanel
                  variant="transparent"
                  padding="sm"
                  withGridBg={true}
                  cornerAccents={false}
                >
                  <h4 className="text-sm font-semibold text-[rgba(var(--mg-primary),0.9)] mb-3 uppercase tracking-wide">
                    Personnel Roster
                  </h4>
                  <ul className="space-y-2">
                    {template.personnelRoster.map((person, index) => (
                      <li key={index} className="text-sm text-[rgba(var(--mg-text),0.9)] flex items-center break-words">
                        <span className="w-1.5 h-1.5 rounded-full bg-[rgba(var(--mg-primary),0.6)] mr-3 flex-shrink-0"></span>
                        <span>{person.profession} x{person.count}</span>
                      </li>
                    ))}
                  </ul>
                </MobiGlasPanel>
              )}

              {/* Required Equipment */}
              {template.requiredEquipment && (
                <MobiGlasPanel
                  variant="transparent"
                  padding="sm"
                  withGridBg={true}
                  cornerAccents={false}
                >
                  <h4 className="text-sm font-semibold text-[rgba(var(--mg-primary),0.9)] mb-3 uppercase tracking-wide">
                    Required Equipment
                  </h4>
                  <p className="text-sm text-[rgba(var(--mg-text),0.9)] whitespace-pre-wrap">
                    {template.requiredEquipment}
                  </p>
                </MobiGlasPanel>
              )}

              {/* Use Template Button */}
              <div className="pt-2">
                <button
                  onClick={onUseForMission}
                  className="w-full py-4 px-6 rounded-lg bg-gradient-to-r from-[rgba(var(--mg-success),0.8)] to-[rgba(var(--mg-success),0.6)] hover:from-[rgba(var(--mg-success),0.9)] hover:to-[rgba(var(--mg-success),0.7)] text-white font-semibold text-lg transition-all duration-200 shadow-lg hover:shadow-[0_0_30px_rgba(var(--mg-success),0.5)] relative overflow-hidden group"
                >
                  <span className="relative z-10 flex items-center justify-center space-x-2">
                    <span>USE THIS TEMPLATE FOR NEW MISSION</span>
                    <ArrowRightIcon />
                  </span>
                  {/* Scanline effect on hover */}
                  <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity">
                    <div className="absolute inset-0 bg-gradient-to-b from-transparent via-white/10 to-transparent animate-scan-vertical"></div>
                  </div>
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </HolographicBorder>
  );
};

export default TemplateStrip;
