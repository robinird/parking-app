import { NextResponse } from 'next/server';
import { readDB, writeDB } from '@/lib/db';

export async function POST(req: Request) {
  try {
    const adminCode = req.headers.get('x-admin-code');
    
    if (adminCode !== process.env.ADMIN_CODE) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { totalSpaces, branches, benches } = body;

    const state = await readDB();
    
    // Update state fields if they are provided
    if (typeof totalSpaces === 'number') {
      state.totalSpaces = totalSpaces;
    }
    if (Array.isArray(branches)) {
      state.branches = branches;
    }
    if (Array.isArray(benches)) {
      state.benches = benches;
    }

    await writeDB(state);

    return NextResponse.json({ success: true, message: 'Configuration updated successfully' });
  } catch (error) {
    console.error('Error in POST /api/admin/config:', error);
    return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
  }
}
