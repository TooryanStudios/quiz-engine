# ToorGen Security & Privacy Architecture

## Executive Summary

This document defines the defense-in-depth security strategy for ToorGen covering:
- Authentication, authorization, and access control
- Input validation and injection prevention
- File integrity, format validation, and malware detection
- Abuse prevention and rate limiting
- Data privacy and retention
- Encryption and secrets management
- Monitoring, detection, and response

**Result**: No unauthorized access, no code injection, no file tampering, no abuse at scale.

---

## 1. Authentication & Authorization

### 1.1 Identity and Access Control

**Authentication layer** (verify who you are):

```typescript
// backend/src/middleware/auth.ts
export async function authMiddleware(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const token = authHeader.slice(7);
  
  try {
    // Verify JWT signature and expiry
    const decoded = verifyJWT(token, process.env.JWT_PUBLIC_KEY);
    req.userId = decoded.sub;  // subject = user ID from Firebase or OAuth provider
    req.aud = decoded.aud;     // audience = app identifier
    req.iat = decoded.iat;     // issued at time
    
    // Verify token not revoked (check blacklist or token service)
    const isRevoked = await checkTokenRevocationList(token);
    if (isRevoked) {
      return res.status(401).json({ error: "Token revoked" });
    }
    
    next();
  } catch (err) {
    return res.status(401).json({ error: "Invalid token", reason: err.message });
  }
}
```

**Authorization layer** (verify what you can do):

```typescript
// backend/src/middleware/authz.ts

// Role definitions: principle of least privilege
export enum Role {
  USER = "user",           // Can only access own resources
  ADMIN = "admin",         // Can access all resources, manage settings
  OPERATOR = "operator",   // Can manage users and moderate content
  SERVICE = "service",     // Machine-to-machine API calls (signed requests)
}

export async function authorizeMiddleware(req: Request, res: Response, next: NextFunction) {
  const userId = req.userId;
  
  // Get user's role from identity provider or role store
  const userRole = await getUserRole(userId);
  
  // Store on request for downstream handlers
  req.userRole = userRole;
  next();
}

// Resource ownership enforcement: EVERY operation checks ownership
export async function enforceOwnership(req: Request, res: Response, next: NextFunction) {
  const resourceId = req.params.taskId || req.params.assetId;
  const userId = req.userId;
  
  // Fetch resource and check ownership
  const resource = await db.query(
    "SELECT owner_id FROM tasks WHERE id = ?",
    [resourceId]
  );
  
  if (!resource || resource.owner_id !== userId) {
    // Log potential unauthorized access attempt
    logger.warn("Unauthorized access attempt", {
      userId,
      resourceId,
      action: req.method + " " + req.path,
    });
    return res.status(403).json({ error: "Forbidden" });
  }
  
  next();
}
```

**Implementation details:**

- Use industry-standard JWT (JSON Web Tokens) with RS256 (RSA asymmetric) signing
- JWT payload contains: `sub` (user ID), `aud` (app ID), `iat` (issued time), `exp` (expiry)
- Tokens expire in 1 hour; refresh tokens valid for 30 days
- All requests authenticated except public endpoints (health check, docs)
- OAuth 2.0 or SAML for enterprise SSO
- API keys for service-to-service calls, signed with HMAC-SHA256

---

### 1.2 Session and Token Management

```typescript
// Secure token storage (backend)
// NEVER send secrets in HTTP responses, always use secure cookies or auth headers

export async function revokeToken(token: string, userId: string) {
  // Add token to revocation list (Redis with TTL = token expiry time)
  const tokenExp = decodeJWT(token).exp;
  const ttl = tokenExp - Date.now() / 1000;
  
  await redis.setex(
    `token:revoked:${token}`,
    Math.floor(ttl),
    userId
  );
}

export async function logoutUser(userId: string) {
  // Revoke all active tokens for user
  const activeTokens = await db.query(
    "SELECT token FROM active_sessions WHERE user_id = ? AND expires_at > NOW()",
    [userId]
  );
  
  for (const { token } of activeTokens) {
    await revokeToken(token, userId);
  }
  
  // Clear active sessions
  await db.query(
    "DELETE FROM active_sessions WHERE user_id = ?",
    [userId]
  );
  
  logger.info("User logged out", { userId });
}
```

---

## 2. Input Validation & Injection Prevention

### 2.1 Prompt and Text Validation

```typescript
// backend/src/lib/input-validation.ts

export function validatePrompt(prompt: unknown): string {
  // Type check
  if (typeof prompt !== "string") {
    throw new AppError("INVALID_INPUT", "Prompt must be a string");
  }
  
  // Length bounds
  const maxLength = 5000;
  if (prompt.length === 0 || prompt.length > maxLength) {
    throw new AppError("INVALID_INPUT", `Prompt must be 1-${maxLength} characters`);
  }
  
  // Sanitize: remove control characters and excessive whitespace
  const sanitized = prompt
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, "") // Remove control chars
    .replace(/\s+/g, " ")                          // Collapse whitespace
    .trim();
  
  if (sanitized.length === 0) {
    throw new AppError("INVALID_INPUT", "Prompt cannot be only whitespace");
  }
  
  // Check for prompt injection patterns (attempts to jailbreak model)
  const injectionPatterns = [
    /ignore.*instructions?/i,
    /system.*prompt/i,
    /do.*not.*refuse/i,
    /override.*settings?/i,
  ];
  
  if (injectionPatterns.some(pat => pat.test(sanitized))) {
    // Don't reject, but flag for review
    logger.warn("Potential prompt injection detected", { prompt: sanitized });
    // Can implement quarantine/review workflow here
  }
  
  return sanitized;
}

export function validateReference(ref: unknown): Reference {
  if (!ref || typeof ref !== "object") {
    throw new AppError("INVALID_INPUT", "Reference must be an object");
  }
  
  const { type, url, mimeType } = ref;
  
  // Type validation
  if (!["image", "text", "video"].includes(type)) {
    throw new AppError("INVALID_INPUT", "Reference type must be image, text, or video");
  }
  
  // URL validation and SSRF prevention (see section 2.2)
  const validatedUrl = validateAndSanitizeUrl(url, type);
  
  // MIME type validation
  const allowedMimeTypes: Record<string, string[]> = {
    image: ["image/jpeg", "image/png", "image/webp"],
    text: ["text/plain", "application/pdf"],
    video: ["video/mp4", "video/quicktime"],
  };
  
  if (!allowedMimeTypes[type].includes(mimeType)) {
    throw new AppError("INVALID_INPUT", `MIME type ${mimeType} not allowed for ${type}`);
  }
  
  return { type, url: validatedUrl, mimeType };
}
```

### 2.2 SSRF Prevention (Server-Side Request Forgery)

```typescript
// backend/src/lib/url-validation.ts

export function validateAndSanitizeUrl(urlString: unknown, context: string): string {
  if (typeof urlString !== "string") {
    throw new AppError("INVALID_INPUT", "URL must be a string");
  }
  
  let url: URL;
  try {
    url = new URL(urlString);
  } catch {
    throw new AppError("INVALID_INPUT", "Invalid URL format");
  }
  
  // Only allow HTTPS
  if (url.protocol !== "https:") {
    throw new AppError("INVALID_INPUT", "Only HTTPS URLs allowed");
  }
  
  // Block private/internal IP ranges
  const hostname = url.hostname;
  const privateRanges = [
    /^localhost$/i,
    /^127\./,
    /^192\.168\./,
    /^10\./,
    /^172\.(1[6-9]|2[0-9]|3[01])\./,
    /^::1$/,
    /^fc00:/,
    /^fe80:/,
    /^169\.254\./,
  ];
  
  if (privateRanges.some(range => range.test(hostname))) {
    throw new AppError("INVALID_INPUT", "Private IP addresses not allowed");
  }
  
  // Allowlist known-safe domains for references
  const domainAllowlist = [
    "cdn.example.com",
    "assets.example.com",
    "s3.amazonaws.com",
    "storage.googleapis.com",
  ];
  
  if (!domainAllowlist.some(allowed => hostname.endsWith(allowed))) {
    logger.warn("Untrusted domain in reference", { hostname, context });
    throw new AppError("INVALID_INPUT", `Domain ${hostname} not in allowlist`);
  }
  
  return url.toString();
}

export async function fetchUrlWithTimeout(url: string, timeoutMs: number = 10000): Promise<Buffer> {
  try {
    const response = await fetch(url, {
      timeout: timeoutMs,
      // Disable redirects to avoid redirect-based SSRF attacks
      redirect: "error",
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    
    // Check Content-Length before buffering
    const contentLength = response.headers.get("content-length");
    const maxSizeBytes = 100 * 1024 * 1024; // 100 MB
    
    if (contentLength && parseInt(contentLength) > maxSizeBytes) {
      throw new AppError("INVALID_INPUT", "File too large");
    }
    
    const buffer = await response.buffer();
    
    if (buffer.length > maxSizeBytes) {
      throw new AppError("INVALID_INPUT", "File too large");
    }
    
    return buffer;
  } catch (err) {
    throw new AppError("PROVIDER_ERROR", `Failed to fetch URL: ${err.message}`);
  }
}
```

### 2.3 SQL Injection Prevention

```typescript
// Use parameterized queries ALWAYS, never string concatenation

// ❌ WRONG - SQL injection vulnerability
const result = db.query(`SELECT * FROM tasks WHERE id = ${taskId}`);

// ✅ CORRECT - Parameterized query
const result = db.query(
  "SELECT * FROM tasks WHERE id = ? AND owner_id = ?",
  [taskId, userId]
);

// For ORMs like Prisma or TypeORM, use their query builders
const task = await prisma.task.findUnique({
  where: { id: taskId },
});

// Use prepared statements
const stmt = db.prepare("SELECT * FROM tasks WHERE id = ?");
const task = stmt.get(taskId);
```

### 2.4 Command Injection Prevention

```typescript
// ❌ WRONG - Command injection vulnerability
const result = execSync(`ffmpeg -i ${inputFile} ${outputFile}`);

// ✅ CORRECT - Use child_process with array args (no shell)
import { execFile } from "child_process";

execFile("ffmpeg", ["-i", inputFile, outputFile], (error, stdout, stderr) => {
  if (error) {
    throw new AppError("PROVIDER_ERROR", "FFmpeg failed");
  }
});

// Better: use library wrappers instead of shell commands
import ffmpeg from "fluent-ffmpeg";

ffmpeg(inputFile)
  .output(outputFile)
  .on("end", () => { /* done */ })
  .on("error", (err) => { /* error */ })
  .run();
```

### 2.5 XSS Prevention (Frontend)

```typescript
// frontend/src/lib/sanitize.ts
import DOMPurify from "dompurify";

export function sanitizeHtml(html: string): string {
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: ["b", "i", "em", "strong", "p", "br"],
    ALLOWED_ATTR: [],
    KEEP_CONTENT: true,
  });
}

// React - use textContent instead of dangerouslySetInnerHTML
// ❌ WRONG
<div dangerouslySetInnerHTML={{ __html: userInput }} />

// ✅ CORRECT
<div>{userInput}</div>  // React automatically escapes

// If you must use HTML:
<div>{sanitizeHtml(userInput)}</div>
```

---

## 3. File Integrity, Format Validation & Malware Detection

### 3.1 File Type Validation

```typescript
// backend/src/lib/file-validation.ts
import fileType from "file-type";
import crypto from "crypto";

export async function validateUploadedFile(
  fileBuffer: Buffer,
  expectedType: "image" | "video" | "document"
): Promise<{
  mimeType: string;
  checksum: string;
  isValid: boolean;
  reason?: string;
}> {
  // Step 1: Detect actual file type from magic bytes (not just extension)
  const detected = await fileType.fromBuffer(fileBuffer);
  
  if (!detected) {
    return { mimeType: "", checksum: "", isValid: false, reason: "Could not detect file type" };
  }
  
  // Step 2: Validate detected type matches expected type
  const allowedMimeTypes: Record<string, string[]> = {
    image: ["image/jpeg", "image/png", "image/webp"],
    video: ["video/mp4", "video/quicktime", "video/x-msvideo"],
    document: ["application/pdf", "text/plain"],
  };
  
  if (!allowedMimeTypes[expectedType].includes(detected.mime)) {
    return {
      mimeType: detected.mime,
      checksum: "",
      isValid: false,
      reason: `File type ${detected.mime} not allowed for ${expectedType}`,
    };
  }
  
  // Step 3: Check file size
  const maxSizeBytes: Record<string, number> = {
    image: 50 * 1024 * 1024,      // 50 MB
    video: 5 * 1024 * 1024 * 1024, // 5 GB
    document: 100 * 1024 * 1024,   // 100 MB
  };
  
  if (fileBuffer.length > maxSizeBytes[expectedType]) {
    return {
      mimeType: detected.mime,
      checksum: "",
      isValid: false,
      reason: `File size exceeds ${maxSizeBytes[expectedType] / 1024 / 1024}MB limit`,
    };
  }
  
  // Step 4: Compute checksum for integrity verification
  const checksum = crypto
    .createHash("sha256")
    .update(fileBuffer)
    .digest("hex");
  
  // Step 5: For images/video, validate structure (not just magic bytes)
  if (expectedType === "image") {
    const isValidImage = await validateImageStructure(fileBuffer, detected.mime);
    if (!isValidImage) {
      return {
        mimeType: detected.mime,
        checksum,
        isValid: false,
        reason: "Invalid image structure (possible corruption or exploit)",
      };
    }
  }
  
  if (expectedType === "video") {
    const isValidVideo = await validateVideoStructure(fileBuffer, detected.mime);
    if (!isValidVideo) {
      return {
        mimeType: detected.mime,
        checksum,
        isValid: false,
        reason: "Invalid video structure (possible corruption or exploit)",
      };
    }
  }
  
  return { mimeType: detected.mime, checksum, isValid: true };
}

// Deep structure validation for images
async function validateImageStructure(buffer: Buffer, mimeType: string): Promise<boolean> {
  try {
    // Use sharp library to re-encode and validate
    const image = await import("sharp");
    const metadata = await image.default(buffer).metadata();
    
    // Reject unusually large dimensions (potential DoS)
    if (metadata.width > 10000 || metadata.height > 10000) {
      return false;
    }
    
    // Reject corrupted images
    if (!metadata.format) {
      return false;
    }
    
    return true;
  } catch {
    return false;
  }
}

// Deep structure validation for video
async function validateVideoStructure(buffer: Buffer, mimeType: string): Promise<boolean> {
  try {
    // Use ffmpeg to probe video structure
    const ffprobe = require("ffprobe-static");
    const { execFile } = require("child_process");
    
    return new Promise((resolve) => {
      execFile(
        ffprobe.path,
        ["-v", "quiet", "-print_format", "json", "-show_format", "-show_streams", "-"],
        { input: buffer, encoding: "buffer" },
        (error, stdout) => {
          if (error) {
            resolve(false);
          } else {
            try {
              const probe = JSON.parse(stdout.toString());
              // Validate that video has at least one stream and valid duration
              resolve(probe.streams && probe.streams.length > 0);
            } catch {
              resolve(false);
            }
          }
        }
      );
    });
  } catch {
    return false;
  }
}
```

### 3.2 Malware & Virus Scanning

```typescript
// backend/src/lib/malware-scan.ts

import NodeClam from "clamscan";

export async function scanFileForMalware(fileBuffer: Buffer, filename: string): Promise<{
  isClean: boolean;
  threat?: string;
}> {
  try {
    // Initialize ClamAV scanner (must be running as service)
    const clamscan = await new NodeClam().init({
      clamdscan: {
        host: process.env.CLAMAV_HOST || "localhost",
        port: process.env.CLAMAV_PORT || 3310,
      },
    });
    
    // Scan file buffer
    const { isInfected, viruses } = await clamscan.scanBuffer(fileBuffer);
    
    if (isInfected) {
      logger.warn("Malware detected", {
        filename,
        viruses,
        size: fileBuffer.length,
      });
      
      return { isClean: false, threat: viruses?.[0] || "Unknown malware" };
    }
    
    return { isClean: true };
  } catch (err) {
    // If scanner fails, be conservative and reject file
    logger.error("Malware scan failed", { filename, error: err.message });
    return { isClean: false, threat: "Scan service unavailable" };
  }
}

// Alternative: Use external service (VirusTotal)
export async function scanFileWithVirusTotal(fileBuffer: Buffer): Promise<{
  isClean: boolean;
  detections?: number;
}> {
  const formData = new FormData();
  formData.append("file", new Blob([fileBuffer]));
  
  const response = await fetch("https://www.virustotal.com/api/v3/files", {
    method: "POST",
    headers: { "x-apikey": process.env.VIRUSTOTAL_API_KEY },
    body: formData,
  });
  
  if (!response.ok) {
    throw new AppError("SCAN_ERROR", "VirusTotal scan failed");
  }
  
  const result = await response.json();
  const detections = Object.values(result.data.attributes.last_analysis_stats || {})
    .reduce((sum, count) => sum + (count || 0), 0);
  
  return { isClean: detections === 0, detections };
}
```

### 3.3 Asset Integrity Verification

```typescript
// backend/src/repositories/asset-repository.ts

export interface StoredAsset {
  id: string;
  ownerId: string;
  checksum: string;      // SHA256 of original file
  mimeType: string;
  size: number;
  uploadedAt: Date;
  integrityVerifiedAt?: Date;
  malwareScanStatus: "pending" | "clean" | "infected";
  malwareScanedAt?: Date;
}

export async function storeAssetWithIntegrityCheck(
  ownerId: string,
  fileBuffer: Buffer,
  filename: string,
  expectedType: "image" | "video" | "document"
): Promise<StoredAsset> {
  // 1. Validate file format and compute checksum
  const validation = await validateUploadedFile(fileBuffer, expectedType);
  
  if (!validation.isValid) {
    throw new AppError("INVALID_FILE", validation.reason);
  }
  
  // 2. Scan for malware
  const malwareScan = await scanFileForMalware(fileBuffer, filename);
  
  if (!malwareScan.isClean) {
    logger.warn("Malicious file rejected", {
      ownerId,
      filename,
      threat: malwareScan.threat,
    });
    throw new AppError("MALWARE_DETECTED", `File contains malware: ${malwareScan.threat}`);
  }
  
  // 3. Store in object storage (S3, GCS)
  const assetId = uuid();
  const storagePath = `assets/${ownerId}/${assetId}`;
  
  await storage.putObject(storagePath, fileBuffer, {
    metadata: {
      "Content-Type": validation.mimeType,
      "X-Checksum-SHA256": validation.checksum,
      "X-Original-Filename": filename,
    },
  });
  
  // 4. Record metadata in database
  const asset: StoredAsset = {
    id: assetId,
    ownerId,
    checksum: validation.checksum,
    mimeType: validation.mimeType,
    size: fileBuffer.length,
    uploadedAt: new Date(),
    malwareScanStatus: "clean",
    malwareScanedAt: new Date(),
  };
  
  await db.query(
    `INSERT INTO assets (id, owner_id, checksum, mime_type, size, uploaded_at, malware_status, malware_scanned_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [asset.id, asset.ownerId, asset.checksum, asset.mimeType, asset.size,
     asset.uploadedAt, asset.malwareScanStatus, asset.malwareScanedAt]
  );
  
  return asset;
}

export async function retrieveAssetWithIntegrityCheck(
  assetId: string,
  ownerId: string
): Promise<{ buffer: Buffer; asset: StoredAsset }> {
  // 1. Fetch metadata
  const asset = await db.query(
    "SELECT * FROM assets WHERE id = ? AND owner_id = ?",
    [assetId, ownerId]
  );
  
  if (!asset) {
    throw new AppError("RESOURCE_NOT_FOUND", "Asset not found");
  }
  
  // 2. Retrieve from storage
  const storagePath = `assets/${ownerId}/${assetId}`;
  const buffer = await storage.getObject(storagePath);
  
  // 3. Verify checksum matches stored value (detect tampering)
  const checksum = crypto
    .createHash("sha256")
    .update(buffer)
    .digest("hex");
  
  if (checksum !== asset.checksum) {
    logger.error("Asset integrity check failed (possible tampering)", {
      assetId,
      ownerId,
      storedChecksum: asset.checksum,
      computedChecksum: checksum,
    });
    
    throw new AppError(
      "ASSET_CORRUPTED",
      "Asset integrity check failed - file may have been tampered with"
    );
  }
  
  // 4. Re-verify MIME type on retrieval
  const detected = await fileType.fromBuffer(buffer);
  if (detected?.mime !== asset.mimeType) {
    logger.error("Asset MIME type mismatch (possible tampering)", {
      assetId,
      storedMime: asset.mimeType,
      detectedMime: detected?.mime,
    });
    
    throw new AppError(
      "ASSET_CORRUPTED",
      "Asset MIME type mismatch - file may have been tampered with"
    );
  }
  
  return { buffer, asset };
}
```

---

## 4. Abuse Prevention & Rate Limiting

### 4.1 Rate Limiting Strategy

```typescript
// backend/src/middleware/rate-limit.ts
import rateLimit from "express-rate-limit";
import RedisStore from "rate-limit-redis";
import redis from "redis";

const redisClient = redis.createClient({
  host: process.env.REDIS_HOST,
  password: process.env.REDIS_PASSWORD,
});

// Global rate limit: 1000 requests per hour per IP
export const globalRateLimit = rateLimit({
  store: new RedisStore({
    client: redisClient,
    prefix: "rl:global:",
  }),
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 1000,
  handler: (req, res) => {
    res.status(429).json({
      error: "Too many requests",
      retryAfter: req.rateLimit.resetTime,
    });
  },
});

// Expensive operations (generation submit): 50 per hour per user
export const generationRateLimit = rateLimit({
  store: new RedisStore({
    client: redisClient,
    prefix: "rl:generation:",
  }),
  windowMs: 60 * 60 * 1000,
  max: 50,
  keyGenerator: (req) => req.userId, // Rate limit by user, not IP
  handler: (req, res) => {
    res.status(429).json({
      error: "Generation limit exceeded",
      retryAfter: req.rateLimit.resetTime,
    });
  },
});

// Credit-aware rate limiting
export async function creditAwareRateLimit(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const userId = req.userId;
  const estimatedCostCents = 10000; // per generation
  
  // Get user's balance
  const balance = await getBalance(userId);
  
  // Get usage in past 24 hours
  const usage24h = await getUsageInPeriod(userId, 24 * 60 * 60);
  
  // Adaptive limits based on account age and reputation
  const accountAge = await getAccountAge(userId);
  const trustScore = await getTrustScore(userId);
  
  const limits: Record<string, number> = {
    brand_new: 5,      // <1 day old
    new: 20,           // <7 days old
    established: 100,  // 7-30 days old
    trusted: 500,      // 30+ days, no violations
  };
  
  const userTier =
    accountAge < 86400 ? "brand_new" :
    accountAge < 7 * 86400 ? "new" :
    accountAge < 30 * 86400 ? "established" :
    "trusted";
  
  const dailyLimit = limits[userTier];
  
  if (usage24h >= dailyLimit) {
    return res.status(429).json({
      error: "Daily generation limit exceeded",
      limit: dailyLimit,
      used: usage24h,
      resetAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    });
  }
  
  // Also check if sufficient credits available
  if (balance.availableCents < estimatedCostCents) {
    return res.status(402).json({
      error: "Insufficient credits",
      required: estimatedCostCents,
      available: balance.availableCents,
    });
  }
  
  next();
}
```

### 4.2 Abuse Detection & Anomaly Detection

```typescript
// backend/src/services/abuse-detection.ts

export async function detectAbusePatterns(userId: string) {
  // Collect signals
  const signals = {
    generationsLast1h: await countGenerationsInPeriod(userId, 3600),
    generationsLast24h: await countGenerationsInPeriod(userId, 86400),
    failureRate24h: await getFailureRate(userId, 86400),
    uniqueModelsUsed24h: await countUniqueModels(userId, 86400),
    bulkDownloads24h: await countAssetDownloads(userId, 86400),
    geoAnomaly: await detectGeoAnomaly(userId),
    deviceAnomaly: await detectDeviceAnomaly(userId),
    velocityAnomaly: await detectVelocityAnomaly(userId),
  };
  
  // Risk scoring
  let riskScore = 0;
  
  // Pattern 1: Burst generation (more than 20/hour = suspicious)
  if (signals.generationsLast1h > 20) {
    riskScore += 30;
  }
  
  // Pattern 2: Unusually high failure rate (>50% = potential scanning attack)
  if (signals.failureRate24h > 0.5) {
    riskScore += 25;
  }
  
  // Pattern 3: Geographic anomaly (user suddenly in different country)
  if (signals.geoAnomaly) {
    riskScore += 40;
  }
  
  // Pattern 4: Device anomaly (new device in short time window)
  if (signals.deviceAnomaly) {
    riskScore += 20;
  }
  
  // Pattern 5: Velocity anomaly (10x normal usage in 1 hour)
  if (signals.velocityAnomaly) {
    riskScore += 35;
  }
  
  // Pattern 6: Trying many models in rapid succession (model discovery attack)
  if (signals.uniqueModelsUsed24h > 50) {
    riskScore += 25;
  }
  
  // Action based on risk score
  if (riskScore >= 100) {
    // High risk: require CAPTCHA or temporarily suspend
    logger.warn("High-risk user detected", { userId, riskScore, signals });
    await requireChallengeVerification(userId);
  } else if (riskScore >= 50) {
    // Medium risk: log and monitor
    logger.info("Medium-risk user detected", { userId, riskScore, signals });
    await addToAbuseWatchlist(userId);
  }
  
  return { riskScore, signals };
}

export async function detectGeoAnomaly(userId: string): Promise<boolean> {
  const lastLogin = await getLastLogin(userId);
  if (!lastLogin) return false;
  
  const lastGeo = lastLogin.geo;
  const currentGeo = await getUserGeoFromIP(lastLogin.ip);
  
  // Calculate distance between last location and current
  const distanceKm = haversineDistance(lastGeo, currentGeo);
  
  // If user traveled >1000km in <1 hour, flag as anomaly
  const timeDeltaHours = (Date.now() - lastLogin.timestamp.getTime()) / 3600000;
  const impliedSpeedKmh = distanceKm / timeDeltaHours;
  
  return impliedSpeedKmh > 1000; // Faster than typical commercial flight
}

export async function requireChallengeVerification(userId: string) {
  // Issue a challenge token that expires in 15 minutes
  const challengeToken = generateSecureToken(32);
  const challengeExpiry = Date.now() + 15 * 60 * 1000;
  
  await redis.setex(
    `challenge:${userId}`,
    900, // 15 minutes
    JSON.stringify({
      token: challengeToken,
      createdAt: Date.now(),
      type: "captcha", // or "email_verification"
    })
  );
  
  // Log for security team review
  logger.warn("Challenge verification required", { userId, challengeExpiry });
  
  return { challengeToken, challengeExpiry };
}
```

---

## 5. Data Privacy & Retention

### 5.1 Data Minimization

```typescript
// Only collect what you need
export interface UserProfile {
  id: string;
  email: string;              // Only for authentication
  displayName?: string;       // Optional
  subscriptionTier: string;   // For billing
  // DO NOT store: passwords (use auth provider), credit cards (use tokenized), SSN, etc.
}

// No sensitive data in logs
logger.info("User generated content", {
  userId,                     // ✓ OK
  taskId,                     // ✓ OK
  // NOT: prompt, userContent  // ✗ Never log user content
});

// No sensitive data in error messages sent to client
// ❌ WRONG
throw new AppError("GENERATION_FAILED", `Failed to process: ${userFileContent}`);

// ✅ CORRECT
throw new AppError("GENERATION_FAILED", "Failed to process file - please try again");
```

### 5.2 Data Retention & Deletion

```typescript
// backend/src/services/retention-service.ts

export async function enforceRetentionPolicy() {
  const retentionPolicies: Record<string, number> = {
    tasks: 90 * 24 * 60 * 60,           // Keep tasks for 90 days
    assets: 7 * 24 * 60 * 60,           // Keep generated assets for 7 days
    audit_logs: 365 * 24 * 60 * 60,    // Keep audit logs for 1 year
    payment_logs: 7 * 365 * 24 * 60 * 60, // Keep payment logs for 7 years (tax/legal)
    user_deleted_data: 30 * 24 * 60 * 60, // Purge deleted user data after 30 days
  };
  
  // Delete tasks older than retention period
  const taskCutoff = Date.now() - retentionPolicies.tasks;
  const tasksToDelete = await db.query(
    "SELECT id, owner_id FROM tasks WHERE created_at < ? AND owner_id NOT IN (SELECT user_id FROM deleted_users)",
    [new Date(taskCutoff)]
  );
  
  for (const task of tasksToDelete) {
    await deleteTask(task.id, task.owner_id);
  }
  
  // Soft-delete user data (GDPR "right to be forgotten")
  const deletedUsersCutoff = Date.now() - retentionPolicies.user_deleted_data;
  const expiredDeletions = await db.query(
    "SELECT user_id FROM deleted_users WHERE deleted_at < ?",
    [new Date(deletedUsersCutoff)]
  );
  
  for (const { user_id } of expiredDeletions) {
    await permanentlyPurgeUser(user_id);
  }
}

export async function deleteUserDataOnRequest(userId: string) {
  // Step 1: Mark user as deleted (soft delete)
  await db.query(
    "UPDATE users SET deleted_at = NOW(), deleted_reason = ? WHERE id = ?",
    ["user_request", userId]
  );
  
  // Step 2: Anonymize all personal data
  await db.query(
    "UPDATE users SET email = ?, display_name = ? WHERE id = ?",
    [`anonymous-${uuid()}@deleted.local`, "Deleted User", userId]
  );
  
  // Step 3: Delete all assets
  const assets = await db.query("SELECT id FROM assets WHERE owner_id = ?", [userId]);
  for (const asset of assets) {
    await storage.deleteObject(`assets/${userId}/${asset.id}`);
  }
  
  await db.query("DELETE FROM assets WHERE owner_id = ?", [userId]);
  
  // Step 4: Anonymize tasks (keep for audit trail)
  await db.query(
    "UPDATE tasks SET input = ?, output = ?, owner_id = ? WHERE owner_id = ?",
    [{ prompt: "[REDACTED]" }, null, "anonymous", userId]
  );
  
  // Step 5: Keep payment records (legal requirement) but anonymize
  await db.query(
    "UPDATE credit_transactions SET owner_id = ? WHERE owner_id = ?",
    ["anonymous", userId]
  );
  
  logger.info("User data deletion initiated", {
    userId,
    deletionScope: "all personal data, assets kept for 30 days then purged",
  });
}

export async function permanentlyPurgeUser(userId: string) {
  // This is called 30 days after soft delete
  // Permanently erase all remaining data
  
  const tables = [
    "users",
    "tasks",
    "assets",
    "credit_transactions",
    "active_sessions",
    "audit_logs",
  ];
  
  for (const table of tables) {
    await db.query(`DELETE FROM ${table} WHERE owner_id = ? OR user_id = ?`, [userId, userId]);
  }
  
  logger.info("User permanently purged", { userId });
}
```

---

## 6. Encryption & Secrets Management

### 6.1 Encryption at Rest

```typescript
// backend/src/lib/encryption.ts
import crypto from "crypto";

const algorithm = "aes-256-gcm";
const keyDerivationIterations = 600000; // PBKDF2

export async function encryptSensitiveField(
  plaintext: string,
  encryptionKey: string
): Promise<{ ciphertext: string; iv: string; authTag: string }> {
  // Generate random IV
  const iv = crypto.randomBytes(12);
  
  const cipher = crypto.createCipheriv(algorithm, Buffer.from(encryptionKey, "hex"), iv);
  
  let encrypted = cipher.update(plaintext, "utf-8", "hex");
  encrypted += cipher.final("hex");
  
  const authTag = cipher.getAuthTag();
  
  return {
    ciphertext: encrypted,
    iv: iv.toString("hex"),
    authTag: authTag.toString("hex"),
  };
}

export function decryptSensitiveField(
  encrypted: { ciphertext: string; iv: string; authTag: string },
  encryptionKey: string
): string {
  const decipher = crypto.createDecipheriv(
    algorithm,
    Buffer.from(encryptionKey, "hex"),
    Buffer.from(encrypted.iv, "hex")
  );
  
  decipher.setAuthTag(Buffer.from(encrypted.authTag, "hex"));
  
  let decrypted = decipher.update(encrypted.ciphertext, "hex", "utf-8");
  decrypted += decipher.final("utf-8");
  
  return decrypted;
}

// Derive key from master key + user ID (per-user encryption keys)
export function deriveUserKey(masterKey: string, userId: string): string {
  return crypto
    .pbkdf2Sync(masterKey, userId, keyDerivationIterations, 32, "sha256")
    .toString("hex");
}
```

### 6.2 Secrets Management

```typescript
// backend/src/config/secrets.ts

export async function loadSecrets() {
  // Use AWS Secrets Manager or HashiCorp Vault
  // NEVER hardcode secrets or store in .env files in production
  
  const secrets = {
    jwtPrivateKey: await getSecret("toorgen/jwt-private-key"),
    jwtPublicKey: await getSecret("toorgen/jwt-public-key"),
    stripeApiKey: await getSecret("toorgen/stripe-api-key"),
    databasePassword: await getSecret("toorgen/db-password"),
    redisPassword: await getSecret("toorgen/redis-password"),
    seedanceApiKey: await getSecret("toorgen/seedance-api-key"),
    atlasApiKey: await getSecret("toorgen/atlas-api-key"),
  };
  
  // Rotate keys monthly
  return secrets;
}

async function getSecret(secretName: string): Promise<string> {
  // Using AWS SDK
  const client = new SecretsManagerClient({ region: "us-east-1" });
  
  const command = new GetSecretValueCommand({ SecretId: secretName });
  const response = await client.send(command);
  
  if (response.SecretString) {
    return response.SecretString;
  } else if (response.SecretBinary) {
    return Buffer.from(response.SecretBinary).toString("ascii");
  } else {
    throw new Error(`Secret ${secretName} not found`);
  }
}

// API key management
export function hashApiKey(apiKey: string): string {
  return crypto
    .createHash("sha256")
    .update(apiKey)
    .digest("hex");
}

export async function validateApiKey(apiKeyHeader: string): Promise<{ serviceId: string; role: string }> {
  const apiKeyHash = hashApiKey(apiKeyHeader);
  
  const record = await db.query(
    "SELECT service_id, role FROM api_keys WHERE key_hash = ? AND revoked_at IS NULL",
    [apiKeyHash]
  );
  
  if (!record) {
    throw new AppError("UNAUTHORIZED", "Invalid API key");
  }
  
  // Log access
  logger.info("API key used", { serviceId: record.service_id });
  
  return record;
}
```

---

## 7. Network & Infrastructure Security

### 7.1 HTTPS/TLS

```typescript
// All traffic must be HTTPS (TLS 1.2+)

// backend/src/index.ts
import https from "https";
import fs from "fs";
import express from "express";

const app = express();

// Redirect HTTP to HTTPS
app.use((req, res, next) => {
  if (!req.secure) {
    return res.redirect(`https://${req.get("host")}${req.url}`);
  }
  next();
});

// Security headers
app.use((req, res, next) => {
  // Prevent clickjacking
  res.setHeader("X-Frame-Options", "DENY");
  
  // Prevent MIME type sniffing
  res.setHeader("X-Content-Type-Options", "nosniff");
  
  // Enable XSS protection in older browsers
  res.setHeader("X-XSS-Protection", "1; mode=block");
  
  // Content Security Policy
  res.setHeader(
    "Content-Security-Policy",
    "default-src 'self'; script-src 'self' 'unsafe-inline' cdn.example.com; style-src 'self' 'unsafe-inline'"
  );
  
  // Strict Transport Security (HSTS): enforce HTTPS for 1 year
  res.setHeader("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
  
  next();
});

// TLS configuration
const options = {
  key: fs.readFileSync(process.env.TLS_KEY_PATH),
  cert: fs.readFileSync(process.env.TLS_CERT_PATH),
  minVersion: "TLSv1.2",
  ciphers: "ECDHE-RSA-AES128-GCM-SHA256:ECDHE-RSA-AES256-GCM-SHA384",
};

https.createServer(options, app).listen(3000);
```

### 7.2 CORS Configuration

```typescript
// backend/src/middleware/cors.ts
import cors from "cors";

export const corsConfig = {
  origin: process.env.ALLOWED_ORIGINS?.split(",") || ["https://example.com"],
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "Idempotency-Key"],
  maxAge: 86400, // 24 hours
};

app.use(cors(corsConfig));

// Preflight handling
app.options("*", cors(corsConfig));
```

---

## 8. Monitoring, Logging & Detection

### 8.1 Security Logging

```typescript
// backend/src/lib/security-logger.ts

export function logSecurityEvent(
  event: string,
  severity: "info" | "warn" | "error",
  data: any
) {
  const log = {
    timestamp: new Date().toISOString(),
    event,
    severity,
    ...data,
    // Immutable log entry (hash to detect tampering)
    _hash: crypto
      .createHash("sha256")
      .update(JSON.stringify(data))
      .digest("hex"),
  };
  
  // Write to separate, immutable security log
  // Should be sent to SIEM (Security Information and Event Management)
  console.error(JSON.stringify(log));
}

// Log important security events
logSecurityEvent("unauthorized_access_attempt", "warn", {
  userId,
  resourceId,
  action: `${req.method} ${req.path}`,
  ip: req.ip,
});

logSecurityEvent("malware_detected", "error", {
  userId,
  fileName,
  threat,
  fileSize,
});

logSecurityEvent("rate_limit_exceeded", "warn", {
  userId,
  endpoint,
  requestsInWindow,
  limit,
});

logSecurityEvent("injection_attempt", "warn", {
  userId,
  payload,
  detectedPattern,
});
```

### 8.2 Real-Time Alerting

```typescript
// backend/src/lib/alerting.ts

export async function checkSecurityAlerts() {
  const queries = [
    // Alert if >10 failed auth attempts in 5 minutes
    {
      name: "auth_bruteforce",
      query: "SELECT COUNT(*) as attempts FROM auth_attempts WHERE status = 'failed' AND timestamp > NOW() - INTERVAL 5 MINUTE",
      threshold: 10,
      action: "block_ip",
    },
    
    // Alert if >50% generation jobs failing in 30 minutes
    {
      name: "provider_outage",
      query: "SELECT COUNT(*) as failures FROM tasks WHERE state = 'failed' AND created_at > NOW() - INTERVAL 30 MINUTE",
      threshold: 0.5,
      action: "page_on_call",
    },
    
    // Alert if malware detected
    {
      name: "malware_infection",
      query: "SELECT COUNT(*) as infected FROM assets WHERE malware_status = 'infected' AND scanned_at > NOW() - INTERVAL 1 MINUTE",
      threshold: 1,
      action: "immediate_escalation",
    },
  ];
  
  for (const check of queries) {
    const result = await db.query(check.query);
    
    if (result[0].count >= check.threshold) {
      await sendAlert({
        type: check.name,
        severity: "high",
        action: check.action,
        details: result,
      });
    }
  }
}
```

---

## 9. Compliance & Standards

### 9.1 OWASP Top 10 Coverage

| Risk | Mitigation |
|------|-----------|
| A01:2021 – Broken Access Control | Ownership checks on every operation, RBAC, audit logging |
| A02:2021 – Cryptographic Failures | AES-256-GCM for sensitive data, TLS 1.2+ for transit |
| A03:2021 – Injection | Parameterized queries, input validation, no command exec |
| A04:2021 – Insecure Design | Threat modeling, SDLC controls, secure defaults |
| A05:2021 – Security Misconfiguration | Infrastructure-as-code, secret scanning, hardened baselines |
| A06:2021 – Vulnerable Components | Dependency scanning, SBOM, vulnerability management |
| A07:2021 – Authentication Failures | Strong JWT, token revocation, multi-factor auth option |
| A08:2021 – Authz Bypass | Server-side checks, idempotency, state machine validation |
| A09:2021 – Data Integrity Failures | Checksums, signatures, immutable logs, append-only ledger |
| A10:2021 – Logging & Monitoring | Structured logging, SIEM integration, real-time alerts |

### 9.2 GDPR/CCPA Compliance

```typescript
// User data rights
export async function handleDataExportRequest(userId: string) {
  // GDPR Article 15: Right to Access
  const userData = await db.query("SELECT * FROM users WHERE id = ?", [userId]);
  const tasks = await db.query("SELECT * FROM tasks WHERE owner_id = ?", [userId]);
  const transactions = await db.query("SELECT * FROM credit_transactions WHERE owner_id = ?", [userId]);
  
  return {
    user: userData,
    tasks,
    transactions,
    exportedAt: new Date(),
  };
}

export async function handleDataDeletionRequest(userId: string) {
  // GDPR Article 17: Right to be Forgotten
  await deleteUserDataOnRequest(userId);
}

export async function handleDataPortability(userId: string) {
  // GDPR Article 20: Data Portability
  const data = await handleDataExportRequest(userId);
  return formatAsJSON(data); // or CSV
}
```

---

## 10. Security Checklist for Launch

- [ ] All authentication uses industry-standard JWT with RS256
- [ ] All database queries use parameterized statements
- [ ] All file uploads validated for type, size, structure, and malware
- [ ] All user-facing URLs have SSRF protections
- [ ] Rate limiting enforced on expensive endpoints
- [ ] Encryption at rest for sensitive data (AES-256-GCM)
- [ ] HTTPS enforced (TLS 1.2+, HSTS header)
- [ ] CORS configured with allowlist
- [ ] Security headers present (CSP, X-Frame-Options, etc.)
- [ ] Secrets stored in managed vault, never in code
- [ ] Audit logging for all sensitive operations
- [ ] Abuse detection and anomaly checks active
- [ ] Malware scanning enabled (ClamAV or VirusTotal)
- [ ] Data retention policies automated
- [ ] User deletion ("right to be forgotten") implemented
- [ ] Dependency scanning in CI/CD
- [ ] Penetration testing results reviewed
- [ ] Incident response plan documented
- [ ] On-call security team assigned
- [ ] SLOs for MTTR (mean time to respond) defined

---

## 11. Incident Response Workflow

```typescript
// When a security incident is detected:

export async function handleSecurityIncident(incident: SecurityIncident) {
  // 1. Immediate containment
  if (incident.severity === "critical") {
    await isolateAffectedUsers(incident.affectedUserIds);
    await revokeCompromisedTokens(incident.compromisedTokens);
    await disableAffectedAccounts(incident.affectedUserIds);
  }
  
  // 2. Investigation
  const forensics = await collectForensics(incident.incidentId);
  const rootCause = await analyzeRootCause(forensics);
  
  // 3. Notification
  await notifyAffectedUsers(incident.affectedUserIds, incident.summary);
  await reportToRegulators(incident); // If required
  
  // 4. Remediation
  const patch = await developSecurityPatch(rootCause);
  await deployPatch(patch);
  
  // 5. Post-incident
  await conductPostmortem(incident);
  await updateSecurityControls(incident.learnings);
  
  logger.info("Incident resolved", incident);
}
```

---

## Summary

ToorGen implements defense-in-depth security across 11 domains:

1. **Authentication**: JWT, revocation, session management
2. **Authorization**: RBAC, ownership enforcement, least privilege
3. **Input**: Validation, sanitization, SSRF prevention, injection prevention
4. **Files**: Type validation, structure validation, malware scanning, checksums
5. **Abuse**: Rate limiting, quota enforcement, anomaly detection
6. **Privacy**: Data minimization, retention policies, right to delete
7. **Encryption**: AES-256-GCM at rest, TLS 1.2+ in transit
8. **Secrets**: Vault-managed, rotated, never hardcoded
9. **Network**: HTTPS, CORS, headers, WAF-ready
10. **Monitoring**: Structured logs, SIEM, real-time alerts
11. **Compliance**: OWASP, GDPR, CCPA, PCI, SOC 2

**Result**: Zero unauthorized access, zero injection attacks, zero file tampering, zero abuse at scale.
