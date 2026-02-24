"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.grantAdminClaim = exports.listAuthUsers = void 0;
const admin = __importStar(require("firebase-admin"));
const https_1 = require("firebase-functions/v2/https");
const params_1 = require("firebase-functions/params");
admin.initializeApp();
// Reads from functions/.env (gitignored) — never hardcoded in source.
const masterEmailParam = (0, params_1.defineString)('MASTER_EMAIL');
/**
 * Callable function — lists all Firebase Auth users.
 * Only callable by the master admin.
 */
exports.listAuthUsers = (0, https_1.onCall)({ region: 'us-central1' }, async (request) => {
    var _a, _b, _c, _d, _e;
    if (!request.auth) {
        throw new https_1.HttpsError('unauthenticated', 'Must be signed in.');
    }
    if (request.auth.token.email !== masterEmailParam.value()) {
        throw new https_1.HttpsError('permission-denied', 'Not authorized.');
    }
    const users = [];
    let pageToken;
    do {
        const result = await admin.auth().listUsers(1000, pageToken);
        for (const u of result.users) {
            users.push({
                uid: u.uid,
                email: (_a = u.email) !== null && _a !== void 0 ? _a : null,
                displayName: (_b = u.displayName) !== null && _b !== void 0 ? _b : null,
                photoURL: (_c = u.photoURL) !== null && _c !== void 0 ? _c : null,
                disabled: u.disabled,
                creationTime: (_d = u.metadata.creationTime) !== null && _d !== void 0 ? _d : null,
                lastSignInTime: (_e = u.metadata.lastSignInTime) !== null && _e !== void 0 ? _e : null,
            });
        }
        pageToken = result.pageToken;
    } while (pageToken);
    return { users };
});
/**
 * Sets the `admin: true` custom claim on the calling user if their email
 * matches MASTER_EMAIL. Call this once from the admin panel to migrate
 * away from email-based Firestore rule checks to claim-based checks.
 * After calling this, sign out and back in to get a refreshed token.
 */
exports.grantAdminClaim = (0, https_1.onCall)({ region: 'us-central1' }, async (request) => {
    if (!request.auth) {
        throw new https_1.HttpsError('unauthenticated', 'Must be signed in.');
    }
    if (request.auth.token.email !== masterEmailParam.value()) {
        throw new https_1.HttpsError('permission-denied', 'Not authorized.');
    }
    if (request.auth.token['admin'] === true) {
        return { message: 'Admin claim already set.' };
    }
    await admin.auth().setCustomUserClaims(request.auth.uid, { admin: true });
    return { message: 'Admin claim granted. Sign out and back in to apply.' };
});
//# sourceMappingURL=index.js.map