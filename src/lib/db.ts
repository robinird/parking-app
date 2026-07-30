import { AppState, User, Branch, Bench } from '@/types';

// Interfaces internes pour le parsing sécurisé depuis Redis (évite les erreurs TypeScript "any")
interface RawUser {
  id?: string | number;
  userId?: string | number;
  firstName?: string;
  lastName?: string;
  benchId?: string;
  isParked?: boolean;
  parkedAt?: string;
  token?: string;
}

interface RawBranch {
  id?: string;
  name?: string;
  capacity?: number;
}

interface RawBench {
  id?: string;
  branchId?: string;
  name?: string;
  capacity?: number;
  token?: string;
  qrCodeToken?: string;
}

// État par défaut enrichi pour que l'application soit utilisable immédiatement si Redis est vide
const DEFAULT_STATE: AppState = {
  totalSpaces: 50,
  availableSpaces: 50,
  parkedUsersCount: 0,
  branches: [
    { id: 'branch-tech', name: 'Tech & Engineering', capacity: 30 },
    { id: 'branch-ops', name: 'Operations & Business', capacity: 20 },
  ],
  benches: [
    {
      id: 'bench-dev',
      name: 'Dev Team',
      branchId: 'branch-tech',
      capacity: 15,
      token: 'TOKEN_DEV_123',
    },
    {
      id: 'bench-data',
      name: 'Data & IA',
      branchId: 'branch-tech',
      capacity: 15,
      token: 'TOKEN_DATA_456',
    },
    {
      id: 'bench-sales',
      name: 'Sales & HR',
      branchId: 'branch-ops',
      capacity: 20,
      token: 'TOKEN_OPS_789',
    },
  ],
  users: [],
};

const REDIS_URL = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
const REDIS_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;

export async function readDB(): Promise<AppState> {
  if (!REDIS_URL || !REDIS_TOKEN) {
    console.warn('[DB] Variables Redis/KV non configurées. Utilisation de l’état par défaut.');
    return DEFAULT_STATE;
  }

  try {
    const res = await fetch(`${REDIS_URL}/get/parking_state`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${REDIS_TOKEN}`,
      },
      cache: 'no-store',
    });

    if (!res.ok) {
      throw new Error(`[DB] Erreur HTTP Redis GET: ${res.status}`);
    }

    const data = await res.json();
    if (!data || !data.result) {
      return DEFAULT_STATE;
    }

    const parsed: Partial<AppState> =
      typeof data.result === 'string' ? JSON.parse(data.result) : data.result;

    const users: User[] = Array.isArray(parsed.users)
      ? (parsed.users as RawUser[]).map((u) => ({
          id: String(u.id || u.userId || `usr_${Math.random().toString(36).substring(2, 9)}`),
          firstName: String(u.firstName || 'Utilisateur'),
          lastName: String(u.lastName || 'Anonyme'),
          benchId: u.benchId ? String(u.benchId) : undefined,
          isParked: Boolean(u.isParked),
        }))
      : [];

    const parkedUsersCount = users.filter((u) => u.isParked).length;
    const totalSpaces =
      typeof parsed.totalSpaces === 'number' && !isNaN(parsed.totalSpaces)
        ? parsed.totalSpaces
        : 50;

    const branches: Branch[] = Array.isArray(parsed.branches)
      ? (parsed.branches as RawBranch[]).map((b, index) => ({
          id: String(b.id || `branch-${index}`),
          name: String(b.name || 'Branche sans nom'),
          capacity:
            typeof b.capacity === 'number' && !isNaN(b.capacity) ? b.capacity : 25,
        }))
      : DEFAULT_STATE.branches;

    const benches: Bench[] = Array.isArray(parsed.benches)
      ? (parsed.benches as RawBench[]).map((b, index) => {
          const generatedToken =
            b.token ||
            b.qrCodeToken ||
            `tok_${b.id || index}_${Math.random().toString(36).substring(2, 7)}`;
          return {
            id: String(b.id || `bench-${index}`),
            branchId: String(b.branchId || (branches[0] ? branches[0].id : 'branch-tech')),
            name: String(b.name || 'Bench sans nom'),
            capacity:
              typeof b.capacity === 'number' && !isNaN(b.capacity) ? b.capacity : 15,
            token: generatedToken,
          };
        })
      : DEFAULT_STATE.benches;

    return {
      totalSpaces,
      availableSpaces: Math.max(0, totalSpaces - parkedUsersCount),
      parkedUsersCount,
      branches,
      benches,
      users,
    };
  } catch (error) {
    console.error('[DB] Erreur lors de la lecture DB :', error);
    return DEFAULT_STATE;
  }
}

export async function writeDB(state: AppState): Promise<AppState> {
  const parkedUsersCount = state.users.filter((u) => Boolean(u.isParked)).length;

  const normalizedState: AppState = {
    totalSpaces: Number(state.totalSpaces) || 50,
    availableSpaces: Math.max(0, (Number(state.totalSpaces) || 50) - parkedUsersCount),
    parkedUsersCount,
    branches: Array.isArray(state.branches) ? state.branches : [],
    benches: Array.isArray(state.benches) ? state.benches : [],
    users: Array.isArray(state.users) ? state.users : [],
  };

  if (!REDIS_URL || !REDIS_TOKEN) {
    console.error('[DB] Impossible d’écrire : variables Redis/KV manquantes.');
    return normalizedState;
  }

  try {
    const res = await fetch(`${REDIS_URL}/set/parking_state`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${REDIS_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(normalizedState),
      cache: 'no-store',
    });

    if (!res.ok) {
      throw new Error(`[DB] Erreur HTTP Redis SET: ${res.status}`);
    }

    return normalizedState;
  } catch (error) {
    console.error('[DB] Erreur lors de l’écriture DB :', error);
    return normalizedState;
  }
}
