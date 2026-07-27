import { NextResponse } from 'next/server';

// État initial par défaut
const INITIAL_STATE = {
  totalSpaces: 20,
  branches: [],
  benches: [],
  users: []
};

// Récupération sécurisée des variables d'environnement (Upstash ou KV)
function getCredentials() {
  const url = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;
  return { url, token };
}

// Fonction de lecture depuis Redis
async function getRedisData() {
  const { url, token } = getCredentials();
  
  if (!url || !token) {
    return INITIAL_STATE;
  }

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(["GET", "parking_db"]),
      cache: 'no-store'
    });
    
    const data = await res.json();
    if (data && data.result) {
      return typeof data.result === 'string' ? JSON.parse(data.result) : data.result;
    }
    return INITIAL_STATE;
  } catch (error) {
    console.error('Error reading from Redis:', error);
    return INITIAL_STATE;
  }
}

// Fonction d'écriture vers Redis
async function setRedisData(state: any) {
  const { url, token } = getCredentials();
  
  if (!url || !token) {
    throw new Error("Base de données Redis non connectée (URL ou Token manquant)");
  }

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(["SET", "parking_db", JSON.stringify(state)]),
  });

  if (!res.ok) {
    throw new Error("Échec de la sauvegarde sur Redis");
  }
}

// Logique interne remplaçant l'ancienne fonction toggleParking de @/lib/db
async function toggleParkingState(userId: string, name: string, benchId: string, isParked: boolean) {
  const state = await getRedisData();
  
  // Recherche de l'utilisateur de manière flexible (support de 'userId' ou 'id')
  const userIndex = state.users.findIndex((u: any) => u.userId === userId || u.id === userId);
  
  if (userIndex >= 0) {
    // Met à jour l'utilisateur existant
    state.users[userIndex].isParked = isParked;
    state.users[userIndex].name = name;
    state.users[userIndex].benchId = benchId;
  } else {
    // Ajoute le nouvel utilisateur
    state.users.push({ id: userId, userId, name, benchId, isParked });
  }
  
  await setRedisData(state);
  return state;
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { userId, name, benchId, isParked } = body;

    // Validation intacte
    if (!userId || !name || !benchId || typeof isParked !== 'boolean') {
      return NextResponse.json({ success: false, error: 'Invalid payload' }, { status: 400 });
    }

    // Appel direct de la nouvelle fonction liée à Redis
    await toggleParkingState(userId, name, benchId, isParked);
    
    return NextResponse.json({
      success: true,
      message: isParked ? 'Parked successfully' : 'Freed successfully'
    });
  } catch (error) {
    console.error('Error in POST /api/park:', error);
    return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
  }
}