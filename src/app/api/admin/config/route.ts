import { NextRequest, NextResponse } from 'next/server';
import { readDB, writeDB } from '@/lib/db';
import { AppState, Branch, Bench } from '@/types';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    // 1. Contrôle d'authentification par le Header x-admin-code
    const adminCode = req.headers.get('x-admin-code');
    const expectedCode = process.env.ADMIN_SECRET_CODE || '123456';

    if (!adminCode || adminCode !== expectedCode) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // 2. Lecture du payload JSON de la requête
    const body = await req.json();
    const { totalSpaces, branches, benches } = body;

    // Validation basique des champs reçus
    if (typeof totalSpaces !== 'number' || totalSpaces < 0) {
      return NextResponse.json(
        { success: false, error: 'Le nombre total de places est invalide.' },
        { status: 400 }
      );
    }

    if (!Array.isArray(branches) || !Array.isArray(benches)) {
      return NextResponse.json(
        { success: false, error: 'La liste des branches ou benches est invalide.' },
        { status: 400 }
      );
    }

    // 3. Lecture de l'état actuel de la base pour ne pas écraser les utilisateurs garés
    const rawState = await readDB();

    const currentUsers = Array.isArray(rawState.users) ? rawState.users : [];
    const parkedUsersCount = currentUsers.filter((u: any) => Boolean(u.isParked)).length;

    // 4. Construction du nouvel objet AppState propre et complet
    const updatedState: AppState = {
      totalSpaces: Number(totalSpaces),
      availableSpaces: Math.max(0, Number(totalSpaces) - parkedUsersCount),
      parkedUsersCount: parkedUsersCount,
      branches: branches.map((b: Branch) => ({
        id: b.id,
        name: b.name,
        capacity: typeof b.capacity === 'number' && !isNaN(b.capacity) ? b.capacity : undefined,
      })),
      benches: benches.map((bench: Bench) => ({
        id: bench.id,
        branchId: bench.branchId,
        name: bench.name,
        capacity: typeof bench.capacity === 'number' && !isNaN(bench.capacity) ? bench.capacity : undefined,
        qrCodeToken: bench.qrCodeToken || `token_${bench.id}_${Math.random().toString(36).substring(2, 7)}`,
      })),
      users: currentUsers,
    };

    // 5. Écriture définitive dans la base Redis/KV
    await writeDB(updatedState as any);

    return NextResponse.json({
      success: true,
      message: 'Configuration sauvegardée avec succès.',
      data: updatedState,
    });
  } catch (err: any) {
    console.error('Erreur critique API /api/admin/config :', err);
    return NextResponse.json(
      { 
        success: false, 
        error: err.message || 'Erreur interne du serveur lors de l’enregistrement de la configuration.' 
      },
      { status: 500 }
    );
  }
}
