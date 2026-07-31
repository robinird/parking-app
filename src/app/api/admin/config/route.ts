import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

type ParkingState = {
  totalSpaces: number;
  availableSpaces?: number;
  parkedUsersCount?: number;
  branches: any[];
  benches: any[];
  users: any[];
};

export async function POST(req: Request) {
  try {
    const adminCode = req.headers.get('x-admin-code');
    const expectedCode = process.env.ADMIN_SECRET_CODE || process.env.ADMIN_CODE;

    if (!adminCode || adminCode !== expectedCode) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { totalSpaces, branches, benches } = body;

    const REDIS_URL = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
    const REDIS_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;

    if (!REDIS_URL || !REDIS_TOKEN) {
      throw new Error('Les variables d\'environnement Redis sont manquantes');
    }

    // 1. Lire l'état actuel depuis Redis via la syntaxe de commande REST standard d'Upstash
    const getRes = await fetch(`${REDIS_URL}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${REDIS_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(['GET', 'parking_state']),
      cache: 'no-store'
    });

    if (!getRes.ok) {
      throw new Error('Erreur de connexion lors de la lecture sur Redis');
    }

    const getData = await getRes.json();
    
    // État par défaut de secours
    let state: ParkingState = {
      totalSpaces: 50,
      branches: [],
      benches: [],
      users: []
    };

    if (getData.result) {
      const parsed = typeof getData.result === 'string' ? JSON.parse(getData.result) : getData.result;
      state = {
        totalSpaces: typeof parsed.totalSpaces === 'number' ? parsed.totalSpaces : 50,
        branches: Array.isArray(parsed.branches) ? parsed.branches : [],
        benches: Array.isArray(parsed.benches) ? parsed.benches : [],
        users: Array.isArray(parsed.users) ? parsed.users : []
      };
    }
    
    // 2. Mettre à jour les champs fournis par le frontend avec validation
    if (typeof totalSpaces === 'number' && totalSpaces >= 0) {
      state.totalSpaces = totalSpaces;
    }
    if (Array.isArray(branches)) {
      state.branches = branches;
    }
    if (Array.isArray(benches)) {
      // S'assurer que chaque bench conserve ou génère bien son token de QR code
      state.benches = benches.map((b: any) => ({
        ...b,
        qrCodeToken: b.qrCodeToken || `token_${b.id}_${Math.random().toString(36).substring(2, 7)}`
      }));
    }

    // Recalculer proprement les compteurs globaux
    const parkedUsersCount = state.users.filter((u: any) => Boolean(u.isParked)).length;
    state.parkedUsersCount = parkedUsersCount;
    state.availableSpaces = Math.max(0, state.totalSpaces - parkedUsersCount);

    // 3. Sauvegarder le nouvel état dans Redis via la commande REST standard ['SET', key, value]
    const setRes = await fetch(`${REDIS_URL}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${REDIS_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(['SET', 'parking_state', JSON.stringify(state)])
    });

    if (!setRes.ok) {
      const errText = await setRes.text();
      throw new Error(`Erreur de connexion lors de l'écriture sur Redis: ${errText}`);
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Configuration updated successfully',
      data: state 
    });
  } catch (error: any) {
    console.error('Error in POST /api/admin/config:', error);
    return NextResponse.json({ success: false, error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
