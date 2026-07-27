export interface Branch {
  id: string;
  name: string;
}

export interface Bench {
  id: string;
  branchId: string;
  name: string;
}

export interface User {
  id: string;
  name: string;
  benchId: string;
  isParked: boolean;
  parkedAt?: string;
}

export interface AppState {
  totalSpaces: number;
  availableSpaces: number;
  parkedUsersCount: number;
  branches: Branch[];
  benches: Bench[];
  users: User[];
}
