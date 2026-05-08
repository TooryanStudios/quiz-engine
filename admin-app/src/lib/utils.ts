import type { QuizQuestion } from '../types/quiz';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Common date threshold for "new" content (14 days)
 */
export const NEW_CONTENT_THRESHOLD_MS = 14 * 24 * 60 * 60 * 1000;

/**
 * Checks if a Firestore timestamp (or similar) is within the "new" threshold
 */
export function isNewContent(createdAt: any): boolean {
  if (!createdAt) return false;
  const ms: number = createdAt?.toMillis?.() ?? (createdAt?.seconds ? createdAt.seconds * 1000 : 0);
  return ms > 0 && Date.now() - ms < NEW_CONTENT_THRESHOLD_MS;
}

/**
 * Extracts a cover image URL from a list of quiz questions
 */
export function getCoverFromQuestions(questions: QuizQuestion[]): string | null {
  for (const q of questions ?? []) {
    if (q.media?.type === 'image' && q.media.url) return q.media.url;
  }
  return null;
}

/**
 * Normalizes different storage URL formats into browser-loadable URLs.
 */
export function resolveMediaUrl(input?: string | null): string | null {
  if (!input || typeof input !== 'string') return null;
  const raw = input.trim();
  if (!raw) return null;

  // Already a normal URL
  if (/^https?:\/\//i.test(raw) || raw.startsWith('data:')) return raw;

  // Firebase Storage URI format: gs://bucket/path/to/file
  if (raw.startsWith('gs://')) {
    const noScheme = raw.slice(5);
    const slash = noScheme.indexOf('/');
    if (slash <= 0) return null;
    const bucket = noScheme.slice(0, slash);
    const objectPath = noScheme.slice(slash + 1);
    if (!objectPath) return null;
    return `https://firebasestorage.googleapis.com/v0/b/${bucket}/o/${encodeURIComponent(objectPath)}?alt=media`;
  }

  // Plain storage object path format: quiz-covers/... or folder/file.ext
  if (raw.includes('/') && !raw.startsWith('/')) {
    const bucket = (import.meta as any)?.env?.VITE_FIREBASE_STORAGE_BUCKET as string | undefined;
    if (bucket) {
      return `https://firebasestorage.googleapis.com/v0/b/${bucket}/o/${encodeURIComponent(raw)}?alt=media`;
    }
  }

  return raw;
}

/**
 * Picks the most reliable cover source for card rendering.
 */
export function getBestCoverImage(coverImage?: string | null, questions: QuizQuestion[] = []): string | null {
  const preferred = resolveMediaUrl(coverImage);
  if (preferred) return preferred;
  return resolveMediaUrl(getCoverFromQuestions(questions));
}

/**
 * Normalizes and clamps text to a maximum length
 */
export function clampText(value: unknown, maxLength: number): string {
  const normalized = String(value ?? '').replace(/\s+/g, ' ').trim();
  if (normalized.length <= maxLength) return normalized;
  return `${normalized.slice(0, maxLength - 1).trimEnd()}…`;
}

/**
 * Shared logic for building a slug from a title
 */
export function titleToSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}
