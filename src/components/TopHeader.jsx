import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { Download, ShieldCheck, WifiOff, Smartphone } from 'lucide-react';

export default function TopHeader() {
  const { user } = useAuth();
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSModal, setShowIOSModal] = useState(false);

  return (
    <>
      {user?.isDemo && (
        <div className="bg-amber-100 border-b border-amber-300 text-amber-950 px-3 py-1.5 text-[11px] sm:text-xs font-semibold flex items-center justify-center gap-2 text-center">
          <span className="w-2 h-2 rounded-full bg-amber-600 animate-pulse shrink-0" />
          <span>Mode Démo Local · Données fictives temporaires en mémoire (non sauvegardées)</span>
        </div>
      )}
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200/80 px-4 py-3 safe-top">
      <div className="max-w-md mx-auto flex items-center justify-between">
        {/* Brand / Logo */}
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 to-blue-500 flex items-center justify-center text-white shadow-sm shadow-blue-500/20 font-black text-xs tracking-tighter">
            VYV
          </div>
          <div>
            <h1 className="text-base font-bold text-slate-900 leading-tight">Suivi VYVGART</h1>
            <p className="text-[11px] text-slate-500 flex items-center gap-1">
              <ShieldCheck className="w-3 h-3 text-emerald-600" />
              Traçabilité médicale
            </p>
          </div>
        </div>

        {/* Actions à droite */}
        <div className="flex items-center gap-2">
          {/* Bouton d'installation PWA si éligible */}
          {isInstallable && !isInstalled && (
            <button
              onClick={install}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 text-xs font-semibold border border-blue-200 transition-colors shadow-sm"
              title="Installer l'application sur votre écran d'accueil"
            >
              <Download className="w-3.5 h-3.5 text-blue-600" />
              <span className="hidden sm:inline">Installer l'app</span>
              <span className="sm:hidden">Installer</span>
            </button>
          )}

          {isIOS && !isInstalled && (
            <button
              onClick={() => setShowIOSModal(true)}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium transition-colors"
              title="Guide d'installation iOS"
            >
              <Smartphone className="w-3.5 h-3.5 text-slate-600" />
              <span>Installer</span>
            </button>
          )}

          {/* Avatar utilisateur */}
          {user && (
            <div className="flex items-center">
              {user.photoURL ? (
                <img
                  src={user.photoURL}
                  alt={user.displayName || 'Utilisateur'}
                  className="w-8 h-8 rounded-full border border-slate-200 object-cover"
                />
              ) : (
                <div className="w-8 h-8 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-700 font-bold text-xs uppercase">
                  {user.email ? user.email.charAt(0) : 'U'}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Modal d'instructions pour iOS Safari */}
      {showIOSModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600">
                <Smartphone className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-base">Installer sur iPhone</h3>
                <p className="text-xs text-slate-500">Pour un accès direct comme une application</p>
              </div>
            </div>

            <ol className="text-xs text-slate-600 space-y-2.5 my-4 bg-slate-50 p-3.5 rounded-xl border border-slate-200/60">
              <li className="flex items-start gap-2">
                <span className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">1</span>
                <span>Dans Safari, appuyez sur le bouton <strong>Partager</strong> (le carré avec une flèche vers le haut).</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">2</span>
                <span>Faites défiler vers le bas et touchez <strong>Sur l'écran d'accueil</strong>.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">3</span>
                <span>Touchez <strong>Ajouter</strong> en haut à droite.</span>
              </li>
            </ol>

            <button
              onClick={() => setShowIOSModal(false)}
              className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold transition-colors"
            >
              J'ai compris
            </button>
          </div>
        </div>
      )}
    </header>
    </>
  );
}
