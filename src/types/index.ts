export interface User {
  id: string;
  firstName: string;
  lastName: string;
  benchId: string;
  isParked: boolean;
}

// Alias de compatibilité pour éviter l'erreur "has no exported member 'UserState'"
export type UserState = User;

export interface Bench {
  id: string;
  name: string;
  branchId: string;
  token?: string;
  qrCodeToken?: string;
}

export interface Branch {
  id: string;
  name: string;
}

export interface AppState {
  totalSpaces: number;
  availableSpaces: number;
  parkedUsersCount: number;
  benches: Bench[];
  branches: Branch[];
  users: User[];
}
