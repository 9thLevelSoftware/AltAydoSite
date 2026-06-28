'use client';

import React, { createContext, useContext, useReducer, useCallback } from 'react';
import type { MissionDraft, MissionParticipantDraft } from '@/types/mission-builder';
import { coerceToMissionDraft, validateMissionDraft, type FieldErrors } from './validation';

export type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

export interface MissionBuilderState {
  mission: MissionDraft;
  dirty: boolean;
  status: SaveStatus;
  errors?: FieldErrors;
}

const initialDraft = (): MissionDraft => ({
  name: '',
  type: 'Cargo Haul',
  scheduledDateTime: new Date().toISOString(),
  status: 'Planning',
  briefSummary: '',
  details: '',
  images: [],
  participants: [],
});

const initialState: MissionBuilderState = {
  mission: initialDraft(),
  dirty: false,
  status: 'idle',
  errors: undefined,
};

// Actions
export type MissionBuilderAction =
  | { type: 'setMission'; payload: MissionDraft }
  | { type: 'reset'; payload?: void }
  | { type: 'setField'; field: keyof MissionDraft; value: MissionDraft[keyof MissionDraft] }
  | { type: 'addImage'; url: string }
  | { type: 'removeImage'; url: string }
  | { type: 'addParticipant'; participant: MissionParticipantDraft }
  | { type: 'updateParticipant'; participant: MissionParticipantDraft }
  | { type: 'removeParticipant'; userId: string }
  | { type: 'setStatus'; status: SaveStatus }
  | {
      type: 'saveSucceeded';
      payload?: Partial<Pick<MissionDraft, 'id' | 'createdAt' | 'updatedAt' | 'version'>>;
    }
  | { type: 'setErrors'; errors?: FieldErrors };

function reducer(state: MissionBuilderState, action: MissionBuilderAction): MissionBuilderState {
  switch (action.type) {
    case 'setMission': {
      const mission = coerceToMissionDraft(action.payload);
      return { ...state, mission, dirty: false, errors: undefined };
    }
    case 'reset': {
      return { ...initialState, mission: initialDraft() };
    }
    case 'setField': {
      const mission = {
        ...state.mission,
        [action.field]: action.value,
        updatedAt: new Date().toISOString(),
      } as MissionDraft;
      return { ...state, mission, dirty: true };
    }
    case 'addImage': {
      if (!action.url) return state;
      const images = state.mission.images.includes(action.url)
        ? state.mission.images
        : [...state.mission.images, action.url];
      return { ...state, dirty: true, mission: { ...state.mission, images } };
    }
    case 'removeImage': {
      const images = state.mission.images.filter((x) => x !== action.url);
      return { ...state, dirty: true, mission: { ...state.mission, images } };
    }
    case 'addParticipant': {
      if (state.mission.participants.some((p) => p.userId === action.participant.userId))
        return state;
      const participants = [...state.mission.participants, action.participant];
      return { ...state, dirty: true, mission: { ...state.mission, participants } };
    }
    case 'updateParticipant': {
      const participants = state.mission.participants.map((p) =>
        p.userId === action.participant.userId ? { ...p, ...action.participant } : p
      );
      return { ...state, dirty: true, mission: { ...state.mission, participants } };
    }
    case 'removeParticipant': {
      const participants = state.mission.participants.filter((p) => p.userId !== action.userId);
      return { ...state, dirty: true, mission: { ...state.mission, participants } };
    }
    case 'setStatus': {
      return { ...state, status: action.status };
    }
    case 'saveSucceeded': {
      // Atomically mark the draft as persisted: clear dirty/errors and merge any
      // server-assigned metadata (id/createdAt/updatedAt/version) back into the draft.
      const mission = action.payload ? { ...state.mission, ...action.payload } : state.mission;
      return { ...state, mission, status: 'saved', dirty: false, errors: undefined };
    }
    case 'setErrors': {
      return { ...state, errors: action.errors };
    }
    default:
      return state;
  }
}

const StateCtx = createContext<MissionBuilderState | undefined>(undefined);
const DispatchCtx = createContext<React.Dispatch<MissionBuilderAction> | undefined>(undefined);

export function MissionBuilderProvider({
  children,
  initial,
}: {
  children: React.ReactNode;
  initial?: MissionDraft;
}) {
  const [state, dispatch] = useReducer(
    reducer,
    initial ? { ...initialState, mission: coerceToMissionDraft(initial) } : initialState
  );

  return (
    <StateCtx.Provider value={state}>
      <DispatchCtx.Provider value={dispatch}>{children}</DispatchCtx.Provider>
    </StateCtx.Provider>
  );
}

export function useMissionBuilderState() {
  const ctx = useContext(StateCtx);
  if (!ctx) throw new Error('useMissionBuilderState must be used within MissionBuilderProvider');
  return ctx;
}

export function useMissionBuilderDispatch() {
  const ctx = useContext(DispatchCtx);
  if (!ctx) throw new Error('useMissionBuilderDispatch must be used within MissionBuilderProvider');
  return ctx;
}

// Convenience hooks
export function useMissionBuilder() {
  const state = useMissionBuilderState();
  const dispatch = useMissionBuilderDispatch();

  const setField = useCallback(
    <K extends keyof MissionDraft>(field: K, value: MissionDraft[K]) => {
      dispatch({ type: 'setField', field, value });
    },
    [dispatch]
  );

  const addImage = useCallback((url: string) => dispatch({ type: 'addImage', url }), [dispatch]);
  const removeImage = useCallback(
    (url: string) => dispatch({ type: 'removeImage', url }),
    [dispatch]
  );

  const addParticipant = useCallback(
    (participant: MissionParticipantDraft) => dispatch({ type: 'addParticipant', participant }),
    [dispatch]
  );
  const updateParticipant = useCallback(
    (participant: MissionParticipantDraft) => dispatch({ type: 'updateParticipant', participant }),
    [dispatch]
  );
  const removeParticipant = useCallback(
    (userId: string) => dispatch({ type: 'removeParticipant', userId }),
    [dispatch]
  );

  const loadFrom = useCallback(
    (mission: MissionDraft) => dispatch({ type: 'setMission', payload: mission }),
    [dispatch]
  );
  const reset = useCallback(() => dispatch({ type: 'reset' }), [dispatch]);

  const validate = useCallback(() => {
    const result = validateMissionDraft(state.mission);
    if (result.success) {
      dispatch({ type: 'setErrors', errors: undefined });
      return { valid: true, data: result.data } as const;
    }
    dispatch({ type: 'setErrors', errors: result.errors });
    return { valid: false, errors: result.errors } as const;
  }, [state.mission, dispatch]);

  // Persist the validated draft via the fleet-ops missions API. Existing drafts
  // (those carrying an id) are updated with PUT; new drafts are created with POST.
  // The server handles the hybrid Cosmos/local-JSON storage fallback.
  const save = useCallback(async () => {
    dispatch({ type: 'setStatus', status: 'saving' });
    const res = validate();
    if (!res.valid) {
      dispatch({ type: 'setStatus', status: 'error' });
      return { ok: false as const, errors: res.errors };
    }

    try {
      const method = res.data.id ? 'PUT' : 'POST';
      const response = await fetch('/api/fleet-ops/missions', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(res.data),
      });

      if (!response.ok) {
        let error = `Save failed (${response.status})`;
        try {
          const body = await response.json();
          if (body?.error) error = body.error;
        } catch {
          // Non-JSON error body; keep the status-based message.
        }
        dispatch({ type: 'setStatus', status: 'error' });
        return { ok: false as const, error };
      }

      const saved = (await response.json()) as Partial<MissionDraft>;

      // Merge only server-assigned metadata that is actually present.
      const meta: Partial<Pick<MissionDraft, 'id' | 'createdAt' | 'updatedAt' | 'version'>> = {};
      if (saved.id) meta.id = saved.id;
      if (saved.createdAt) meta.createdAt = saved.createdAt;
      if (saved.updatedAt) meta.updatedAt = saved.updatedAt;
      if (typeof saved.version === 'number') meta.version = saved.version;

      dispatch({ type: 'saveSucceeded', payload: meta });
      return { ok: true as const, data: saved };
    } catch (e) {
      dispatch({ type: 'setStatus', status: 'error' });
      return { ok: false as const, error: e instanceof Error ? e.message : 'Save failed' };
    }
  }, [validate, dispatch]);

  return {
    state,
    actions: {
      setField,
      addImage,
      removeImage,
      addParticipant,
      updateParticipant,
      removeParticipant,
      loadFrom,
      reset,
      save,
      validate,
    },
  } as const;
}
