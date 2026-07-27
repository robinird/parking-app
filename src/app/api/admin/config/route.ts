import { NextResponse } from 'next/server';

// Définition explicite du type pour éviter l'erreur TypeScript "never[]" lors du build
type ParkingState = {
  totalSpaces: number;
  branches: any[];
  benches: any[];
  parkedUsers: any[];
};

export async function POST(req: Request) {
  try {
    const adminCode = req.headers.get('x-admin-code');
    
    if (adminCode !== process.env.ADMIN_CODE) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { totalSpaces, branches, benches } = body;

    // Utilisation des variables Upstash ou KV Vercel
    const REDIS_URL = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
    const REDIS_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;

    if (!REDIS_URL || !REDIS_TOKEN) {
      throw new Error('Les variables d\'environnement Redis sont manquantes');
    }

    // 1. Lire l'état actuel depuis Redis via fetch REST natif
    const getRes = await fetch(`${REDIS_URL}/get/parking_state`, {
      headers: {
        Authorization: `Bearer ${REDIS_TOKEN}`,
      },
      cache: 'no-store'
    });

    if (!getRes.ok) {
      throw new Error('Erreur de connexion lors de la lecture sur Redis');
    }

    const getData = await getRes.json();
    
    // Gérer l'état par défaut si la clé n'existe pas encore avec notre type explicite
    let state: ParkingState = {
      totalSpaces: 100,
      branches: [],
      benches: [],
      parkedUsers: []
    };

    if (getData.result) {
      state = typeof getData.result === 'string' ? JSON.parse(getData.result) : getData.result;
    }
    
    // 2. Mettre à jour les champs fournis par le frontend
    if (typeof totalSpaces === 'number') {
      state.totalSpaces = totalSpaces;
    }
    if (Array.isArray(branches)) {
      state.branches = branches;
    }
    if (Array.isArray(benches)) {
      state.benches = benches;
    }

    // 3. Sauvegarder le nouvel état dans Redis
    const setRes = await fetch(`${REDIS_URL}/set/parking_state`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${REDIS_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(state)
    });

    if (!setRes.ok) {
      throw new Error('Erreur de connexion lors de l\'écriture sur Redis');
    }

    return NextResponse.json({ success: true, message: 'Configuration updated successfully' });
  } catch (error: any) {
    console.error('Error in POST /api/admin/config:', error);
    return NextResponse.json({ success: false, error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
