import type { QuizQuestion } from '../types/quiz';

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
