/**
 * studio.ts
 *
 * Core domain types for the multi-tenant Studio system:
 * Organizations → Projects → Members
 *
 * Each organization is an isolated studio/workspace. Projects live inside an
 * organization and can be private, visible to all org members, or shared with
 * a specific set of invited collaborators.
 *
 * Firestore layout:
 *   studio_orgs/{orgId}
 *   studio_orgs/{orgId}/members/{userId}
 *   studio_projects/{projectId}          (orgId field ties projects to their org)
 *   studio_projects/{projectId}/members/{userId}
 */

import type { Timestamp } from 'firebase/firestore'

// ─── Shared ──────────────────────────────────────────────────────────────────

/** Serialized-to-plain-object version (dates as ISO strings or millis). */
export type WithClientTimestamps<T, K extends string = 'createdAt' | 'updatedAt'> = Omit<T, K> & {
  [P in keyof T & K]: number
}

// ─── Organization ─────────────────────────────────────────────────────────────

export type OrgPlan = 'free' | 'pro' | 'enterprise'

/**
 * Top-level organization document stored at `studio_orgs/{orgId}`.
 * An organization is the top-level isolation boundary — assets, projects, and
 * members of one org are never visible to another org.
 */
export type StudioOrg = {
  /** Firestore document ID. */
  id: string
  /** Human-readable display name. */
  name: string
  /**
   * URL-safe slug (lowercase, hyphens). Unique across the platform.
   * Used for future vanity URLs (e.g. /studio/my-company).
   */
  slug: string
  /** Firebase Auth UID of the org creator / primary owner. */
  ownerId: string
  /** ISO description shown on the org profile. */
  description: string
  /** Firebase Storage URL for the org logo. */
  logoUrl: string
  /** Subscription tier — controls feature access. */
  plan: OrgPlan
  /** Denormalized count kept in sync for quick display (not for security). */
  memberCount: number
  createdAt: Timestamp
  updatedAt: Timestamp
}

export type OrgRole = 'owner' | 'admin' | 'member'

/**
 * Subcollection document at `studio_orgs/{orgId}/members/{userId}`.
 * Denormalized identity fields are copied from the user's profile so lists
 * can be rendered without extra per-user reads.
 */
export type OrgMember = {
  /** Firebase Auth UID — matches the document ID. */
  userId: string
  role: OrgRole
  /** Denormalized display name for list rendering. */
  displayName: string
  /** Denormalized email. */
  email: string
  /** Denormalized avatar URL. */
  photoUrl: string
  joinedAt: Timestamp
  /** UID of the member who sent the invite (empty string if self-joined). */
  invitedBy: string
}

// ─── Project ──────────────────────────────────────────────────────────────────

export type ProjectVisibility =
  /** Only explicitly added project members can access. */
  | 'private'
  /** All members of the parent organization can access. */
  | 'org'
  /**
   * Visible to the project's member list regardless of org membership.
   * Useful for inviting external collaborators to a single project.
   */
  | 'shared'

export type ProjectStatus = 'active' | 'archived' | 'draft'

export type StudioProjectNewLayoutConfig = {
  version: 1
  adminOnlyPanelIds: string[]
  masterAdminCanCloseTabs: boolean
}

/**
 * Top-level project document stored at `studio_projects/{projectId}`.
 * Projects are scoped to one org via `orgId`.
 */
export type StudioProject = {
  /** Firestore document ID. */
  id: string
  /** Parent organization. */
  orgId: string
  /** Human-readable project name. */
  name: string
  /** Optional description shown in project listings. */
  description: string
  visibility: ProjectVisibility
  status: ProjectStatus
  /** Firebase Auth UID of the user who created the project. */
  ownerId: string
  /** Firebase Storage URL for the project cover image. */
  coverImageUrl: string
  /** Free-form tags for filtering. */
  tags: string[]
  /**
   * Denormalized flat list of member UIDs.
   * Stored so Firestore security rules can evaluate access in a single document
   * read without requiring a subcollection lookup at rule-evaluation time.
   */
  memberUids: string[]
  /** Shared ToorGen Dockview policy for project-scoped admin tabs and close behavior. */
  toorGenNewLayoutConfig?: StudioProjectNewLayoutConfig
  createdAt: Timestamp
  updatedAt: Timestamp
}

export type ProjectRole = 'owner' | 'editor' | 'viewer'
export type FolderAccessScope = 'all' | 'restricted'

/**
 * Subcollection document at `studio_projects/{projectId}/members/{userId}`.
 */
export type ProjectMember = {
  /** Firebase Auth UID — matches the document ID. */
  userId: string
  role: ProjectRole
  /** Whether this member can see all project folders or only explicit ones. */
  folderScope?: FolderAccessScope
  /** Denormalized display name. */
  displayName: string
  /** Denormalized email. */
  email: string
  /** Denormalized avatar URL. */
  photoUrl: string
  addedAt: Timestamp
  /** UID of the member who added this person. */
  addedBy: string
}

// ─── Invite ───────────────────────────────────────────────────────────────────

export type InviteStatus = 'pending' | 'accepted' | 'declined' | 'expired'
export type InviteTargetKind = 'org' | 'project'

export type StudioInviteFolderAccess = {
  projectId: string
  folderId: string
}

/**
 * Invite document stored at `studio_invites/{inviteId}`.
 * A single collection for both org-level and project-level invitations so they
 * can be resolved with a simple email-indexed query on sign-in.
 */
export type StudioInvite = {
  id: string
  /** 'org' or 'project' */
  targetKind: InviteTargetKind
  /** orgId for org invites; projectId for project invites. */
  targetId: string
  /** Resolved on acceptance — org project invites also store the orgId here. */
  orgId: string
  role: OrgRole | ProjectRole
  /** Email address the invite was sent to. */
  inviteeEmail: string
  /** UID of the invited user when known. */
  inviteeUid?: string
  /** Display name (pre-filled if known). */
  inviteeDisplayName: string
  /** Extra project ids granted when the invite is accepted. */
  targetProjectIds?: string[]
  /** Folder ids granted when the invite is accepted. */
  targetFolderRefs?: StudioInviteFolderAccess[]
  /** UID of the member who created the invite. */
  invitedBy: string
  status: InviteStatus
  /** Opaque token embedded in the invite link. */
  token: string
  createdAt: Timestamp
  /** Invites are auto-expired after this time. */
  expiresAt: Timestamp
}

// ─── Utility / client-side helpers ───────────────────────────────────────────

/**
 * Notification document stored at `studio_notifications/{notificationId}`.
 * Mirrors the WorkHub notification pattern: keyed by recipientUid,
 * single-field query, no composite index required.
 */
export type StudioNotification = {
  id: string
  recipientUid: string
  createdBy: string
  type: 'studio_invite' | 'studio_test'
  inviteId?: string
  inviteeEmail?: string
  inviteeDisplayName?: string
  title?: string
  message?: string
  /** Projects the invite grants access to */
  targetProjectIds?: string[]
  /** Folders the invite grants access to */
  targetFolderRefs?: StudioInviteFolderAccess[]
  read: boolean
  createdAt: Timestamp
}

/**
 * Lightweight org summary used in dropdowns and navigation.
 */
export type OrgSummary = Pick<StudioOrg, 'id' | 'name' | 'slug' | 'logoUrl' | 'plan'> & {
  role: OrgRole
}

/**
 * Lightweight project summary used in lists.
 */
export type ProjectSummary = Pick<
  StudioProject,
  'id' | 'orgId' | 'name' | 'description' | 'visibility' | 'status' | 'coverImageUrl' | 'tags'
> & {
  role: ProjectRole
  updatedAt: number
}

// ─── Folder ───────────────────────────────────────────────────────────────────

/**
 * A named container stored at `studio_projects/{projectId}/folders/{folderId}`.
 * Folders are flat-by-default; `parentId` allows one level of nesting.
 */
export type StudioFolder = {
  id: string
  projectId: string
  name: string
  /** null means root-level folder. */
  parentId: string | null
  createdBy: string
  /** Members who can read this folder when not owner/editor. */
  viewerUids?: string[]
  /** Explicit allow-list for this folder. Empty means inherit/default visibility. */
  allowedMemberUids?: string[]
  /** Members hidden from this folder. */
  hiddenMemberUids?: string[]
  createdAt: Timestamp
}

export type FolderSummary = Pick<StudioFolder, 'id' | 'projectId' | 'name' | 'parentId' | 'createdBy' | 'viewerUids' | 'allowedMemberUids' | 'hiddenMemberUids'> & {
  createdAt: number
}

export type StudioReferenceAssetKind = 'image' | 'video' | 'audio'

export type StudioReferenceAsset = {
  id: string
  projectId: string
  kind: StudioReferenceAssetKind
  url: string
  thumbnailUrl?: string
  name: string
  createdBy: string
  createdAt: Timestamp
}
