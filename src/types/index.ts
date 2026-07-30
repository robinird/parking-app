export interface Branch {
  id: string;
  name: string;
  capacity?: number;
}

export interface Bench {
  id: string;
  branchId: string;
  name: string;
  capacity?: number;
  qrCodeToken?: string;
}

export interface User {
  id: string;
  userId?: string;
  firstName: string;
  lastName: string;
  benchId?: string;
  isParked: boolean;
  parkedAt?: string | number;
  token?: string;
}

export interface AppState {
  totalSpaces: number;
  availableSpaces: number;
  parkedUsersCount: number;
  branches: Branch[];
  benches: Bench[];
  users: User[];
}
