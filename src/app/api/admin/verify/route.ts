import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const adminCode = req.headers.get('x-admin-code');
    
    if (adminCode === process.env.ADMIN_CODE) {
      return NextResponse.json({ success: true, valid: true });
    }
    
    return NextResponse.json({ success: false, valid: false, error: 'Code incorrect' }, { status: 401 });
  } catch (error) {
    console.error('Error in POST /api/admin/verify:', error);
    return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
  }
}
