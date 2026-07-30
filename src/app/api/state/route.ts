import { NextRequest, NextResponse } from 'next/server';
import { readDB, writeDB } from '@/lib/db';
import { AppState, User } from '@/types';

export const dynamic = 'force-dynamic';

// --- État par défaut de secours au premier lancement ---
const DEFAULT_STATE: AppState = {
  totalSpaces: 50,
  availableSpaces: 50,
  parkedUsersCount: 0,
  branches: [
    { id: 'branch-default', name: 'Branche Générique', capacity: 50 },
  ],
  benches: [
    { id: 'bench-default', name: 'Bench Générique', branchId: 'branch-default', capacity: 25 },
  ],
  users: [],
};

export async function GET() {
  try {
    const rawState = await readDB();

    // Normalisation stricte de la liste des utilisateurs
    const normalizedUsers: User[] = (rawState.users || []).map((u: any) => ({
      id: u.id || u.userId || 'unknown',
      firstName: u.firstName || 'Anonyme',
      lastName: u.lastName || '',
      benchId: u.benchId || '',
      isParked: Boolean(u.isParked),
      parkedAt: u.parkedAt,
    }));

    const totalSpaces = typeof rawState.totalSpaces === 'number' ? rawState.totalSpaces : DEFAULT_STATE.totalSpaces;
    const parkedUsersCount = normalizedUsers.filter((u) => u.isParked).length;
    const availableSpaces = Math.max(0, totalSpaces - parkedUsersCount);

    const state: AppState = {
      totalSpaces,
      availableSpaces,
      parkedUsersCount,
      branches: rawState.branches && rawState.branches.length > 0 ? rawState.branches : DEFAULT_STATE.branches,
      benches: rawState.benches && rawState.benches.length > 0 ? rawState.benches : DEFAULT_STATE.benches,
      users: normalizedUsers,
    };

    return NextResponse.json({
      success: true,
      data: state,
    });
  } catch (error: any) {
    console.error('Erreur dans GET /api/state :', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Erreur interne du serveur lors de la récupération de l’état.',
        data: DEFAULT_STATE 
      },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const rawState = await readDB();

    const updatedState: AppState = {
      totalSpaces: typeof body.totalSpaces === 'number' ? body.totalSpaces : (rawState.totalSpaces || DEFAULT_STATE.totalSpaces),
      branches: Array.isArray(body.branches) ? body.branches : (rawState.branches || DEFAULT_STATE.branches),
      benches: Array.isArray(body.benches) ? body.benches : (rawState.benches || DEFAULT_STATE.benches),
      users: Array.isArray(body.users) ? body.users : (rawState.users || DEFAULT_STATE.users),
      parkedUsersCount: 0,
      availableSpaces: 0,
    };

    // Recalcul des places disponibles
    const parkedCount = updatedState.users.filter((u) => u.isParked).length;
    updatedState.parkedUsersCount = parkedCount;
    updatedState.availableSpaces = Math.max(0, updatedState.totalSpaces - parkedCount);

    await writeDB(updatedState as any);

    return NextResponse.json({
      success: true,
      data: updatedState,
    });
  } catch (error: any) {
    console.error('Erreur dans POST /api/state :', error);
    return NextResponse.json(
      { success: false, error: 'Erreur lors de la modification de l’état du parking.' },
      { status: 400 }
    );
  }
}
