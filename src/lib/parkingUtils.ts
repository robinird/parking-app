import { Bench, Branch, SpaceAvailability, User } from '@/types';

/**
 * Calcule le statut de disponibilité en fonction de l'occupation et de la capacité.
 * - Vert : > 20% de places libres
 * - Orange : <= 20% de places libres
 * - Rouge : Complet (0 place)
 * - Illimité : Aucune capacité maximale définie
 */
export function getAvailabilityStatus(occupied: number, capacity?: number): SpaceAvailability {
  if (capacity === undefined || capacity === null || capacity <= 0) {
    return {
      occupied,
      capacity: undefined,
      free: undefined,
      freePercentage: undefined,
      status: 'unlimited',
      label: `${occupied} garé${occupied > 1 ? 's' : ''} (Illimité)`,
    };
  }

  const free = Math.max(0, capacity - occupied);
  const freePercentage = (free / capacity) * 100;

  let status: SpaceAvailability['status'] = 'green';
  if (free === 0) {
    status = 'red';
  } else if (freePercentage <= 20) {
    status = 'orange';
  }

  return {
    occupied,
    capacity,
    free,
    freePercentage,
    status,
    label: `${occupied} / ${capacity} (${free} libre${free > 1 ? 's' : ''})`,
  };
}

/**
 * Calcule la disponibilité spécifique à un Bench
 */
export function calculateBenchAvailability(
  bench?: Bench,
  users: User[] = []
): SpaceAvailability | undefined {
  if (!bench) return undefined;
  const occupied = users.filter((user) => user.benchId === bench.id && user.isParked).length;
  return getAvailabilityStatus(occupied, bench.capacity);
}

/**
 * Calcule la disponibilité spécifique à une Branche (agrégation de ses Benches)
 */
export function calculateBranchAvailability(
  branch?: Branch,
  benches: Bench[] = [],
  users: User[] = []
): SpaceAvailability | undefined {
  if (!branch) return undefined;
  const branchBenchIds = new Set(
    benches.filter((bench) => bench.branchId === branch.id).map((bench) => bench.id)
  );

  const occupied = users.filter(
    (user) => user.benchId && branchBenchIds.has(user.benchId) && user.isParked
  ).length;

  return getAvailabilityStatus(occupied, branch.capacity);
}
