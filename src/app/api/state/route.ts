import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic'; // Ensure no caching

// État initial par défaut si la base de données est vide
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

export async function GET() {
  try {
    // Remplacement de readDB() par la lecture Redis
    const state = await getRedisData();
    
    const parkedUsersCount = state.users.filter((u: any) => u.isParked).length;
    
    return NextResponse.json({
      success: true,
      data: {
        totalSpaces: state.totalSpaces,
        availableSpaces: Math.max(0, state.totalSpaces - parkedUsersCount),
        parkedUsersCount,
        branches: state.branches,
        benches: state.benches,
        users: state.users
      }
    });
  } catch (error) {
    console.error('Error in GET /api/state:', error);
    return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
  }
}