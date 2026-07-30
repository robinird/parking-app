export interface User {
  id: string;
  firstName: string;
  lastName: string;
  benchId: string;
  isParked: boolean;
  token?: string;
  parkedAt?: string;
}

// Alias indispensable pour corriger l'erreur :
// "Module '@/types' has no exported member 'UserState'."
export type UserState = User;

export interface Branch {
  id: string;
  name: string;
  capacity: number;
  maxSpaces?: number;
}

export interface Bench {
  id: string;
  name: string;
  branchId: string;
  capacity: number;
  maxSpaces?: number;
  token?: string;
  qrCodeToken?: string;
}

export interface AppState {
  totalSpaces: number;
  availableSpaces: number;
  parkedUsersCount: number;
  branches: Branch[];
  benches: Bench[];
  users: User[];
}
