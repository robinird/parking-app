import { AppState, User, Branch, Bench } from '@/types';

const REDIS_KEY = 'parking_state';

const DEFAULT_STATE: AppState = {
  totalSpaces: 50,
  availableSpaces: 50,
  parkedUsersCount: 0,
  branches: [],
  benches: [],
  users: [],
};

function getRedisCredentials() {
  const url = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;
  return { url, token };
}

export async function readDB(): Promise<AppState> {
  const { url, token } = getRedisCredentials();

  if (!url || !token) {
    console.warn('Variables d’environnement Redis non configurées.');
    return DEFAULT_STATE;
  }

  try {
    const res = await fetch(`${url}/get/${REDIS_KEY}`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: 'no-store',
    });

    if (!res.ok) {
      console.error('Erreur HTTP Redis readDB:', res.statusText);
      return DEFAULT_STATE;
    }

    const data = await res.json();
    if (!data || data.result === null || data.result === undefined) {
      return DEFAULT_STATE;
    }

    const raw = typeof data.result === 'string' ? JSON.parse(data.result) : data.result;

    const users: User[] = Array.isArray(raw.users)
      ? raw.users.map((u: any) => ({
          id: String(u.id || u.userId || ''),
          firstName: String(u.firstName || 'Ancien'),
          lastName: String(u.lastName || 'Utilisateur'),
          isParked: Boolean(u.isParked),
          benchId: u.benchId ? String(u.benchId) : undefined,
          parkedAt: u.parkedAt ? String(u.parkedAt) : undefined,
        }))
      : [];

    const branches: Branch[] = Array.isArray(raw.branches)
      ? raw.branches.map((b: any) => ({
          id: String(b.id),
          name: String(b.name || ''),
          capacity: typeof b.capacity === 'number' && !isNaN(b.capacity) ? b.capacity : undefined,
        }))
      : [];

    const benches: Bench[] = Array.isArray(raw.benches)
      ? raw.benches.map((b: any) => ({
          id: String(b.id),
          branchId: String(b.branchId),
          name: String(b.name || ''),
          capacity: typeof b.capacity === 'number' && !isNaN(b.capacity) ? b.capacity : undefined,
          qrCodeToken: b.qrCodeToken ? String(b.qrCodeToken) : `tok_${Math.random().toString(36).substring(2, 9)}`,
        }))
      : [];

    const totalSpaces = typeof raw.totalSpaces === 'number' ? raw.totalSpaces : 50;
    const parkedUsersCount = users.filter((u) => u.isParked).length;
    const availableSpaces = Math.max(0, totalSpaces - parkedUsersCount);

    return {
      totalSpaces,
      availableSpaces,
      parkedUsersCount,
      branches,
      benches,
      users,
    };
  } catch (err) {
    console.error('Erreur globale lors de la lecture DB:', err);
    return DEFAULT_STATE;
  }
}

export async function writeDB(state: AppState): Promise<boolean> {
  const { url, token } = getRedisCredentials();

  if (!url || !token) {
    throw new Error('Variables d’environnement Redis manquantes (UPSTASH_REDIS_REST_URL/TOKEN ou KV_REST_API_URL/TOKEN).');
  }

  const parkedUsersCount = state.users.filter((u) => u.isParked).length;
  const availableSpaces = Math.max(0, state.totalSpaces - parkedUsersCount);

  const payload: AppState = {
    ...state,
    parkedUsersCount,
    availableSpaces,
  };

  const res = await fetch(`${url}/set/${REDIS_KEY}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Échec de l’écriture Redis (${res.status}): ${errorText}`);
  }

  return true;
}
