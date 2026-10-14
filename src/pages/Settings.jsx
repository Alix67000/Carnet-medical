import React, { useState, useEffect } from 'react';
import { useInjections } from '../context/InjectionsContext';
import { useAuth } from '../context/AuthContext';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { 
  Bell, 
  Calendar, 
  Clock, 
  User, 
  LogOut, 
  Save, 
  Check, 
  Download, 
  Smartphone, 
  ShieldCheck, 
  Info,
  Loader2,
  Sparkles,
  AlertCircle
} from 'lucide-react';

export default function Settings() {
  const { preferences, updatePreferences } = useInjections();
  const { user, logout } = useAuth();
  const { isInstallable, isInstalled, install, isIOS } = usePWAInstall();

  const [intervalDays, setIntervalDays] = useState(preferences.intervalDays || 7);
  const [reminderTime, setReminderTime] = useState(preferences.reminderTime || '09:00');
  const [notificationsEnabled, setNotificationsEnabled] = useState(preferences.notificationsEnabled ?? true);

  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [testNotifMessage, setTestNotifMessage] = useState(null);

  // Synchronise avec les préférences chargées
  useEffect(() => {
    if (preferences) {
      setIntervalDays(preferences.intervalDays || 7);
      setReminderTime(preferences.reminderTime || '09:00');
      setNotificationsEnabled(preferences.notificationsEnabled ?? true);
    }
  }, [preferences]);

  const handleSave = async (e) => {
    if (e) e.preventDefault();
    setIsSaving(true);
    setSaveSuccess(false);

    try {
      await updatePreferences({
        intervalDays: Number(intervalDays) || 7,
        reminderTime,
        notificationsEnabled,
      });
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      console.error('Erreur sauvegarde préférences:', err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleTestNotification = async () => {
    setTestNotifMessage(null);

    // 1. Tester la permission du navigateur
    if ('Notification' in window) {
      let perm = Notification.permission;
      if (perm === 'default') {
        try {
          perm = await Notification.requestPermission();
        } catch (e) {
          // ignore
        }
      }

      if (perm === 'granted') {
        try {
          new Notification('Rappel Suivi VVG', {
            body: `C'est le moment de réaliser votre injection de VVG (Zone recommandée calculée)`,
            icon: '/pwa-192x192.png',
            badge: '/pwa-192x192.png',
          });
          setTestNotifMessage('Notification système envoyée avec succès !');
          return;
        } catch (e) {
          // Si dans iframe, fallback
        }
      }
    }

    // Fallback notification in-app
    setTestNotifMessage('Rappel simulé : C\'est le moment de réaliser votre injection hebdomadaire de VVG !');
  };

  return (
    <div className="space-y-5 pb-28 animate-in fade-in duration-200">
      {/* En-tête */}
      <div className="pt-1">
        <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
          Paramètres du suivi
        </h2>
        <p className="text-xs text-slate-500">
          Personnalisez la fréquence de vos rappels et gérez votre compte
        </p>
      </div>

      {saveSuccess && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold rounded-2xl flex items-center gap-2 shadow-xs animate-in fade-in">
          <Check className="w-4 h-4 text-emerald-600" />
          <span>Paramètres enregistrés avec succès dans votre espace personnel !</span>
        </div>
      )}

      {testNotifMessage && (
        <div className="p-3.5 bg-blue-50 border border-blue-200 text-blue-800 text-xs rounded-2xl flex items-center justify-between shadow-xs animate-in fade-in">
          <div className="flex items-center gap-2">
            <Bell className="w-4 h-4 text-blue-600 shrink-0" />
            <span>{testNotifMessage}</span>
          </div>
          <button
            onClick={() => setTestNotifMessage(null)}
            className="text-slate-400 hover:text-slate-700 text-xs font-bold"
          >
            Fermer
          </button>
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-4">
        {/* Section Fréquence */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-4 sm:p-5 shadow-xs space-y-3">
          <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
            <Calendar className="w-4 h-4 text-blue-600" />
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
              Fréquence du traitement
            </h3>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-700 block">
              Intervalle entre deux injections (en jours)
            </label>
            <div className="flex items-center gap-3">
              <input
                type="number"
                min="1"
                max="90"
                value={intervalDays}
                onChange={(e) => setIntervalDays(Math.max(1, parseInt(e.target.value) || 1))}
                className="w-24 px-3 py-2.5 rounded-xl border border-slate-300 focus:border-blue-600 focus:ring-2 focus:ring-blue-100 text-slate-900 text-base font-bold text-center bg-slate-50/50 outline-none"
              />
              <span className="text-sm text-slate-600 font-medium">jours</span>
            </div>

            {/* Raccourcis fréquences usuelles */}
            <div className="flex items-center gap-2 pt-1">
              {[
                { label: '7 jours (hebdo standard)', val: 7 },
                { label: '14 jours', val: 14 },
                { label: '28 jours', val: 28 },
              ].map((preset) => (
                <button
                  key={preset.val}
                  type="button"
                  onClick={() => setIntervalDays(preset.val)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors ${
                    intervalDays === preset.val
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  {preset.label}
                </button>
              ))}
            </div>

            <p className="text-[11px] text-slate-400">
              Le protocole standard du VVG prescrit généralement 1 injection tous les 7 jours.
            </p>
          </div>
        </div>

        {/* Section Rappels & Notifications */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-4 sm:p-5 shadow-xs space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
            <Bell className="w-4 h-4 text-emerald-600" />
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
              Rappels & Notifications
            </h3>
          </div>

          {/* Toggle Activer les notifications */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-800">Activer les notifications</p>
              <p className="text-[11px] text-slate-400">Recevoir une alerte le jour de l'injection</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={notificationsEnabled}
                onChange={(e) => setNotificationsEnabled(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
            </label>
          </div>

          {/* Input Heure du rappel */}
          {notificationsEnabled && (
            <div className="space-y-1.5 pt-2 border-t border-slate-100 animate-in fade-in">
              <label className="text-xs font-semibold text-slate-700 block">
                Heure préférée du rappel
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="time"
                  value={reminderTime}
                  onChange={(e) => setReminderTime(e.target.value)}
                  className="w-32 px-3 py-2 rounded-xl border border-slate-300 focus:border-blue-600 focus:ring-2 focus:ring-blue-100 text-slate-900 text-sm font-semibold bg-slate-50/50 outline-none"
                />
                <span className="text-xs text-slate-500">Heure locale</span>
              </div>
            </div>
          )}

          {/* Bouton Tester une notification */}
          <div className="pt-1">
            <button
              type="button"
              onClick={handleTestNotification}
              className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 active:bg-slate-300 text-slate-700 text-xs font-semibold transition-colors flex items-center gap-2 cursor-pointer"
            >
              <Bell className="w-3.5 h-3.5 text-slate-600" />
              <span>Tester une notification</span>
            </button>
          </div>
        </div>

        {/* Section PWA / Installation */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-4 sm:p-5 shadow-xs space-y-3">
          <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
            <Smartphone className="w-4 h-4 text-blue-600" />
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
              Application Mobile & Hors-Ligne
            </h3>
          </div>

          <p className="text-xs text-slate-600 leading-relaxed">
            Cette application est une Progressive Web App (PWA). Elle fonctionne hors-connexion et peut s'installer sur votre téléphone comme une application native.
          </p>

          {isInstallable && !isInstalled && (
            <button
              type="button"
              onClick={install}
              className="w-full py-2.5 px-4 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 text-xs font-bold flex items-center justify-center gap-2 transition-colors cursor-pointer"
            >
              <Download className="w-4 h-4 text-blue-600" />
              <span>Installer Suivi VVG sur cet appareil</span>
            </button>
          )}

          {isInstalled && (
            <div className="flex items-center gap-2 text-xs font-medium text-emerald-700 bg-emerald-50 p-2.5 rounded-xl border border-emerald-100">
              <Check className="w-4 h-4 text-emerald-600" />
              <span>Application installée en mode autonome (PWA active)</span>
            </div>
          )}
        </div>

        {/* Section Compte Utilisateur */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-4 sm:p-5 shadow-xs space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
            <User className="w-4 h-4 text-slate-600" />
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
              Compte & Sécurité
            </h3>
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <p className="text-xs font-bold text-slate-900 truncate max-w-[200px] sm:max-w-xs">
                {user?.isDemo ? 'Patient Démonstration (Local)' : (user?.email || 'Utilisateur')}
              </p>
              <p className="text-[11px] text-slate-400">
                {user?.isDemo ? 'Session locale active · Non connectée au cloud' : 'Données synchronisées dans Google Firestore'}
              </p>
            </div>
            <div 
              className={`w-2.5 h-2.5 rounded-full ring-4 ${user?.isDemo ? 'bg-amber-500 ring-amber-100' : 'bg-emerald-500 ring-emerald-100'}`} 
              title={user?.isDemo ? 'Mode Démo' : 'Connecté Cloud'} 
            />
          </div>

          {user?.isDemo && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 space-y-1">
              <div className="flex items-center gap-1.5 font-bold text-amber-950">
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                <span>Mode Démonstration Actif</span>
              </div>
              <p className="text-[11px] leading-relaxed">
                Ce mode fonctionne exclusivement en <strong>mémoire vive temporaire</strong> avec des <strong>données fictives</strong>. Aucune donnée médicale réelle n'est envoyée à Firestore ni stockée dans votre navigateur (localStorage/IndexedDB désactivés). La déconnexion ou la fermeture de l'onglet réinitialise tout.
              </p>
            </div>
          )}

          <button
            type="button"
            onClick={logout}
            className="w-full py-2.5 px-4 rounded-xl border border-red-200 hover:bg-red-50 text-red-600 text-xs font-bold flex items-center justify-center gap-2 transition-colors cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
            <span>{user?.isDemo ? 'Quitter le mode démo' : 'Se déconnecter'}</span>
          </button>
        </div>

        {/* Bouton Enregistrer les Paramètres */}
        <div className="pt-2">
          <button
            type="submit"
            disabled={isSaving}
            className="w-full py-4 px-5 rounded-2xl bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-bold text-base flex items-center justify-center gap-2 shadow-lg shadow-blue-600/25 transition-all duration-200 cursor-pointer disabled:opacity-60"
          >
            {isSaving ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>Enregistrement...</span>
              </>
            ) : (
              <>
                <Save className="w-5 h-5" />
                <span>Enregistrer les paramètres</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
