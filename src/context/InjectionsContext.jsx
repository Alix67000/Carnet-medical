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
import { addDays, differenceInCalendarDays, startOfDay } from 'date-fns';

const InjectionsContext = createContext(null);

const DEFAULT_PREFERENCES = {
  intervalDays: 7,
  reminderTime: '09:00',
  notificationsEnabled: true,
};

export function InjectionsProvider({ children }) {
  const { user } = useAuth();
  const [injections, setInjections] = useState([]);
  const [preferences, setPreferences] = useState(DEFAULT_PREFERENCES);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Synchronisation en temps réel des injections et préférences utilisateur
  useEffect(() => {
    if (!user) {
      setInjections([]);
      setPreferences(DEFAULT_PREFERENCES);
      setLoading(false);
      return;
    }

    setLoading(true);
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
        handleFirestoreError(err, 'list', `users/${user.uid}/injections`);
        setError('Impossible de charger l\'historique des injections.');
        setLoading(false);
      }
    );

    // Écoute des préférences utilisateur
    const prefDocRef = doc(db, 'users', user.uid, 'settings', 'preferences');
    const unsubscribePrefs = onSnapshot(
      prefDocRef,
      (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.data();
          setPreferences({
            intervalDays: typeof data.intervalDays === 'number' ? data.intervalDays : 7,
            reminderTime: data.reminderTime || '09:00',
            notificationsEnabled: data.notificationsEnabled !== undefined ? Boolean(data.notificationsEnabled) : true,
          });
        } else {
          // Initialise les préférences par défaut
          setDoc(prefDocRef, {
            ...DEFAULT_PREFERENCES,
            updatedAt: serverTimestamp(),
          }).catch((err) => {
            handleFirestoreError(err, 'write', `users/${user.uid}/settings/preferences`);
          });
        }
      },
      (err) => {
        handleFirestoreError(err, 'get', `users/${user.uid}/settings/preferences`);
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

    const injectionsRef = collection(db, 'users', user.uid, 'injections');
    const dateTimestamp = date instanceof Date ? Timestamp.fromDate(date) : Timestamp.now();
    const expTimestamp = expirationDate instanceof Date ? Timestamp.fromDate(expirationDate) : Timestamp.fromDate(new Date(expirationDate));

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
      handleFirestoreError(err, 'create', `users/${user.uid}/injections`);
      throw err;
    }
  };

  // Supprimer une injection
  const deleteInjection = async (injectionId) => {
    if (!user) throw new Error('Utilisateur non connecté');
    try {
      const docRef = doc(db, 'users', user.uid, 'injections', injectionId);
      await deleteDoc(docRef);
    } catch (err) {
      handleFirestoreError(err, 'delete', `users/${user.uid}/injections/${injectionId}`);
      throw err;
    }
  };

  // Mettre à jour les préférences
  const updatePreferences = async (newPrefs) => {
    if (!user) throw new Error('Utilisateur non connecté');
    try {
      const prefDocRef = doc(db, 'users', user.uid, 'settings', 'preferences');
      const payload = {
        intervalDays: Number(newPrefs.intervalDays) || 7,
        reminderTime: newPrefs.reminderTime || '09:00',
        notificationsEnabled: Boolean(newPrefs.notificationsEnabled),
        updatedAt: serverTimestamp(),
      };
      await setDoc(prefDocRef, payload, { merge: true });
      setPreferences(payload);
    } catch (err) {
      handleFirestoreError(err, 'update', `users/${user.uid}/settings/preferences`);
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
