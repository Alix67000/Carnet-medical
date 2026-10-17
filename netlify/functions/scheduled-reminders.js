import { schedule } from '@netlify/functions';
import { getFirebaseAdmin, getZonedTimeInfo } from './utils/firebaseAdmin.js';

/**
 * Netlify Scheduled Function pour les rappels automatiques.
 * Compatible avec le forfait Netlify Free.
 *
 * Fréquence recommandée : '0 * * * *' (toutes les heures à la minute 00).
 * 24 exécutions / jour × 30 jours = 720 exécutions / mois.
 * Durée moyenne par exécution : ~1 à 2 secondes (soit moins de 25 minutes de calcul par mois,
 * largement en-deçà des 100 heures et des 125 000 requêtes gratuites de Netlify).
 */
const handler = async (event) => {
  const now = new Date();
  console.log(`[Netlify Scheduled Reminders] Lancement de la vérification à ${now.toISOString()}`);

  try {
    const { db, messaging } = getFirebaseAdmin();

    // 1. Récupération de tous les appareils actifs via collectionGroup
    // Résout le problème des documents parents fantômes sans nécessiter de champs préalables sur /users/{userId}
    const activeTokensSnap = await db
      .collectionGroup('fcmTokens')
      .where('enabled', '==', true)
      .get();

    if (activeTokensSnap.empty) {
      console.log('[Netlify Scheduled Reminders] Aucun appareil actif trouvé.');
      return {
        statusCode: 200,
        body: JSON.stringify({ message: 'Aucun appareil actif', sentCount: 0 }),
      };
    }

    // Regroupement des jetons par utilisateur
    const userTokensMap = new Map();
    activeTokensSnap.forEach((docSnap) => {
      const data = docSnap.data();
      const userRef = docSnap.ref.parent.parent;
      if (!userRef) return;
      const userId = userRef.id;

      if (!userTokensMap.has(userId)) {
        userTokensMap.set(userId, []);
      }
      userTokensMap.get(userId).push({
        docId: docSnap.id,
        ref: docSnap.ref,
        token: data.token,
        timeZone: data.timeZone,
      });
    });

    console.log(`[Netlify Scheduled Reminders] ${userTokensMap.size} patient(s) à évaluer.`);

    let sentCountTotal = 0;
    let prunedTokensTotal = 0;

    // 2. Évaluation de l'échéance pour chaque utilisateur
    for (const [userId, userDevices] of userTokensMap.entries()) {
      try {
        // Préférences du patient
        const prefSnap = await db.doc(`users/${userId}/settings/preferences`).get();
        if (!prefSnap.exists) continue;

        const prefs = prefSnap.data();
        if (prefs.notificationsEnabled === false) continue; // Notifications coupées par le patient

        // Dernière injection
        const latestInjSnap = await db
          .collection(`users/${userId}/injections`)
          .orderBy('date', 'desc')
          .limit(1)
          .get();

        if (latestInjSnap.empty) continue; // Pas encore d'injection notée

        const lastInj = latestInjSnap.docs[0].data();
        const lastInjDate = lastInj.date?.toDate ? lastInj.date.toDate() : new Date(lastInj.date);
        if (!lastInjDate || isNaN(lastInjDate.getTime())) {
          console.warn(`[Netlify Scheduled Reminders] Date invalide pour l'utilisateur ${userId}`);
          continue;
        }
        const intervalDays = typeof prefs.intervalDays === 'number' && prefs.intervalDays >= 1 ? prefs.intervalDays : 7;
        const reminderTimeStr = prefs.reminderTime || '09:00';
        const userTimeZone = prefs.timeZone || userDevices[0]?.timeZone || 'Europe/Paris';

        // Date cible de la prochaine injection
        const targetDate = new Date(lastInjDate.getTime() + intervalDays * 24 * 60 * 60 * 1000);
        const targetInfo = getZonedTimeInfo(targetDate, userTimeZone);
        const targetDateKey = targetInfo.dateStr; // "YYYY-MM-DD"

        // Déduplication : au maximum 1 rappel par échéance
        if (prefs.lastReminderSentForDate === targetDateKey) {
          continue; // Déjà envoyé pour cette échéance
        }

        // Heure et date actuelles dans le fuseau du patient
        const currentZoned = getZonedTimeInfo(now, userTimeZone);
        const isTargetDateToday = currentZoned.dateStr === targetDateKey;
        const isPastTargetDate = currentZoned.dateStr > targetDateKey;
        const isTimeReached = currentZoned.timeStr >= reminderTimeStr;

        const isDue = (isTargetDateToday && isTimeReached) || isPastTargetDate;
        if (!isDue) continue;

        // Évite le spam si l'échéance est dépassée depuis plus de 4 jours
        const daysOverdue = Math.round((now - targetDate) / (24 * 60 * 60 * 1000));
        if (daysOverdue > 4) continue;

        const validTokens = userDevices.map((d) => d.token).filter(Boolean);
        if (validTokens.length === 0) continue;

        // Notification discrète et confidentielle pour écran verrouillé
        const messagePayload = {
          notification: {
            title: 'Rappel de votre carnet médical',
            body: "C'est le moment de réaliser votre injection programmée.",
          },
          data: {
            type: 'scheduled_reminder',
            click_action: '/',
          },
          tokens: validTokens,
        };

        const batchResponse = await messaging.sendEachForMulticast(messagePayload);
        sentCountTotal += batchResponse.successCount;

        // Nettoyage des jetons invalides ou expirés
        if (batchResponse.failureCount > 0) {
          const deletePromises = [];
          batchResponse.responses.forEach((resp, idx) => {
            if (!resp.success && resp.error) {
              const errCode = resp.error.code;
              if (
                errCode === 'messaging/invalid-registration-token' ||
                errCode === 'messaging/registration-token-not-registered'
              ) {
                prunedTokensTotal++;
                const dev = userDevices[idx];
                if (dev?.ref) {
                  deletePromises.push(dev.ref.delete().catch(() => {}));
                }
              }
            }
          });
          await Promise.all(deletePromises);
        }

        // Mémorisation de l'échéance notifiée pour éviter les doublons
        if (batchResponse.successCount > 0) {
          await db.doc(`users/${userId}/settings/preferences`).set(
            {
              lastReminderSentForDate: targetDateKey,
              lastReminderSentAt: new Date(),
            },
            { merge: true }
          );
        }
      } catch (err) {
        console.error('[Netlify Scheduled Reminders] Erreur traitement utilisateur:', err?.message || 'internal');
      }
    }

    console.log(`[Netlify Scheduled Reminders] Fin : ${sentCountTotal} notification(s) envoyée(s), ${prunedTokensTotal} jeton(s) nettoyé(s).`);

    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        sentCount: sentCountTotal,
        prunedTokens: prunedTokensTotal,
        executedAt: now.toISOString(),
      }),
    };
  } catch (globalErr) {
    console.error('[Netlify Scheduled Reminders] Erreur globale:', globalErr);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: globalErr.message || 'Internal server error' }),
    };
  }
};

// Export standardisé pour Netlify Scheduled Functions (toutes les heures à xx:00)
// Compatible avec les runtimes Netlify v1 (schedule) et v2 (config.schedule)
export const handler = schedule('0 * * * *', handler);
export const config = {
  schedule: '0 * * * *',
};
export { handler as scheduledRemindersHandler };
