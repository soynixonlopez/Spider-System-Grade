/**
 * Import function triggers from their respective submodules:
 *
 * const {onCall} = require("firebase-functions/v2/https");
 * const {onDocumentWritten} = require("firebase-functions/v2/firestore");
 *
 * See a full list of supported triggers at https://firebase.google.com/docs/functions
 */

const {setGlobalOptions} = require("firebase-functions");
const {onRequest} = require("firebase-functions/https");
const logger = require("firebase-functions/logger");

const functions = require('firebase-functions');
const admin = require('firebase-admin');

admin.initializeApp();

// Cloud Function para eliminar usuarios de Firebase Auth
exports.deleteUser = functions.https.onCall(async (data, context) => {
    // Verificar que el usuario esté autenticado
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'Usuario no autenticado');
    }

    // Verificar que el usuario sea admin
    const adminDoc = await admin.firestore().collection('users').doc(context.auth.uid).get();
    if (!adminDoc.exists || adminDoc.data().role !== 'admin') {
        throw new functions.https.HttpsError('permission-denied', 'Solo los administradores pueden eliminar usuarios');
    }

    const { userId } = data;
    
    if (!userId) {
        throw new functions.https.HttpsError('invalid-argument', 'Se requiere el ID del usuario');
    }

    try {
        // Eliminar usuario de Firebase Auth
        await admin.auth().deleteUser(userId);
        
        console.log(`Usuario ${userId} eliminado de Firebase Auth`);
        
        return { success: true, message: 'Usuario eliminado exitosamente' };
    } catch (error) {
        console.error('Error eliminando usuario:', error);
        throw new functions.https.HttpsError('internal', 'Error eliminando usuario: ' + error.message);
    }
});

// Cloud Function para eliminar múltiples usuarios (para promociones)
exports.deleteMultipleUsers = functions.https.onCall(async (data, context) => {
    // Verificar que el usuario esté autenticado
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'Usuario no autenticado');
    }

    // Verificar que el usuario sea admin
    const adminDoc = await admin.firestore().collection('users').doc(context.auth.uid).get();
    if (!adminDoc.exists || adminDoc.data().role !== 'admin') {
        throw new functions.https.HttpsError('permission-denied', 'Solo los administradores pueden eliminar usuarios');
    }

    const { userIds } = data;
    
    if (!userIds || !Array.isArray(userIds)) {
        throw new functions.https.HttpsError('invalid-argument', 'Se requiere un array de IDs de usuarios');
    }

    try {
        const results = [];
        
        for (const userId of userIds) {
            try {
                await admin.auth().deleteUser(userId);
                results.push({ userId, success: true });
                console.log(`Usuario ${userId} eliminado de Firebase Auth`);
            } catch (error) {
                results.push({ userId, success: false, error: error.message });
                console.error(`Error eliminando usuario ${userId}:`, error);
            }
        }
        
        const successCount = results.filter(r => r.success).length;
        const errorCount = results.filter(r => !r.success).length;
        
        return { 
            success: true, 
            message: `${successCount} usuarios eliminados exitosamente${errorCount > 0 ? `, ${errorCount} errores` : ''}`,
            results 
        };
    } catch (error) {
        console.error('Error eliminando usuarios:', error);
        throw new functions.https.HttpsError('internal', 'Error eliminando usuarios: ' + error.message);
    }
});

// For cost control, you can set the maximum number of containers that can be
// running at the same time. This helps mitigate the impact of unexpected
// traffic spikes by instead downgrading performance. This limit is a
// per-function limit. You can override the limit for each function using the
// `maxInstances` option in the function's options, e.g.
// `onRequest({ maxInstances: 5 }, (req, res) => { ... })`.
// NOTE: setGlobalOptions does not apply to functions using the v1 API. V1
// functions should each use functions.runWith({ maxInstances: 10 }) instead.
// In the v1 API, each function can only serve one request per container, so
// this will be the maximum concurrent request count.
setGlobalOptions({ maxInstances: 10 });

// Create and deploy your first functions
// https://firebase.google.com/docs/functions/get-started

// exports.helloWorld = onRequest((request, response) => {
//   logger.info("Hello logs!", {structuredData: true});
//   response.send("Hello from Firebase!");
// });
