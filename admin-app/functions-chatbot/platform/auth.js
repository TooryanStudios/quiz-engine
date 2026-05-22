const pickFirstNonEmptyString = (...values) => {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }
  return "";
};

export const extractBearerToken = (authorizationHeader) => {
  const normalized = pickFirstNonEmptyString(authorizationHeader);
  const bearerMatch = normalized.match(/^bearer\s+(.+)$/i);
  return pickFirstNonEmptyString(bearerMatch?.[1]);
};

export const createFirebaseAuthVerifier = ({ ensureFirebaseAdminApp, getAuth }) => {
  if (typeof ensureFirebaseAdminApp !== "function") {
    throw new Error("ensureFirebaseAdminApp is required.");
  }

  if (typeof getAuth !== "function") {
    throw new Error("getAuth is required.");
  }

  return async (req) => {
    const idToken = extractBearerToken(req?.headers?.authorization);
    if (!idToken) {
      return {
        ok: false,
        status: 401,
        error: "Missing Firebase bearer token.",
      };
    }

    let adminApp;
    try {
      adminApp = await ensureFirebaseAdminApp();
    } catch (error) {
      return {
        ok: false,
        status: 500,
        error: error?.message || "Firebase admin credentials are not configured.",
      };
    }

    try {
      const decodedToken = await getAuth(adminApp).verifyIdToken(idToken);
      return {
        ok: true,
        uid: pickFirstNonEmptyString(decodedToken?.uid, decodedToken?.sub),
        decodedToken,
      };
    } catch {
      return {
        ok: false,
        status: 401,
        error: "Invalid or expired Firebase bearer token.",
      };
    }
  };
};
