import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { 
  collection, 
  doc, 
  query, 
  orderBy, 
  onSnapshot, 
  addDoc, 
  deleteDoc, 
  setDoc,
  serverTimestamp, 
  Timestamp 
} from 'firebase/firestore';
import { db, handleFirestoreError } from '../firebase';
import { useAuth } from './AuthContext';
import { getNextZone } from '../utils/zoneLogic';
import { addDays, subDays, addMonths, differenceInCalendarDays, startOfDay } from 'date-fns';

const InjectionsContext = createContext(null);

const DEFAULT_PREFERENCES = {
  intervalDays: 7,
  reminderTime: '09:00',
  notificationsEnabled: true,
  timeZone: typeof Intl !== 'undefined' ? (Intl.DateTimeFormat().resolvedOptions().timeZone || 'Europe/Paris') : 'Europe/Paris',
};

// Données initiales d'exemple pour le mode démonstration
function getInitialDemoInjections() {
  const sevenDaysAgo = subDays(new Date(), 7);
  sevenDaysAgo.setHours(9, 30, 0, 0);

  return [
    {
      id: 'demo-inj-1',
      zone: 1, // Supérieur Droit
      lotNumber: 'VYV-2026-A12',
      date: sevenDaysAgo,
      expirationDate: addMonths(new Date(), 8),
      createdAt: sevenDaysAgo,
    }
  ];
}

export function InjectionsProvider({ children }) {
  const { user } = useAuth();
  const [injections, setInjections] = useState([]);
  const [preferences, setPreferences] = useState(DEFAULT_PREFERENCES);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Synchronisation des données (Firestore pour utilisateur authentifié, ou mémoire vive en mode démo)
  useEffect(() => {
    // Si déconnexion ou aucun utilisateur, vider immédiatement les données en mémoire
    if (!user) {
      setInjections([]);
      setPreferences(DEFAULT_PREFERENCES);
      setLoading(false);
      setError(null);
      return;
    }

    // Cas 1 : Mode Démonstration local (données 100% fictives conservées uniquement en mémoire vive)
    // Aucune interaction avec Firestore, aucun enregistrement dans localStorage ou IndexedDB.
    if (user.isDemo) {
      setInjections(getInitialDemoInjections());
      setPreferences(DEFAULT_PREFERENCES);
      setError(null);
      setLoading(false);
      return;
    }

    // Cas 2 : Utilisateur Firebase Authentifié réel (Firestore en direct avec sécurité par UID)
    setLoading(true);
    setError(null);

    const injectionsRef = collection(db, 'users', user.uid, 'injections');
    const injectionsQuery = query(injectionsRef, orderBy('date', 'desc'));

    const unsubscribeInjections = onSnapshot(
      injectionsQuery,
      (snapshot) => {
        const items = snapshot.docs.map((docSnap) => {
          const data = docSnap.data();
          return {
            id: docSnap.id,
            zone: Number(data.zone) || 1,
            lotNumber: data.lotNumber || '',
            date: data.date?.toDate ? data.date.toDate() : new Date(data.date || Date.now()),
            expirationDate: data.expirationDate?.toDate ? data.expirationDate.toDate() : (data.expirationDate ? new Date(data.expirationDate) : null),
            createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : new Date(),
          };
        });
        setInjections(items);
        setLoading(false);
      },
      (err) => {
        handleFirestoreError(err, 'list', 'injections');
        setError('Impossible de charger l\'historique des injections Firestore.');
        setLoading(false);
      }
    );

    // Écoute des préférences utilisateur dans Firestore
    const prefDocRef = doc(db, 'users', user.uid, 'settings', 'preferences');
    const userDocRef = doc(db, 'users', user.uid);

    // Backfill automatique du document parent pour éliminer les documents fantômes dans Firestore
    setDoc(userDocRef, { active: true, updatedAt: serverTimestamp() }, { merge: true }).catch(() => {});

    const unsubscribePrefs = onSnapshot(
      prefDocRef,
      (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.data();
          setPreferences({
            intervalDays: typeof data.intervalDays === 'number' ? data.intervalDays : 7,
            reminderTime: data.reminderTime || '09:00',
            notificationsEnabled: data.notificationsEnabled !== undefined ? Boolean(data.notificationsEnabled) : true,
            timeZone: data.timeZone || (typeof Intl !== 'undefined' ? (Intl.DateTimeFormat().resolvedOptions().timeZone || 'Europe/Paris') : 'Europe/Paris'),
          });
        } else {
          // Initialise les préférences par défaut dans Firestore
          setDoc(prefDocRef, {
            ...DEFAULT_PREFERENCES,
            updatedAt: serverTimestamp(),
          }).catch((err) => {
            handleFirestoreError(err, 'write', 'settings/preferences');
          });
        }
      },
      (err) => {
        handleFirestoreError(err, 'get', 'settings/preferences');
      }
    );

    return () => {
      unsubscribeInjections();
      unsubscribePrefs();
    };
  }, [user]);

  // Ajouter une injection
  const addInjection = async ({ date, zone, lotNumber, expirationDate }) => {
    if (!user) throw new Error('Utilisateur non connecté');

    const injectionDate = date instanceof Date ? date : new Date(date);
    const expDate = expirationDate instanceof Date ? expirationDate : new Date(expirationDate);

    // Mode Démo Local : mise à jour exclusive de la mémoire d'état React (aucun stockage local ni réseau)
    if (user.isDemo) {
      const newEntry = {
        id: `demo-inj-${Date.now()}`,
        date: injectionDate,
        zone: Number(zone),
        lotNumber: String(lotNumber).trim().toUpperCase(),
        expirationDate: expDate,
        createdAt: new Date(),
      };
      setInjections((prev) => [newEntry, ...prev].sort((a, b) => b.date - a.date));
      return newEntry.id;
    }

    // Mode Firestore en direct
    const injectionsRef = collection(db, 'users', user.uid, 'injections');
    const dateTimestamp = Timestamp.fromDate(injectionDate);
    const expTimestamp = Timestamp.fromDate(expDate);

    try {
      const docRef = await addDoc(injectionsRef, {
        date: dateTimestamp,
        zone: Number(zone),
        lotNumber: String(lotNumber).trim().toUpperCase(),
        expirationDate: expTimestamp,
        createdAt: serverTimestamp(),
      });
      return docRef.id;
    } catch (err) {
      handleFirestoreError(err, 'create', 'injections');
      throw err;
    }
  };

  // Supprimer une injection
  const deleteInjection = async (injectionId) => {
    if (!user) throw new Error('Utilisateur non connecté');

    // Mode Démo Local : filtrage en mémoire uniquement
    if (user.isDemo) {
      setInjections((prev) => prev.filter((inj) => inj.id !== injectionId));
      return;
    }

    // Mode Firestore
    try {
      const docRef = doc(db, 'users', user.uid, 'injections', injectionId);
      await deleteDoc(docRef);
    } catch (err) {
      handleFirestoreError(err, 'delete', 'injections');
      throw err;
    }
  };

  // Modifier une injection existante
  const updateInjection = async (injectionId, { date, zone, lotNumber, expirationDate }) => {
    if (!user) throw new Error('Utilisateur non connecté');

    const injectionDate = date instanceof Date ? date : new Date(date);
    const expDate = expirationDate instanceof Date ? expirationDate : new Date(expirationDate);

    // Mode Démo Local : mise à jour en mémoire vive uniquement
    if (user.isDemo) {
      setInjections((prev) =>
        prev
          .map((inj) => {
            if (inj.id === injectionId) {
              return {
                ...inj,
                date: injectionDate,
                zone: Number(zone),
                lotNumber: String(lotNumber).trim().toUpperCase(),
                expirationDate: expDate,
                updatedAt: new Date(),
              };
            }
            return inj;
          })
          .sort((a, b) => b.date - a.date)
      );
      return;
    }

    // Mode Firestore en direct
    const injectionDocRef = doc(db, 'users', user.uid, 'injections', injectionId);
    const dateTimestamp = Timestamp.fromDate(injectionDate);
    const expTimestamp = Timestamp.fromDate(expDate);

    try {
      await setDoc(
        injectionDocRef,
        {
          date: dateTimestamp,
          zone: Number(zone),
          lotNumber: String(lotNumber).trim().toUpperCase(),
          expirationDate: expTimestamp,
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );
    } catch (err) {
      handleFirestoreError(err, 'update', 'injections');
      throw err;
    }
  };

  // Mettre à jour les préférences
  const updatePreferences = async (newPrefs) => {
    if (!user) throw new Error('Utilisateur non connecté');

    const payload = {
      intervalDays: Number(newPrefs.intervalDays) || 7,
      reminderTime: newPrefs.reminderTime || '09:00',
      notificationsEnabled: Boolean(newPrefs.notificationsEnabled),
      timeZone: newPrefs.timeZone || preferences.timeZone || 'Europe/Paris',
    };

    // Mode Démo Local : mise à jour en mémoire vive uniquement
    if (user.isDemo) {
      setPreferences(payload);
      return;
    }

    // Mode Firestore
    try {
      const prefDocRef = doc(db, 'users', user.uid, 'settings', 'preferences');
      await setDoc(prefDocRef, { ...payload, updatedAt: serverTimestamp() }, { merge: true });
      setPreferences(payload);
    } catch (err) {
      handleFirestoreError(err, 'update', 'settings/preferences');
      throw err;
    }
  };

  // Métriques et calculs dérivés
  const calculations = useMemo(() => {
    const lastInjection = injections.length > 0 ? injections[0] : null;
    const nextSuggestedZone = getNextZone(lastInjection?.zone);

    let nextInjectionDate = null;
    let daysUntilNext = null;
    let scheduleStatus = 'none'; // 'today', 'future', 'overdue', 'none'

    if (lastInjection && lastInjection.date) {
      nextInjectionDate = addDays(lastInjection.date, preferences.intervalDays || 7);
      const today = startOfDay(new Date());
      const targetDay = startOfDay(nextInjectionDate);
      daysUntilNext = differenceInCalendarDays(targetDay, today);

      if (daysUntilNext === 0) {
        scheduleStatus = 'today';
      } else if (daysUntilNext < 0) {
        scheduleStatus = 'overdue';
      } else {
        scheduleStatus = 'future';
      }
    }

    return {
      lastInjection,
      nextSuggestedZone,
      nextInjectionDate,
      daysUntilNext,
      scheduleStatus,
      totalInjections: injections.length,
    };
  }, [injections, preferences]);

  return (
    <InjectionsContext.Provider
      value={{
        injections,
        preferences,
        loading,
        error,
        addInjection,
        updateInjection,
        deleteInjection,
        updatePreferences,
        ...calculations,
      }}
    >
      {children}
    </InjectionsContext.Provider>
  );
}

export function useInjections() {
  const context = useContext(InjectionsContext);
  if (!context) {
    throw new Error('useInjections doit être utilisé au sein de InjectionsProvider');
  }
  return context;
}
