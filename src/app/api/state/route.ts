import { NextResponse } from 'next/server';
import { AppState } from '@/types';

// État initial en mémoire (en production, relier à une base de données ou KV Vercel)
let globalState: AppState = {
  totalSpaces: 50,
  availableSpaces: 50,
  parkedUsersCount: 0,
  branches: [
    { id: 'branch-1', name: 'Tech & Engineering', quota: 30 },
    { id: 'branch-2', name: 'Business & Sales', quota: 20 },
  ],
  benches: [
    { id: 'bench-1', name: 'Web Dev Team', branchId: 'branch-1', allocatedSpaces: 15 },
    { id: 'bench-2', name: 'Mobile Team', branchId: 'branch-1', allocatedSpaces: 15 },
    { id: 'bench-3', name: 'Marketing Team', branchId: 'branch-2', allocatedSpaces: 10 },
    { id: 'bench-4', name: 'Sales Team', branchId: 'branch-2', allocatedSpaces: 10 },
  ],
  users: [],
};

export async function GET() {
  return NextResponse.json({
    success: true,
    data: globalState,
  });
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    if (body && typeof body.totalSpaces === 'number') {
      globalState = { ...globalState, ...body };
    }
    return NextResponse.json({ success: true, data: globalState });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Données invalides' },
      { status: 400 }
    );
  }
}
