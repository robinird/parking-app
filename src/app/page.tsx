"use client"; 

import { useState, useEffect } from 'react';
import useSWR from 'swr';
import { AppState } from '@/types';
import { Header } from '@/components/Header';
import { ProfileSelector } from '@/components/ProfileSelector';
import { AdminModal } from '@/components/AdminModal';
import { ParkingButton } from '@/components/ParkingButton';
import { QrScannerModal } from '@/components/QrScannerModal';
import { calculateBenchAvailability, calculateBranchAvailability } from '@/lib/parkingUtils';
import { motion, AnimatePresence } from 'framer-motion';
import { CarFront, AlertTriangle } from 'lucide-react';

const fetcher = (url: string) => fetch(url).then(res => res.json());

export default function Dashboard() {
  const [isClient, setIsClient] = useState(false);
  const [isAdminOpen, setIsAdminOpen] = useState(false);
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [userId, setUserId] = useState<string>('');
  const [firstName, setFirstName] = useState<string>('');
  const [lastName, setLastName] = useState<string>('');
  const [benchId, setBenchId] = useState<string>('');
  const [isActionLoading, setIsActionLoading] = useState(false);
  const [actionError, setActionError] = useState<string>('');

  const { data: state, error, mutate } = useSWR<AppState>('/api/state', fetcher, {
    refreshInterval: 5000,
    revalidateOnFocus: true,
  });

  useEffect(() => {
    setIsClient(true);
    const storedUserId = localStorage.getItem('parking_user_id');
    const storedFirstName = localStorage.getItem('parking_user_firstName');
    const storedLastName = localStorage.getItem('parking_user_lastName');
    const storedBenchId = localStorage.getItem('parking_user_bench');

    if (storedUserId && storedFirstName && storedLastName && storedBenchId) {
      setUserId(storedUserId);
      setFirstName(storedFirstName);
      setLastName(storedLastName);
      setBenchId(storedBenchId);
    } else {
      const newId = `user_${Math.random().toString(36).substr(2, 9)}`;
      setUserId(newId);
      localStorage.setItem('parking_user_id', newId);
    }
  }, []);

  const handleSelectProfile = (fName: string, lName: string, bench: string) => {
    setFirstName(fName);
    setLastName(lName);
    setBenchId(bench);
    localStorage.setItem('parking_user_firstName', fName);
    localStorage.setItem('parking_user_lastName', lName);
    localStorage.setItem('parking_user_bench', bench);
  };

  const currentUserState = (state?.users || []).find(u => u.id === userId);
  const isParked = currentUserState?.isParked || false;

  const currentUserBench = (state?.benches || []).find(b => b.id === benchId);
  const currentUserBranch = (state?.branches || []).find(br => br.id === currentUserBench?.branchId);

  const benchAvailability = calculateBenchAvailability(currentUserBench, state?.users || []);
  const branchAvailability = calculateBranchAvailability(
    currentUserBranch,
    state?.benches || [],
    state?.users || []
  );

  // Sécurisation stricte des compteurs globaux pour ne jamais afficher 0/0 par défaut
  const safeTotalSpaces = Number(state?.totalSpaces) || 0;
  const parkedUsersCount = (state?.users || []).filter(u => u.isParked).length;
  const safeAvailableSpaces =
    state?.availableSpaces !== undefined &&
    state?.availableSpaces !== null &&
    !isNaN(Number(state.availableSpaces))
      ? Number(state.availableSpaces)
      : Math.max(0, safeTotalSpaces - parkedUsersCount);

  const isBenchFull = benchAvailability?.status === 'red';
  const isBranchFull = branchAvailability?.status === 'red';
  const isGlobalFull = safeTotalSpaces > 0 ? safeAvailableSpaces <= 0 : false;
  const needsProfile = !firstName || !lastName || !benchId;

  const isBlockedFromParking = !isParked && (isGlobalFull || isBenchFull || isBranchFull);
  const disabled = isBlockedFromParking || needsProfile;

  let statusMessage = "Une place vous attend !";
  if (isParked) {
    statusMessage = "Votre place est actuellement réservée.";
  } else if (isBlockedFromParking) {
    if (isGlobalFull) statusMessage = "Le parking est globalement complet pour le moment.";
    else if (isBenchFull) statusMessage = `Complet ! Il n'y a plus de places disponibles pour le bench ${currentUserBench?.name}.`;
    else if (isBranchFull) statusMessage = `Complet ! Il n'y a plus de places disponibles pour la branche ${currentUserBranch?.name}.`;
  }

  const executeParkingAction = async (targetParkedState: boolean, token?: string) => {
    if (!state) return;
    setIsActionLoading(true);
    setActionError('');

    const nextAvailableSpaces = safeAvailableSpaces + (targetParkedState ? -1 : 1);
    mutate({
      ...state,
      availableSpaces: Math.max(0, nextAvailableSpaces),
      users: (state.users || []).map(u => u.id === userId ? { ...u, isParked: targetParkedState } : u)
    }, false);

    try {
      const response = await fetch('/api/park', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          firstName,
          lastName,
          benchId,
          isParked: targetParkedState,
          token: token || ''
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Erreur serveur (${response.status})`);
      }

      await mutate();
    } catch (e: any) {
      console.error("Erreur lors de l'appel /api/park :", e);
      setActionError(e.message || "Une erreur est survenue lors de la synchronisation de la place.");
      await mutate();
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleParkingButtonClick = () => {
    setActionError('');
    if (isParked) {
      executeParkingAction(false);
    } else {
      setIsScannerOpen(true);
    }
  };

  const handleScanSuccess = (token: string) => {
    setIsScannerOpen(false);
    executeParkingAction(true, token);
  };

  if (!isClient || !state) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-screen">
        <div className="animate-pulse flex flex-col items-center gap-4 text-primary">
          <CarFront className="w-12 h-12" />
          <p className="font-medium text-lg">Chargement...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      {needsProfile && (
        <ProfileSelector state={state} onSelectProfile={handleSelectProfile} />
      )}
      
      <Header 
        available={safeAvailableSpaces} 
        total={safeTotalSpaces} 
        onOpenAdmin={() => setIsAdminOpen(true)} 
      />

      <AdminModal 
        isOpen={isAdminOpen} 
        onClose={() => setIsAdminOpen(false)} 
        state={state}
        onUpdate={() => mutate()}
      />

      <QrScannerModal
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        onScanSuccess={handleScanSuccess}
        benchName={currentUserBench?.name}
      />

      <main className="flex-1 flex flex-col items-center justify-center p-6 relative overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/5 rounded-full blur-[100px] -z-10 pointer-events-none" />
        
        <AnimatePresence mode="wait">
          {!needsProfile && (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-col items-center w-full max-w-md"
            >
              <div className="mb-8 text-center">
                <h2 className="text-2xl font-light mb-1">
                  Bonjour, <span className="font-bold">{firstName}</span>
                </h2>
                <p className={`text-sm ${isBlockedFromParking && !isParked ? 'text-destructive font-medium' : 'text-muted-foreground'}`}>
                  {statusMessage}
                </p>
              </div>

              {actionError && (
                <div className="mb-6 w-full p-3.5 bg-destructive/10 border border-destructive/30 rounded-xl flex items-center gap-2.5 text-destructive text-xs">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span className="font-medium">{actionError}</span>
                </div>
              )}

              <ParkingButton 
                isParked={isParked} 
                isLoading={isActionLoading} 
                onClick={handleParkingButtonClick} 
                disabled={disabled}
                user={currentUserState || {
                  id: userId,
                  firstName,
                  lastName,
                  benchId,
                  isParked: false,
                }}
                branches={state?.branches || []}
                benches={state?.benches || []}
                users={state?.users || []}
                branchAvailability={branchAvailability}
                benchAvailability={benchAvailability}
              />

              <div className="mt-12 flex items-center gap-2 px-4 py-2 rounded-full glass">
                <div className={`w-2.5 h-2.5 rounded-full animate-pulse ${
                  isParked ? 'bg-destructive' : isBlockedFromParking ? 'bg-muted-foreground' : 'bg-primary'
                }`} />
                <span className="text-sm font-medium">
                  {isParked ? "Occupé" : isBlockedFromParking ? "Complet" : "Libre"}
                </span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </>
  );
}
