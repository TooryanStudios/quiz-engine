# Grok Image Generation — API Reference & Bug History

## Overview

The xAI Grok image API has two distinct endpoints with very different behaviour. Getting them confused is the root cause of all "random image" generation failures. This document records exactly what works, what was broken, and how it was fixed.

---

## Endpoints

### 1. Text-to-image (no reference images)

```
POST https://api.x.ai/v1/images/generations
```

- Use when there are **no reference images**.
- Accepts only `prompt`, `model`, `aspect_ratio`, `resolution`.
- **Silently ignores any image field** (`image_urls`, `images`, `image`, etc.) without error.
- This silent-ignore behaviour was the first red herring — we were sending images here and wondering why they had no effect.

### 2. Image editing / reference-guided generation

```
POST https://api.x.ai/v1/images/edits
```

- Use when there **are** reference images.
- Validates the image payload and returns an error for bad input.
- Supports up to **3 source images**.
- The backend routes to this endpoint automatically when `hasReferenceImages` is true.

---

## Correct Request Body Format

### Single reference image

```json
{
  "model": "grok-imagine-image-quality",
  "prompt": "...",
  "aspect_ratio": "16:9",
  "resolution": "1k",
  "image": {
    "type": "image_url",
    "url": "https://... or data:image/png;base64,..."
  }
}
```

### Multiple reference images (2–3)

```json
{
  "model": "grok-imagine-image-quality",
  "prompt": "...",
  "aspect_ratio": "16:9",
  "resolution": "1k",
  "images": [
    { "type": "image_url", "url": "https://... or data:image/png;base64,..." },
    { "type": "image_url", "url": "https://... or data:image/png;base64,..." },
    { "type": "image_url", "url": "https://... or data:image/png;base64,..." }
  ]
}
```

### Critical field name rule

| Context | Field name | Correct |
|---|---|---|
| REST API body (single) | `image.url` | ✅ |
| REST API body (multi) | `images[].url` | ✅ |
| REST API body (multi) | `images[].image_url` | ❌ silently ignored |
| Python SDK | `image_urls=[...]` | ✅ (SDK only, not REST) |

**The nested property must be `url`, not `image_url`.** The Python SDK accepts `image_urls` as a top-level parameter, but the raw REST API body uses `images[].url`. These are different things.

---

## Supported Models

| Model | Notes |
|---|---|
| `grok-imagine-image-quality` | Standard quality, slower |
| `grok-imagine-image-speed` | Faster, lower quality |

Model names match the `isGrokImageModel()` regex: `/^grok-imagine-image/i`

---

## Supported Parameters

| Parameter | Values | Notes |
|---|---|---|
| `aspect_ratio` | `"16:9"`, `"9:16"`, `"1:1"`, `"4:3"`, `"3:4"`, `"auto"` | Use `"auto"` for adaptive (mapped from `"adaptive"`) |
| `resolution` | `"1k"`, `"2k"` | Defaults to `"1k"` for text-to-image |

---

## Firebase Storage URLs

Firebase Storage URLs (`https://firebasestorage.googleapis.com/...`) cannot be accessed by xAI directly — they require auth tokens that may expire. The backend converts them to base64 data URIs before sending:

```
data:image/png;base64,<base64-encoded-bytes>
```

This conversion happens in `preparedEditImageInputs` via `resolveImageForSeedance()` in `functions-chatbot/server/index.js`. The field name stays `url` after conversion.

---

## Backend Routing Logic (`index.js`)

Location: `functions-chatbot/server/index.js`

```
isGrokImageModel(rawModel)
  └─ true
      └─ hasReferenceImages?
          ├─ yes → POST /images/edits
          │         imageBody.image  (single)  = { type, url }
          │         imageBody.images (multiple) = [{ type, url }, ...]
          └─ no  → POST /images/generations
                    (no image fields)
```

Key functions:
- `isGrokImageModel(model)` — `/^grok-imagine-image/i.test(model)`
- `buildXaiImageEditUrl()` — returns `https://api.x.ai/v1/images/edits`
- `buildXaiImageGenerateUrl()` — returns `https://api.x.ai/v1/images/generations`
- `normalizeStringArray(value)` — extracts string URLs from `{ url }` or `{ image_url }` objects
- `resolveImageForSeedance(url)` — converts Firebase URLs to base64 data URIs

---

## Frontend Payload Format

The frontend (`useLabNewLayoutComposer.ts`) sends to `/api/seedance/generate`:

```json
{
  "model": "grok-imagine-image-quality",
  "providerHint": "grok",
  "prompt": "...",
  "aspect_ratio": "16:9",
  "resolution": "1k",
  "images": [
    { "type": "image_url", "url": "https://firebasestorage.googleapis.com/..." },
    { "type": "image_url", "url": "https://firebasestorage.googleapis.com/..." }
  ]
}
```

The backend normalises this (via `normalizeStringArray`) into plain URL strings, converts Firebase URLs to base64, then re-wraps them as `{ type, url }` for the final xAI request.

---

## Bug History

### Bug 1 — Wrong endpoint for reference images

**Symptom**: Images generated but references completely ignored; output was random/unrelated.

**Cause**: Backend was routing to `/images/generations` regardless of whether reference images were present. That endpoint silently ignores all image fields.

**Fix**: Backend was already routing to `/images/edits` when `hasReferenceImages` is true, but the key format was wrong (see Bug 2).

---

### Bug 2 — Wrong field name: `image_urls` instead of `images`

**Symptom**: Still generating random images even after routing to `/images/edits`.

**Cause**: Backend sent `imageBody.image_urls = [url, url]` (flat array at top level). The `/images/edits` endpoint does not recognise `image_urls` — it requires the `images` key with object entries.

**Fix**: Changed to `imageBody.images = urls.map(url => ({ type: 'image_url', url }))`.

---

### Bug 3 — Wrong nested field name: `image_url` instead of `url`

**Symptom**: Still generating random images. `/images/edits` accepted the request without error but ignored the images.

**Cause**: Objects inside `images` were `{ type: "image_url", image_url: "..." }`. The REST API requires `{ type: "image_url", url: "..." }`. The `image_url` property name is only valid in the Python SDK's `image_urls=[]` parameter, not in the raw REST body.

**Fix**: Changed mapping to `({ type: 'image_url', url })` (ES6 shorthand).

**This was the final fix that made reference-guided generation work correctly.**

---

## Debugging Tool

A `{ }` debug button sits next to the Generate button in the composer UI. Clicking it computes and displays the exact xAI API request that will be sent (without making a network call), including the final `images[]` structure after all normalisation. The API key is not shown (server-side only).

---

## Cost Reference (approximate)

| Request type | Approx. ticks |
|---|---|
| Text-to-image (no refs) | ~500M |
| 1 reference image | ~600M |
| 2 reference images | ~700M |
| 3 reference images | ~800M |

Cost scales with image count, confirming `/images/edits` is processing the images.
