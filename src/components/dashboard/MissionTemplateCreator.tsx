'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useRouter } from 'next/navigation';
import MissionTemplateForm from './MissionTemplateForm';
import TemplateStrip from './TemplateStrip';
import { MobiGlasButton, MobiGlasPanel, CornerAccents, DataStreamBackground, StatusIndicator } from '../ui/mobiglas';
import {
  MissionTemplate,
  MissionTemplateResponse,
  MissionTemplateShip,
  MissionTemplatePersonnel,
  MissionTemplateValidationErrors,
  ActivityType
} from '@/types/MissionTemplate';


// Icons for the interface
const CreateIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
  </svg>
);

const TrashIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
  </svg>
);

const EditIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
  </svg>
);

const TemplateIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
  </svg>
);

interface MissionTemplateCreatorProps {
  userClearanceLevel: number;
  userId: string;
  userName: string;
}

type ViewMode = 'list' | 'create' | 'edit';

const MissionTemplateCreator: React.FC<MissionTemplateCreatorProps> = ({
  userClearanceLevel,
  userId,
  userName: _userName
}) => {
  // Access control
  const hasLeadershipAccess = userClearanceLevel >= 3;

  // Router for navigation
  const router = useRouter();

  // State management
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [templates, setTemplates] = useState<MissionTemplateResponse[]>([]);
  const [currentTemplate, setCurrentTemplate] = useState<MissionTemplate | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<MissionTemplateValidationErrors>({});
  const [notification, setNotification] = useState<{ type: 'success' | 'error', message: string } | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  const [expandedTemplateId, setExpandedTemplateId] = useState<string | null>(null);

  // Ref for scroll control
  const containerRef = useRef<HTMLDivElement>(null);

  // Helper: robust scroll-to-top (container + window/document)
  const scrollToTop = () => {
    try {
      containerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } catch {}
    try {
      if (typeof window !== 'undefined') {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    } catch {}
    try {
      (document?.documentElement as any)?.scrollTo?.({ top: 0, behavior: 'smooth' });
    } catch {}
    try {
      (document?.body as any)?.scrollTo?.({ top: 0, behavior: 'smooth' });
    } catch {}
  };

  // Form state
  const [formData, setFormData] = useState<Partial<MissionTemplate>>({
    name: '',
    operationType: 'Space Operations',
    primaryActivity: undefined,
    secondaryActivity: undefined,
    tertiaryActivity: undefined,
    shipRoster: [],
    personnelRoster: [],
    requiredEquipment: ''
  });

  // Constants
  const ACTIVITY_OPTIONS: ActivityType[] = ['Mining', 'Salvage', 'Escort', 'Transport', 'Medical', 'Combat'];

  // FIX malformed effects region
  // Load templates on component mount
  useEffect(() => {
    loadTemplates();
  }, []);

  // Clear notification after 5 seconds
  useEffect(() => {
    if (!notification) return;
    const timer = setTimeout(() => setNotification(null), 5000);
    return () => clearTimeout(timer);
  }, [notification]);

  // Scroll to top when returning to list view
  useEffect(() => {
    if (viewMode === 'list') {
      const timer = setTimeout(() => {
        scrollToTop();
      }, 200);
      return () => clearTimeout(timer);
    }
  }, [viewMode]);

  // Template loading function
  const loadTemplates = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/mission-templates');
      if (response.ok) {
        const data = await response.json();
        setTemplates(data.items || []);
      } else {
        console.error(`Failed to load templates: ${response.status}`);
        setNotification({ type: 'error', message: 'Failed to load mission templates' });
        return;
      }
    } catch (error) {
      console.error('Error loading templates:', error);
      setNotification({ type: 'error', message: 'Failed to load mission templates' });
    } finally {
      setIsLoading(false);
    }
  };

  // Handle template expansion (only one at a time)
  const handleToggleExpand = useCallback((templateId: string) => {
    setExpandedTemplateId(prev => prev === templateId ? null : templateId);
  }, []);

  // Handle use template for mission
  const handleUseForMission = useCallback((templateId: string) => {
    router.push(`/dashboard/mission-planner?templateId=${templateId}`);
  }, [router]);

  // Get available activities for dropdowns (excluding already selected)
  const getAvailableActivities = (excludeField?: 'primary' | 'secondary' | 'tertiary'): ActivityType[] => {
    const selected = [
      excludeField !== 'primary' ? formData.primaryActivity : null,
      excludeField !== 'secondary' ? formData.secondaryActivity : null,
      excludeField !== 'tertiary' ? formData.tertiaryActivity : null
    ].filter(Boolean) as ActivityType[];

    return ACTIVITY_OPTIONS.filter(activity => !selected.includes(activity));
  };

  // Form handlers
  const handleInputChange = (field: keyof MissionTemplate, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear related errors
    if (errors[field as keyof MissionTemplateValidationErrors]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  // Ship roster management
  const addShipEntry = () => {
    const newEntry: MissionTemplateShip = {
      size: 'Medium',
      category: 'Transport',
      count: 1
    };
    setFormData(prev => ({
      ...prev,
      shipRoster: [...(prev.shipRoster || []), newEntry]
    }));
  };

  const updateShipEntry = (index: number, field: keyof MissionTemplateShip, value: any) => {
    const updatedRoster = [...(formData.shipRoster || [])];
    updatedRoster[index] = { ...updatedRoster[index], [field]: value } as MissionTemplateShip;
    setFormData(prev => ({ ...prev, shipRoster: updatedRoster }));
  };

  const removeShipEntry = (index: number) => {
    const updatedRoster = [...(formData.shipRoster || [])];
    updatedRoster.splice(index, 1);
    setFormData(prev => ({ ...prev, shipRoster: updatedRoster }));
  };

  // Personnel roster management
  const addPersonnelEntry = () => {
    const newEntry: MissionTemplatePersonnel = {
      profession: 'Pilot',
      count: 1
    };
    setFormData(prev => ({
      ...prev,
      personnelRoster: [...(prev.personnelRoster || []), newEntry]
    }));
  };

  const updatePersonnelEntry = (index: number, field: keyof MissionTemplatePersonnel, value: any) => {
    const updatedRoster = [...(formData.personnelRoster || [])];
    updatedRoster[index] = { ...updatedRoster[index], [field]: value } as MissionTemplatePersonnel;
    setFormData(prev => ({ ...prev, personnelRoster: updatedRoster }));
  };

  const removePersonnelEntry = (index: number) => {
    const updatedRoster = [...(formData.personnelRoster || [])];
    updatedRoster.splice(index, 1);
    setFormData(prev => ({ ...prev, personnelRoster: updatedRoster }));
  };

  // Validation
  const validateForm = (): boolean => {
    const newErrors: MissionTemplateValidationErrors = {};

    if (!formData.name?.trim()) {
      newErrors.name = 'Template name is required';
    } else {
      // Check for duplicate name (exclude current template if editing)
      const isDuplicate = templates.some(template =>
        template.name.toLowerCase() === formData.name?.toLowerCase() &&
        template.id !== currentTemplate?.id
      );
      if (isDuplicate) {
        newErrors.name = 'A template with this name already exists';
      }
    }

    if (!formData.primaryActivity) {
      newErrors.primaryActivity = 'Primary activity is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // CRUD operations
  const handleSave = async () => {
    if (!validateForm()) return;

    setIsLoading(true);
    try {
      const templateData = {
        name: formData.name,
        operationType: formData.operationType,
        primaryActivity: formData.primaryActivity,
        secondaryActivity: formData.secondaryActivity || undefined,
        tertiaryActivity: formData.tertiaryActivity || undefined,
        shipRoster: formData.shipRoster || [],
        personnelRoster: formData.personnelRoster || [],
        requiredEquipment: formData.requiredEquipment || '',
        // include creator when creating new
        createdBy: currentTemplate ? undefined : userId
      } as any;

      let response: Response;
      let message: string;

      if (currentTemplate) {
        // Update existing template
        response = await fetch('/api/mission-templates', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...templateData, id: currentTemplate.id })
        });
        message = 'Template updated successfully';
      } else {
        // Create new template
        response = await fetch('/api/mission-templates', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(templateData)
        });
        message = 'Template created successfully';
      }

      if (response.ok) {
        setNotification({ type: 'success', message });
        await loadTemplates();
        resetForm();
        setExpandedTemplateId(null);
        setViewMode('list'); // useEffect will handle scrolling
      } else {
        const errorData = await response.json().catch(() => ({}));
        const msg = (errorData as any).error || 'Failed to save template';
        setNotification({ type: 'error', message: msg });
        return;
      }
    } catch (error) {
      console.error('Error saving template:', error);
      setNotification({
        type: 'error',
        message: error instanceof Error ? error.message : 'Failed to save template'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleEdit = (template: MissionTemplateResponse) => {
    setCurrentTemplate(template);
    setFormData(template);
    setViewMode('edit');
  };

  const handleDelete = async (templateId: string) => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/mission-templates?id=${templateId}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        setNotification({ type: 'success', message: 'Template deleted successfully' });
        await loadTemplates();
      } else {
        const errorData = await response.json().catch(() => ({}));
        const msg = (errorData as any).error || 'Failed to delete template';
        setNotification({ type: 'error', message: msg });
        return;
      }
    } catch (error) {
      console.error('Error deleting template:', error);
      setNotification({
        type: 'error',
        message: error instanceof Error ? error.message : 'Failed to delete template'
      });
    } finally {
      setIsLoading(false);
      setShowDeleteConfirm(null);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      operationType: 'Space Operations',
      primaryActivity: undefined,
      secondaryActivity: undefined,
      tertiaryActivity: undefined,
      shipRoster: [],
      personnelRoster: [],
      requiredEquipment: ''
    });
    setCurrentTemplate(null);
    setErrors({});
  };

  const handleCancel = () => {
    resetForm();
    setExpandedTemplateId(null);
    setViewMode('list'); // useEffect will handle scrolling
  };

  // Access control check
  if (!hasLeadershipAccess) {
    return (
      <div className="text-center py-16">
        <div className="text-[rgba(var(--mg-warning),0.8)] text-lg mb-4">
          RESTRICTED ACCESS
        </div>
        <div className="text-[rgba(var(--mg-text),0.6)]">
          Clearance Level 3 or higher required to access Mission Template Creator
        </div>
      </div>
    );
  }

  // Render list view
  if (viewMode === 'list') {
    return (
      <div ref={containerRef} className="relative min-h-screen">
        {/* Background Effects */}
        <DataStreamBackground opacity="low" speed="medium" />

        {/* Slim Header Bar - Sticky */}
        <div className="sticky top-0 z-20 backdrop-blur-lg bg-[rgba(var(--mg-panel-dark),0.85)] border-b border-[rgba(var(--mg-primary),0.2)]">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 py-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-0">
            {/* Left: Title + Description */}
            <div className="flex items-center space-x-3 sm:space-x-4 flex-1 min-w-0">
              <div className="text-[rgba(var(--mg-primary),0.8)] flex-shrink-0">
                <TemplateIcon />
              </div>
              <div className="flex-1 min-w-0">
                <h1 className="text-lg sm:text-xl font-bold text-[rgba(var(--mg-primary),0.9)] truncate">
                  Mission Template Creator
                </h1>
                <p className="text-xs sm:text-sm text-[rgba(var(--mg-text),0.6)] hidden sm:block">
                  Manage reusable mission templates for organization operations
                </p>
              </div>
            </div>

            {/* Right: Single New Template Button */}
            <div className="w-full sm:w-auto">
              <MobiGlasButton
                onClick={() => setViewMode('create')}
                variant="primary"
                size="md"
                disabled={isLoading}
                leftIcon={<CreateIcon />}
                withScanline={true}
                withCorners={true}
                withGlow={true}
                className="w-full sm:w-auto"
              >
                NEW TEMPLATE
              </MobiGlasButton>
            </div>
          </div>

          {/* Corner accents for header */}
          <CornerAccents variant="animated" color="primary" size="sm" />
        </div>

        {/* Template List Container */}
        <div className="max-w-5xl mx-auto px-6 py-8">
          {isLoading ? (
            <motion.div
              className="text-center py-12"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.3 }}
            >
              <div className="relative inline-block">
                <div className="w-12 h-12 border-2 border-[rgba(var(--mg-primary),0.3)] border-t-[rgba(var(--mg-primary),1)] rounded-full animate-spin mx-auto mb-4"></div>
                <div className="absolute inset-0 w-12 h-12 border border-[rgba(var(--mg-primary),0.2)] rounded-full animate-pulse mx-auto"></div>
              </div>
              <div className="text-[rgba(var(--mg-text),0.6)] font-medium animate-pulse">
                Loading mission templates...
              </div>
              <div className="mt-2 text-xs text-[rgba(var(--mg-primary),0.7)] animate-pulse">
                Accessing secure database
              </div>
            </motion.div>
          ) : templates.length === 0 ? (
            <motion.div
              className="text-center py-16"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <div className="max-w-md mx-auto p-8 relative border border-[rgba(var(--mg-primary),0.2)] rounded-lg bg-gradient-to-br from-[rgba(var(--mg-panel-dark),0.6)] to-[rgba(var(--mg-panel-dark),0.3)]">
                <div className="w-16 h-16 mx-auto mb-6 border-2 border-[rgba(var(--mg-primary),0.3)] rounded-lg flex items-center justify-center">
                  <TemplateIcon />
                  <div className="absolute inset-0 border border-[rgba(var(--mg-primary),0.1)] rounded-lg animate-pulse"></div>
                </div>
                <h3 className="text-lg font-semibold text-[rgba(var(--mg-text),0.9)] mb-2">
                  No Mission Templates
                </h3>
                <p className="text-[rgba(var(--mg-text),0.6)] mb-6">
                  Create your first mission template to standardize operations and improve efficiency.
                </p>
                <MobiGlasButton
                  onClick={() => setViewMode('create')}
                  variant="primary"
                  size="lg"
                  leftIcon={<CreateIcon />}
                  withScanline={true}
                  withCorners={true}
                  withGlow={true}
                >
                  Create First Template
                </MobiGlasButton>
                <CornerAccents variant="animated" color="primary" size="md" />
              </div>
            </motion.div>
          ) : (
            <div className="space-y-3">
              {templates.map((template) => (
                <TemplateStrip
                  key={template.id}
                  template={template}
                  isExpanded={expandedTemplateId === template.id}
                  onToggleExpand={() => handleToggleExpand(template.id)}
                  onEdit={() => handleEdit(template)}
                  onDelete={() => setShowDeleteConfirm(template.id)}
                  onUseForMission={() => handleUseForMission(template.id)}
                />
              ))}
            </div>
          )}
        </div>

        {/* Delete Confirmation Modal */}
        <AnimatePresence>
          {showDeleteConfirm && (
            <motion.div
              className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowDeleteConfirm(null)}
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                onClick={(e) => e.stopPropagation()}
                className="max-w-md mx-4"
              >
                <MobiGlasPanel
                  variant="darker"
                  cornerAccents={true}
                  padding="lg"
                  className="border-[rgba(var(--mg-danger),0.5)]"
                >
                  <div role="dialog" aria-modal="true" aria-labelledby="delete-modal-title">
                    <h3 id="delete-modal-title" className="text-lg font-semibold text-[rgba(var(--mg-danger),0.9)] mb-4">
                      Confirm Deletion
                    </h3>
                    <p className="text-[rgba(var(--mg-text),0.8)] mb-6">
                      Are you sure you want to delete this mission template? This action cannot be undone.
                    </p>
                    <div className="flex justify-end space-x-3">
                      <MobiGlasButton
                        variant="outline"
                        size="md"
                        onClick={() => setShowDeleteConfirm(null)}
                      >
                        Cancel
                      </MobiGlasButton>
                      <MobiGlasButton
                        variant="primary"
                        size="md"
                        onClick={() => showDeleteConfirm && handleDelete(showDeleteConfirm)}
                        disabled={isLoading}
                        className="!bg-[rgba(var(--mg-danger),0.8)] !text-white hover:!bg-[rgba(var(--mg-danger),0.9)]"
                      >
                        Delete
                      </MobiGlasButton>
                    </div>
                  </div>
                </MobiGlasPanel>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Notification */}
        <AnimatePresence>
          {notification && (
            <motion.div
              role="alert"
              aria-live="polite"
              className="fixed top-20 right-6 z-[9999]"
              initial={{ opacity: 0, x: 100, scale: 0.8 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 100, scale: 0.8 }}
              transition={{ duration: 0.3, ease: 'easeOut' }}
              style={{ position: 'fixed', willChange: 'transform' }}
            >
              <div className="max-w-sm relative border border-[rgba(var(--mg-primary),0.2)] rounded-lg">
                <div className={`relative px-6 py-4 rounded-lg border-2 backdrop-filter backdrop-blur-md ${
                  notification.type === 'success'
                    ? 'bg-[rgba(var(--mg-success),0.15)] border-[rgba(var(--mg-success),0.6)] text-[rgba(var(--mg-success),1)]'
                    : 'bg-[rgba(var(--mg-danger),0.15)] border-[rgba(var(--mg-danger),0.6)] text-[rgba(var(--mg-danger),1)]'
                } shadow-[0_0_30px_rgba(var(--mg-${notification.type === 'success' ? 'success' : 'danger'}),0.3)]`}>
                  <div className="relative z-10 flex items-center">
                    <div className={`w-2 h-2 rounded-full mr-3 animate-pulse ${
                      notification.type === 'success' ? 'bg-[rgba(var(--mg-success),1)]' : 'bg-[rgba(var(--mg-danger),1)]'
                    }`}></div>
                    <span className="font-medium">{notification.message}</span>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  }

  // Render create/edit form view
  return (
    <MissionTemplateForm
      formData={formData}
      errors={errors}
      isLoading={isLoading}
      isEditing={viewMode === 'edit'}
      onInputChange={handleInputChange}
      onSave={handleSave}
      onCancel={handleCancel}
      onAddShip={addShipEntry}
      onUpdateShip={updateShipEntry}
      onRemoveShip={removeShipEntry}
      onAddPersonnel={addPersonnelEntry}
      onUpdatePersonnel={updatePersonnelEntry}
      onRemovePersonnel={removePersonnelEntry}
      getAvailableActivities={getAvailableActivities}
    />
  );
};

export default MissionTemplateCreator;
