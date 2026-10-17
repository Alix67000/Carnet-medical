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
  AlertCircle,
  Radio,
  Globe,
  Trash2,
  Send,
  Lock,
  RefreshCw
} from 'lucide-react';
import {
  isPushNotificationSupported,
  getNotificationPermission,
  registerDeviceForPush,
  unregisterDeviceForPush,
  getRegisteredDevices,
  sendFcmTestNotification,
  initForegroundNotificationListener,
  triggerLocalTestNotification
} from '../services/fcmService';

export default function Settings() {
  const { preferences, updatePreferences } = useInjections();
  const { user, logout } = useAuth();
  const { isInstallable, isInstalled, install, isIOS } = usePWAInstall();

  const [intervalDays, setIntervalDays] = useState(preferences.intervalDays || 7);
  const [reminderTime, setReminderTime] = useState(preferences.reminderTime || '09:00');
  const [notificationsEnabled, setNotificationsEnabled] = useState(preferences.notificationsEnabled ?? true);
  const [timeZone, setTimeZone] = useState(
    preferences.timeZone || (typeof Intl !== 'undefined' ? (Intl.DateTimeFormat().resolvedOptions().timeZone || 'Europe/Paris') : 'Europe/Paris')
  );

  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // États pour Firebase Cloud Messaging (FCM)
  const [pushSupported, setPushSupported] = useState(true);
  const [pushPermission, setPushPermission] = useState(getNotificationPermission());
  const [registeredDevices, setRegisteredDevices] = useState([]);
  const [isRegisteringPush, setIsRegisteringPush] = useState(false);
  const [isTestingPush, setIsTestingPush] = useState(false);
  const [pushStatusMessage, setPushStatusMessage] = useState(null);
  const [devicesError, setDevicesError] = useState(null);
  const [isLoadingDevices, setIsLoadingDevices] = useState(false);

  const hasVapidKey = Boolean(import.meta.env.VITE_FIREBASE_VAPID_KEY);

  // Synchronise avec les préférences chargées
  useEffect(() => {
    if (preferences) {
      setIntervalDays(preferences.intervalDays || 7);
      setReminderTime(preferences.reminderTime || '09:00');
      setNotificationsEnabled(preferences.notificationsEnabled ?? true);
      if (preferences.timeZone) {
        setTimeZone(preferences.timeZone);
      }
    }
  }, [preferences]);

  // Récupère les appareils enregistrés avec interception des erreurs Firestore (ex: permission-denied)
  const refreshRegisteredDevices = async (currentUser = user) => {
    if (!currentUser || currentUser.isDemo) {
      setRegisteredDevices([]);
      setDevicesError(null);
      return [];
    }

    setIsLoadingDevices(true);
    try {
      const devices = await getRegisteredDevices(currentUser);
      setRegisteredDevices(devices);
      setDevicesError(null);
      return devices;
    } catch (err) {
      setDevicesError(err?.code || 'error');
      if (err?.code === 'permission-denied') {
        setPushStatusMessage({
          type: 'error',
          text: 'Accès refusé aux appareils autorisés (permission-denied).',
          details: "Les règles de sécurité Firestore n'autorisent pas la lecture de vos appareils. Vérifiez que votre session est valide.",
        });
      } else {
        setPushStatusMessage({
          type: 'error',
          text: 'Impossible de récupérer la liste des appareils enregistrés.',
          details: err?.message || err?.code || 'Erreur Firestore',
        });
      }
      return null;
    } finally {
      setIsLoadingDevices(false);
    }
  };

  // Initialisation et vérification du support FCM et des appareils enregistrés (Lieu 1: Chargement initial)
  useEffect(() => {
    isPushNotificationSupported().then(setPushSupported);
    setPushPermission(getNotificationPermission());

    if (user && !user.isDemo) {
      refreshRegisteredDevices(user);

      // Écouteur des notifications reçues en direct au premier plan
      let unsubscribe = () => {};
      initForegroundNotificationListener((msg) => {
        setPushStatusMessage({
          type: 'info',
          text: `Message reçu au 1er plan : « ${msg.title} »`,
          details: msg.body
        });
      }).then((unsub) => {
        unsubscribe = unsub;
      });

      return () => unsubscribe();
    } else {
      setRegisteredDevices([]);
      setDevicesError(null);
    }
  }, [user]);

  const handleSave = async (e) => {
    if (e) e.preventDefault();
    setIsSaving(true);
    setSaveSuccess(false);

    try {
      await updatePreferences({
        intervalDays: Number(intervalDays) || 7,
        reminderTime,
        notificationsEnabled,
        timeZone,
      });
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      console.error('Erreur sauvegarde préférences [code]:', err?.code || 'unknown');
    } finally {
      setIsSaving(false);
    }
  };

  // Enregistrement explicite de l'appareil pour les rappels push (Lieu 2: Après activation)
  const handleRegisterPush = async () => {
    if (!user || user.isDemo) {
      setPushStatusMessage({
        type: 'error',
        text: 'Veuillez vous connecter avec votre compte Google réel pour activer les rappels push.'
      });
      return;
    }

    setIsRegisteringPush(true);
    setPushStatusMessage(null);

    try {
      // 1. Enregistre d'abord les préférences complètes avec updatePreferences
      await updatePreferences({
        intervalDays: Number(intervalDays) || 7,
        reminderTime,
        notificationsEnabled,
        timeZone,
      });

      // 2. Ensuite seulement, appelle registerDeviceForPush(user, timeZone)
      const result = await registerDeviceForPush(user, timeZone);
      setPushPermission(result.permission || getNotificationPermission());

      if (result.success) {
        setPushStatusMessage({
          type: 'success',
          text: 'Appareil enregistré avec succès pour recevoir les rappels push !',
          details: `Fuseau horaire configuré : ${result.timeZone}. Vos rappels arriveront à ${reminderTime}.`
        });
        await refreshRegisteredDevices(user);
      } else {
        setPushStatusMessage({
          type: 'error',
          text: result.error || "Impossible d'activer les notifications push sur cet appareil.",
          details: result.details
        });
      }
    } catch (err) {
      setPushStatusMessage({
        type: 'error',
        text: "Une erreur inattendue est survenue lors de l'enregistrement de l'appareil."
      });
    } finally {
      setIsRegisteringPush(false);
    }
  };

  // Désactivation des notifications sur l'appareil (Lieu 3: Après désactivation)
  const handleUnregisterDevice = async (tokenId = null) => {
    if (!user || user.isDemo) return;

    try {
      await unregisterDeviceForPush(user, tokenId);
      await refreshRegisteredDevices(user);
      setPushStatusMessage({
        type: 'info',
        text: 'Appareil retiré de la liste des rappels push.'
      });
    } catch {
      setPushStatusMessage({
        type: 'error',
        text: 'Erreur lors du retrait de l\'appareil.'
      });
    }
  };

  // Test de l'envoi push via Firebase Cloud Messaging
  const handleTestFcmPush = async () => {
    if (!user || user.isDemo) {
      setPushStatusMessage({
        type: 'error',
        text: 'Le mode démonstration fonctionne en mémoire vive locale. Connectez-vous avec un compte Google réel pour tester Firebase Cloud Messaging.'
      });
      return;
    }

    if (registeredDevices.length === 0) {
      setPushStatusMessage({
        type: 'error',
        text: 'Aucun appareil actif enregistré. Cliquez d\'abord sur "Activer les notifications push sur cet appareil" ci-dessous.'
      });
      return;
    }

    setIsTestingPush(true);
    setPushStatusMessage(null);

    try {
      const res = await sendFcmTestNotification(user);
      if (res.success) {
        setPushStatusMessage({
          type: 'success',
          text: `Notification push envoyée via Firebase Cloud Messaging (${res.count} appareil(s) notifié(s)).`,
          details: 'Si l\'application est fermée ou en arrière-plan, vérifiez la notification discrète sur votre écran verrouillé.'
        });
      } else {
        setPushStatusMessage({
          type: 'error',
          text: res.error,
          details: res.isFunctionMissing
            ? "Pour tester l'envoi en direct, assurez-vous que la fonction Netlify 'send-test-reminder' est déployée et configurée avec la clé secrète Firebase Admin (FIREBASE_SERVICE_ACCOUNT)."
            : undefined
        });
      }
    } catch {
      setPushStatusMessage({
        type: 'error',
        text: 'Échec de la communication avec le backend FCM.'
      });
    } finally {
      setIsTestingPush(false);
    }
  };

  // Test d'affichage local du Service Worker (pour tester le format discret sur l'appareil)
  const handleLocalServiceWorkerTest = async () => {
    const res = await triggerLocalTestNotification();
    if (res.success) {
      setPushStatusMessage({
        type: 'success',
        text: 'Notification locale de test affichée via le Service Worker.',
        details: 'Titre : « Rappel de votre carnet médical » (format discret pour écran verrouillé).'
      });
    } else {
      setPushStatusMessage({
        type: 'error',
        text: res.error || 'Impossible d\'afficher la notification locale.'
      });
    }
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

      {pushStatusMessage && (
        <div 
          className={`p-3.5 rounded-2xl text-xs border shadow-xs animate-in fade-in flex items-start justify-between gap-2 ${
            pushStatusMessage.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
              : pushStatusMessage.type === 'error'
              ? 'bg-red-50 border-red-200 text-red-900'
              : 'bg-blue-50 border-blue-200 text-blue-900'
          }`}
        >
          <div className="space-y-1">
            <div className="flex items-center gap-1.5 font-bold">
              {pushStatusMessage.type === 'success' ? (
                <Check className="w-4 h-4 text-emerald-600 shrink-0" />
              ) : pushStatusMessage.type === 'error' ? (
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
              ) : (
                <Bell className="w-4 h-4 text-blue-600 shrink-0" />
              )}
              <span>{pushStatusMessage.text}</span>
            </div>
            {pushStatusMessage.details && (
              <p className="text-[11px] opacity-90 pl-5.5 leading-relaxed">
                {pushStatusMessage.details}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={() => setPushStatusMessage(null)}
            className="text-slate-400 hover:text-slate-700 text-xs font-bold shrink-0 ml-1"
          >
            ✕
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
              Le protocole prescrit généralement 1 injection tous les 7 jours.
            </p>
          </div>
        </div>

        {/* Section Rappels & Notifications Push (FCM) */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-4 sm:p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <Bell className="w-4 h-4 text-emerald-600" />
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                Rappels Push & Notifications
              </h3>
            </div>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 font-bold border border-blue-200/50">
              FCM Cloud
            </span>
          </div>

          {/* Toggle Activer les notifications */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-800">Activer les rappels d'injection</p>
              <p className="text-[11px] text-slate-400">
                Calcul automatique selon la dernière injection et votre intervalle
              </p>
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

          {/* Paramètres de l'heure et du fuseau horaire */}
          {notificationsEnabled && (
            <div className="space-y-3 pt-2 border-t border-slate-100 animate-in fade-in">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Heure du rappel */}
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700 block">
                    Heure du rappel
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="time"
                      value={reminderTime}
                      onChange={(e) => setReminderTime(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:border-blue-600 focus:ring-2 focus:ring-blue-100 text-slate-900 text-sm font-semibold bg-slate-50/50 outline-none"
                    />
                  </div>
                </div>

                {/* Fuseau horaire */}
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700 flex items-center gap-1">
                    <Globe className="w-3.5 h-3.5 text-slate-500" />
                    <span>Fuseau horaire</span>
                  </label>
                  <input
                    type="text"
                    value={timeZone}
                    onChange={(e) => setTimeZone(e.target.value)}
                    placeholder="Europe/Paris"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:border-blue-600 focus:ring-2 focus:ring-blue-100 text-slate-900 text-xs font-medium bg-slate-50/50 outline-none"
                  />
                </div>
              </div>

              {/* Bloc d'état FCM et Enregistrement de l'appareil */}
              <div className="bg-slate-50 rounded-xl p-3.5 border border-slate-200/80 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800">
                    État des notifications push Web (PWA)
                  </span>
                  {/* Badge de permission */}
                  <span 
                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      pushPermission === 'granted'
                        ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                        : pushPermission === 'denied'
                        ? 'bg-red-100 text-red-800 border border-red-300'
                        : 'bg-amber-100 text-amber-800 border border-amber-300'
                    }`}
                  >
                    <Radio className="w-2.5 h-2.5 animate-pulse" />
                    {pushPermission === 'granted' && 'Permission accordée'}
                    {pushPermission === 'denied' && 'Permission refusée'}
                    {pushPermission === 'default' && 'Permission requise'}
                    {pushPermission === 'unsupported' && 'Non supporté'}
                  </span>
                </div>

                <p className="text-[11px] text-slate-600 leading-relaxed">
                  Pour recevoir un rappel automatique même lorsque l'application ou l'onglet est fermé, autorisez les notifications push sur cet appareil.
                </p>

                {/* Bouton d'activation explicite de l'appareil */}
                <div className="flex flex-wrap items-center gap-2 pt-1">
                  <button
                    type="button"
                    onClick={handleRegisterPush}
                    disabled={isRegisteringPush || user?.isDemo}
                    className="flex-1 py-2.5 px-3 rounded-xl bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-all shadow-sm cursor-pointer disabled:opacity-50"
                  >
                    {isRegisteringPush ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Enregistrement du jeton...</span>
                      </>
                    ) : (
                      <>
                        <Bell className="w-3.5 h-3.5" />
                        <span>Activer le push sur cet appareil</span>
                      </>
                    )}
                  </button>

                  {registeredDevices.length > 0 && (
                    <button
                      type="button"
                      onClick={() => handleUnregisterDevice()}
                      className="py-2.5 px-3 rounded-xl border border-slate-300 hover:bg-slate-100 text-slate-700 font-medium text-xs transition-colors cursor-pointer"
                      title="Désactiver le push sur cet appareil"
                    >
                      Désactiver
                    </button>
                  )}
                </div>

                {/* Liste des appareils enregistrés pour cet utilisateur */}
                {user && !user.isDemo && (
                  <div className="pt-2 border-t border-slate-200 space-y-2">
                    <div className="flex items-center justify-between text-[11px] text-slate-500">
                      <span>Appareils autorisés ({devicesError ? '—' : registeredDevices.length}) :</span>
                      <button
                        type="button"
                        onClick={() => refreshRegisteredDevices()}
                        disabled={isLoadingDevices}
                        className="text-blue-600 hover:text-blue-700 font-semibold flex items-center gap-1 cursor-pointer disabled:opacity-50"
                      >
                        <RefreshCw className={`w-3 h-3 ${isLoadingDevices ? 'animate-spin' : ''}`} /> Actualiser
                      </button>
                    </div>

                    {devicesError ? (
                      <p className="text-[11px] text-red-500 italic">
                        Impossible de charger les appareils autorisés.
                      </p>
                    ) : isLoadingDevices ? (
                      <div className="flex items-center gap-1.5 text-[11px] text-slate-400 py-1">
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Chargement des appareils...</span>
                      </div>
                    ) : registeredDevices.length === 0 ? (
                      <p className="text-[11px] text-slate-400 italic">
                        Aucun appareil n'est encore enregistré pour recevoir les rappels push.
                      </p>
                    ) : (
                      <div className="space-y-1.5 max-h-32 overflow-y-auto">
                        {registeredDevices.map((dev) => (
                          <div 
                            key={dev.id}
                            className="bg-white p-2 rounded-lg border border-slate-200 flex items-center justify-between gap-2 text-[11px]"
                          >
                            <div className="truncate">
                              <span className="font-semibold text-slate-800 block truncate">
                                {dev.platform || 'Navigateur Web'} · {dev.timeZone || 'UTC'}
                              </span>
                              <span className="text-[10px] text-slate-400 font-mono block truncate">
                                {dev.id}
                              </span>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleUnregisterDevice(dev.id)}
                              className="p-1 text-slate-400 hover:text-red-600 rounded transition-colors"
                              title="Supprimer cet appareil"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Aperçu de confidentialité sur écran verrouillé */}
              <div className="bg-blue-50/50 rounded-xl p-3 border border-blue-100 text-xs text-blue-900 space-y-1.5">
                <div className="flex items-center gap-1.5 font-bold text-blue-950">
                  <Lock className="w-3.5 h-3.5 text-blue-600" />
                  <span>Confidentialité sur écran verrouillé :</span>
                </div>
                <div className="bg-white/80 p-2 rounded-lg border border-blue-200/60 font-sans space-y-0.5">
                  <p className="font-bold text-slate-900 text-xs">Rappel de votre carnet médical</p>
                  <p className="text-slate-600 text-[11px]">C'est le moment de réaliser votre injection programmée.</p>
                </div>
                <p className="text-[10px] text-slate-500 leading-tight">
                  Aucun nom de traitement, ni numéro de lot ou données sensibles ne sont affichés sur l'écran verrouillé.
                </p>
              </div>

              {/* Boutons de test : Réel FCM et Prévisualisation Locale */}
              <div className="pt-1 space-y-2">
                <button
                  type="button"
                  onClick={handleTestFcmPush}
                  disabled={isTestingPush || user?.isDemo}
                  className="w-full py-3 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 active:bg-slate-950 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer disabled:opacity-50"
                >
                  {isTestingPush ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Envoi du test FCM via Netlify Function...</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Tester l'envoi de notification push FCM</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={handleLocalServiceWorkerTest}
                  className="w-full py-2 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-[11px] flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Bell className="w-3.5 h-3.5 text-slate-500" />
                  <span>Tester l'affichage immédiat du Service Worker (Local)</span>
                </button>
              </div>
            </div>
          )}
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
              <span>Installer Suivi VYVGART sur cet appareil</span>
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
                Ce mode fonctionne exclusivement en <strong>mémoire vive temporaire</strong> avec des <strong>données fictives</strong>. Aucune donnée médicale réelle n'est envoyée à Firestore ni stockée dans votre navigateur (localStorage/IndexedDB désactivés).
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

        {/* Informations de Version & Crédit Auteur */}
        <div className="pt-6 pb-2 text-center text-xs text-slate-400 font-medium tracking-tight space-y-1 select-none">
          <p>Version 1.0.0 · Développé par Ali A.</p>
          <p className="text-[11px] text-slate-400/80">Carnet médical personnel · Suivi VYVGART</p>
        </div>
      </form>
    </div>
  );
}
