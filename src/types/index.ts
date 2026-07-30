export type AvailabilityStatus = 'green' | 'orange' | 'red';

export interface UserState {
  id: string;
  firstName: string;
  lastName: string;
  benchId?: string;
  isParked: boolean;
}

// Alias pour éviter les erreurs d'import (User / UserState)
export type User = UserState;

export interface BenchState {
  id: string;
  name: string;
  branchId: string;
  capacity: number;
  token?: string;
}

// Alias pour éviter les erreurs d'import (Bench / BenchState)
export type Bench = BenchState;

export interface BranchState {
  id: string;
  name: string;
  capacity: number;
}

// Alias pour éviter les erreurs d'import (Branch / BranchState)
export type Branch = BranchState;

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
