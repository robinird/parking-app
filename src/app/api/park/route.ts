import { NextResponse } from 'next/server';
import { toggleParking } from '@/lib/db';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { userId, name, benchId, isParked } = body;

    if (!userId || !name || !benchId || typeof isParked !== 'boolean') {
      return NextResponse.json({ success: false, error: 'Invalid payload' }, { status: 400 });
    }

    const state = await toggleParking(userId, name, benchId, isParked);
    
    return NextResponse.json({
      success: true,
      message: isParked ? 'Parked successfully' : 'Freed successfully'
    });
  } catch (error) {
    console.error('Error in POST /api/park:', error);
    return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
  }
}
