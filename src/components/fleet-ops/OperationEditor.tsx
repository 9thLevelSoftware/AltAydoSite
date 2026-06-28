'use client';

import React, { useState, useEffect } from 'react';
import { Session } from 'next-auth';
import { OperationResponse, OperationStatus, OperationParticipant } from '@/types/Operation';
import { UserShip } from '@/types/user';
import UserSelector from './UserSelector';
import { MobiGlasButton } from '@/components/ui/mobiglas';

interface OperationEditorProps {
  session: Session;
  operation?: OperationResponse;
  onSave: (operation: OperationResponse) => void;
  onCancel: () => void;
}

interface UserWithShips {
  id: string;
  aydoHandle: string;
  ships: UserShip[];
}

// Format a Date into the `YYYY-MM-DDTHH:mm` shape required by <input type="datetime-local">
// using the Date's LOCAL components, so no implicit UTC shift occurs.
const toDatetimeLocalString = (date: Date): string => {
  const pad = (n: number) => String(n).padStart(2, '0');
  return (
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}` +
    `T${pad(date.getHours())}:${pad(date.getMinutes())}`
  );
};

const OperationEditor: React.FC<OperationEditorProps> = ({
  session,
  operation,
  onSave,
  onCancel,
}) => {
  const isEditing = !!operation;

  // Form state
  const [formData, setFormData] = useState({
    name: operation?.name || '',
    description: operation?.description || '',
    status: operation?.status || ('Planning' as OperationStatus),
    // Stored value is a UTC ISO string; display it in the user's local time for the
    // datetime-local input. Build from local components so the picker shows local wall time.
    plannedDateTime: toDatetimeLocalString(
      operation?.plannedDateTime ? new Date(operation.plannedDateTime) : new Date()
    ),
    location: operation?.location || '',
    objectives: operation?.objectives || '',
    commsChannel: operation?.commsChannel || '',
    diagramLinks: operation?.diagramLinks || [''],
  });

  // Participants state
  const [participants, setParticipants] = useState<OperationParticipant[]>(
    operation?.participants || []
  );

  // UI state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [users, setUsers] = useState<UserWithShips[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);
  const [usersError, setUsersError] = useState<string | null>(null);
  // Bumping this token re-runs the user-fetch effect (used by the retry button).
  const [reloadUsersToken, setReloadUsersToken] = useState(0);

  // Fetch users for selection
  useEffect(() => {
    const controller = new AbortController();

    const fetchUsers = async () => {
      try {
        setIsLoadingUsers(true);
        setUsersError(null);
        const response = await fetch('/api/users', { signal: controller.signal });

        if (!response.ok) {
          throw new Error(`Error fetching users: ${response.status}`);
        }

        const raw = await response.json();
        const items = Array.isArray(raw) ? raw : (raw?.items ?? []);
        if (!controller.signal.aborted) {
          setUsers(items);
        }
      } catch (err: any) {
        // Ignore aborts triggered by unmount or a newer retry.
        if (err?.name === 'AbortError' || controller.signal.aborted) {
          return;
        }
        console.error('Error fetching users:', err);
        setUsersError(err?.message || 'Failed to load users');
      } finally {
        if (!controller.signal.aborted) {
          setIsLoadingUsers(false);
        }
      }
    };

    fetchUsers();

    return () => controller.abort();
  }, [reloadUsersToken]);

  // Re-run the user fetch after a failure.
  const handleRetryLoadUsers = () => setReloadUsersToken((token) => token + 1);

  // Handle form input changes
  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  // Handle diagram links changes
  const handleDiagramLinkChange = (index: number, value: string) => {
    const updatedLinks = [...formData.diagramLinks];
    updatedLinks[index] = value;
    setFormData((prev) => ({
      ...prev,
      diagramLinks: updatedLinks,
    }));
  };

  // Add a new diagram link field
  const addDiagramLink = () => {
    setFormData((prev) => ({
      ...prev,
      diagramLinks: [...prev.diagramLinks, ''],
    }));
  };

  // Remove a diagram link field
  const removeDiagramLink = (index: number) => {
    const updatedLinks = [...formData.diagramLinks];
    updatedLinks.splice(index, 1);
    setFormData((prev) => ({
      ...prev,
      diagramLinks: updatedLinks,
    }));
  };

  // Handle adding a participant
  const handleAddParticipant = (userId: string) => {
    // Check if user is already a participant
    if (participants.some((p) => p.userId === userId)) {
      return;
    }

    // Add new participant
    setParticipants((prev) => [
      ...prev,
      {
        userId,
        role: '',
      },
    ]);
  };

  // Handle removing a participant
  const handleRemoveParticipant = (index: number) => {
    const updatedParticipants = [...participants];
    updatedParticipants.splice(index, 1);
    setParticipants(updatedParticipants);
  };

  // Handle participant field changes
  const handleParticipantChange = (index: number, field: string, value: string) => {
    const updatedParticipants = [...participants];
    updatedParticipants[index] = {
      ...updatedParticipants[index],
      [field]: value,
    };
    setParticipants(updatedParticipants);
  };

  // Handle ship assignment
  const handleShipAssignment = (index: number, ship: UserShip) => {
    const updatedParticipants = [...participants];
    updatedParticipants[index] = {
      ...updatedParticipants[index],
      shipManufacturer: ship.manufacturer,
      shipName: ship.name,
      fleetyardsId: ship.fleetyardsId,
    };
    setParticipants(updatedParticipants);
  };

  // Clear a participant's ship assignment
  const handleClearShipAssignment = (index: number) => {
    const updatedParticipants = [...participants];
    updatedParticipants[index] = {
      ...updatedParticipants[index],
      shipManufacturer: undefined,
      shipName: undefined,
      fleetyardsId: undefined,
    };
    setParticipants(updatedParticipants);
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      setIsSubmitting(true);
      setError(null);

      // Filter out empty diagram links
      const filteredDiagramLinks = formData.diagramLinks.filter((link) => link.trim() !== '');

      // The datetime-local value is local wall time with no timezone; convert it to a
      // real Date (interpreted as local) and store as a UTC ISO string. This is symmetric
      // with the load path (which renders the stored UTC ISO back into local components).
      const plannedDateTimeIso = new Date(formData.plannedDateTime).toISOString();

      // Prepare data for API
      const operationData = {
        ...formData,
        plannedDateTime: plannedDateTimeIso,
        diagramLinks: filteredDiagramLinks,
        participants: participants.map((p) => ({
          ...p,
          // Ensure all required fields are present
          userId: p.userId,
          role: p.role || 'Crew',
          shipName: p.shipName,
          shipManufacturer: p.shipManufacturer,
          fleetyardsId: p.fleetyardsId,
          notes: p.notes,
        })),
      };

      // Determine if we're creating or updating
      const url = isEditing
        ? `/api/fleet-ops/operations/${operation.id}`
        : '/api/fleet-ops/operations';

      const method = isEditing ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(operationData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.error || `Failed to ${isEditing ? 'update' : 'create'} operation`
        );
      }

      const savedOperation = await response.json();
      onSave(savedOperation);
    } catch (err: any) {
      setError(err.message || `Failed to ${isEditing ? 'update' : 'create'} operation`);
      console.error('Error saving operation:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Find user by ID
  const findUser = (userId: string) => {
    return users.find((user) => user.id === userId);
  };

  // Get user's ships
  const getUserShips = (userId: string) => {
    const user = findUser(userId);
    return user?.ships || [];
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="mg-title text-xl">
          {isEditing ? 'Edit Operation' : 'Create New Operation'}
        </h2>
        <MobiGlasButton variant="secondary" onClick={onCancel} disabled={isSubmitting}>
          Cancel
        </MobiGlasButton>
      </div>

      {error && (
        <div className="mg-panel-error p-4 mb-6">
          <p className="mg-text-error">{error}</p>
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="mg-panel p-6 mb-6">
          <h3 className="mg-subtitle mb-4">Operation Details</h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Name */}
            <div>
              <label htmlFor="name" className="mg-label">
                Operation Name
              </label>
              <input
                type="text"
                id="name"
                name="name"
                className="mg-input w-full"
                value={formData.name}
                onChange={handleInputChange}
                required
                minLength={3}
              />
            </div>

            {/* Status */}
            <div>
              <label htmlFor="status" className="mg-label">
                Status
              </label>
              <select
                id="status"
                name="status"
                className="mg-input w-full"
                value={formData.status}
                onChange={handleInputChange}
                required
              >
                <option value="Planning">Planning</option>
                <option value="Briefing">Briefing</option>
                <option value="Active">Active</option>
                <option value="Completed">Completed</option>
                <option value="Debriefing">Debriefing</option>
                <option value="Cancelled">Cancelled</option>
              </select>
            </div>

            {/* Date/Time */}
            <div>
              <label htmlFor="plannedDateTime" className="mg-label">
                Date & Time
              </label>
              <input
                type="datetime-local"
                id="plannedDateTime"
                name="plannedDateTime"
                className="mg-input w-full"
                value={formData.plannedDateTime}
                onChange={handleInputChange}
                required
              />
            </div>

            {/* Location */}
            <div>
              <label htmlFor="location" className="mg-label">
                Location
              </label>
              <input
                type="text"
                id="location"
                name="location"
                className="mg-input w-full"
                value={formData.location}
                onChange={handleInputChange}
                required
              />
            </div>

            {/* Comms Channel */}
            <div className="md:col-span-2">
              <label htmlFor="commsChannel" className="mg-label">
                Communications Channel
              </label>
              <input
                type="text"
                id="commsChannel"
                name="commsChannel"
                className="mg-input w-full"
                value={formData.commsChannel}
                onChange={handleInputChange}
                placeholder="Discord channel, in-game channel, etc."
              />
            </div>

            {/* Description */}
            <div className="md:col-span-2">
              <label htmlFor="description" className="mg-label">
                Description
              </label>
              <textarea
                id="description"
                name="description"
                className="mg-input w-full h-24"
                value={formData.description}
                onChange={handleInputChange}
                required
              />
            </div>

            {/* Objectives */}
            <div className="md:col-span-2">
              <label htmlFor="objectives" className="mg-label">
                Objectives
              </label>
              <textarea
                id="objectives"
                name="objectives"
                className="mg-input w-full h-32"
                value={formData.objectives}
                onChange={handleInputChange}
                required
              />
            </div>
          </div>
        </div>

        {/* Diagram Links */}
        <div className="mg-panel p-6 mb-6">
          <h3 className="mg-subtitle mb-4">Operation Diagrams</h3>
          <p className="mg-text-secondary mb-4">
            Add links to external diagrams, maps, or other reference materials.
          </p>

          {formData.diagramLinks.map((link, index) => (
            <div key={index} className="flex gap-2 mb-2">
              <input
                type="url"
                className="mg-input flex-grow"
                value={link}
                onChange={(e) => handleDiagramLinkChange(index, e.target.value)}
                placeholder="https://example.com/diagram"
              />
              <MobiGlasButton
                type="button"
                variant="secondary"
                onClick={() => removeDiagramLink(index)}
              >
                Remove
              </MobiGlasButton>
            </div>
          ))}

          <MobiGlasButton
            type="button"
            variant="secondary"
            className="mt-2"
            onClick={addDiagramLink}
          >
            Add Diagram Link
          </MobiGlasButton>
        </div>

        {/* Participants */}
        <div className="mg-panel p-6 mb-6">
          <h3 className="mg-subtitle mb-4">Operation Participants</h3>

          {/* User selector */}
          <div className="mb-6">
            <label htmlFor="op-add-participant" className="mg-label">
              Add Participant
            </label>
            <UserSelector
              users={users}
              onSelectUser={handleAddParticipant}
              isLoading={isLoadingUsers}
              existingParticipantIds={participants.map((p) => p.userId)}
            />
            {usersError && (
              <div className="mg-panel-error p-3 mt-2 flex items-center justify-between gap-4">
                <p className="mg-text-error">Failed to load users: {usersError}</p>
                <MobiGlasButton
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={handleRetryLoadUsers}
                  disabled={isLoadingUsers}
                  isLoading={isLoadingUsers}
                >
                  Retry
                </MobiGlasButton>
              </div>
            )}
          </div>

          {/* Participants list */}
          {participants.length > 0 ? (
            <div className="space-y-4">
              {participants.map((participant, index) => {
                const user = findUser(participant.userId);
                const userShips = getUserShips(participant.userId);

                return (
                  <div key={index} className="mg-panel-secondary p-4">
                    <div className="flex justify-between items-center mb-4">
                      <h4 className="mg-subtitle">{user?.aydoHandle || participant.userId}</h4>
                      <MobiGlasButton
                        type="button"
                        variant="danger"
                        size="sm"
                        onClick={() => handleRemoveParticipant(index)}
                      >
                        Remove
                      </MobiGlasButton>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Role */}
                      <div>
                        <label htmlFor={`op-participant-role-${index}`} className="mg-label">
                          Role
                        </label>
                        <input
                          type="text"
                          id={`op-participant-role-${index}`}
                          className="mg-input w-full"
                          value={participant.role}
                          onChange={(e) => handleParticipantChange(index, 'role', e.target.value)}
                          placeholder="e.g. Pilot, Security, Engineer"
                          required
                        />
                      </div>

                      {/* Ship Assignment */}
                      <div>
                        <label htmlFor={`op-participant-ship-${index}`} className="mg-label">
                          Assigned Ship
                        </label>
                        {userShips.length > 0 ? (
                          <select
                            id={`op-participant-ship-${index}`}
                            className="mg-input w-full"
                            value={participant.fleetyardsId || ''}
                            onChange={(e) => {
                              const selectedId = e.target.value;
                              if (selectedId === '') {
                                handleClearShipAssignment(index);
                                return;
                              }
                              const selectedShip = userShips.find(
                                (ship) => ship.fleetyardsId === selectedId
                              );
                              if (selectedShip) {
                                handleShipAssignment(index, selectedShip);
                              }
                            }}
                          >
                            <option value="">No Ship Assigned</option>
                            {userShips.map((ship, shipIndex) => (
                              <option
                                key={ship.fleetyardsId || shipIndex}
                                value={ship.fleetyardsId}
                              >
                                {ship.manufacturer} {ship.name}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <p className="mg-text-secondary">User has no ships registered</p>
                        )}
                      </div>

                      {/* Notes */}
                      <div className="md:col-span-2">
                        <label htmlFor={`op-participant-notes-${index}`} className="mg-label">
                          Notes
                        </label>
                        <textarea
                          id={`op-participant-notes-${index}`}
                          className="mg-input w-full"
                          value={participant.notes || ''}
                          onChange={(e) => handleParticipantChange(index, 'notes', e.target.value)}
                          placeholder="Additional instructions or notes for this participant"
                          rows={2}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="mg-text-secondary">No participants added yet.</p>
          )}
        </div>

        {/* Submit button */}
        <div className="flex justify-end">
          <MobiGlasButton
            type="submit"
            variant="primary"
            disabled={isSubmitting}
            isLoading={isSubmitting}
          >
            {isEditing ? 'Update Operation' : 'Create Operation'}
          </MobiGlasButton>
        </div>
      </form>
    </div>
  );
};

export default OperationEditor;
