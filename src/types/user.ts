export interface User {
  id: string;
  aydoHandle: string;
  email: string;
  passwordHash: string | null;
  clearanceLevel: number;
  role: string;
  discordName: string | null;
  discordId?: string | null;
  discordAvatar?: string | null;
  rsiAccountName: string | null;
  bio?: string | null;
  photo?: string | null;
  payGrade?: string | null;
  position?: string | null;
  division?: string | null;
  timezone?: string | null;
  ships?: UserShip[];
  createdAt?: string;
  updatedAt?: string;
}

export interface UserResponse {
  id: string;
  aydoHandle: string;
  email: string;
  clearanceLevel: number;
  role: string;
  discordName?: string | null;
  discordId?: string | null;
  discordAvatar?: string | null;
  rsiAccountName?: string | null;
  bio?: string | null;
  photo?: string | null;
  payGrade?: string | null;
  position?: string | null;
  division?: string | null;
  timezone?: string | null;
  ships?: UserShip[];
}

export interface UserShip {
  manufacturer: string;
  name: string;
  fleetyardsId: string;
  image?: string;              // Kept optional for transition; removed in Phase 7
}