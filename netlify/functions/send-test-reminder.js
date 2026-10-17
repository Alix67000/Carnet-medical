import { getFirebaseAdmin } from './utils/firebaseAdmin.js';

/**
 * Netlify Function pour le test d'envoi FCM sécurisé.
 * Accessible via POST /.netlify/functions/send-test-reminder
 *
 * Sécurité :
 * - L'en-tête Authorization doit contenir un jeton Firebase Auth valide (Bearer <token>).
 * - La fonction n'envoie la notification qu'aux appareils enregistrés sous l'UID authentifié.
 * - Aucun token ou UID externe arbitraire ne peut être fourni par le client.
 */
export async function handler(event, context) {
  // En-têtes CORS pour les requêtes de test
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers, body: '' };
  }

  const authHeader = event.headers.authorization || event.headers.Authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return {
      statusCode: 401,
      headers,
      body: JSON.stringify({ error: 'Jeton d\'authentification manquant dans l\'en-tête Authorization.' }),
    };
  }

  const idToken = authHeader.replace('Bearer ', '').trim();

  try {
    const { auth, db, messaging } = getFirebaseAdmin();

    // 1. Vérification sécurisée du jeton Firebase Auth
    let decodedToken;
    try {
      decodedToken = await auth.verifyIdToken(idToken);
    } catch (authErr) {
      console.error('[send-test-reminder] Jeton invalide ou expiré:', authErr.message);
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ error: 'Session expirée ou jeton d\'authentification invalide.' }),
      };
    }

    const userId = decodedToken.uid;

    // 2. Recherche des appareils autorisés pour cet utilisateur uniquement
    const tokensSnap = await db
      .collection('users')
      .doc(userId)
      .collection('fcmTokens')
      .where('enabled', '==', true)
      .get();

    if (tokensSnap.empty) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({
          error: 'Aucun appareil actif n\'a été trouvé pour votre compte. Cliquez d\'abord sur "Activer les notifications push sur cet appareil".',
        }),
      };
    }

    const userDevices = tokensSnap.docs.map((docSnap) => ({
      docId: docSnap.id,
      ref: docSnap.ref,
      token: docSnap.data().token,
    }));

    const tokens = userDevices.map((d) => d.token).filter(Boolean);

    // 3. Envoi du message FCM discret
    const payload = {
      notification: {
        title: 'Rappel de votre carnet médical',
        body: 'Test de notification push réussi pour votre carnet médical.',
      },
      data: {
        type: 'test_notification',
        click_action: '/',
        sentAt: new Date().toISOString(),
      },
      tokens,
    };

    const response = await messaging.sendEachForMulticast(payload);

    // 4. Nettoyage des tokens devenus obsolètes
    if (response.failureCount > 0) {
      const deletePromises = [];
      response.responses.forEach((resp, idx) => {
        if (!resp.success && resp.error) {
          const code = resp.error.code;
          if (
            code === 'messaging/invalid-registration-token' ||
            code === 'messaging/registration-token-not-registered'
          ) {
            const dev = userDevices[idx];
            if (dev?.ref) {
              deletePromises.push(dev.ref.delete().catch(() => {}));
            }
          }
        }
      });
      await Promise.all(deletePromises);
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        count: response.successCount,
        failureCount: response.failureCount,
        totalDevices: tokens.length,
      }),
    };
  } catch (err) {
    console.error('[send-test-reminder] Erreur:', err.message);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Erreur serveur lors de l\'envoi du test FCM.',
        details: err.message,
      }),
    };
  }
}

export default handler;
