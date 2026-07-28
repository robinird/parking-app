export interface Branch {
  id: string;
  name: string;
  capacity?: number; // Capacité max de la branche (optionnel)
}

export interface Bench {
  id: string;
  branchId: string;
  name: string;
  capacity?: number; // Capacité max du bench (optionnel)
}

export interface User {
  id: string;
  firstName: string; // Remplacement de name par firstName
  lastName: string;  // Remplacement de name par lastName
  benchId: string;
  isParked: boolean;
  parkedAt?: string; // Date et heure de stationnement
}

export interface AppState {
  totalSpaces: number;
  availableSpaces: number;
  parkedUsersCount: number;
  branches: Branch[];
  benches: Bench[];
  users: User[];
}
