import { AppState, User, Branch, Bench } from '@/types';

const DEFAULT_STATE: AppState = {
  totalSpaces: 50,
  availableSpaces: 50,
  parkedUsersCount: 0,
  branches: [],
  benches: [],
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
    if (!data.result) {
      return DEFAULT_STATE;
    }

    const parsed: Partial<AppState> =
      typeof data.result === 'string' ? JSON.parse(data.result) : data.result;

    const users: User[] = Array.isArray(parsed.users)
      ? parsed.users.map((u: any) => ({
          id: String(u.id || u.userId || `usr_${Math.random()}`),
          userId: u.userId ? String(u.userId) : String(u.id || ''),
          firstName: String(u.firstName || 'Utilisateur'),
          lastName: String(u.lastName || 'Anonyme'),
          benchId: u.benchId ? String(u.benchId) : undefined,
          isParked: Boolean(u.isParked),
          parkedAt: u.parkedAt,
          token: u.token,
        }))
      : [];

    const parkedUsersCount = users.filter((u) => u.isParked).length;
    const totalSpaces = typeof parsed.totalSpaces === 'number' ? parsed.totalSpaces : 50;

    const branches: Branch[] = Array.isArray(parsed.branches)
      ? parsed.branches.map((b: any) => ({
          id: String(b.id),
          name: String(b.name || 'Branche sans nom'),
          capacity: typeof b.capacity === 'number' && !isNaN(b.capacity) ? b.capacity : undefined,
        }))
      : [];

    const benches: Bench[] = Array.isArray(parsed.benches)
      ? parsed.benches.map((b: any) => ({
          id: String(b.id),
          branchId: String(b.branchId),
          name: String(b.name || 'Bench sans nom'),
          capacity: typeof b.capacity === 'number' && !isNaN(b.capacity) ? b.capacity : undefined,
          qrCodeToken: b.qrCodeToken || `tok_${b.id}_${Math.random().toString(36).substring(2, 7)}`,
        }))
      : [];

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

export async function writeDB(state: AppState): Promise<boolean> {
  if (!REDIS_URL || !REDIS_TOKEN) {
    console.error('[DB] Impossible d’écrire : variables Redis/KV manquantes.');
    return false;
  }

  try {
    const parkedUsersCount = state.users.filter((u) => Boolean(u.isParked)).length;
    
    const normalizedState: AppState = {
      totalSpaces: Number(state.totalSpaces),
      availableSpaces: Math.max(0, Number(state.totalSpaces) - parkedUsersCount),
      parkedUsersCount,
      branches: Array.isArray(state.branches) ? state.branches : [],
      benches: Array.isArray(state.benches) ? state.benches : [],
      users: Array.isArray(state.users) ? state.users : [],
    };

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

    return true;
  } catch (error) {
    console.error('[DB] Erreur lors de l’écriture DB :', error);
    return false;
  }
}
