"use client";

import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Camera, AlertCircle, Keyboard } from 'lucide-react';

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
  const [isScanning, setIsScanning] = useState(false);
  const [manualCode, setManualCode] = useState('');
  const scannerRef = useRef<any>(null);
  const readerDivId = 'qr-reader-container';

  useEffect(() => {
    let isMounted = true;

    if (!isOpen) {
      cleanupScanner();
      setError('');
      setManualCode('');
      return;
    }

    const initScanner = async () => {
      try {
        setError('');
        setIsScanning(true);

        // @ts-ignore: html5-qrcode peut ne pas avoir de déclarations de types dans le build TypeScript
        const html5QrcodeModule = await import('html5-qrcode');
        const Html5Qrcode = html5QrcodeModule.Html5Qrcode;

        if (!isMounted) return;

        const element = document.getElementById(readerDivId);
        if (!element) return;

        const html5Qrcode = new Html5Qrcode(readerDivId);
        scannerRef.current = html5Qrcode;

        const config = { fps: 10, qrbox: { width: 220, height: 220 } };

        await html5Qrcode.start(
          { facingMode: 'environment' },
          config,
          (decodedText: string) => {
            cleanupScanner();
            onScanSuccess(decodedText);
          },
          () => {
            // Callback de scan continu (ignoré)
          }
        );
      } catch (err: any) {
        console.error('Erreur démarrage scanner QR:', err);
        if (isMounted) {
          setError(
            err?.message ||
              "Accès caméra refusé ou indisponible. Vous pouvez saisir le code manuellement ci-dessous."
          );
          setIsScanning(false);
        }
      }
    };

    const timer = setTimeout(() => {
      initScanner();
    }, 300);

    return () => {
      isMounted = false;
      clearTimeout(timer);
      cleanupScanner();
    };
  }, [isOpen]);

  const cleanupScanner = async () => {
    if (scannerRef.current) {
      try {
        if (scannerRef.current.isScanning) {
          await scannerRef.current.stop();
        }
        await scannerRef.current.clear();
      } catch (err) {
        console.error('Erreur nettoyage scanner:', err);
      } finally {
        scannerRef.current = null;
        setIsScanning(false);
      }
    }
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualCode.trim()) return;
    cleanupScanner();
    onScanSuccess(manualCode.trim());
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-background/80 backdrop-blur-md overflow-y-auto">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="bg-card border border-border w-full max-w-md rounded-3xl shadow-2xl relative overflow-hidden flex flex-col"
        >
          {/* En-tête */}
          <div className="flex items-center justify-between p-5 border-b border-border bg-muted/30">
            <div className="flex items-center gap-2">
              <Camera className="w-5 h-5 text-primary" />
              <h3 className="font-bold text-lg text-foreground">
                Validation par QR Code
              </h3>
            </div>
            <button
              onClick={() => {
                cleanupScanner();
                onClose();
              }}
              className="p-2 bg-background hover:bg-muted rounded-full transition-colors"
            >
              <X className="w-5 h-5 text-muted-foreground" />
            </button>
          </div>

          {/* Corps */}
          <div className="p-6 flex flex-col items-center gap-4">
            {benchName && (
              <div className="text-center">
                <p className="text-xs text-muted-foreground uppercase tracking-wider">
                  Bench attribué
                </p>
                <p className="font-bold text-primary text-base">{benchName}</p>
              </div>
            )}

            {/* Container vidéo scanner */}
            <div className="relative w-full aspect-square max-w-[260px] bg-black rounded-2xl overflow-hidden shadow-inner flex items-center justify-center border-2 border-primary/30">
              <div id={readerDivId} className="w-full h-full" />

              {isScanning && !error && (
                <div className="absolute inset-0 pointer-events-none border-2 border-primary/50 rounded-2xl flex items-center justify-center">
                  <div className="w-44 h-44 border-2 border-dashed border-primary/80 rounded-xl animate-pulse" />
                </div>
              )}
            </div>

            {error && (
              <div className="w-full p-3 bg-destructive/10 text-destructive text-xs rounded-xl flex items-start gap-2 border border-destructive/20">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <p className="text-xs text-center text-muted-foreground">
              Veuillez flasher le QR Code affiché sur votre bench pour valider votre présence physique.
            </p>

            {/* Secours : Saisie manuelle */}
            <form onSubmit={handleManualSubmit} className="w-full pt-4 border-t border-border flex flex-col gap-2">
              <label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                <Keyboard className="w-3.5 h-3.5" /> Saisie manuelle du code
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={manualCode}
                  onChange={(e) => setManualCode(e.target.value)}
                  placeholder="Code ou JSON du bench..."
                  className="flex-1 bg-background border border-border rounded-xl px-3 py-2 text-xs font-mono outline-none focus:border-primary"
                />
                <button
                  type="submit"
                  disabled={!manualCode.trim()}
                  className="px-4 py-2 bg-primary text-primary-foreground font-bold text-xs rounded-xl hover:bg-primary/90 disabled:opacity-50 transition-all"
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
