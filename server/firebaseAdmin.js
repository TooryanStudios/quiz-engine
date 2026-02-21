'use strict';

const admin = require('firebase-admin');

let app = null;

function parseServiceAccountJson() {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (!raw) return null;

  try {
    return JSON.parse(raw);
  } catch (_err) {
    throw new Error('FIREBASE_SERVICE_ACCOUNT_JSON is not valid JSON');
  }
}

function getAdminApp() {
  if (app) return app;

  if (admin.apps.length) {
    app = admin.app();
    return app;
  }

  const serviceAccount = parseServiceAccountJson();
  if (!serviceAccount) {
    throw new Error('Missing FIREBASE_SERVICE_ACCOUNT_JSON');
  }

  app = admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    projectId: process.env.FIREBASE_PROJECT_ID || serviceAccount.project_id,
  });

  return app;
}

function getFirestore() {
  return getAdminApp().firestore();
}

module.exports = {
  admin,
  getFirestore,
};
