import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic'; // Ensure no caching

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
// -----------------------------------------------------------

export async function GET() {
  try {
    const state = await getRedisState();
    
    const parkedUsersCount = state.users.filter((u: any) => u.isParked).length;
    
    return NextResponse.json({
      success: true,
      data: {
        totalSpaces: state.totalSpaces,
        availableSpaces: Math.max(0, state.totalSpaces - parkedUsersCount),
        parkedUsersCount,
        branches: state.branches || DEFAULT_STATE.branches,
        benches: state.benches || DEFAULT_STATE.benches,
        users: state.users || []
      }
    });
  } catch (error) {
    console.error('Error in GET /api/state:', error);
    return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
  }
}
