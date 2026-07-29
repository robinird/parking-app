import React, { useState } from 'react';
import { ParkingButton } from '@/components/ParkingButton';
import { AppState, User } from '@/types';

interface UserCardProps {
  currentUser: User;
  appState: AppState;
  onTogglePark: () => Promise<void>;
}

export function UserCard({ currentUser, appState, onTogglePark }: UserCardProps) {
  const [isLoading, setIsLoading] = useState(false);

  const handleClick = async () => {
    setIsLoading(true);
    try {
      await onTogglePark();
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="p-6 rounded-2xl bg-card border shadow-sm flex flex-col items-center justify-center gap-6">
      <ParkingButton
        isParked={currentUser.isParked}
        isLoading={isLoading}
        onClick={handleClick}
        user={currentUser}
        branches={appState.branches}
        benches={appState.benches}
        users={appState.users}
      />
    </div>
  );
}
