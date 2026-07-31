"use client";

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AppState, Branch, Bench } from '@/types';
import {
  X,
  Save,
  Lock,
  AlertCircle,
  Plus,
  Trash2,
  Users,
  SlidersHorizontal,
  UserMinus,
  QrCode,
  Printer,
  RefreshCw,
  Settings as SettingsIcon,
} from 'lucide-react';

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

  const [activeTab, setActiveTab] = useState<'config' | 'users'>('config');

  const [totalSpaces, setTotalSpaces] = useState<number>(0);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [benches, setBenches] = useState<Bench[]>([]);

  const [error, setError] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [selectedBranchId, setSelectedBranchId] = useState<string>('');
  const [isUnparkingId, setIsUnparkingId] = useState<string | null>(null);

  const [qrModalBench, setQrModalBench] = useState<Bench | null>(null);

  // Initialisation correcte de l'état local du modal uniquement à l'ouverture (évite l'écrasement par le SWR en arrière-plan)
  useEffect(() => {
    if (isOpen && state) {
      setTotalSpaces(Number(state.totalSpaces) || 0);
      setBranches(state.branches ? JSON.parse(JSON.stringify(state.branches)) : []);
      setBenches(
        state.benches
          ? JSON.parse(JSON.stringify(state.benches)).map((b: Bench) => ({
              ...b,
              qrCodeToken: b.qrCodeToken || `token_${b.id}_${Math.random().toString(36).substring(2, 7)}`,
            }))
          : []
      );
      if (state.branches && state.branches.length > 0 && !selectedBranchId) {
        setSelectedBranchId(state.branches[0].id);
      }
    } else if (!isOpen) {
      setIsAuthenticated(false);
      setCode('');
      setError('');
      setActiveTab('config');
      setQrModalBench(null);
    }
  }, [isOpen]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim()) return;

    setIsVerifying(true);
    setError('');

    try {
      const res = await fetch('/api/admin/verify', {
        method: 'POST',
        headers: {
          'x-admin-code': code,
        },
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
      const parsedTotalSpaces = Number(totalSpaces) || 0;
      const res = await fetch('/api/admin/config', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-code': code,
        },
        body: JSON.stringify({
          totalSpaces: parsedTotalSpaces,
          branches,
          benches,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Erreur inconnue lors de la sauvegarde');
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

  const handleForceUnpark = async (user: any) => {
    const targetId = user.id || user.userId;
    setIsUnparkingId(targetId);
    setError('');

    try {
      const res = await fetch('/api/park', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: targetId,
          firstName: user.firstName || 'Ancien',
          lastName: user.lastName || 'Utilisateur',
          benchId: user.benchId || 'bench-default',
          isParked: false,
        }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || `Erreur serveur (${res.status}) lors de la libération.`);
      }

      onUpdate();
    } catch (err: any) {
      console.error('Erreur handleForceUnpark:', err);
      setError(err.message || 'Une erreur inattendue est survenue.');
    } finally {
      setIsUnparkingId(null);
    }
  };

  const addBranch = () => {
    const newId = `b_${Date.now()}`;
    const newBranch: Branch = { id: newId, name: 'Nouvelle Branche', capacity: 20 };
    setBranches([...branches, newBranch]);
    setSelectedBranchId(newId);
  };

  const updateBranch = (id: string, name: string) => {
    setBranches(branches.map((b) => (b.id === id ? { ...b, name } : b)));
  };

  const updateBranchCapacity = (id: string, capacity: string) => {
    setBranches(
      branches.map((b) => (b.id === id ? { ...b, capacity: capacity ? Number(capacity) : undefined } : b))
    );
  };

  const removeBranch = (id: string) => {
    setBranches(branches.filter((b) => b.id !== id));
    setBenches(benches.filter((b) => b.branchId !== id));
    if (selectedBranchId === id) {
      setSelectedBranchId('');
    }
  };

  const currentBenches = benches.filter((b) => b.branchId === selectedBranchId);

  const addBench = () => {
    if (!selectedBranchId) return;
    const newId = `bench_${Date.now()}`;
    const newToken = `tok_${Math.random().toString(36).substring(2, 9)}`;
    const newBench: Bench = {
      id: newId,
      branchId: selectedBranchId,
      name: 'Nouveau Bench',
      capacity: 5,
      qrCodeToken: newToken,
    };
    setBenches([...benches, newBench]);
  };

  const updateBench = (id: string, name: string) => {
    setBenches(benches.map((b) => (b.id === id ? { ...b, name } : b)));
  };

  const updateBenchCapacity = (id: string, capacity: string) => {
    setBenches(
      benches.map((b) => (b.id === id ? { ...b, capacity: capacity ? Number(capacity) : undefined } : b))
    );
  };

  const removeBench = (id: string) => {
    setBenches(benches.filter((b) => b.id !== id));
  };

  const regenerateBenchToken = (benchId: string) => {
    const newToken = `tok_${Math.random().toString(36).substring(2, 9)}`;
    setBenches((prev) =>
      prev.map((b) => (b.id === benchId ? { ...b, qrCodeToken: newToken } : b))
    );
    if (qrModalBench && qrModalBench.id === benchId) {
      setQrModalBench({ ...qrModalBench, qrCodeToken: newToken });
    }
  };

  if (!isOpen) return null;
  const parkedUsersList = (state?.users || []).filter((u) => u.isParked);

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-background/80 backdrop-blur-md overflow-y-auto">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="bg-card border border-border w-full max-w-3xl rounded-3xl shadow-2xl relative my-8 flex flex-col max-h-[90vh]"
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
                  <p className="text-muted-foreground text-sm">Veuillez saisir le code d'administration pour accéder aux paramètres.</p>
                </div>

                {error && (
                  <div className="p-3 bg-destructive/10 text-destructive text-sm rounded-lg flex items-center gap-2">
                    <AlertCircle className="w-4 h-4" /> {error}
                  </div>
                )}

                <input
                  type="password"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
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
              <div className="space-y-6">
                <div className="flex bg-muted p-1 rounded-xl w-full max-w-md mx-auto mb-6">
                  <button
                    onClick={() => { setActiveTab('config'); setError(''); }}
                    className={`flex-1 py-2 text-sm font-medium rounded-lg flex items-center justify-center gap-2 transition-all ${activeTab === 'config' ? 'bg-background shadow text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                  >
                    <SlidersHorizontal className="w-4 h-4" /> Configuration
                  </button>
                  <button
                    onClick={() => { setActiveTab('users'); setError(''); }}
                    className={`flex-1 py-2 text-sm font-medium rounded-lg flex items-center justify-center gap-2 transition-all ${activeTab === 'users' ? 'bg-background shadow text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                  >
                    <Users className="w-4 h-4" /> Utilisateurs garés ({parkedUsersList.length})
                  </button>
                </div>

                {error && (
                  <div className="p-3 bg-destructive/10 text-destructive text-sm rounded-lg flex items-center gap-2">
                    <AlertCircle className="w-4 h-4" /> {error}
                  </div>
                )}

                {activeTab === 'users' && (
                  <div className="space-y-4">
                    <h3 className="font-semibold text-lg border-b border-border pb-2">Suivi des places en temps réel</h3>

                    {parkedUsersList.length === 0 ? (
                      <div className="text-center p-8 bg-muted/20 border border-border rounded-xl">
                        <Users className="w-12 h-12 text-muted-foreground mx-auto mb-3 opacity-50" />
                        <p className="text-muted-foreground text-sm">Le parking est actuellement vide.</p>
                      </div>
                    ) : (
                      <div className="bg-muted/20 border border-border rounded-xl overflow-hidden">
                        <table className="w-full text-left text-sm">
                          <thead className="bg-muted/50 text-muted-foreground border-b border-border">
                            <tr>
                              <th className="px-4 py-3 font-medium">Utilisateur</th>
                              <th className="px-4 py-3 font-medium">Emplacement</th>
                              <th className="px-4 py-3 font-medium">Arrivé(e) le</th>
                              <th className="px-4 py-3 font-medium text-right">Action</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-border">
                            {parkedUsersList.map((user) => {
                              const bBench = (state?.benches || []).find((b) => b.id === user.benchId);
                              const bBranch = (state?.branches || []).find((br) => br.id === bBench?.branchId);

                              const u = user as any;
                              const targetId = u.id || u.userId;

                              return (
                                <tr key={targetId} className="hover:bg-muted/30 transition-colors">
                                  <td className="px-4 py-3 font-medium text-foreground">
                                    {u.firstName || 'Ancien'} {u.lastName || 'Utilisateur'}
                                  </td>
                                  <td className="px-4 py-3">
                                    <div className="text-xs text-muted-foreground">{bBranch?.name || 'Inconnu'}</div>
                                    <div>{bBench?.name || 'Inconnu'}</div>
                                  </td>
                                  <td className="px-4 py-3 text-muted-foreground">
                                    {u.parkedAt ? new Date(u.parkedAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) : 'N/A'}
                                  </td>
                                  <td className="px-4 py-3 text-right">
                                    <button
                                      onClick={() => handleForceUnpark(u)}
                                      disabled={isUnparkingId === targetId}
                                      className="text-xs bg-destructive/10 text-destructive hover:bg-destructive hover:text-destructive-foreground px-3 py-1.5 rounded-lg font-medium transition-colors flex items-center gap-1 ml-auto disabled:opacity-50"
                                    >
                                      {isUnparkingId === targetId ? '...' : <><UserMinus className="w-3 h-3" /> Libérer</>}
                                    </button>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}

                {activeTab === 'config' && (
                  <>
                    <section className="space-y-4">
                      <h3 className="font-semibold text-lg border-b border-border pb-2">Général</h3>
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-foreground">Nombre total de places globales</label>
                        <input
                          type="number"
                          min="0"
                          value={totalSpaces}
                          onChange={(e) => setTotalSpaces(e.target.value === '' ? 0 : Number(e.target.value))}
                          className="w-full max-w-xs bg-background border border-border rounded-xl px-4 py-3 outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all text-foreground"
                        />
                      </div>
                    </section>

                    <section className="space-y-4">
                      <h3 className="font-semibold text-lg border-b border-border pb-2">Structure et QR Codes Benches</h3>

                      <div className="flex flex-col md:flex-row gap-6">
                        <div className="flex-1 space-y-3">
                          <div className="flex items-center justify-between">
                            <label className="text-sm font-medium text-muted-foreground">Branches</label>
                            <button onClick={addBranch} className="text-primary hover:text-primary/80 flex items-center gap-1 text-xs font-medium">
                              <Plus className="w-3 h-3" /> Ajouter
                            </button>
                          </div>
                          <div className="bg-muted/20 border border-border rounded-xl p-2 space-y-2 max-h-[350px] overflow-y-auto">
                            {branches.map((branch) => (
                              <div
                                key={branch.id}
                                onClick={() => setSelectedBranchId(branch.id)}
                                className={`flex flex-col gap-2 p-3 rounded-lg cursor-pointer transition-colors ${selectedBranchId === branch.id ? 'bg-primary/5 border-l-2 border-primary' : 'hover:bg-muted border-l-2 border-transparent'}`}
                              >
                                <div className="flex items-center justify-between">
                                  <input
                                    type="text"
                                    value={branch.name}
                                    onChange={(e) => updateBranch(branch.id, e.target.value)}
                                    placeholder="Nom de la branche"
                                    className="bg-transparent border-none outline-none font-medium text-sm w-3/4"
                                  />
                                  <button onClick={(e) => { e.stopPropagation(); removeBranch(branch.id); }} className="text-muted-foreground hover:text-destructive p-1">
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </div>
                                <div className="flex items-center gap-2 text-xs">
                                  <span className="text-muted-foreground whitespace-nowrap">Capacité Max :</span>
                                  <input
                                    type="number"
                                    value={branch.capacity !== undefined ? branch.capacity : ''}
                                    onChange={(e) => updateBranchCapacity(branch.id, e.target.value)}
                                    placeholder="Illimitée"
                                    className="bg-background border border-border rounded px-2 py-1 outline-none w-20 text-xs"
                                  />
                                </div>
                              </div>
                            ))}
                            {branches.length === 0 && <p className="text-xs text-muted-foreground text-center p-4">Aucune branche.</p>}
                          </div>
                        </div>

                        <div className="flex-1 space-y-3">
                          <div className="flex items-center justify-between">
                            <label className="text-sm font-medium text-muted-foreground">
                              Benches {selectedBranchId && `(${branches.find((b) => b.id === selectedBranchId)?.name || ''})`}
                            </label>
                            {selectedBranchId && (
                              <button onClick={addBench} className="text-primary hover:text-primary/80 flex items-center gap-1 text-xs font-medium">
                                <Plus className="w-3 h-3" /> Ajouter
                              </button>
                            )}
                          </div>

                          <div className="bg-muted/20 border border-border rounded-xl p-2 space-y-2 max-h-[350px] overflow-y-auto">
                            {!selectedBranchId ? (
                              <p className="text-xs text-muted-foreground text-center p-4">Sélectionnez une branche.</p>
                            ) : currentBenches.length === 0 ? (
                              <p className="text-xs text-muted-foreground text-center p-4">Aucun bench.</p>
                            ) : (
                              currentBenches.map((bench) => (
                                <div key={bench.id} className="flex flex-col gap-2 p-3 rounded-lg bg-background border border-border">
                                  <div className="flex items-center justify-between">
                                    <input
                                      type="text"
                                      value={bench.name}
                                      onChange={(e) => updateBench(bench.id, e.target.value)}
                                      placeholder="Nom du bench"
                                      className="bg-transparent border-none outline-none font-medium text-sm w-3/4"
                                    />
                                    <div className="flex items-center gap-1">
                                      <button
                                        onClick={() => setQrModalBench(bench)}
                                        title="Imprimer le QR Code"
                                        className="text-primary hover:bg-primary/10 p-1 rounded transition-colors"
                                      >
                                        <QrCode className="w-4 h-4" />
                                      </button>
                                      <button onClick={() => removeBench(bench.id)} className="text-muted-foreground hover:text-destructive p-1">
                                        <Trash2 className="w-4 h-4" />
                                      </button>
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-2 text-xs">
                                    <span className="text-muted-foreground whitespace-nowrap">Capacité Max :</span>
                                    <input
                                      type="number"
                                      value={bench.capacity !== undefined ? bench.capacity : ''}
                                      onChange={(e) => updateBenchCapacity(bench.id, e.target.value)}
                                      placeholder="Illimitée"
                                      className="bg-muted border border-border rounded px-2 py-1 outline-none w-20 text-xs"
                                    />
                                  </div>
                                </div>
                              ))
                            )}
                          </div>
                        </div>
                      </div>
                    </section>

                    <div className="pt-4 border-t border-border mt-8 flex justify-end">
                      <button
                        onClick={handleSave}
                        disabled={isSaving}
                        className="flex items-center justify-center gap-2 px-8 py-3 rounded-xl bg-primary text-primary-foreground font-bold hover:bg-primary/90 transition-all disabled:opacity-50"
                      >
                        {isSaving ? 'Enregistrement...' : (
                          <>Sauvegarder la configuration <Save className="w-4 h-4" /></>
                        )}
                      </button>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        </motion.div>

        {qrModalBench && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-card border border-border rounded-3xl p-6 max-w-sm w-full flex flex-col items-center gap-4 shadow-2xl relative"
            >
              <button
                onClick={() => setQrModalBench(null)}
                className="absolute top-4 right-4 p-2 text-muted-foreground hover:text-foreground rounded-full hover:bg-muted"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="text-center">
                <h3 className="font-bold text-lg text-foreground">{qrModalBench.name}</h3>
                <p className="text-xs text-muted-foreground">QR Code d'authentification physique</p>
              </div>

              <div className="bg-white p-4 rounded-2xl shadow-md border border-border flex items-center justify-center">
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(
                    JSON.stringify({
                      benchId: qrModalBench.id,
                      token: qrModalBench.qrCodeToken || qrModalBench.id,
                    })
                  )}`}
                  alt={`QR Code ${qrModalBench.name}`}
                  className="w-48 h-48 object-contain"
                />
              </div>

              <div className="w-full bg-muted/40 p-2.5 rounded-xl text-[10px] font-mono text-center text-muted-foreground break-all">
                Payload : {JSON.stringify({ benchId: qrModalBench.id, token: qrModalBench.qrCodeToken || qrModalBench.id })}
              </div>

              <div className="flex w-full gap-2">
                <button
                  onClick={() => regenerateBenchToken(qrModalBench.id)}
                  title="Régénérer le jeton"
                  className="px-3 py-2 bg-muted text-muted-foreground hover:text-foreground hover:bg-muted/80 rounded-xl text-xs font-medium flex items-center gap-1 transition-colors"
                >
                  <RefreshCw className="w-3.5 h-3.5" /> Régénérer
                </button>
                <button
                  onClick={() => window.print()}
                  className="flex-1 py-2 bg-primary text-primary-foreground font-bold rounded-xl text-xs flex items-center justify-center gap-2 hover:bg-primary/90 transition-colors"
                >
                  <Printer className="w-4 h-4" /> Imprimer
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </div>
    </AnimatePresence>
  );
}
