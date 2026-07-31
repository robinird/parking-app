import { NextResponse } from 'next/server';
import { readDB, writeDB } from '@/lib/db';
import { AppState, UserState } from '@/types';

const resolveScannedBenchId = (payload: Record<string, unknown>, benches: any[]): string | undefined => {
  const rawToken = typeof payload.token === 'string' ? payload.token.trim() : '';
  const rawQr = typeof payload.qrCodeData === 'string' ? payload.qrCodeData.trim() : '';
  const directBenchId = typeof payload.benchId === 'string' ? payload.benchId.trim() : '';

  let searchKey = rawToken || rawQr || directBenchId;
  if (!searchKey) return undefined;

  let parsedToken = searchKey;
  let parsedId = '';
  try {
    const json = JSON.parse(searchKey);
    if (json && typeof json === 'object') {
      if (typeof json.token === 'string') parsedToken = json.token.trim();
      if (typeof json.benchId === 'string') parsedId = json.benchId.trim();
      if (typeof json.id === 'string') parsedId = json.id.trim();
    }
  } catch {
    // Non JSON, utilisation de la chaîne brute
  }

  const found = benches.find((b: any) => {
    if (parsedId && b.id === parsedId) return true;
    if (directBenchId && b.id === directBenchId) return true;
    if (b.id === searchKey) return true;
    if (b.qrCodeToken && (b.qrCodeToken === searchKey || b.qrCodeToken === parsedToken)) return true;
    if (b.token && (b.token === searchKey || b.token === parsedToken)) return true;
    if (searchKey.includes(b.id)) return true;
    if (b.qrCodeToken && searchKey.includes(b.qrCodeToken)) return true;
    return false;
  });

  return found ? found.id : (parsedId || directBenchId || searchKey);
};

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { userId, firstName, lastName, benchId, isParked } = body;

    if (!userId || typeof isParked !== 'boolean') {
      return NextResponse.json(
        { error: 'Paramètres invalides : userId et isParked sont obligatoires.' },
        { status: 400 }
      );
    }

    const state: AppState = await readDB();
    let targetBench: any = null;

    if (isParked) {
      const targetBenchId = resolveScannedBenchId(body, state.benches);
      if (!targetBenchId) {
        return NextResponse.json(
          { error: 'Un QR Code valide ou un token est requis pour se garer.' },
          { status: 400 }
        );
      }

      targetBench = state.benches.find((b: any) => b.id === targetBenchId || b.qrCodeToken === targetBenchId);

      if (!targetBench) {
        return NextResponse.json(
          { error: 'QR code ou token invalide pour ce bench.' },
          { status: 403 }
        );
      }

      // Contrôle de sécurité : Empêcher de scanner un autre bench que celui assigné au profil utilisateur
      const existingUser = state.users.find((u: any) => u.id === userId);
      const userAssignedBenchId = existingUser?.benchId;

      if (userAssignedBenchId && targetBench.id !== userAssignedBenchId) {
        return NextResponse.json(
          { error: `Le QR code scanné (${targetBench.name}) ne correspond pas à votre bench assigné.` },
          { status: 403 }
        );
      }

      // 1. Contrôle capacité globale
      const currentParkedCount = state.users.filter((u: any) => u.isParked).length;
      if (currentParkedCount >= state.totalSpaces) {
        return NextResponse.json(
          { error: 'Le parking est globalement complet.' },
          { status: 403 }
        );
      }

      // 2. Contrôle capacité du bench
      const benchLimit = targetBench.capacity ?? targetBench.maxSpaces ?? Infinity;
      const parkedInBench = state.users.filter(
        (u: any) =>
          u.isParked &&
          (u.benchId ?? '') === targetBench.id &&
          u.id !== userId
      ).length;

      if (parkedInBench >= benchLimit) {
        return NextResponse.json(
          { error: `Le bench ${targetBench.name} a atteint sa capacité maximale.` },
          { status: 403 }
        );
      }

      // 3. Contrôle capacité de la branche
      const targetBranch = state.branches.find((br: any) => br.id === targetBench.branchId);
      if (targetBranch) {
        const branchLimit = targetBranch.capacity ?? targetBranch.maxSpaces ?? Infinity;
        const branchBenchIds = new Set(
          state.benches.filter((b: any) => b.branchId === targetBranch.id).map((b: any) => b.id)
        );

        const parkedInBranch = state.users.filter(
          (u: any) =>
            u.isParked &&
            branchBenchIds.has(u.benchId ?? '') &&
            u.id !== userId
        ).length;

        if (parkedInBranch >= branchLimit) {
          return NextResponse.json(
            { error: `La branche ${targetBranch.name} est complète.` },
            { status: 403 }
          );
        }
      }
    }

    const effectiveBenchId = benchId || (isParked && targetBench ? targetBench.id : undefined);

    const existingUserIndex = state.users.findIndex((u: any) => u.id === userId);
    let updatedUsers: UserState[];

    if (existingUserIndex !== -1) {
      updatedUsers = state.users.map((u: any, idx: number) => {
        if (idx === existingUserIndex) {
          return {
            ...u,
            firstName: firstName || u.firstName,
            lastName: lastName || u.lastName,
            benchId: effectiveBenchId || u.benchId,
            isParked,
          };
        }
        return u;
      });
    } else {
      const newUser: UserState = {
        id: userId,
        firstName: firstName || 'Utilisateur',
        lastName: lastName || '',
        benchId: effectiveBenchId || state.benches[0]?.id || '',
        isParked,
      };
      updatedUsers = [...state.users, newUser];
    }

    const parkedUsersCount = updatedUsers.filter((u: any) => u.isParked).length;
    const availableSpaces = Math.max(0, state.totalSpaces - parkedUsersCount);

    const newState: AppState = {
      ...state,
      users: updatedUsers,
      parkedUsersCount,
      availableSpaces,
    };

    const savedState = await writeDB(newState);

    return NextResponse.json(savedState, { status: 200 });
  } catch (error: unknown) {
    console.error('Erreur critique dans POST /api/park:', error);
    return NextResponse.json(
      { error: "Erreur interne du serveur lors de l'enregistrement de la place." },
      { status: 500 }
    );
  }
}
