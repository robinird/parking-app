import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AppState, Branch, Bench } from '@/types';
import { X, Save, Lock, AlertCircle, Plus, Trash2 } from 'lucide-react';
import { Settings as SettingsIcon } from 'lucide-react';

interface AdminModalProps {
  isOpen: boolean;
  onClose: () => void;
  state: AppState;
  onUpdate: () => void;
}

export function AdminModal({ isOpen, onClose, state, onUpdate }: AdminModalProps) {
  const [code, setCode] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  
  const [totalSpaces, setTotalSpaces] = useState(state.totalSpaces);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [benches, setBenches] = useState<Bench[]>([]);
  
  const [error, setError] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  
  const [selectedBranchId, setSelectedBranchId] = useState<string>('');

  // Sync state when modal opens or state changes (if authenticated)
  useEffect(() => {
    if (isOpen) {
      setTotalSpaces(state.totalSpaces);
      setBranches([...state.branches]);
      setBenches([...state.benches]);
      if (state.branches.length > 0 && !selectedBranchId) {
        setSelectedBranchId(state.branches[0].id);
      }
    } else {
      // Reset authentication on close
      setIsAuthenticated(false);
      setCode('');
      setError('');
    }
  }, [isOpen, state]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim()) return;
    
    setIsVerifying(true);
    setError('');
    
    try {
      const res = await fetch('/api/admin/verify', {
        method: 'POST',
        headers: {
          'x-admin-code': code
        }
      });
      
      const data = await res.json();
      
      if (!res.ok || !data.valid) {
        throw new Error(data.error || 'Code incorrect');
      }
      
      setIsAuthenticated(true);
    } catch (err: any) {
      setError(err.message);
      setCode('');
    } finally {
      setIsVerifying(false);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    setError('');
    
    try {
      const res = await fetch('/api/admin/config', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-code': code
        },
        body: JSON.stringify({
          totalSpaces: Number(totalSpaces),
          branches,
          benches
        })
      });

      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.error || 'Erreur inconnue');
      }

      onUpdate();
      onClose();
    } catch (err: any) {
      setError(err.message === 'Unauthorized' ? 'Session expirée, veuillez vous reconnecter' : err.message);
      if (err.message === 'Unauthorized') {
        setIsAuthenticated(false);
        setCode('');
      }
    } finally {
      setIsSaving(false);
    }
  };

  // Branch CRUD
  const addBranch = () => {
    const newId = `b_${Date.now()}`;
    setBranches([...branches, { id: newId, name: 'Nouvelle Branche' }]);
    setSelectedBranchId(newId);
  };
  
  const updateBranch = (id: string, name: string) => {
    setBranches(branches.map(b => b.id === id ? { ...b, name } : b));
  };
  
  const removeBranch = (id: string) => {
    setBranches(branches.filter(b => b.id !== id));
    setBenches(benches.filter(b => b.branchId !== id)); // Cascade delete benches visually
    if (selectedBranchId === id) {
      setSelectedBranchId('');
    }
  };

  // Bench CRUD
  const currentBenches = benches.filter(b => b.branchId === selectedBranchId);
  
  const addBench = () => {
    if (!selectedBranchId) return;
    const newId = `bench_${Date.now()}`;
    setBenches([...benches, { id: newId, branchId: selectedBranchId, name: 'Nouveau Bench' }]);
  };
  
  const updateBench = (id: string, name: string) => {
    setBenches(benches.map(b => b.id === id ? { ...b, name } : b));
  };
  
  const removeBench = (id: string) => {
    setBenches(benches.filter(b => b.id !== id));
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-background/80 backdrop-blur-md overflow-y-auto">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="bg-card border border-border w-full max-w-2xl rounded-3xl shadow-2xl relative my-8 flex flex-col max-h-[90vh]"
        >
          <div className="flex items-center justify-between p-6 border-b border-border bg-muted/30 shrink-0">
            <h2 className="text-xl font-bold flex items-center gap-2">
              <SettingsIcon className="w-5 h-5 text-primary" />
              Administration
            </h2>
            <button onClick={onClose} className="p-2 bg-background hover:bg-muted rounded-full transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="p-6 overflow-y-auto flex-1">
            {!isAuthenticated ? (
              <form onSubmit={handleLogin} className="space-y-4 max-w-sm mx-auto mt-8 mb-12">
                <div className="flex flex-col items-center mb-6 text-center">
                  <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
                    <Lock className="w-8 h-8 text-muted-foreground" />
                  </div>
                  <p className="text-muted-foreground text-sm">Veuillez saisir le code d'administration pour modifier les paramètres.</p>
                </div>
                
                {error && (
                  <div className="p-3 bg-destructive/10 text-destructive text-sm rounded-lg flex items-center gap-2">
                    <AlertCircle className="w-4 h-4" /> {error}
                  </div>
                )}
                
                <input 
                  type="password" 
                  value={code}
                  onChange={e => setCode(e.target.value)}
                  placeholder="Code secret..."
                  className="w-full bg-background border border-border rounded-xl px-4 py-3 text-center tracking-[0.5em] font-mono text-xl focus:border-primary outline-none transition-all"
                  autoFocus
                  disabled={isVerifying}
                />
                
                <button
                  type="submit"
                  disabled={!code.trim() || isVerifying}
                  className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-bold hover:bg-primary/90 disabled:opacity-50 transition-all"
                >
                  {isVerifying ? 'Vérification...' : 'Déverrouiller'}
                </button>
              </form>
            ) : (
              <div className="space-y-8">
                {/* Global Settings */}
                <section className="space-y-4">
                  <h3 className="font-semibold text-lg border-b border-border pb-2">Général</h3>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">Nombre total de places globales</label>
                    <input 
                      type="number" 
                      min="1"
                      value={totalSpaces}
                      onChange={e => setTotalSpaces(Number(e.target.value))}
                      className="w-full max-w-xs bg-background border border-border rounded-xl px-4 py-3 outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all text-foreground"
                    />
                  </div>
                </section>

                {/* Branches & Benches Management */}
                <section className="space-y-4">
                  <h3 className="font-semibold text-lg border-b border-border pb-2">Structure de l'entreprise</h3>
                  
                  <div className="flex flex-col md:flex-row gap-6">
                    {/* Branches List */}
                    <div className="flex-1 space-y-3">
                      <div className="flex items-center justify-between">
                        <label className="text-sm font-medium text-muted-foreground">Branches</label>
                        <button onClick={addBranch} className="text-primary hover:text-primary/80 flex items-center gap-1 text-xs font-medium">
                          <Plus className="w-3 h-3" /> Ajouter
                        </button>
                      </div>
                      <div className="bg-muted/20 border border-border rounded-xl p-2 space-y-2 max-h-[300px] overflow-y-auto">
                        {branches.map(branch => (
                          <div 
                            key={branch.id}
                            onClick={() => setSelectedBranchId(branch.id)}
                            className={`flex items-center gap-2 p-2 rounded-lg cursor-pointer transition-colors ${selectedBranchId === branch.id ? 'bg-primary/10 border border-primary/20' : 'hover:bg-muted'}`}
                          >
                            <input 
                              type="text" 
                              value={branch.name}
                              onChange={e => updateBranch(branch.id, e.target.value)}
                              className="bg-transparent border-none outline-none flex-1 font-medium text-sm"
                            />
                            <button onClick={(e) => { e.stopPropagation(); removeBranch(branch.id); }} className="text-muted-foreground hover:text-destructive p-1">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        ))}
                        {branches.length === 0 && <p className="text-xs text-muted-foreground text-center p-4">Aucune branche.</p>}
                      </div>
                    </div>

                    {/* Benches List */}
                    <div className="flex-1 space-y-3">
                      <div className="flex items-center justify-between">
                        <label className="text-sm font-medium text-muted-foreground">
                          Benches {selectedBranchId && `(${branches.find(b => b.id === selectedBranchId)?.name})`}
                        </label>
                        {selectedBranchId && (
                          <button onClick={addBench} className="text-primary hover:text-primary/80 flex items-center gap-1 text-xs font-medium">
                            <Plus className="w-3 h-3" /> Ajouter
                          </button>
                        )}
                      </div>
                      
                      <div className="bg-muted/20 border border-border rounded-xl p-2 space-y-2 max-h-[300px] overflow-y-auto">
                        {!selectedBranchId ? (
                          <p className="text-xs text-muted-foreground text-center p-4">Sélectionnez une branche.</p>
                        ) : currentBenches.length === 0 ? (
                          <p className="text-xs text-muted-foreground text-center p-4">Aucun bench.</p>
                        ) : (
                          currentBenches.map(bench => (
                            <div key={bench.id} className="flex items-center gap-2 p-2 rounded-lg bg-background border border-border">
                              <input 
                                type="text" 
                                value={bench.name}
                                onChange={e => updateBench(bench.id, e.target.value)}
                                className="bg-transparent border-none outline-none flex-1 text-sm"
                              />
                              <button onClick={() => removeBench(bench.id)} className="text-muted-foreground hover:text-destructive p-1">
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <div className="bg-blue-500/10 text-blue-500 p-3 rounded-lg text-xs mt-2 flex gap-2 items-start">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                    <p>Attention : La suppression d'une branche ou d'un bench ne modifie pas rétroactivement les utilisateurs déjà enregistrés dessus. Soyez vigilant.</p>
                  </div>
                </section>
                
                {error && (
                  <div className="p-3 bg-destructive/10 text-destructive text-sm rounded-lg flex items-center gap-2">
                    <AlertCircle className="w-4 h-4" /> {error}
                  </div>
                )}

                <div className="pt-4 border-t border-border mt-8 flex justify-end">
                  <button
                    onClick={handleSave}
                    disabled={isSaving}
                    className="flex items-center justify-center gap-2 px-8 py-3 rounded-xl bg-primary text-primary-foreground font-bold hover:bg-primary/90 transition-all disabled:opacity-50"
                  >
                    {isSaving ? 'Enregistrement...' : (
                      <>Sauvegarder <Save className="w-4 h-4" /></>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
