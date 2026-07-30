export type AvailabilityStatus = 'green' | 'orange' | 'red';

export interface UserState {
  id: string;
  firstName: string;
  lastName: string;
  benchId?: string;
  isParked: boolean;
}

export interface BenchState {
  id: string;
  name: string;
  branchId: string;
  capacity: number;
  token?: string;
}

export interface BranchState {
  id: string;
  name: string;
  capacity: number;
}

export interface AvailabilityResult {
  status: AvailabilityStatus;
  available: number;
  total: number;
  occupied: number;
}

export interface AppState {
  totalSpaces: number;
  availableSpaces: number;
  parkedUsersCount: number;
  branches: BranchState[];
  benches: BenchState[];
  users: UserState[];
}

// Alias d'exportation pour garantir la compatibilité universelle des imports
export type User = UserState;
export type Bench = BenchState;
export type Branch = BranchState;
