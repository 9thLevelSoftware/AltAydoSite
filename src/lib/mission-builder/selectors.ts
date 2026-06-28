import type { MissionBuilderState } from './store';
import { isMissionDraftValid, validateMissionDraft } from './validation';

export function selectMission(state: MissionBuilderState) {
  return state.mission;
}

export function selectParticipantCount(state: MissionBuilderState) {
  return state.mission.participants.length;
}

export function selectShipCount(state: MissionBuilderState) {
  // Count every participant that has a ship assigned and is not ground support.
  // Each participant occupies one ship slot, so we intentionally do not
  // deduplicate by shipId (two participants on the same model still count as two).
  return state.mission.participants.filter((p) => p.shipId && !p.isGroundSupport).length;
}

export function selectGroundSupportCount(state: MissionBuilderState) {
  return state.mission.participants.filter((p) => p.isGroundSupport).length;
}

export function selectSaveStatus(state: MissionBuilderState) {
  return state.status;
}

export function selectErrors(state: MissionBuilderState) {
  return state.errors;
}

export function selectIsValid(state: MissionBuilderState) {
  return isMissionDraftValid(state.mission);
}

export function selectValidationIssues(state: MissionBuilderState) {
  const res = validateMissionDraft(state.mission);
  if (res.success) return undefined;
  return res.errors;
}

export function selectSummary(state: MissionBuilderState) {
  return {
    participantCount: selectParticipantCount(state),
    shipCount: selectShipCount(state),
    groundSupportCount: selectGroundSupportCount(state),
  } as const;
}
