export interface User {
  id: string;
  firstName: string;
  lastName: string;
  benchId: string;
  isParked: boolean;
  token?: string;
  parkedAt?: string;
}

export interface Branch {
  id: string;
  name: string;
  maxSpaces?: number;
}

export interface Bench {
  id: string;
  name: string;
  branchId: string;
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
