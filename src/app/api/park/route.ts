import { NextResponse } from 'next/server';
import { readDB, writeDB } from '@/lib/db';
import { AppState, UserState } from '@/types';

interface ParseResult {
  token: string;
  parsedBenchId?: string;
} 

const resolveTokenAndBench = (payload: Record<string, unknown>): ParseResult => {
  let token = typeof payload.token === 'string' ? payload.token.trim() : '';
  let parsedBenchId: string | undefined = undefined; 

  const rawQrData = typeof payload.qrCodeData === 'string' ? payload.qrCodeData.trim() : '';
  if (!token && rawQrData) {
    try {
      const parsed = JSON.parse(rawQrData);
      if (parsed && typeof parsed === 'object') {
        if ('token' in parsed && typeof parsed.token === 'string') {
          token = parsed.token.trim();
        }
        if ('benchId' in parsed && typeof parsed.benchId === 'string') {
          parsedBenchId = parsed.benchId.trim();
        }
      }
    } catch {
      token = rawQrData;
    }
  }

  return { token, parsedBenchId };
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

    const { token, parsedBenchId } = resolveTokenAndBench(body);
    const state: AppState = await readDB();

    // Typage explicite pour éviter l'inférence implicite de type 'any' sous TypeScript strict
    let targetBench: any = null;

    if (isParked) {
      if (!token && !parsedBenchId) {
        return NextResponse.json(
          { error: 'Un QR Code valide ou un token est requis pour se garer.' },
          { status: 400 }
        );
      }

      // 1. Recherche du bench cible strictement basé sur le QR code scanné
      targetBench = state.benches.find((b) => {
        if (parsedBenchId && b.id === parsedBenchId) return true;
        if (b.qrCodeToken && b.qrCodeToken === token) return true;
        if ((b as any).token && (b as any).token === token) return true;
        if (b.id === token) return true;
        return false;
      });

      if (!targetBench) {
        return NextResponse.json(
          { error: 'QR code ou token invalide pour ce bench.' },
          { status: 403 }
        );
      }

      // 2. CONTRÔLE DE SÉCURITÉ : Vérifier que le QR code scanné correspond bien au bench assigné au profil
      if (benchId && targetBench.id !== benchId) {
        return NextResponse.json(
          { error: `Le QR code scanné (${targetBench.name}) ne correspond pas à votre bench assigné.` },
          { status: 403 }
        );
      }

      // 3. Contrôle capacité globale
      const currentParkedCount = state.users.filter((u) => u.isParked).length;
      if (currentParkedCount >= state.totalSpaces) {
        return NextResponse.json(
          { error: 'Le parking est globalement complet.' },
          { status: 403 }
        );
      }

      // 4. Contrôle capacité du bench
      const benchLimit = targetBench.capacity ?? (targetBench as any).maxSpaces ?? Infinity;
      const parkedInBench = state.users.filter(
        (u) =>
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

      // 5. Contrôle capacité de la branche
      const targetBranch = state.branches.find((br) => br.id === targetBench.branchId);
      if (targetBranch) {
        const branchLimit = targetBranch.capacity ?? (targetBranch as any).maxSpaces ?? Infinity;
        const branchBenchIds = new Set(
          state.benches.filter((b) => b.branchId === targetBranch.id).map((b) => b.id)
        );

        const parkedInBranch = state.users.filter(
          (u) =>
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

    const existingUserIndex = state.users.findIndex((u) => u.id === userId);
    let updatedUsers: UserState[];

    if (existingUserIndex !== -1) {
      updatedUsers = state.users.map((u, idx) => {
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

    const parkedUsersCount = updatedUsers.filter((u) => u.isParked).length;
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
