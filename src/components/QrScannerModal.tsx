"use client";

import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Camera, AlertCircle, Keyboard, RefreshCw, Play, Loader2, Upload } from 'lucide-react';

interface QrScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onScanSuccess: (qrCodeData: string) => void;
  benchName?: string;
}

export function QrScannerModal({
  isOpen,
  onClose,
  onScanSuccess,
  benchName,
}: QrScannerModalProps) {
  const [error, setError] = useState<string>('');
  const [isCameraRequested, setIsCameraRequested] = useState<boolean>(false);
  const [isScanning, setIsScanning] = useState<boolean>(false);
  const [isLoadingCamera, setIsLoadingCamera] = useState<boolean>(false);
  const [manualCode, setManualCode] = useState<string>('');

  const scannerRef = useRef<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const readerDivId = 'qr-reader-container';

  const cleanupScanner = async () => {
    if (scannerRef.current) {
      try {
        if (scannerRef.current.isScanning) {
          await scannerRef.current.stop();
        }
        await scannerRef.current.clear();
      } catch (err) {
        console.error('Erreur lors du nettoyage du scanner:', err);
      } finally {
        scannerRef.current = null;
        setIsScanning(false);
        setIsLoadingCamera(false);
      }
    }
  };

  const handleStartCamera = async () => {
    setError('');
    setIsLoadingCamera(true);
    setIsCameraRequested(true);

    try {
      // Import dynamique pour la compatibilité Next.js SSR
      // @ts-ignore
      const html5QrcodeModule = await import('html5-qrcode');
      const Html5Qrcode = html5QrcodeModule.Html5Qrcode;

      const element = document.getElementById(readerDivId);
      if (!element) {
        throw new Error("Conteneur vidéo introuvable dans le DOM.");
      }

      const html5Qrcode = new Html5Qrcode(readerDivId);
      scannerRef.current = html5Qrcode;

      const config = {
        fps: 10,
        qrbox: { width: 220, height: 220 },
        aspectRatio: 1.0,
      };

      // Lancement direct avec la contrainte caméra arrière
      await html5Qrcode.start(
        { facingMode: 'environment' },
        config,
        (decodedText: string) => {
          cleanupScanner().then(() => {
            onScanSuccess(decodedText);
          });
        },
        () => {
          // Ignorer les frames non décodées
        }
      );

      setIsScanning(true);
      setIsLoadingCamera(false);
    } catch (err: any) {
      console.error('Erreur critique d’activation caméra:', err);

      // Repli vers la caméra par défaut (ex: webcam PC en simulateur mobile)
      try {
        if (scannerRef.current) {
          await scannerRef.current.start(
            { facingMode: 'user' },
            { fps: 10, qrbox: { width: 220, height: 220 } },
            (decodedText: string) => {
              cleanupScanner().then(() => {
                onScanSuccess(decodedText);
              });
            },
            () => {}
          );
          setIsScanning(true);
          setIsLoadingCamera(false);
          return;
        }
      } catch (fallbackErr) {
        console.error('Echec du repli caméra:', fallbackErr);
      }

      setError(
        "Accès caméra bloqué par le navigateur. Utilisez le bouton 'Photo native' ci-dessous ou saisissez le code manuellement."
      );
      setIsScanning(false);
      setIsLoadingCamera(false);
      setIsCameraRequested(false);
    }
  };

  // Lecture via photo prise par l'appareil photo natif du téléphone
  const handleNativePhotoCapture = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];

    setError('');
    setIsLoadingCamera(true);

    try {
      // @ts-ignore
      const html5QrcodeModule = await import('html5-qrcode');
      const Html5Qrcode = html5QrcodeModule.Html5Qrcode;

      const html5Qrcode = new Html5Qrcode(readerDivId);
      scannerRef.current = html5Qrcode;

      const decodedText = await html5Qrcode.scanFile(file, true);
      await cleanupScanner();
      onScanSuccess(decodedText);
    } catch (err) {
      console.error('Erreur lecture photo QR:', err);
      setError("Impossible de lire un QR code valide sur cette photo. Réessayez ou utilisez la saisie manuelle.");
      setIsLoadingCamera(false);
    }
  };

  const handleResetCamera = () => {
    cleanupScanner().then(() => {
      setIsCameraRequested(false);
      setError('');
    });
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualCode.trim()) return;
    cleanupScanner().then(() => {
      onScanSuccess(manualCode.trim());
    });
  };

  useEffect(() => {
    if (!isOpen) {
      cleanupScanner();
      setError('');
      setManualCode('');
      setIsCameraRequested(false);
    }
    return () => {
      cleanupScanner();
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[110] flex items-center justify-center p-3 sm:p-4 bg-background/80 backdrop-blur-md overflow-y-auto">
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.98 }}
          transition={{ duration: 0.15, ease: 'easeOut' }}
          className="bg-card border border-border w-full max-w-md rounded-3xl shadow-2xl relative overflow-hidden flex flex-col my-auto max-h-[92vh]"
        >
          {/* En-tête */}
          <div className="flex items-center justify-between p-4 sm:p-5 border-b border-border bg-muted/30 shrink-0">
            <div className="flex items-center gap-2">
              <Camera className="w-5 h-5 text-primary shrink-0" />
              <h3 className="font-bold text-base sm:text-lg text-foreground">
                Scanner le QR Code
              </h3>
            </div>
            <button
              onClick={() => {
                cleanupScanner();
                onClose();
              }}
              className="p-2.5 bg-background hover:bg-muted rounded-full transition-colors active:scale-95"
              aria-label="Fermer"
            >
              <X className="w-5 h-5 text-muted-foreground" />
            </button>
          </div>

          {/* Corps de la modale */}
          <div className="p-4 sm:p-6 flex flex-col items-center gap-4 overflow-y-auto">
            {benchName && (
              <div className="text-center w-full bg-muted/20 py-2 px-3 rounded-xl border border-border/50">
                <p className="text-[11px] text-muted-foreground uppercase tracking-wider font-medium">
                  Bench attribué
                </p>
                <p className="font-bold text-primary text-sm sm:text-base">{benchName}</p>
              </div>
            )}

            {/* Zone du scanner et bouton d'activation principal */}
            <div className="relative w-[260px] h-[260px] bg-black rounded-2xl overflow-hidden shadow-inner flex flex-col items-center justify-center border-2 border-primary/30 shrink-0 mx-auto">
              {/* Conteneur DOM strict requis par html5-qrcode */}
              <div
                id={readerDivId}
                style={{ width: '260px', height: '260px', border: 'none' }}
                className={!isCameraRequested ? 'hidden' : 'block'}
              />

              {/* État 1 : Bouton d'activation visible en permanence au lancement */}
              {!isCameraRequested && !isLoadingCamera && (
                <div className="absolute inset-0 flex flex-col items-center justify-center p-4 text-center bg-zinc-950 gap-3 z-20">
                  <Camera className="w-10 h-10 text-primary/80 animate-pulse" />
                  <p className="text-xs text-zinc-300 px-2 leading-relaxed">
                    Cliquez ci-dessous pour lancer la caméra en direct.
                  </p>
                  <button
                    onClick={handleStartCamera}
                    type="button"
                    className="px-4 py-2.5 bg-primary text-primary-foreground font-bold text-xs rounded-xl hover:bg-primary/90 flex items-center gap-2 shadow-lg active:scale-95 transition-all"
                  >
                    <Play className="w-3.5 h-3.5 fill-current" /> Activer le scanner vidéo
                  </button>
                </div>
              )}

              {/* État 2 : Chargement du flux vidéo */}
              {isLoadingCamera && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-zinc-950 gap-3 z-20">
                  <Loader2 className="w-8 h-8 text-primary animate-spin" />
                  <p className="text-xs text-zinc-300 font-medium">
                    Ouverture de la caméra...
                  </p>
                </div>
              )}

              {/* État 3 : Scan actif */}
              {isScanning && !error && (
                <div className="absolute inset-0 pointer-events-none border-2 border-primary/40 rounded-2xl flex items-center justify-center z-10">
                  <div className="w-44 h-44 border-2 border-dashed border-primary/70 rounded-xl animate-pulse" />
                </div>
              )}
            </div>

            {/* Bouton Option natif : Toujours affiché, fonctionne à 100% sur smartphone */}
            <div className="w-full flex flex-col items-center gap-2">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handleNativePhotoCapture}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="w-full py-2.5 px-4 bg-secondary text-secondary-foreground hover:bg-secondary/80 font-semibold text-xs rounded-xl flex items-center justify-center gap-2 border border-border/60 active:scale-98 transition-all shadow-sm"
              >
                <Upload className="w-4 h-4 text-primary" />
                Prendre une photo du QR (Mode Natif mobile)
              </button>
            </div>

            {error && (
              <div className="w-full p-3 bg-destructive/10 text-destructive text-xs rounded-xl flex flex-col gap-2 border border-destructive/20">
                <div className="flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span className="leading-relaxed">{error}</span>
                </div>
                <button
                  onClick={handleResetCamera}
                  className="self-end mt-1 px-3 py-1.5 bg-destructive text-destructive-foreground font-semibold rounded-lg text-[11px] flex items-center gap-1.5 shadow-sm active:scale-95 transition-transform"
                >
                  <RefreshCw className="w-3 h-3" /> Réessayer
                </button>
              </div>
            )}

            <p className="text-xs text-center text-muted-foreground px-2">
              Positionnez le QR code dans le cadre ou utilisez le mode natif si la vidéo est bloquée.
            </p>

            {/* Saisie manuelle de secours */}
            <form onSubmit={handleManualSubmit} className="w-full pt-3 border-t border-border flex flex-col gap-2">
              <label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                <Keyboard className="w-3.5 h-3.5" /> Saisie manuelle de secours
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={manualCode}
                  onChange={(e) => setManualCode(e.target.value)}
                  placeholder="Code ou données JSON..."
                  className="flex-1 bg-background border border-border rounded-xl px-3 py-2.5 text-xs font-mono outline-none focus:border-primary text-foreground"
                />
                <button
                  type="submit"
                  disabled={!manualCode.trim()}
                  className="px-4 py-2.5 bg-primary text-primary-foreground font-bold text-xs rounded-xl hover:bg-primary/90 disabled:opacity-50 transition-all active:scale-95 shrink-0"
                >
                  Valider
                </button>
              </div>
            </form>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
