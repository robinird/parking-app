import { NextResponse } from 'next/server';
import { readDB } from '@/lib/db';

export const dynamic = 'force-dynamic'; // Ensure no caching

export async function GET() {
  try {
    const state = await readDB();
    
    const parkedUsersCount = state.users.filter(u => u.isParked).length;
    
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
