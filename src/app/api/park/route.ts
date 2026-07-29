import { NextRequest, NextResponse } from 'next/server';
import { readDB, writeDB } from '@/lib/db';
import { AppState, User } from '@/types';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { userId, firstName, lastName, benchId, isParked, qrCodePayload, benchToken } = body;

    if (!userId || !benchId) {
      return NextResponse.json(
        { error: 'Paramètres userId et benchId obligatoires.' },
        { status: 400 }
      );
    }

    // 1. LECTURE BRUTE DE LA DB ET NORMALISATION STRICTE DES UTILISATEURS POUR CORRESPONDRE À APPSATE
    const rawState = await readDB();

    const normalizedUsers: User[] = (rawState.users || []).map((u: any) => ({
      id: u.id || u.userId || 'unknown',
      firstName: u.firstName || 'Anonyme',
      lastName: u.lastName || '',
      benchId: u.benchId || '',
      isParked: Boolean(u.isParked),
      parkedAt: u.parkedAt,
    }));

    const parkedCount = normalizedUsers.filter((u) => u.isParked).length;
    const availSpaces = Math.max(0, (rawState.totalSpaces || 0) - parkedCount);

    const state: AppState = {
      totalSpaces: rawState.totalSpaces || 50,
      branches: rawState.branches || [],
      benches: rawState.benches || [],
      users: normalizedUsers,
      parkedUsersCount: parkedCount,
      availableSpaces: availSpaces,
    };

    const targetBench = state.benches.find((b) => b.id === benchId);
    if (!targetBench) {
      return NextResponse.json(
        { error: 'Le bench spécifié est introuvable.' },
        { status: 404 }
      );
    }

    const targetBranch = state.branches.find((br) => br.id === targetBench.branchId);

    // 2. VALIDATION SÉCURISÉE DU QR CODE LORS DU STATIONNEMENT
    if (isParked) {
      const payload = qrCodePayload || benchToken;

      if (!payload) {
        return NextResponse.json(
          { error: 'Le scan du QR Code du bench est obligatoire pour se garer.' },
          { status: 400 }
        );
      }

      let scannedBenchId: string | undefined;
      let scannedToken: string | undefined;

      if (typeof payload === 'string') {
        const trimmed = payload.trim();
        if (trimmed.startsWith('{')) {
          try {
            const parsed = JSON.parse(trimmed);
            scannedBenchId = parsed.benchId;
            scannedToken = parsed.token;
          } catch {
            // Non-JSON, traité comme texte brut
          }
        }

        if (!scannedBenchId && trimmed.includes(':')) {
          const parts = trimmed.split(':');
          scannedBenchId = parts[0];
          scannedToken = parts[1];
        } else if (!scannedBenchId) {
          scannedToken = trimmed;
        }
      }

      // Vérification ID Bench
      if (scannedBenchId && scannedBenchId !== benchId) {
        return NextResponse.json(
          {
            error: `Ce QR Code appartient à un autre bench (${scannedBenchId}) et ne correspond pas à votre bench attribué (${targetBench.name}).`,
          },
          { status: 400 }
        );
      }

      // Vérification Token de sécurité
      const expectedToken = targetBench.qrCodeToken || targetBench.id;
      const providedToken = scannedToken || payload;

      if (providedToken !== expectedToken && providedToken !== targetBench.id) {
        return NextResponse.json(
          {
            error: `QR Code invalide pour le bench "${targetBench.name}". Veuillez scanner le code officiel présent sur place.`,
          },
          { status: 400 }
        );
      }

      // Vérification Capacité du Bench
      const parkedInBench = state.users.filter(
        (u) => u.isParked && u.benchId === benchId && u.id !== userId
      ).length;

      if (targetBench.capacity && parkedInBench >= targetBench.capacity) {
        return NextResponse.json(
          { error: `Le bench "${targetBench.name}" est actuellement complet.` },
          { status: 400 }
        );
      }

      // Vérification Capacité de la Branche
      if (targetBranch?.capacity) {
        const branchBenchIds = new Set(
          state.benches
            .filter((b) => b.branchId === targetBranch.id)
            .map((b) => b.id)
        );

        const parkedInBranch = state.users.filter(
          (u) => u.isParked && branchBenchIds.has(u.benchId) && u.id !== userId
        ).length;

        if (parkedInBranch >= targetBranch.capacity) {
          return NextResponse.json(
            { error: `La branche "${targetBranch.name}" est actuellement complète.` },
            { status: 400 }
          );
        }
      }

      // Vérification Capacité Globale
      if (state.availableSpaces <= 0) {
        return NextResponse.json(
          { error: 'Le parking global est complet.' },
          { status: 400 }
        );
      }
    }

    // 3. MISE À JOUR DE LA LISTE DES UTILISATEURS
    let userIndex = state.users.findIndex((u) => u.id === userId);
    const now = new Date().toISOString();

    if (userIndex >= 0) {
      state.users[userIndex] = {
        ...state.users[userIndex],
        firstName: firstName || state.users[userIndex].firstName,
        lastName: lastName || state.users[userIndex].lastName,
        benchId,
        isParked,
        parkedAt: isParked ? now : undefined,
      };
    } else {
      state.users.push({
        id: userId,
        firstName: firstName || 'Utilisateur',
        lastName: lastName || 'Anonyme',
        benchId,
        isParked,
        parkedAt: isParked ? now : undefined,
      });
    }

    // Recalcul final des compteurs
    const totalParked = state.users.filter((u) => u.isParked).length;
    state.parkedUsersCount = totalParked;
    state.availableSpaces = Math.max(0, state.totalSpaces - totalParked);

    // 4. ÉCRITURE PERSISTANTE EN BASE
    await writeDB(state as any);

    return NextResponse.json({
      success: true,
      data: state,
    });
  } catch (err: any) {
    console.error('Erreur critique dans /api/park:', err);
    return NextResponse.json(
      { error: err.message || 'Erreur serveur interne lors du changement d’état.' },
      { status: 500 }
    );
  }
}
