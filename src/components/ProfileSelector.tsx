import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AppState } from '@/types';
import { User, LogIn } from 'lucide-react';

interface ProfileSelectorProps {
  state: AppState;
  onSelectProfile: (firstName: string, lastName: string, benchId: string) => void;
}

export function ProfileSelector({ state, onSelectProfile }: ProfileSelectorProps) {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [selectedBranch, setSelectedBranch] = useState('');
  const [selectedBench, setSelectedBench] = useState('');

  const availableBenches = useMemo(() => {
    if (!selectedBranch) return [];
    return state.benches.filter(b => b.branchId === selectedBranch);
  }, [selectedBranch, state.benches]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (firstName.trim() && lastName.trim() && selectedBench) {
      onSelectProfile(firstName.trim(), lastName.trim(), selectedBench);
    }
  };

  const isFormValid = firstName.trim().length > 1 && lastName.trim().length > 1 && selectedBench !== '';

  return (
    <AnimatePresence>
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm"
      >
        <motion.div 
          initial={{ scale: 0.9, y: 20 }}
          animate={{ scale: 1, y: 0 }}
          className="bg-card border border-border w-full max-w-md rounded-3xl p-6 shadow-2xl glass-dark"
        >
          <div className="flex flex-col items-center mb-8">
            <div className="w-16 h-16 bg-primary/20 rounded-full flex items-center justify-center mb-4">
              <User className="w-8 h-8 text-primary" />
            </div>
            <h2 className="text-2xl font-bold text-center">Bienvenue !</h2>
            <p className="text-muted-foreground text-center mt-2 text-sm">Veuillez renseigner votre profil pour accéder à la réservation de parking.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground ml-1">Prénom</label>
                <input 
                  type="text" 
                  value={firstName}
                  onChange={e => setFirstName(e.target.value)}
                  placeholder="Ex: Jean"
                  className="w-full bg-background/50 border border-border rounded-xl px-4 py-3 outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all text-foreground"
                  required
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground ml-1">Nom</label>
                <input 
                  type="text" 
                  value={lastName}
                  onChange={e => setLastName(e.target.value)}
                  placeholder="Ex: Dupont"
                  className="w-full bg-background/50 border border-border rounded-xl px-4 py-3 outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all text-foreground"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground ml-1">Branche</label>
              <select 
                value={selectedBranch}
                onChange={e => {
                  setSelectedBranch(e.target.value);
                  setSelectedBench('');
                }}
                className="w-full bg-background/50 border border-border rounded-xl px-4 py-3 outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all text-foreground appearance-none"
                required
              >
                <option value="" disabled>Sélectionnez une branche...</option>
                {state.branches.map(branch => (
                  <option key={branch.id} value={branch.id}>{branch.name}</option>
                ))}
              </select>
            </div>

            {selectedBranch && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="space-y-2"
              >
                <label className="text-sm font-medium text-foreground ml-1">Bench / Équipe</label>
                <select 
                  value={selectedBench}
                  onChange={e => setSelectedBench(e.target.value)}
                  className="w-full bg-background/50 border border-border rounded-xl px-4 py-3 outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all text-foreground appearance-none"
                  required
                >
                  <option value="" disabled>Sélectionnez un bench...</option>
                  {availableBenches.map(bench => (
                    <option key={bench.id} value={bench.id}>{bench.name}</option>
                  ))}
                </select>
              </motion.div>
            )}

            <button
              type="submit"
              disabled={!isFormValid}
              className={`w-full mt-6 flex items-center justify-center gap-2 py-4 rounded-xl font-bold transition-all ${
                isFormValid 
                  ? 'bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg shadow-primary/20 active:scale-[0.98]' 
                  : 'bg-muted text-muted-foreground cursor-not-allowed'
              }`}
            >
              Continuer <LogIn className="w-5 h-5" />
            </button>
          </form>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
