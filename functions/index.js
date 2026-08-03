// functions/index.js

const {onCall, HttpsError} = require("firebase-functions/v2/https");
const {initializeApp} = require("firebase-admin/app");
const {getAuth} = require("firebase-admin/auth");
const {getFirestore, FieldValue} = require("firebase-admin/firestore");

initializeApp();

exports.createUser = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Must be authenticated.");
  }

  const {
    email,
    password,
    nombreCompleto,
    apellidoPaterno,
    apellidoMaterno,
    areaTrabajo,
  } = request.data;

  try {
    const userRecord = await getAuth().createUser({
      email,
      password,
      displayName: `${nombreCompleto} ${apellidoPaterno} ${apellidoMaterno}`,
    });

    await getFirestore()
        .collection("usuarios")
        .doc(userRecord.uid)
        .set({
          nombre: nombreCompleto,
          apellido_paterno: apellidoPaterno,
          apellido_materno: apellidoMaterno,
          area: areaTrabajo,
          correo: email,
          fecha_creado: FieldValue.serverTimestamp(),
        });

    return {uid: userRecord.uid};
  } catch (error) {
    console.error("Error creating new user:", error);
    throw new HttpsError("unknown", error.message, error);
  }
});

exports.deleteAuthUser = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Must be authenticated.");
  }
  const {uid} = request.data;
  if (!uid) {
    throw new HttpsError("invalid-argument", "UID requerido.");
  }
  try {
    await getAuth().deleteUser(uid);
    return {success: true};
  } catch (error) {
    console.error("Error deleting auth user:", error);
    throw new HttpsError("unknown", error.message, error);
  }
});

