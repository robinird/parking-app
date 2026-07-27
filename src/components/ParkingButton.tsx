import { motion } from 'framer-motion';
import { Power } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ParkingButtonProps {
  isParked: boolean;
  isLoading: boolean;
  onClick: () => void;
  disabled?: boolean;
}

export function ParkingButton({ isParked, isLoading, onClick, disabled }: ParkingButtonProps) {
  return (
    <div className="relative w-72 h-72 mx-auto flex items-center justify-center">
      {/* Outer ring / Bezel */}
      <div className={cn(
        "absolute inset-0 rounded-full bg-gradient-to-br transition-all duration-500",
        isParked 
          ? "from-destructive/40 to-destructive/10" 
          : "from-primary/40 to-primary/10"
      )} />
      
      <div className={cn(
        "absolute inset-4 rounded-full bg-card shadow-xl transition-all duration-500",
      )} />

      {/* The actual push button */}
      <motion.button
        disabled={disabled || isLoading}
        onClick={onClick}
        whileTap={{ scale: 0.95 }}
        animate={{ 
          scale: isParked ? 0.98 : 1,
        }}
        transition={{ type: "spring", stiffness: 300, damping: 20 }}
        className={cn(
          "relative z-10 w-56 h-56 rounded-full flex flex-col items-center justify-center gap-4 transition-all duration-500",
          isParked 
            ? "bg-gradient-to-br from-destructive to-[#dc2626] text-destructive-foreground shadow-3d-button-pressed translate-y-1" 
            : "bg-gradient-to-br from-primary to-[#059669] text-primary-foreground shadow-3d-button",
          disabled && "opacity-50 cursor-not-allowed"
        )}
      >
        <motion.div
          animate={{ 
            rotate: isLoading ? 360 : 0 
          }}
          transition={{ 
            duration: 2, 
            repeat: isLoading ? Infinity : 0, 
            ease: "linear" 
          }}
        >
          <Power className={cn(
            "w-12 h-12 transition-all duration-500",
            isParked ? "drop-shadow-[0_0_15px_rgba(255,255,255,0.6)]" : "drop-shadow-[0_0_8px_rgba(0,0,0,0.3)]"
          )} />
        </motion.div>
        
        <span className="font-bold tracking-wider text-xl uppercase">
          {isLoading ? '...' : isParked ? 'Libérer' : 'Se garer'}
        </span>
      </motion.button>
    </div>
  );
}
