import { motion } from 'framer-motion';
import { Power, Building2, Layers } from 'lucide-react';
import { cn } from '@/lib/utils';
import { SpaceAvailability } from '@/types';

interface ParkingButtonProps {
  isParked: boolean;
  isLoading: boolean;
  onClick: () => void;
  disabled?: boolean;
  branchName?: string;
  benchName?: string;
  branchAvailability?: SpaceAvailability;
  benchAvailability?: SpaceAvailability;
}

const statusStyles: Record<SpaceAvailability['status'], string> = {
  green: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30',
  orange: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30',
  red: 'bg-destructive/10 text-destructive border-destructive/30 animate-pulse',
  unlimited: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30',
};

const statusDotStyles: Record<SpaceAvailability['status'], string> = {
  green: 'bg-emerald-500',
  orange: 'bg-amber-500',
  red: 'bg-destructive',
  unlimited: 'bg-blue-500',
};

export function ParkingButton({
  isParked,
  isLoading,
  onClick,
  disabled,
  branchName,
  benchName,
  branchAvailability,
  benchAvailability,
}: ParkingButtonProps) {
  const isBenchFull = benchAvailability?.status === 'red' && !isParked;
  const isBranchFull = branchAvailability?.status === 'red' && !isParked;
  const isButtonDisabled = disabled || isLoading || isBenchFull || isBranchFull;

  return (
    <div className="flex flex-col items-center justify-center gap-8 w-full max-w-md mx-auto">
      {/* Badges d'occupation en temps réel */}
      {(branchAvailability || benchAvailability) && (
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 w-full px-4">
          {branchAvailability && branchName && (
            <div
              className={cn(
                'flex items-center gap-2.5 px-3.5 py-1.5 rounded-full border text-xs font-semibold shadow-sm transition-colors duration-300 w-full sm:w-auto justify-center',
                statusStyles[branchAvailability.status]
              )}
            >
              <Building2 className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate max-w-[120px]">{branchName}</span>
              <span className="opacity-40">•</span>
              <span
                className={cn(
                  'w-2 h-2 rounded-full shrink-0',
                  statusDotStyles[branchAvailability.status]
                )}
              />
              <span className="whitespace-nowrap">{branchAvailability.label}</span>
            </div>
          )}

          {benchAvailability && benchName && (
            <div
              className={cn(
                'flex items-center gap-2.5 px-3.5 py-1.5 rounded-full border text-xs font-semibold shadow-sm transition-colors duration-300 w-full sm:w-auto justify-center',
                statusStyles[benchAvailability.status]
              )}
            >
              <Layers className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate max-w-[120px]">{benchName}</span>
              <span className="opacity-40">•</span>
              <span
                className={cn(
                  'w-2 h-2 rounded-full shrink-0',
                  statusDotStyles[benchAvailability.status]
                )}
              />
              <span className="whitespace-nowrap">{benchAvailability.label}</span>
            </div>
          )}
        </div>
      )}

      {/* Bouton de stationnement principal */}
      <div className="relative w-72 h-72 mx-auto flex items-center justify-center">
        {/* Outer ring / Bezel */}
        <div
          className={cn(
            'absolute inset-0 rounded-full bg-gradient-to-br transition-all duration-500',
            isParked
              ? 'from-destructive/40 to-destructive/10'
              : 'from-primary/40 to-primary/10'
          )}
        />

        <div
          className={cn(
            'absolute inset-4 rounded-full bg-card shadow-xl transition-all duration-500'
          )}
        />

        {/* The actual push button */}
        <motion.button
          disabled={isButtonDisabled}
          onClick={onClick}
          whileTap={{ scale: isButtonDisabled ? 1 : 0.95 }}
          animate={{
            scale: isParked ? 0.98 : 1,
          }}
          transition={{ type: 'spring', stiffness: 300, damping: 20 }}
          className={cn(
            'relative z-10 w-56 h-56 rounded-full flex flex-col items-center justify-center gap-4 transition-all duration-500',
            isParked
              ? 'bg-gradient-to-br from-destructive to-[#dc2626] text-destructive-foreground shadow-3d-button-pressed translate-y-1'
              : 'bg-gradient-to-br from-primary to-[#059669] text-primary-foreground shadow-3d-button',
            isButtonDisabled && 'opacity-50 cursor-not-allowed'
          )}
        >
          <motion.div
            animate={{
              rotate: isLoading ? 360 : 0,
            }}
            transition={{
              duration: 2,
              repeat: isLoading ? Infinity : 0,
              ease: 'linear',
            }}
          >
            <Power
              className={cn(
                'w-12 h-12 transition-all duration-500',
                isParked
                  ? 'drop-shadow-[0_0_15px_rgba(255,255,255,0.6)]'
                  : 'drop-shadow-[0_0_8px_rgba(0,0,0,0.3)]'
              )}
            />
          </motion.div>

          <span className="font-bold tracking-wider text-xl uppercase text-center px-4">
            {isLoading
              ? '...'
              : isBenchFull || isBranchFull
              ? 'Complet'
              : isParked
              ? 'Libérer'
              : 'Se garer'}
          </span>
        </motion.button>
      </div>
    </div>
  );
}
