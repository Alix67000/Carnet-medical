import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { 
  ShieldCheck, 
  Lock, 
  Activity, 
  CheckCircle2, 
  AlertCircle, 
  Sparkles, 
  Copy, 
  Check, 
  ExternalLink,
  HelpCircle,
  Play
} from 'lucide-react';

export default function Login() {
  const { loginWithGoogle, loginGuest, user, authError, setAuthError } = useAuth();
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [copiedDomain, setCopiedDomain] = useState(false);

  // Si déjà connecté, rediriger vers l'accueil
  React.useEffect(() => {
    if (user) {
      navigate('/', { replace: true });
    }
  }, [user, navigate]);

  const handleGoogleLogin = async () => {
    setIsSubmitting(true);
    try {
      await loginWithGoogle();
      navigate('/', { replace: true });
    } catch (err) {
      // Géré dans AuthContext
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGuestLogin = async () => {
    setIsSubmitting(true);
    try {
      await loginGuest();
      navigate('/', { replace: true });
    } catch (err) {
      console.error('Erreur démarrage mode démo [code]:', err?.code || 'unknown');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCopyDomain = (domainToCopy) => {
    if (navigator?.clipboard) {
      navigator.clipboard.writeText(domainToCopy);
      setCopiedDomain(true);
      setTimeout(() => setCopiedDomain(false), 2500);
    }
  };

  const currentHost = typeof window !== 'undefined' ? window.location.hostname : '';
  const isUnauthorizedDomain = authError && typeof authError === 'object' && authError.code === 'auth/unauthorized-domain';

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50/70 via-white to-slate-50 flex flex-col justify-between p-5 max-w-md mx-auto">
      {/* Haut de page & Logo */}
      <div className="pt-6 sm:pt-10 text-center">
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-blue-600 text-white shadow-xl shadow-blue-500/25 mb-4 transform transition-transform hover:scale-105">
          <Activity className="w-10 h-10" />
        </div>

        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-100/80 text-blue-800 text-xs font-semibold mb-2">
          <Sparkles className="w-3.5 h-3.5 text-blue-600" />
          Protocole VYVGART Sécurisé
        </div>

        <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">
          Suivi VYVGART
        </h1>
        <p className="text-slate-600 text-xs sm:text-sm mt-1.5 max-w-xs mx-auto leading-relaxed">
          Votre carnet numérique personnel pour la traçabilité et la rotation de vos injections sous-cutanées de VYVGART.
        </p>
      </div>

      {/* Guide spécifique si le domaine Firebase n'est pas encore autorisé */}
      {isUnauthorizedDomain ? (
        <div className="my-4 bg-amber-50 border-2 border-amber-300 rounded-2xl p-4 shadow-sm text-left space-y-3 animate-in fade-in">
          <div className="flex items-start gap-2.5">
            <AlertCircle className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
            <div>
              <h3 className="text-xs font-bold text-amber-950 uppercase tracking-wide">
                Domaine à autoriser dans Firebase Console
              </h3>
              <p className="text-xs text-amber-900 mt-1">
                Google bloque la connexion car l'adresse de prévisualisation n'est pas encore enregistrée dans votre projet <strong>carnet-medical-ca19c</strong>.
              </p>
            </div>
          </div>

          <div className="bg-white p-2.5 rounded-xl border border-amber-200 flex items-center justify-between gap-2">
            <span className="text-xs font-mono text-slate-800 break-all select-all font-semibold">
              {currentHost}
            </span>
            <button
              onClick={() => handleCopyDomain(currentHost)}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-amber-100 hover:bg-amber-200 text-amber-900 rounded-lg text-xs font-bold shrink-0 transition-colors cursor-pointer"
            >
              {copiedDomain ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedDomain ? 'Copié !' : 'Copier'}</span>
            </button>
          </div>

          <ol className="text-[11px] text-amber-900 space-y-1 list-decimal list-inside bg-amber-100/50 p-2.5 rounded-xl">
            <li>Ouvrez votre console Firebase (Authentication &gt; Settings &gt; Authorized domains).</li>
            <li>Collez le domaine ci-dessus et enregistrez.</li>
          </ol>

          <div className="pt-1">
            <button
              onClick={handleGuestLogin}
              className="w-full py-2.5 px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-sm transition-colors cursor-pointer"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>Tester l'interface en mode Démo (données fictives en mémoire)</span>
            </button>
            <p className="text-[10px] text-amber-800 text-center mt-1">
              Mode temporaire non connecté : aucune donnée sauvegardée dans le cloud ni sur votre appareil.
            </p>
          </div>
        </div>
      ) : (
        /* Carte des garanties médicales standard */
        <div className="my-5 bg-white rounded-2xl border border-slate-200/80 p-4 shadow-sm space-y-3">
          <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Fonctionnalités clés</h2>
          
          <div className="flex items-start gap-3">
            <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 mt-0.5">
              <CheckCircle2 className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-xs font-semibold text-slate-800">Rotation intelligente des 4 quadrants</h3>
              <p className="text-[11px] text-slate-500">Ordre médical : 1 → 2 → 3 → 4 pour préserver les tissus.</p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 mt-0.5">
              <CheckCircle2 className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-xs font-semibold text-slate-800">Traçabilité complète des flacons</h3>
              <p className="text-[11px] text-slate-500">Numéros de lot et péremption archivés à chaque injection.</p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0 mt-0.5">
              <CheckCircle2 className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-xs font-semibold text-slate-800">Export PDF officiel pour médecin</h3>
              <p className="text-[11px] text-slate-500">Génération du relevé complet en un clic.</p>
            </div>
          </div>
        </div>
      )}

      {/* Section Connexion */}
      <div className="space-y-3 pb-4">
        {authError && !isUnauthorizedDomain && (
          <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl flex items-start gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{typeof authError === 'object' ? authError.message : authError}</span>
          </div>
        )}

        {/* Bouton Google Sign-In */}
        <button
          onClick={handleGoogleLogin}
          disabled={isSubmitting}
          className="w-full py-3.5 px-4 bg-white hover:bg-slate-50 active:bg-slate-100 text-slate-800 font-semibold rounded-2xl border-2 border-slate-300/80 shadow-md flex items-center justify-center gap-3 transition-all duration-200 cursor-pointer disabled:opacity-60"
        >
          {/* Logo officiel Google SVG */}
          <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
            <path
              fill="#4285F4"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="#34A853"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="#FBBC05"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
            />
            <path
              fill="#EA4335"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
            />
          </svg>
          <span className="text-sm sm:text-base">Se connecter avec Google</span>
        </button>

        {/* Option Démo Locale Éphémère */}
        <div className="pt-1">
          <button
            onClick={handleGuestLogin}
            disabled={isSubmitting}
            className="w-full py-2.5 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer"
          >
            <Play className="w-3.5 h-3.5 text-blue-600 fill-current" />
            <span>Explorer en mode démonstration locale</span>
          </button>
          <p className="text-[10px] text-slate-400 text-center mt-1">
            Données d'exemple en mémoire vive · Aucune donnée sauvegardée dans le cloud
          </p>
        </div>

        {/* Mention de sécurité obligatoire */}
        <div className="pt-2 flex items-center justify-center gap-1.5 text-slate-500 text-xs text-center">
          <Lock className="w-3.5 h-3.5 text-emerald-600" />
          <span>Vos données médicales sont privées et protégées</span>
        </div>
      </div>
    </div>
  );
}
