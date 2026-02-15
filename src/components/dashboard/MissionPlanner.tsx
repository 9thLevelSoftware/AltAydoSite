'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { useSearchParams, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import Image from 'next/image';
import { MobiGlasPanel } from '@/components/ui/mobiglas';
import MobiGlasButton from '../ui/mobiglas/MobiGlasButton';
import MissionPlannerForm from './MissionPlannerForm';
import { useToast } from '@/hooks/useToast';
import { useConfirmDialog } from '@/hooks/useConfirmDialog';
import {
  PlannedMission,
  PlannedMissionResponse,
  PlannedMissionValidationErrors,
  PlannedMissionStatus,
  ExpectedParticipant,
  ConfirmedParticipant,
  createEmptyMission
} from '@/types/PlannedMission';
import { MissionTemplate } from '@/types/MissionTemplate';
import {
  PlusIcon,
  CalendarIcon,
  UsersIcon,
  ShipIcon,
  DiscordIcon,
  EditIcon,
  TrashIcon,
  EyeIcon,
  CheckIcon,
  ClipboardIcon
} from '@/components/ui/icons';

// Status badge colors
const STATUS_COLORS: Record<PlannedMissionStatus, string> = {
  DRAFT: 'bg-[rgba(var(--mg-text),0.2)] text-[rgba(var(--mg-text),0.7)]',
  SCHEDULED: 'bg-[rgba(var(--mg-primary),0.2)] text-[rgba(var(--mg-primary),1)]',
  ACTIVE: 'bg-[rgba(var(--mg-success),0.2)] text-[rgba(var(--mg-success),1)]',
  DEBRIEFING: 'bg-[rgba(255,193,7),0.2] text-[rgba(255,193,7,1)]',
  COMPLETED: 'bg-[rgba(var(--mg-secondary),0.2)] text-[rgba(var(--mg-secondary),1)]',
  CANCELLED: 'bg-[rgba(var(--mg-danger),0.2)] text-[rgba(var(--mg-danger),0.8)]'
};

type ViewMode = 'list' | 'create' | 'edit' | 'view' | 'debrief';

interface MissionPlannerProps {
  initialMissionId?: string;
}

const MissionPlanner: React.FC<MissionPlannerProps> = ({ initialMissionId }) => {
  const { data: session } = useSession();
  const searchParams = useSearchParams();
  const router = useRouter();
  const { toast } = useToast();
  const { confirm } = useConfirmDialog();
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [missions, setMissions] = useState<PlannedMissionResponse[]>([]);
  const [templates, setTemplates] = useState<MissionTemplate[]>([]);
  const [selectedMission, setSelectedMission] = useState<PlannedMissionResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingList, setIsLoadingList] = useState(true);
  const [errors, setErrors] = useState<PlannedMissionValidationErrors>({});
  const [statusFilter, setStatusFilter] = useState<PlannedMissionStatus | 'all'>('all');
  const [rsvpData, setRsvpData] = useState<Record<string, { count: number; users: Array<{ username: string; globalName?: string; nickname?: string }> }>>({});

  // Track if we've already processed URL params
  const templateParamProcessed = useRef(false);
  const missionIdParamProcessed = useRef(false);

  // Debrief state
  const [debriefParticipants, setDebriefParticipants] = useState<Record<string, boolean>>({});

  // Form data
  const [formData, setFormData] = useState<Partial<PlannedMission>>(createEmptyMission());

  // Check user clearance
  const userClearance = (session?.user as any)?.clearanceLevel || 1;
  const userId = (session?.user as any)?.id || '';
  const canCreateMission = userClearance >= 3;

  // Fetch missions
  const fetchMissions = useCallback(async () => {
    setIsLoadingList(true);
    try {
      let url = '/api/planned-missions?';
      if (statusFilter !== 'all') {
        url += `status=${statusFilter}&`;
      }

      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setMissions(data.items || []);

        // Fetch RSVP data for published missions
        const published = (data.items || []).filter((m: PlannedMissionResponse) => m.discordEvent);
        for (const mission of published) {
          fetchRsvpData(mission.id);
        }
      }
    } catch (error) {
      console.error('Error fetching missions:', error);
    } finally {
      setIsLoadingList(false);
    }
  }, [statusFilter]);

  // Fetch templates
  const fetchTemplates = useCallback(async () => {
    try {
      const res = await fetch('/api/mission-templates');
      if (res.ok) {
        const data = await res.json();
        setTemplates(data.items || []);
      }
    } catch (error) {
      console.error('Error fetching templates:', error);
    }
  }, []);

  // Fetch RSVP data for a mission
  const fetchRsvpData = async (missionId: string) => {
    try {
      const res = await fetch(`/api/planned-missions/${missionId}/discord`);
      if (res.ok) {
        const data = await res.json();
        setRsvpData(prev => ({
          ...prev,
          [missionId]: {
            count: data.count || 0,
            users: data.rsvps || []
          }
        }));
      }
    } catch (error) {
      console.error('Error fetching RSVPs:', error);
    }
  };

  // Initial load
  useEffect(() => {
    fetchMissions();
    fetchTemplates();
  }, [fetchMissions, fetchTemplates]);

  // Handle initial mission ID
  useEffect(() => {
    if (initialMissionId && missions.length > 0) {
      const mission = missions.find(m => m.id === initialMissionId);
      if (mission) {
        handleEdit(mission);
      }
    }
  }, [initialMissionId, missions]);

  // Handle templateId from URL params (when navigating from template creator)
  useEffect(() => {
    if (templateParamProcessed.current) return;

    const templateId = searchParams.get('templateId');
    if (!templateId || templates.length === 0) return;

    const template = templates.find(t => t.id === templateId);
    if (template) {
      templateParamProcessed.current = true;

      // Pre-populate form with template data
      setFormData({
        ...createEmptyMission(),
        templateId: template.id,
        templateName: template.name,
        operationType: template.operationType,
        primaryActivity: template.primaryActivity,
        secondaryActivity: template.secondaryActivity,
        tertiaryActivity: template.tertiaryActivity,
        equipmentNotes: template.requiredEquipment
      });

      // Switch to create mode
      setViewMode('create');

      // Clear the URL param to prevent re-triggering on navigation
      router.replace('/dashboard/mission-planner', { scroll: false });
    }
  }, [searchParams, templates, router]);

  // Handle missionId from URL params (when navigating from Discord event or calendar)
  useEffect(() => {
    if (missionIdParamProcessed.current) return;

    const missionId = searchParams.get('missionId');
    if (!missionId || missions.length === 0) return;

    const mission = missions.find(m => m.id === missionId);
    if (mission) {
      missionIdParamProcessed.current = true;

      // Open the mission in view mode
      setSelectedMission(mission);
      setViewMode('view');

      // Clear the URL param to prevent re-triggering on navigation
      router.replace('/dashboard/mission-planner', { scroll: false });
    }
  }, [searchParams, missions, router]);

  // Reset form
  const resetForm = () => {
    setFormData(createEmptyMission());
    setErrors({});
    setSelectedMission(null);
  };

  // Handle input change
  const handleInputChange = (field: keyof PlannedMission, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field as keyof PlannedMissionValidationErrors]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  // Validate form
  const validateForm = (): boolean => {
    const newErrors: PlannedMissionValidationErrors = {};

    if (!formData.name || formData.name.length < 3) {
      newErrors.name = 'Mission name must be at least 3 characters';
    }

    if (!formData.scheduledDateTime) {
      newErrors.scheduledDateTime = 'Scheduled date/time is required';
    }

    if (!formData.operationType) {
      newErrors.operationType = 'Operation type is required';
    }

    if (!formData.primaryActivity) {
      newErrors.primaryActivity = 'Primary activity is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Save mission
  const handleSave = async () => {
    if (!validateForm()) return;

    setIsLoading(true);
    try {
      const method = selectedMission ? 'PUT' : 'POST';
      const body = selectedMission
        ? { ...formData, id: selectedMission.id }
        : formData;

      const res = await fetch('/api/planned-missions', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      if (res.ok) {
        const savedMission = await res.json();

        // If editing a mission with a Discord event, sync the changes to Discord
        if (selectedMission?.discordEvent && savedMission?.id) {
          try {
            const discordRes = await fetch(`/api/planned-missions/${savedMission.id}/discord`, {
              method: 'PATCH'
            });
            if (!discordRes.ok) {
              console.warn('Failed to sync changes to Discord event');
            }
          } catch (discordError) {
            console.warn('Failed to sync changes to Discord:', discordError);
            // Don't fail the save operation if Discord sync fails
          }
        }

        await fetchMissions();
        setViewMode('list');
        resetForm();
      } else {
        const data = await res.json();
        setErrors({ general: data.error || 'Failed to save mission' });
      }
    } catch (error) {
      setErrors({ general: 'Network error. Please try again.' });
    } finally {
      setIsLoading(false);
    }
  };

  // Edit mission
  const handleEdit = (mission: PlannedMissionResponse) => {
    setSelectedMission(mission);
    setFormData({
      name: mission.name,
      scheduledDateTime: mission.scheduledDateTime,
      duration: mission.duration,
      location: mission.location,
      templateId: mission.templateId,
      templateName: mission.templateName,
      operationType: mission.operationType,
      primaryActivity: mission.primaryActivity,
      secondaryActivity: mission.secondaryActivity,
      tertiaryActivity: mission.tertiaryActivity,
      leaders: mission.leaders,
      ships: mission.ships,
      objectives: mission.objectives,
      briefing: mission.briefing,
      equipmentNotes: mission.equipmentNotes,
      images: mission.images,
      expectedParticipants: mission.expectedParticipants,
      confirmedParticipants: mission.confirmedParticipants,
      status: mission.status
    });
    setViewMode('edit');
  };

  // Delete mission
  const handleDelete = async (id: string) => {
    const confirmed = await confirm({
      title: 'Delete Mission',
      message: 'Are you sure you want to delete this mission? This action cannot be undone.',
      confirmLabel: 'Delete',
      cancelLabel: 'Cancel',
      variant: 'danger'
    });
    if (!confirmed) return;

    setIsLoading(true);
    try {
      const res = await fetch(`/api/planned-missions?id=${id}`, {
        method: 'DELETE'
      });

      if (res.ok) {
        await fetchMissions();
      }
    } catch (error) {
      console.error('Error deleting mission:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Publish to Discord
  const handlePublishToDiscord = async () => {
    if (!selectedMission) return;

    setIsLoading(true);
    try {
      const res = await fetch(`/api/planned-missions/${selectedMission.id}/discord`, {
        method: 'POST'
      });

      if (res.ok) {
        const data = await res.json();
        setSelectedMission(data.mission);
        setFormData(prev => ({ ...prev, status: 'SCHEDULED' }));
        await fetchMissions();
        toast.success('Mission published to Discord successfully!');
      } else {
        const data = await res.json();
        toast.error(`Failed to publish: ${data.error}`);
      }
    } catch (error) {
      toast.error('Network error. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // View mission
  const handleView = (mission: PlannedMissionResponse) => {
    setSelectedMission(mission);
    setViewMode('view');
  };

  // Start debrief
  const handleStartDebrief = (mission: PlannedMissionResponse) => {
    setSelectedMission(mission);
    // Pre-populate confirmed participants
    const confirmed: Record<string, boolean> = {};
    mission.confirmedParticipants.forEach(p => {
      confirmed[p.odId] = true;
    });
    // Also add expected participants as unchecked
    mission.expectedParticipants.forEach(p => {
      if (!confirmed[p.discordId]) {
        confirmed[p.discordId] = false;
      }
    });
    setDebriefParticipants(confirmed);
    setViewMode('debrief');
  };

  // Toggle participant confirmation
  const toggleParticipantConfirm = (id: string) => {
    setDebriefParticipants(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  // Save debrief
  const handleSaveDebrief = async () => {
    if (!selectedMission) return;

    setIsLoading(true);
    try {
      // Build confirmed participants list
      const confirmed: ConfirmedParticipant[] = [];
      const now = new Date().toISOString();

      Object.entries(debriefParticipants).forEach(([id, isConfirmed]) => {
        if (isConfirmed) {
          // Find in expected participants first
          const expected = selectedMission.expectedParticipants.find(p => p.discordId === id);
          if (expected) {
            confirmed.push({
              odId: expected.discordId,
              displayName: expected.discordNickname || expected.discordGlobalName || expected.discordUsername,
              discordId: expected.discordId,
              userId: expected.userId,
              aydoHandle: expected.aydoHandle,
              confirmedBy: userId,
              confirmedAt: now
            });
          } else {
            // Check if already in confirmed
            const alreadyConfirmed = selectedMission.confirmedParticipants.find(p => p.odId === id);
            if (alreadyConfirmed) {
              confirmed.push(alreadyConfirmed);
            }
          }
        }
      });

      const res = await fetch(`/api/planned-missions/${selectedMission.id}/attendance`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ confirmedParticipants: confirmed })
      });

      if (res.ok) {
        await fetchMissions();
        setViewMode('list');
        setSelectedMission(null);
        toast.success('Attendance saved successfully!');
      } else {
        const data = await res.json();
        toast.error(`Failed to save attendance: ${data.error}`);
      }
    } catch (error) {
      toast.error('Network error. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Complete mission (mark as completed)
  const handleCompleteMission = async () => {
    if (!selectedMission) return;

    setIsLoading(true);
    try {
      const res = await fetch(`/api/planned-missions/${selectedMission.id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'COMPLETED' })
      });

      if (res.ok) {
        await fetchMissions();
        setViewMode('list');
        setSelectedMission(null);
        toast.success('Mission marked as completed!');
      }
    } catch (error) {
      toast.error('Network error. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Format date with timezone
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZoneName: 'short'
    });
  };

  // Get countdown string for upcoming missions
  const getCountdown = (dateString: string): { text: string; isUrgent: boolean; isPast: boolean } => {
    const now = new Date();
    const target = new Date(dateString);
    const diffMs = target.getTime() - now.getTime();

    // Mission is in the past
    if (diffMs < 0) {
      return { text: 'Started', isUrgent: false, isPast: true };
    }

    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    // Less than 1 hour - urgent
    if (diffMins < 60) {
      return { text: `T-${diffMins}m`, isUrgent: true, isPast: false };
    }

    // Less than 24 hours
    if (diffHours < 24) {
      const remainingMins = diffMins % 60;
      return {
        text: `T-${diffHours}h ${remainingMins}m`,
        isUrgent: diffHours < 2,
        isPast: false
      };
    }

    // More than a day
    const remainingHours = diffHours % 24;
    return {
      text: `T-${diffDays}d ${remainingHours}h`,
      isUrgent: false,
      isPast: false
    };
  };

  // Get user's timezone for display
  const getUserTimezone = () => {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  };

  // Calculate total ships for a mission
  const getTotalShips = (mission: PlannedMissionResponse) => {
    return (mission.ships || []).reduce((total, ship) => total + ship.quantity, 0);
  };

  // Render list view
  const renderListView = () => (
    <div className="space-y-6">
      {/* Header */}
      <MobiGlasPanel
        title="Mission Planner"
        rightContent={
          canCreateMission && (
            <MobiGlasButton
              onClick={() => { resetForm(); setViewMode('create'); }}
              variant="primary"
              size="md"
              leftIcon={<PlusIcon />}
              withGlow
            >
              Plan New Mission
            </MobiGlasButton>
          )
        }
      >
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <div className="text-[rgba(var(--mg-text),0.7)]">
              Create and manage mission plans. Publish to Discord to gather interest.
            </div>
            {/* Timezone indicator */}
            <div className="flex items-center gap-1 mt-1 text-xs text-[rgba(var(--mg-text),0.4)]">
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>Times shown in your local timezone: {getUserTimezone()}</span>
            </div>
          </div>

          {/* Status Filter */}
          <div className="flex flex-wrap gap-2">
            {(['all', 'DRAFT', 'SCHEDULED', 'ACTIVE', 'DEBRIEFING', 'COMPLETED'] as const).map((status) => (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${
                  statusFilter === status
                    ? 'bg-[rgba(var(--mg-primary),0.3)] text-[rgba(var(--mg-primary),1)]'
                    : 'bg-[rgba(var(--mg-panel-dark),0.3)] text-[rgba(var(--mg-text),0.6)] hover:bg-[rgba(var(--mg-primary),0.1)]'
                }`}
              >
                {status === 'all' ? 'All' : status}
              </button>
            ))}
          </div>
        </div>
      </MobiGlasPanel>

      {/* Missions Grid */}
      {isLoadingList ? (
        <div className="text-center py-12">
          <div className="animate-pulse text-[rgba(var(--mg-primary),0.6)]">Loading missions...</div>
        </div>
      ) : missions.length === 0 ? (
        <MobiGlasPanel>
          <div className="text-center py-12 text-[rgba(var(--mg-text),0.5)]">
            <CalendarIcon />
            <p className="mt-4">No missions found.</p>
            {canCreateMission && (
              <p className="mt-2">Click &quot;Plan New Mission&quot; to create your first mission.</p>
            )}
          </div>
        </MobiGlasPanel>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {missions.map((mission) => (
            <motion.div
              key={mission.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-lg border border-[rgba(var(--mg-primary),0.2)] bg-[rgba(var(--mg-panel-dark),0.4)] overflow-hidden hover:border-[rgba(var(--mg-primary),0.4)] transition-all"
            >
              {/* Mission Header Image (first ship) */}
              {mission.ships?.[0] && (
                <div className="h-32 relative">
                  {mission.ships[0].image ? (
                    <Image
                      src={mission.ships[0].image}
                      alt={mission.ships[0].shipName}
                      fill
                      className="object-cover"
                      sizes="(max-width: 768px) 100vw, 33vw"
                    />
                  ) : (
                    <div className="flex items-center justify-center w-full h-full bg-[rgba(var(--mg-panel-dark),0.6)] border border-[rgba(var(--mg-primary),0.15)] rounded">
                      <span className="text-xs text-[rgba(var(--mg-primary),0.3)]">No image</span>
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-[rgba(0,0,0,0.8)] to-transparent" />
                  {/* Status Badge */}
                  <div className={`absolute top-2 right-2 px-2 py-1 rounded text-xs font-medium ${STATUS_COLORS[mission.status]}`}>
                    {mission.status}
                  </div>
                </div>
              )}

              {/* Mission Info */}
              <div className="p-4">
                <h3 className="text-lg font-medium text-[rgba(var(--mg-text),0.95)] mb-2 truncate">
                  {mission.name}
                </h3>

                <div className="flex items-center justify-between gap-2 text-sm text-[rgba(var(--mg-text),0.6)] mb-3">
                  <div className="flex items-center gap-1">
                    <CalendarIcon />
                    <span className="text-xs">{formatDate(mission.scheduledDateTime)}</span>
                  </div>
                  {/* Countdown Display */}
                  {mission.status === 'SCHEDULED' && (() => {
                    const countdown = getCountdown(mission.scheduledDateTime);
                    return (
                      <div
                        className={`flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${
                          countdown.isPast
                            ? 'bg-[rgba(var(--mg-success),0.2)] text-[rgba(var(--mg-success),1)]'
                            : countdown.isUrgent
                            ? 'bg-[rgba(var(--mg-danger),0.2)] text-[rgba(var(--mg-danger),1)] animate-pulse'
                            : 'bg-[rgba(var(--mg-primary),0.15)] text-[rgba(var(--mg-primary),0.9)]'
                        }`}
                        title="Time until mission start"
                      >
                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span>{countdown.text}</span>
                      </div>
                    );
                  })()}
                </div>

                <div className="flex items-center gap-4 text-xs text-[rgba(var(--mg-text),0.5)] mb-4">
                  <div className="flex items-center gap-1">
                    <ShipIcon />
                    <span>{mission.ships?.length || 0} ships</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <UsersIcon />
                    <span>{getTotalShips(mission)} ships</span>
                  </div>
                  {mission.discordEvent && rsvpData[mission.id] && (
                    <div className="flex items-center gap-1 text-[rgba(var(--mg-primary),0.8)] relative group cursor-help">
                      <DiscordIcon />
                      <span>{rsvpData[mission.id].count} interested</span>
                      {rsvpData[mission.id].users.length > 0 && (
                        <div className="absolute bottom-full left-0 mb-2 hidden group-hover:block z-50">
                          <div className="bg-[rgba(var(--mg-panel-dark),0.95)] border border-[rgba(var(--mg-primary),0.3)] rounded-lg p-3 shadow-lg min-w-[180px]">
                            <div className="text-xs font-medium text-[rgba(var(--mg-primary),1)] mb-2">Interested:</div>
                            <div className="space-y-1 max-h-[150px] overflow-y-auto">
                              {rsvpData[mission.id].users.map((user, idx) => (
                                <div key={idx} className="text-xs text-[rgba(var(--mg-text),0.8)]">
                                  {user.nickname || user.globalName || user.username}
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Activity Tags */}
                <div className="flex flex-wrap gap-1 mb-4">
                  <span className="px-2 py-0.5 rounded-full bg-[rgba(var(--mg-primary),0.2)] text-[rgba(var(--mg-primary),1)] text-xs">
                    {mission.primaryActivity}
                  </span>
                  {mission.secondaryActivity && (
                    <span className="px-2 py-0.5 rounded-full bg-[rgba(var(--mg-secondary),0.2)] text-[rgba(var(--mg-secondary),1)] text-xs">
                      {mission.secondaryActivity}
                    </span>
                  )}
                </div>

                {/* Participants Summary */}
                {(mission.expectedParticipants.length > 0 || mission.confirmedParticipants.length > 0) && (
                  <div className="flex items-center gap-3 text-xs mb-4 p-2 rounded bg-[rgba(var(--mg-panel-dark),0.3)]">
                    {mission.expectedParticipants.length > 0 && (
                      <span className="text-[rgba(var(--mg-text),0.6)]">
                        {mission.expectedParticipants.length} expected
                      </span>
                    )}
                    {mission.confirmedParticipants.length > 0 && (
                      <span className="text-[rgba(var(--mg-success),0.8)]">
                        {mission.confirmedParticipants.length} confirmed
                      </span>
                    )}
                  </div>
                )}

                {/* Actions */}
                <div className="flex gap-2">
                  <button
                    onClick={() => handleView(mission)}
                    className="flex-1 flex items-center justify-center gap-1 py-2 rounded bg-[rgba(var(--mg-primary),0.1)] text-[rgba(var(--mg-primary),0.8)] hover:bg-[rgba(var(--mg-primary),0.2)] transition-colors text-sm"
                  >
                    <EyeIcon />
                    View
                  </button>
                  {(mission.createdBy === session?.user?.id || userClearance >= 4) && mission.status !== 'COMPLETED' && mission.status !== 'CANCELLED' && (
                    <>
                      {(mission.status === 'ACTIVE' || mission.status === 'DEBRIEFING') && (
                        <button
                          onClick={() => handleStartDebrief(mission)}
                          className="flex items-center justify-center gap-1 py-2 px-3 rounded bg-[rgba(255,193,7,0.1)] text-[rgba(255,193,7,0.9)] hover:bg-[rgba(255,193,7,0.2)] transition-colors text-sm"
                          title="Mark Attendance"
                        >
                          <ClipboardIcon />
                        </button>
                      )}
                      <button
                        onClick={() => handleEdit(mission)}
                        className="flex items-center justify-center gap-1 py-2 px-3 rounded bg-[rgba(var(--mg-secondary),0.1)] text-[rgba(var(--mg-secondary),0.8)] hover:bg-[rgba(var(--mg-secondary),0.2)] transition-colors text-sm"
                      >
                        <EditIcon />
                      </button>
                      <button
                        onClick={() => handleDelete(mission.id)}
                        className="flex items-center justify-center gap-1 py-2 px-3 rounded bg-[rgba(var(--mg-danger),0.1)] text-[rgba(var(--mg-danger),0.8)] hover:bg-[rgba(var(--mg-danger),0.2)] transition-colors text-sm"
                      >
                        <TrashIcon />
                      </button>
                    </>
                  )}
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );

  // Render view mode (read-only mission details)
  const renderViewMode = () => {
    if (!selectedMission) return null;

    return (
      <div className="space-y-6">
        {/* Header */}
        <MobiGlasPanel
          title="Mission Details"
          rightContent={
            <MobiGlasButton
              onClick={() => { setViewMode('list'); setSelectedMission(null); }}
              variant="secondary"
              size="sm"
            >
              Back to List
            </MobiGlasButton>
          }
        >
          <div className="flex items-center gap-3 mb-3 pb-3 border-b border-[rgba(var(--mg-primary),0.2)]">
            <span className="px-2 py-1 rounded text-xs font-medium bg-[rgba(var(--mg-primary),0.2)] text-[rgba(var(--mg-primary),1)]">
              VIEWING
            </span>
            <span className="text-[rgba(var(--mg-text),0.9)] font-medium text-lg">{selectedMission.name}</span>
          </div>
          <div className="flex flex-wrap items-center gap-4">
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${STATUS_COLORS[selectedMission.status]}`}>
              {selectedMission.status}
            </span>
            <div className="text-[rgba(var(--mg-text),0.6)]">
              {formatDate(selectedMission.scheduledDateTime)}
            </div>
            {selectedMission.location && (
              <div className="text-[rgba(var(--mg-text),0.6)]">
                📍 {selectedMission.location}
              </div>
            )}
            {selectedMission.discordEvent && (
              <div className="flex items-center gap-1 text-[rgba(var(--mg-primary),0.8)]">
                <DiscordIcon />
                Published to Discord
              </div>
            )}
          </div>
        </MobiGlasPanel>

        {/* Mission Details Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Column - Briefing & Leadership */}
          <div className="space-y-6">
            <MobiGlasPanel title="Mission Briefing">
              <div className="space-y-4">
                <div>
                  <h4 className="mg-subtitle mb-2">OBJECTIVES</h4>
                  <p className="text-[rgba(var(--mg-text),0.8)] whitespace-pre-wrap">
                    {selectedMission.objectives || 'No objectives specified.'}
                  </p>
                </div>
                <div>
                  <h4 className="mg-subtitle mb-2">DETAILED BRIEFING</h4>
                  <p className="text-[rgba(var(--mg-text),0.8)] whitespace-pre-wrap">
                    {selectedMission.briefing || 'No detailed briefing provided.'}
                  </p>
                </div>
                {selectedMission.equipmentNotes && (
                  <div>
                    <h4 className="mg-subtitle mb-2">EQUIPMENT</h4>
                    <p className="text-[rgba(var(--mg-text),0.8)] whitespace-pre-wrap">
                      {selectedMission.equipmentNotes}
                    </p>
                  </div>
                )}
              </div>
            </MobiGlasPanel>

            <MobiGlasPanel title="Leadership">
              {selectedMission.leaders.length > 0 ? (
                <div className="space-y-2">
                  {selectedMission.leaders.map((leader, i) => (
                    <div key={i} className="flex items-center justify-between p-3 rounded bg-[rgba(var(--mg-panel-dark),0.3)]">
                      <span className="text-[rgba(var(--mg-text),0.6)]">{leader.role}</span>
                      <span className="text-[rgba(var(--mg-text),0.9)] font-medium">{leader.aydoHandle}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-[rgba(var(--mg-text),0.5)]">No leaders assigned.</div>
              )}
            </MobiGlasPanel>

            {/* Participants */}
            {(selectedMission.expectedParticipants.length > 0 || selectedMission.confirmedParticipants.length > 0) && (
              <MobiGlasPanel title="Participants">
                <div className="space-y-4">
                  {/* Expected Participants */}
                  {selectedMission.expectedParticipants.length > 0 && (
                    <div>
                      <h4 className="mg-subtitle mb-2">EXPECTED ({selectedMission.expectedParticipants.length})</h4>
                      <div className="flex flex-wrap gap-2">
                        {selectedMission.expectedParticipants.map((p, i) => (
                          <div
                            key={i}
                            className="flex items-center gap-2 px-3 py-1.5 rounded bg-[rgba(var(--mg-panel-dark),0.3)]"
                          >
                            {p.discordAvatar && (
                              <Image
                                src={p.discordAvatar}
                                alt=""
                                width={20}
                                height={20}
                                className="rounded-full"
                              />
                            )}
                            <span className="text-sm text-[rgba(var(--mg-text),0.8)]">
                              {p.discordNickname || p.discordGlobalName || p.discordUsername}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Confirmed Participants */}
                  {selectedMission.confirmedParticipants.length > 0 && (
                    <div>
                      <h4 className="mg-subtitle mb-2 text-[rgba(var(--mg-success),0.8)]">
                        CONFIRMED ({selectedMission.confirmedParticipants.length})
                      </h4>
                      <div className="flex flex-wrap gap-2">
                        {selectedMission.confirmedParticipants.map((p, i) => (
                          <div
                            key={i}
                            className="flex items-center gap-2 px-3 py-1.5 rounded bg-[rgba(var(--mg-success),0.1)] border border-[rgba(var(--mg-success),0.3)]"
                          >
                            <CheckIcon />
                            <span className="text-sm text-[rgba(var(--mg-text),0.8)]">
                              {p.aydoHandle || p.displayName}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </MobiGlasPanel>
            )}
          </div>

          {/* Right Column - Ships */}
          <div className="space-y-6">
            <MobiGlasPanel
              title="Ship Roster"
              rightContent={
                <span className="text-sm text-[rgba(var(--mg-text),0.5)]">
                  {getTotalShips(selectedMission)} ships
                </span>
              }
            >
              {selectedMission.ships.length > 0 ? (
                <div className="grid grid-cols-2 gap-3">
                  {selectedMission.ships.map((ship, shipIdx) => (
                    <div
                      key={shipIdx}
                      className="rounded overflow-hidden border border-[rgba(var(--mg-primary),0.2)]"
                    >
                      <div className="aspect-video relative">
                        {ship.image ? (
                          <Image
                            src={ship.image}
                            alt={ship.shipName}
                            fill
                            className="object-cover"
                            sizes="200px"
                          />
                        ) : (
                          <div className="flex items-center justify-center w-full h-full bg-[rgba(var(--mg-panel-dark),0.6)] border border-[rgba(var(--mg-primary),0.15)] rounded">
                            <span className="text-xs text-[rgba(var(--mg-primary),0.3)]">No image</span>
                          </div>
                        )}
                        <div className="absolute top-1 right-1 bg-[rgba(0,0,0,0.7)] px-2 py-0.5 rounded text-sm">
                          x{ship.quantity}
                        </div>
                        <div className="absolute bottom-1 left-1 bg-[rgba(0,0,0,0.7)] px-2 py-0.5 rounded text-xs">
                          {ship.size}
                        </div>
                      </div>
                      <div className="p-2 bg-[rgba(var(--mg-panel-dark),0.4)]">
                        <div className="text-sm font-medium truncate">{ship.shipName}</div>
                        <div className="text-xs text-[rgba(var(--mg-text),0.5)]">{ship.manufacturer}</div>
                        {ship.notes && (
                          <div className="text-xs text-[rgba(var(--mg-primary),0.7)] mt-1">{ship.notes}</div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-[rgba(var(--mg-text),0.5)]">No ships assigned to this mission.</div>
              )}
            </MobiGlasPanel>
          </div>
        </div>

        {/* Action Buttons - Hidden for COMPLETED/CANCELLED missions */}
        {(selectedMission.createdBy === session?.user?.id || userClearance >= 4) &&
         selectedMission.status !== 'COMPLETED' && selectedMission.status !== 'CANCELLED' && (
          <div className="flex justify-end gap-3">
            {(selectedMission.status === 'ACTIVE' || selectedMission.status === 'DEBRIEFING') && (
              <MobiGlasButton
                onClick={() => handleStartDebrief(selectedMission)}
                variant="secondary"
                size="md"
                leftIcon={<ClipboardIcon />}
              >
                Mark Attendance
              </MobiGlasButton>
            )}
            <MobiGlasButton
              onClick={() => handleEdit(selectedMission)}
              variant="primary"
              size="md"
              leftIcon={<EditIcon />}
            >
              Edit Mission
            </MobiGlasButton>
          </div>
        )}

        {/* Read-only notice for completed/cancelled missions */}
        {(selectedMission.status === 'COMPLETED' || selectedMission.status === 'CANCELLED') && (
          <div className="flex justify-center">
            <div className="px-4 py-2 rounded bg-[rgba(var(--mg-panel-dark),0.5)] text-[rgba(var(--mg-text),0.5)] text-sm">
              This mission is {selectedMission.status.toLowerCase()} and cannot be edited.
            </div>
          </div>
        )}
      </div>
    );
  };

  // Render debrief mode
  const renderDebriefMode = () => {
    if (!selectedMission) return null;

    const allParticipants = [
      ...selectedMission.expectedParticipants.map(p => ({
        id: p.discordId,
        name: p.discordNickname || p.discordGlobalName || p.discordUsername,
        avatar: p.discordAvatar,
        source: 'discord' as const
      })),
      ...selectedMission.confirmedParticipants
        .filter(p => !selectedMission.expectedParticipants.some(e => e.discordId === p.odId))
        .map(p => ({
          id: p.odId,
          name: p.aydoHandle || p.displayName,
          avatar: undefined,
          source: 'manual' as const
        }))
    ];

    return (
      <div className="space-y-6">
        {/* Header */}
        <MobiGlasPanel
          title="Mark Attendance"
          rightContent={
            <MobiGlasButton
              onClick={() => { setViewMode('list'); setSelectedMission(null); }}
              variant="secondary"
              size="sm"
            >
              Cancel
            </MobiGlasButton>
          }
        >
          <div className="text-[rgba(var(--mg-text),0.7)]">
            <strong>{selectedMission.name}</strong> - {formatDate(selectedMission.scheduledDateTime)}
          </div>
          <div className="text-sm text-[rgba(var(--mg-text),0.5)] mt-2">
            Check the box next to participants who actually showed up for this mission.
          </div>
        </MobiGlasPanel>

        {/* Participants Checklist */}
        <MobiGlasPanel title={`Participants (${allParticipants.length})`}>
          {allParticipants.length > 0 ? (
            <div className="space-y-2">
              {allParticipants.map((participant) => (
                <motion.div
                  key={participant.id}
                  className={`flex items-center gap-3 p-3 rounded cursor-pointer transition-all ${
                    debriefParticipants[participant.id]
                      ? 'bg-[rgba(var(--mg-success),0.15)] border border-[rgba(var(--mg-success),0.4)]'
                      : 'bg-[rgba(var(--mg-panel-dark),0.3)] border border-transparent hover:bg-[rgba(var(--mg-panel-dark),0.5)]'
                  }`}
                  onClick={() => toggleParticipantConfirm(participant.id)}
                  whileTap={{ scale: 0.98 }}
                >
                  <div className={`w-6 h-6 rounded border-2 flex items-center justify-center transition-all ${
                    debriefParticipants[participant.id]
                      ? 'bg-[rgba(var(--mg-success),0.8)] border-[rgba(var(--mg-success),1)]'
                      : 'border-[rgba(var(--mg-text),0.3)]'
                  }`}>
                    {debriefParticipants[participant.id] && <CheckIcon />}
                  </div>
                  {participant.avatar && (
                    <Image
                      src={participant.avatar}
                      alt=""
                      width={32}
                      height={32}
                      className="rounded-full"
                    />
                  )}
                  <span className="flex-1 text-[rgba(var(--mg-text),0.9)]">
                    {participant.name}
                  </span>
                  {participant.source === 'discord' && (
                    <DiscordIcon />
                  )}
                </motion.div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-[rgba(var(--mg-text),0.5)]">
              No expected participants. Sync RSVPs from Discord or add participants manually.
            </div>
          )}

          {/* Summary */}
          <div className="mt-4 pt-4 border-t border-[rgba(var(--mg-primary),0.2)]">
            <div className="text-sm text-[rgba(var(--mg-text),0.6)]">
              <span className="text-[rgba(var(--mg-success),0.8)] font-medium">
                {Object.values(debriefParticipants).filter(Boolean).length}
              </span>
              {' '}of{' '}
              <span className="font-medium">{allParticipants.length}</span>
              {' '}participants confirmed
            </div>
          </div>
        </MobiGlasPanel>

        {/* Action Buttons */}
        <div className="flex justify-end gap-3">
          <MobiGlasButton
            onClick={handleSaveDebrief}
            variant="primary"
            size="md"
            isLoading={isLoading}
            leftIcon={<CheckIcon />}
          >
            Save Attendance
          </MobiGlasButton>
          <MobiGlasButton
            onClick={handleCompleteMission}
            variant="secondary"
            size="md"
            disabled={isLoading}
          >
            Complete Mission
          </MobiGlasButton>
        </div>
      </div>
    );
  };

  // Main render
  return (
    <AnimatePresence mode="wait">
      {viewMode === 'list' && (
        <motion.div
          key="list"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          {renderListView()}
        </motion.div>
      )}

      {viewMode === 'view' && (
        <motion.div
          key="view"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          {renderViewMode()}
        </motion.div>
      )}

      {viewMode === 'debrief' && (
        <motion.div
          key="debrief"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          {renderDebriefMode()}
        </motion.div>
      )}

      {(viewMode === 'create' || viewMode === 'edit') && (
        <motion.div
          key="form"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <MissionPlannerForm
            formData={formData}
            errors={errors}
            isLoading={isLoading}
            isEditing={viewMode === 'edit'}
            templates={templates}
            onInputChange={handleInputChange}
            onSave={handleSave}
            onCancel={() => { setViewMode('list'); resetForm(); }}
            onPublishToDiscord={viewMode === 'edit' && formData.status === 'DRAFT' ? handlePublishToDiscord : undefined}
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default MissionPlanner;
