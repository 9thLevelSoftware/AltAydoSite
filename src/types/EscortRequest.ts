export type EscortRequestStatus =
  | 'Submitted'
  | 'Under Review'
  | 'Approved'
  | 'Assigned'
  | 'In Progress'
  | 'Completed'
  | 'Cancelled'
  | 'Rejected';

export type ThreatLevel = 'Low' | 'Medium' | 'High' | 'Critical' | 'Unknown';

export type SecurityAssetType =
  | 'Escort Ships Only'
  | 'Ground Security Only'
  | 'On Ship Security Only'
  | 'Combined Operations';

export interface EscortRequestParticipant {
  userId: string;
  userName: string;
  role: string; // 'Security Officer', 'Pilot', 'Ground Support', etc.
  assigned?: boolean;
}

export interface EscortRequest {
  id: string;
  requestedBy: string;
  requestedByUserId?: string;
  threatAssessment: 'done' | 'needed';
  threatLevel?: ThreatLevel;
  shipsToEscort: number;
  startLocation: string;
  endLocation: string;
  secondaryLocations?: string;
  plannedRoute: string;
  assetsRequested: SecurityAssetType[];
  additionalNotes?: string;
  status: EscortRequestStatus;
  priority: 'Low' | 'Medium' | 'High' | 'Urgent';
  estimatedDuration?: string;
  preferredDateTime?: string;
  assignedPersonnel?: EscortRequestParticipant[];
  assignedSecurityOfficer?: string;
  securityOfficerUserId?: string;
  completionNotes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface EscortRequestResponse extends EscortRequest {
  // Response type that matches the request but ensures all fields are present
}

export interface EscortRequestFilters {
  status?: EscortRequestStatus | 'all';
  priority?: EscortRequest['priority'] | 'all';
  assignedTo?: string;
  requestedBy?: string;
}
