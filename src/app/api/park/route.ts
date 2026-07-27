import { NextResponse } from 'next/server';

// --- État par défaut pour débloquer l'application au 1er lancement ---
const DEFAULT_STATE = {
  totalSpaces: 20,
  branches: [
    { id: "branch-default", name: "Branche Générique" }
  ],
  benches: [
    { id: "bench-default", name: "Bench Générique", branchId: "branch-default" }
  ],
  users: []
};

// --- Utilitaires de connexion à la base de données Redis ---
function getRedisCredentials() {
  const url = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;
  
  if (!url || !token) {
    throw new Error("Variables d'environnement Redis (Upstash/KV) manquantes.");
  }
  return { url, token };
}

async function getRedisState() {
  try {
    const { url, token } = getRedisCredentials();
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(["GET", "parking_state"]),
      cache: 'no-store'
    });
    
    const data = await res.json();
    if (data && data.result) {
      return typeof data.result === 'string' ? JSON.parse(data.result) : data.result;
    }
  } catch (e) {
    console.error("Erreur de lecture Redis:", e);
  }
  
  // Retourne l'état par défaut (avec branche et bench) si la base est vide
  return DEFAULT_STATE;
}

async function setRedisState(state: any) {
  const { url, token } = getRedisCredentials();
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(["SET", "parking_state", JSON.stringify(state)]),
  });
  
  if (!res.ok) {
    throw new Error("Échec de l'écriture dans Redis");
  }
}
// -----------------------------------------------------------

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { userId, name, benchId, isParked } = body;

    if (!userId || !name || !benchId || typeof isParked !== 'boolean') {
      return NextResponse.json({ success: false, error: 'Invalid payload' }, { status: 400 });
    }

    const state = await getRedisState();
    
    // Recherche si l'utilisateur existe déjà dans la base
    const userIndex = state.users.findIndex((u: any) => u.userId === userId || u.id === userId);
    
    if (userIndex !== -1) {
      // Mise à jour de l'utilisateur existant
      state.users[userIndex].isParked = isParked;
      state.users[userIndex].name = name;
      state.users[userIndex].benchId = benchId;
      state.users[userIndex].userId = userId;
    } else {
      // Création d'un nouvel utilisateur
      state.users.push({
        id: userId,
        userId: userId,
        name,
        benchId,
        isParked
      });
    }

    // Sauvegarde du nouvel état dans Upstash Redis
    await setRedisState(state);
    
    return NextResponse.json({
      success: true,
      message: isParked ? 'Parked successfully' : 'Freed successfully'
    });
  } catch (error) {
    console.error('Error in POST /api/park:', error);
    return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
  }
}
