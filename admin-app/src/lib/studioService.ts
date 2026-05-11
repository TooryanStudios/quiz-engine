/**
 * studioService.ts
 *
 * CRUD service layer for the Studio multi-tenant system.
 * Handles organizations, projects, members, and invites.
 *
 * Firestore layout:
 *   studio_orgs/{orgId}
 *   studio_orgs/{orgId}/members/{userId}
 *   studio_projects/{projectId}
 *   studio_projects/{projectId}/members/{userId}
 *   studio_invites/{inviteId}
 */

import {
  addDoc,
  arrayRemove,
  arrayUnion,
  collection,
  collectionGroup,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
  setDoc,
  Timestamp,
  updateDoc,
  where,
  type Unsubscribe,
} from 'firebase/firestore'
import { httpsCallable } from 'firebase/functions'
import { db } from './firebase'
import { functions } from './firebase'
import type {
  FolderSummary,
  FolderAccessScope,
  OrgMember,
  OrgRole,
  OrgSummary,
  ProjectMember,
  ProjectRole,
  ProjectSummary,
  ProjectVisibility,
  StudioFolder,
  StudioInvite,
  StudioInviteFolderAccess,
  StudioNotification,
  StudioOrg,
  StudioProject,
  StudioProjectNewLayoutConfig,
  StudioReferenceAsset,
  StudioReferenceAssetKind,
} from '../types/studio'

// ─── Collection references ────────────────────────────────────────────────────

const orgsCol = () => collection(db, 'studio_orgs')
const orgDoc = (orgId: string) => doc(db, 'studio_orgs', orgId)
const orgMembersCol = (orgId: string) => collection(db, 'studio_orgs', orgId, 'members')
const orgMemberDoc = (orgId: string, userId: string) =>
  doc(db, 'studio_orgs', orgId, 'members', userId)

const projectsCol = () => collection(db, 'studio_projects')
const projectDoc = (projectId: string) => doc(db, 'studio_projects', projectId)
const projectMembersCol = (projectId: string) =>
  collection(db, 'studio_projects', projectId, 'members')
const projectMemberDoc = (projectId: string, userId: string) =>
  doc(db, 'studio_projects', projectId, 'members', userId)

const invitesCol = () => collection(db, 'studio_invites')
const inviteDoc = (inviteId: string) => doc(db, 'studio_invites', inviteId)

const studioNotificationsCol = () => collection(db, 'studio_notifications')
const projectReferenceLibraryCol = (projectId: string) => collection(db, 'studio_projects', projectId, 'reference_library')
const projectReferenceLibraryDoc = (projectId: string, itemId: string) => doc(db, 'studio_projects', projectId, 'reference_library', itemId)

const foldersCol = (projectId: string) =>
  collection(db, 'studio_projects', projectId, 'folders')
const folderDoc = (projectId: string, folderId: string) =>
  doc(db, 'studio_projects', projectId, 'folders', folderId)
const projectFlowCanvasDoc = (projectId: string, scopeId: string) =>
  doc(db, 'studio_projects', projectId, 'flow_canvas', scopeId)

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Generate a cryptographically random token suitable for invite links. */
function generateToken(): string {
  const bytes = new Uint8Array(24)
  crypto.getRandomValues(bytes)
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')
}

/** Convert a name to a URL-safe lowercase slug. */
function toSlug(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48)
}

function docData<T>(snapshot: { data(): unknown; id: string }): T {
  return { ...(snapshot.data() as object), id: snapshot.id } as T
}

// Duck-typed createdAt resolver — handles Firestore Timestamp, plain number, and unknown.
const resolveRefCreatedAtMs = (value: unknown): number => {
  if (typeof value === 'number') return value
  if (value && typeof (value as { toMillis?: unknown }).toMillis === 'function') {
    return (value as { toMillis: () => number }).toMillis()
  }
  return 0
}

// ─── Organizations ────────────────────────────────────────────────────────────

export interface CreateOrgInput {
  name: string
  description?: string
  logoUrl?: string
}

/**
 * Create a new organization. The caller automatically becomes the owner and is
 * written into the `members` subcollection.
 */
export async function createOrg(
  input: CreateOrgInput,
  user: { uid: string; displayName: string; email: string; photoUrl: string },
): Promise<StudioOrg> {
  const ref = doc(orgsCol())
  const slug = toSlug(input.name)
  const now = serverTimestamp()

  const orgData: Omit<StudioOrg, 'id' | 'createdAt' | 'updatedAt'> & {
    createdAt: ReturnType<typeof serverTimestamp>
    updatedAt: ReturnType<typeof serverTimestamp>
  } = {
    name: input.name,
    slug,
    ownerId: user.uid,
    description: input.description ?? '',
    logoUrl: input.logoUrl ?? '',
    plan: 'free',
    memberCount: 1,
    createdAt: now,
    updatedAt: now,
  }

  const memberData: Omit<OrgMember, 'joinedAt'> & { joinedAt: ReturnType<typeof serverTimestamp> } =
    {
      userId: user.uid,
      role: 'owner',
      displayName: user.displayName,
      email: user.email,
      photoUrl: user.photoUrl,
      invitedBy: '',
      joinedAt: now,
    }

  await runTransaction(db, async (tx) => {
    tx.set(ref, orgData)
    tx.set(orgMemberDoc(ref.id, user.uid), memberData)
  })

  const snap = await getDoc(ref)
  return docData<StudioOrg>(snap)
}

/** Update org metadata (name, description, logoUrl). Only org owner / admin should call. */
export async function updateOrg(
  orgId: string,
  patch: Partial<Pick<StudioOrg, 'name' | 'description' | 'logoUrl' | 'plan'>>,
): Promise<void> {
  await updateDoc(orgDoc(orgId), { ...patch, updatedAt: serverTimestamp() })
}

/** Hard-delete an org and all its sub-documents (requires Cloud Function for full cascades). */
export async function deleteOrg(orgId: string): Promise<void> {
  // Subcollection cleanup must be handled server-side; the client only removes
  // the top-level doc to trigger a Cloud Function cascade if configured.
  await deleteDoc(orgDoc(orgId))
}

/** Fetch a single org by ID. Returns null if not found. */
export async function getOrg(orgId: string): Promise<StudioOrg | null> {
  const snap = await getDoc(orgDoc(orgId))
  if (!snap.exists()) return null
  return docData<StudioOrg>(snap)
}

/**
 * Subscribe to all orgs the current user is a member of.
 * Runs a separate query on the `members` subcollection is not supported client-side
 * via collectionGroup without index setup, so we store a flat list approach:
 * query `studio_projects` by `memberUids` array-contains.
 *
 * For orgs, we query via the orgs the user owns + separate member lookups.
 * Returns an array of OrgSummary objects ordered by name.
 */
export function subscribeToUserOrgs(
  userId: string,
  onResult: (orgs: OrgSummary[]) => void,
  onError?: (error: Error) => void,
): Unsubscribe {
  // Query orgs where the user is the owner OR is in a known set.
  // Because Firestore doesn't support subcollection-group queries for membership
  // without the collectionGroup index, we use the owner field for a lightweight
  // primary query and supplement with per-org membership lookups from the app layer.
  // In practice, the recommended pattern is to also store orgIds on the user profile.
  const q = query(orgsCol(), where('ownerId', '==', userId), orderBy('name'))

  return onSnapshot(
    q,
    (snap) => {
      const orgs: OrgSummary[] = snap.docs.map((d) => {
        const data = d.data() as StudioOrg
        return {
          id: d.id,
          name: data.name,
          slug: data.slug,
          logoUrl: data.logoUrl,
          plan: data.plan,
          role: 'owner' as const,
        }
      })
      onResult(orgs)
    },
    (err) => onError?.(err),
  )
}

// ─── Org Members ──────────────────────────────────────────────────────────────

/** Fetch all members of an organization. */
export async function getOrgMembers(orgId: string): Promise<OrgMember[]> {
  const snap = await getDocs(orgMembersCol(orgId))
  return snap.docs.map((d) => docData<OrgMember>(d))
}

/** Subscribe to org member list in real time. */
export function subscribeToOrgMembers(
  orgId: string,
  onResult: (members: OrgMember[]) => void,
  onError?: (error: Error) => void,
): Unsubscribe {
  return onSnapshot(
    orgMembersCol(orgId),
    (snap) => onResult(snap.docs.map((d) => docData<OrgMember>(d))),
    (err) => onError?.(err),
  )
}

/** Change an existing org member's role. */
export async function setOrgMemberRole(
  orgId: string,
  userId: string,
  role: OrgRole,
): Promise<void> {
  await updateDoc(orgMemberDoc(orgId, userId), { role })
}

/** Remove a member from an org (and decrement count). */
export async function removeOrgMember(orgId: string, userId: string): Promise<void> {
  await runTransaction(db, async (tx) => {
    tx.delete(orgMemberDoc(orgId, userId))
    tx.update(orgDoc(orgId), { memberCount: (await getDoc(orgDoc(orgId))).data()!.memberCount - 1 })
  })
}

// ─── Projects ─────────────────────────────────────────────────────────────────

export interface CreateProjectInput {
  orgId: string
  name: string
  description?: string
  visibility?: ProjectVisibility
  coverImageUrl?: string
  tags?: string[]
}

/**
 * Create a project inside an org. The creator becomes the project owner and is
 * added to both `memberUids` and the `members` subcollection.
 */
export async function createProject(
  input: CreateProjectInput,
  user: { uid: string; displayName: string; email: string; photoUrl: string },
): Promise<StudioProject> {
  const ref = doc(projectsCol())
  const now = serverTimestamp()

  const projectData: Omit<StudioProject, 'id' | 'createdAt' | 'updatedAt'> & {
    createdAt: ReturnType<typeof serverTimestamp>
    updatedAt: ReturnType<typeof serverTimestamp>
  } = {
    orgId: input.orgId,
    name: input.name,
    description: input.description ?? '',
    visibility: input.visibility ?? 'private',
    status: 'active',
    ownerId: user.uid,
    coverImageUrl: input.coverImageUrl ?? '',
    tags: input.tags ?? [],
    memberUids: [user.uid],
    createdAt: now,
    updatedAt: now,
  }

  const memberData: Omit<ProjectMember, 'addedAt'> & {
    addedAt: ReturnType<typeof serverTimestamp>
  } = {
    userId: user.uid,
    role: 'owner',
    folderScope: 'all',
    displayName: user.displayName,
    email: user.email,
    photoUrl: user.photoUrl,
    addedBy: user.uid,
    addedAt: now,
  }

  await runTransaction(db, async (tx) => {
    tx.set(ref, projectData)
    tx.set(projectMemberDoc(ref.id, user.uid), memberData)
  })

  const snap = await getDoc(ref)
  return docData<StudioProject>(snap)
}

/** Update project metadata. */
export async function updateProject(
  projectId: string,
  patch: Partial<
    Pick<
      StudioProject,
      'name' | 'description' | 'visibility' | 'status' | 'coverImageUrl' | 'tags'
    >
  >,
): Promise<void> {
  await updateDoc(projectDoc(projectId), { ...patch, updatedAt: serverTimestamp() })
}

/** Delete a project document (subcollection cleanup requires server-side cascade). */
export async function deleteProject(projectId: string): Promise<void> {
  await deleteDoc(projectDoc(projectId))
}

/** Fetch a single project. Returns null if not found. */
export async function getProject(projectId: string): Promise<StudioProject | null> {
  const snap = await getDoc(projectDoc(projectId))
  if (!snap.exists()) return null
  return docData<StudioProject>(snap)
}

export function subscribeToProjectNewLayoutConfig(
  projectId: string,
  onResult: (config: StudioProjectNewLayoutConfig | null) => void,
  onError?: (error: Error) => void,
): Unsubscribe {
  return onSnapshot(
    projectDoc(projectId),
    (snap) => {
      if (!snap.exists()) {
        onResult(null)
        return
      }

      const data = snap.data() as StudioProject
      onResult(data.toorGenNewLayoutConfig ?? null)
    },
    (err) => onError?.(err),
  )
}

export async function saveProjectNewLayoutConfig(
  projectId: string,
  config: StudioProjectNewLayoutConfig,
): Promise<void> {
  await updateDoc(projectDoc(projectId), {
    toorGenNewLayoutConfig: config,
    updatedAt: serverTimestamp(),
  })
}

export type StudioProjectFlowCanvasPayload = {
  nodes: unknown[]
  edges: unknown[]
  viewport?: { x: number; y: number; zoom: number }
}

export type StudioProjectFlowCanvasSummary = {
  scopeId: string
  flowName: string
  folderId: string | null
  folderPathIds: string[]
  folderPathNames: string[]
  updatedBy: string
  updatedAt: number
}

export function subscribeToProjectFlowCanvases(
  projectId: string,
  onResult: (items: StudioProjectFlowCanvasSummary[]) => void,
  onError?: (error: Error) => void,
): Unsubscribe {
  const q = query(collection(db, 'studio_projects', projectId, 'flow_canvas'), orderBy('updatedAt', 'desc'))
  return onSnapshot(
    q,
    (snap) => {
      const items = snap.docs.map((docSnap) => {
        const data = docSnap.data() as {
          flowName?: string
          folderId?: string | null
          folderPathIds?: string[]
          folderPathNames?: string[]
          updatedBy?: string
          updatedAt?: Timestamp
        }

        return {
          scopeId: docSnap.id,
          flowName: (data.flowName || '').trim() || 'Untitled Flow',
          folderId: typeof data.folderId === 'string' && data.folderId.trim() ? data.folderId : null,
          folderPathIds: Array.isArray(data.folderPathIds) ? data.folderPathIds : [],
          folderPathNames: Array.isArray(data.folderPathNames) ? data.folderPathNames : [],
          updatedBy: typeof data.updatedBy === 'string' ? data.updatedBy : '',
          updatedAt: data.updatedAt instanceof Timestamp ? data.updatedAt.toMillis() : 0,
        } as StudioProjectFlowCanvasSummary
      })
      onResult(items)
    },
    (err) => onError?.(err),
  )
}

export async function loadProjectFlowCanvasState(
  projectId: string,
  scopeId: string,
): Promise<StudioProjectFlowCanvasPayload | null> {
  const snapshot = await getDoc(projectFlowCanvasDoc(projectId, scopeId))
  if (!snapshot.exists()) {
    return null
  }

  const data = snapshot.data() as {
    workflow?: {
      nodes?: unknown[]
      edges?: unknown[]
      viewport?: { x: number; y: number; zoom: number }
    }
  }

  return {
    nodes: Array.isArray(data.workflow?.nodes) ? data.workflow.nodes : [],
    edges: Array.isArray(data.workflow?.edges) ? data.workflow.edges : [],
    ...(data.workflow?.viewport ? { viewport: data.workflow.viewport } : {}),
  }
}

export async function saveProjectFlowCanvasState(input: {
  projectId: string
  scopeId: string
  flowName?: string
  folderId: string | null
  folderPathIds: string[]
  folderPathNames: string[]
  updatedBy: string
  workflow: StudioProjectFlowCanvasPayload
}): Promise<void> {
  await setDoc(projectFlowCanvasDoc(input.projectId, input.scopeId), {
    version: 1,
    scopeId: input.scopeId,
    ...(typeof input.flowName === 'string' ? { flowName: input.flowName.trim() || 'Untitled Flow' } : {}),
    folderId: input.folderId,
    folderPathIds: input.folderPathIds,
    folderPathNames: input.folderPathNames,
    updatedBy: input.updatedBy,
    workflow: {
      nodes: Array.isArray(input.workflow.nodes) ? input.workflow.nodes : [],
      edges: Array.isArray(input.workflow.edges) ? input.workflow.edges : [],
      ...(input.workflow.viewport ? { viewport: input.workflow.viewport } : {}),
    },
    updatedAt: serverTimestamp(),
  }, { merge: true })
}

export async function listProjectFlowCanvases(
  projectId: string,
): Promise<StudioProjectFlowCanvasSummary[]> {
  const q = query(collection(db, 'studio_projects', projectId, 'flow_canvas'), orderBy('updatedAt', 'desc'))
  const snap = await getDocs(q)
  return snap.docs.map((docSnap) => {
    const data = docSnap.data() as {
      flowName?: string
      folderId?: string | null
      folderPathIds?: string[]
      folderPathNames?: string[]
      updatedBy?: string
      updatedAt?: Timestamp
    }
    return {
      scopeId: docSnap.id,
      flowName: (data.flowName || '').trim() || 'Untitled Flow',
      folderId: typeof data.folderId === 'string' && data.folderId.trim() ? data.folderId : null,
      folderPathIds: Array.isArray(data.folderPathIds) ? data.folderPathIds : [],
      folderPathNames: Array.isArray(data.folderPathNames) ? data.folderPathNames : [],
      updatedBy: typeof data.updatedBy === 'string' ? data.updatedBy : '',
      updatedAt: data.updatedAt instanceof Timestamp ? data.updatedAt.toMillis() : 0,
    } as StudioProjectFlowCanvasSummary
  })
}

export async function listProjectFolders(
  projectId: string,
  access: { userId: string; role: ProjectRole | null },
): Promise<FolderSummary[]> {
  const canReadAllFolders = access.role === 'owner' || access.role === 'editor'
  const q = canReadAllFolders
    ? query(foldersCol(projectId), orderBy('createdAt'))
    : query(foldersCol(projectId), where('viewerUids', 'array-contains', access.userId))
  const snap = await getDocs(q)
  return snap.docs.map((d) => {
    const data = d.data() as StudioFolder
    return {
      id: d.id,
      projectId: data.projectId,
      name: data.name,
      parentId: data.parentId,
      createdBy: data.createdBy,
      viewerUids: Array.isArray(data.viewerUids) ? data.viewerUids : [],
      allowedMemberUids: Array.isArray(data.allowedMemberUids) ? data.allowedMemberUids : [],
      hiddenMemberUids: Array.isArray(data.hiddenMemberUids) ? data.hiddenMemberUids : [],
      createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toMillis() : Date.now(),
    } as FolderSummary
  }).sort((left, right) => left.createdAt - right.createdAt)
}

export async function renameProjectFlowCanvas(
  projectId: string,
  scopeId: string,
  flowName: string,
): Promise<void> {
  await updateDoc(projectFlowCanvasDoc(projectId, scopeId), {
    flowName: flowName.trim() || 'Untitled Flow',
    updatedAt: serverTimestamp(),
  })
}

export async function moveProjectFlowCanvas(input: {
  projectId: string
  scopeId: string
  folderId: string | null
  folderPathIds: string[]
  folderPathNames: string[]
}): Promise<void> {
  await updateDoc(projectFlowCanvasDoc(input.projectId, input.scopeId), {
    folderId: input.folderId,
    folderPathIds: input.folderPathIds,
    folderPathNames: input.folderPathNames,
    updatedAt: serverTimestamp(),
  })
}

export async function deleteProjectFlowCanvas(projectId: string, scopeId: string): Promise<void> {
  await deleteDoc(projectFlowCanvasDoc(projectId, scopeId))
}

/**
 * Subscribe to all projects within an org that are visible to a given user.
 * Covers:
 *   - 'org' visibility (all org members)
 *   - 'private' / 'shared' where the user is in memberUids
 */
export function subscribeToOrgProjects(
  orgId: string,
  userId: string,
  onResult: (projects: ProjectSummary[]) => void,
  onError?: (error: Error) => void,
): Unsubscribe {
  // Query: projects in this org where the user is a member
  const q = query(
    projectsCol(),
    where('orgId', '==', orgId),
    where('memberUids', 'array-contains', userId),
    orderBy('updatedAt', 'desc'),
  )

  return onSnapshot(
    q,
    (snap) => {
      const projects: ProjectSummary[] = snap.docs.map((d) => {
        const data = d.data() as StudioProject
        return {
          id: d.id,
          orgId: data.orgId,
          name: data.name,
          description: data.description,
          visibility: data.visibility,
          status: data.status,
          coverImageUrl: data.coverImageUrl,
          tags: data.tags,
          role: (data.ownerId === userId ? 'owner' : 'editor') as import('../types/studio').ProjectRole,
          updatedAt:
            data.updatedAt instanceof Timestamp ? data.updatedAt.toMillis() : Date.now(),
        }
      })
      onResult(projects)
    },
    (err) => onError?.(err),
  )
}

/**
 * Subscribe to all projects that include the user as a member.
 * This powers personal project workflows that do not require explicit org setup.
 */
export function subscribeToUserProjects(
  userId: string,
  onResult: (projects: ProjectSummary[]) => void,
  onError?: (error: Error) => void,
): Unsubscribe {
  const q = query(projectsCol(), where('memberUids', 'array-contains', userId))

  return onSnapshot(
    q,
    (snap) => {
      const projects: ProjectSummary[] = snap.docs.map((d) => {
        const data = d.data() as StudioProject
        return {
          id: d.id,
          orgId: data.orgId,
          name: data.name,
          description: data.description,
          visibility: data.visibility,
          status: data.status,
          coverImageUrl: data.coverImageUrl,
          tags: data.tags,
          role: (data.ownerId === userId ? 'owner' : 'editor') as import('../types/studio').ProjectRole,
          updatedAt:
            data.updatedAt instanceof Timestamp ? data.updatedAt.toMillis() : Date.now(),
        }
      }).sort((a, b) => b.updatedAt - a.updatedAt)
      onResult(projects)
    },
    (err) => onError?.(err),
  )
}

// ─── Project Members ──────────────────────────────────────────────────────────

/** Fetch all members of a project. */
export async function getProjectMembers(projectId: string): Promise<ProjectMember[]> {
  const snap = await getDocs(projectMembersCol(projectId))
  return snap.docs.map((d) => docData<ProjectMember>(d))
}

/** Subscribe to project member list. */
export function subscribeToProjectMembers(
  projectId: string,
  onResult: (members: ProjectMember[]) => void,
  onError?: (error: Error) => void,
): Unsubscribe {
  return onSnapshot(
    projectMembersCol(projectId),
    (snap) => onResult(snap.docs.map((d) => docData<ProjectMember>(d))),
    (err) => onError?.(err),
  )
}

/**
 * Add a user to a project.
 * Updates both the subcollection and the denormalized `memberUids` array.
 */
export async function addProjectMember(
  projectId: string,
  member: { uid: string; displayName: string; email: string; photoUrl: string },
  role: ProjectRole,
  addedBy: string,
  options?: { folderScope?: FolderAccessScope },
): Promise<void> {
  const now = serverTimestamp()
  const memberData: Omit<ProjectMember, 'addedAt'> & {
    addedAt: ReturnType<typeof serverTimestamp>
  } = {
    userId: member.uid,
    role,
    folderScope: options?.folderScope ?? 'all',
    displayName: member.displayName,
    email: member.email,
    photoUrl: member.photoUrl,
    addedBy,
    addedAt: now,
  }

  await runTransaction(db, async (tx) => {
    tx.set(projectMemberDoc(projectId, member.uid), memberData)
    tx.update(projectDoc(projectId), {
      memberUids: arrayUnion(member.uid),
      updatedAt: serverTimestamp(),
    })
  })
}

/** Change an existing project member's role. */
export async function setProjectMemberRole(
  projectId: string,
  userId: string,
  role: ProjectRole,
): Promise<void> {
  await updateDoc(projectMemberDoc(projectId, userId), { role })
}

export async function setProjectMemberFolderScope(
  projectId: string,
  userId: string,
  folderScope: FolderAccessScope,
): Promise<void> {
  await updateDoc(projectMemberDoc(projectId, userId), { folderScope })
}

/** Remove a member from a project. */
export async function removeProjectMember(projectId: string, userId: string): Promise<void> {
  await runTransaction(db, async (tx) => {
    tx.delete(projectMemberDoc(projectId, userId))
    tx.update(projectDoc(projectId), {
      memberUids: arrayRemove(userId),
      updatedAt: serverTimestamp(),
    })
  })
}

// ─── Invites ──────────────────────────────────────────────────────────────────

export interface CreateInviteInput {
  targetKind: 'org' | 'project'
  targetId: string
  orgId: string
  role: OrgRole | ProjectRole
  inviteeEmail: string
  inviteeUid?: string
  inviteeDisplayName?: string
  targetProjectIds?: string[]
  targetFolderRefs?: StudioInviteFolderAccess[]
  invitedBy: string
  /** Hours until expiry. Defaults to 72. */
  expiryHours?: number
}

type SendStudioOrgInviteEmailRequest = {
  inviteId: string
}

type SendStudioOrgInviteEmailResponse = {
  toEmail: string
  message: string
}

/** Create an invite document and return the full record with generated token. */
export async function createInvite(input: CreateInviteInput): Promise<StudioInvite> {
  const ref = doc(invitesCol())
  const now = Timestamp.now()
  const expiryHours = input.expiryHours ?? 72
  const expiresAt = Timestamp.fromMillis(now.toMillis() + expiryHours * 60 * 60 * 1000)
  const targetProjectIds = Array.from(new Set((input.targetProjectIds || []).map((projectId) => projectId.trim()).filter(Boolean)))
  const targetFolderRefs = Array.from(new Map(
    (input.targetFolderRefs || [])
      .map((folderRef) => ({ projectId: folderRef.projectId.trim(), folderId: folderRef.folderId.trim() }))
      .filter((folderRef) => folderRef.projectId && folderRef.folderId)
      .map((folderRef) => [`${folderRef.projectId}__${folderRef.folderId}`, folderRef] as const),
  ).values())

  const inviteData: Omit<StudioInvite, 'id'> = {
    targetKind: input.targetKind,
    targetId: input.targetId,
    orgId: input.orgId,
    role: input.role,
    inviteeEmail: input.inviteeEmail.toLowerCase().trim(),
    ...(input.inviteeUid ? { inviteeUid: input.inviteeUid } : {}),
    inviteeDisplayName: input.inviteeDisplayName ?? '',
    ...(targetProjectIds.length > 0 ? { targetProjectIds } : {}),
    ...(targetFolderRefs.length > 0 ? { targetFolderRefs } : {}),
    invitedBy: input.invitedBy,
    status: 'pending',
    token: generateToken(),
    createdAt: now,
    expiresAt,
  }

  await setDoc(ref, inviteData)
  return { ...inviteData, id: ref.id }
}

export async function sendStudioOrgInviteEmail(input: SendStudioOrgInviteEmailRequest): Promise<SendStudioOrgInviteEmailResponse> {
  const fn = httpsCallable<SendStudioOrgInviteEmailRequest, SendStudioOrgInviteEmailResponse>(
    functions,
    'sendStudioOrgInviteEmail',
  )
  const result = await fn(input)
  return result.data
}

/** Look up a pending invite by its opaque token. */
export async function getInviteByToken(token: string): Promise<StudioInvite | null> {
  const q = query(invitesCol(), where('token', '==', token), where('status', '==', 'pending'))
  const snap = await getDocs(q)
  if (snap.empty) return null
  return docData<StudioInvite>(snap.docs[0])
}

/** Fetch all pending invites sent to a given email address (called on sign-in). */
export async function getPendingInvitesForEmail(email: string): Promise<StudioInvite[]> {
  const q = query(
    invitesCol(),
    where('inviteeEmail', '==', email.toLowerCase().trim()),
    where('status', '==', 'pending'),
  )
  const snap = await getDocs(q)
  return snap.docs.map((d) => docData<StudioInvite>(d))
}

export function subscribePendingInvitesForEmail(
  email: string,
  onData: (invites: StudioInvite[]) => void,
): Unsubscribe {
  const normalizedEmail = email.toLowerCase().trim()
  if (!normalizedEmail) {
    onData([])
    return () => undefined
  }

  const q = query(
    invitesCol(),
    where('inviteeEmail', '==', normalizedEmail),
    where('status', '==', 'pending'),
  )
  return onSnapshot(q, (snap) => onData(snap.docs.map((d) => docData<StudioInvite>(d))), () => onData([]))
}

export function subscribePendingInvitesForRecipient(
  input: { uid: string; email?: string | null },
  onData: (invites: StudioInvite[]) => void,
): Unsubscribe {
  const uid = input.uid.trim()
  const email = (input.email || '').trim().toLowerCase()
  if (!uid && !email) {
    onData([])
    return () => undefined
  }

  const current = new Map<string, StudioInvite>()
  let uidInvites: StudioInvite[] = []
  let emailInvites: StudioInvite[] = []

  const emit = () => {
    current.clear()
    for (const invite of uidInvites) current.set(invite.id, invite)
    for (const invite of emailInvites) current.set(invite.id, invite)
    onData(Array.from(current.values()))
  }

  const unsubscribers: Unsubscribe[] = []

  if (uid) {
    const q = query(invitesCol(), where('inviteeUid', '==', uid), where('status', '==', 'pending'))
    unsubscribers.push(onSnapshot(q, (snap) => {
      uidInvites = snap.docs.map((d) => docData<StudioInvite>(d))
      emit()
    }, () => {
      uidInvites = []
      emit()
    }))
  }

  if (email) {
    const q = query(invitesCol(), where('inviteeEmail', '==', email), where('status', '==', 'pending'))
    unsubscribers.push(onSnapshot(q, (snap) => {
      emailInvites = snap.docs.map((d) => docData<StudioInvite>(d))
      emit()
    }, () => {
      emailInvites = []
      emit()
    }))
  }

  return () => {
    for (const unsubscribe of unsubscribers) unsubscribe()
  }
}

/**
 * Accept an invite: adds the user to the org/project and marks the invite accepted.
 * The caller must pass a resolved user identity.
 */
export async function acceptInvite(
  invite: StudioInvite,
  user: { uid: string; displayName: string; email: string; photoUrl: string },
): Promise<void> {
  const now = serverTimestamp()
  const projectRole = (invite.targetKind === 'project' ? invite.role : 'viewer') as ProjectRole
  const projectIds = Array.from(new Set([
    ...(invite.targetKind === 'project' ? [invite.targetId] : []),
    ...(invite.targetProjectIds || []),
  ].map((projectId) => projectId.trim()).filter(Boolean)))
  const folderRefs = Array.from(new Map(
    (invite.targetFolderRefs || [])
      .map((folderRef) => ({ projectId: folderRef.projectId.trim(), folderId: folderRef.folderId.trim() }))
      .filter((folderRef) => folderRef.projectId && folderRef.folderId)
      .map((folderRef) => [`${folderRef.projectId}__${folderRef.folderId}`, folderRef] as const),
  ).values())

  await runTransaction(db, async (tx) => {
    // Mark invite accepted
    tx.update(inviteDoc(invite.id), { status: 'accepted' })

    if (invite.targetKind === 'org') {
      const role = invite.role as OrgRole
      const memberData: Omit<OrgMember, 'joinedAt'> & {
        joinedAt: ReturnType<typeof serverTimestamp>
      } = {
        userId: user.uid,
        role,
        displayName: user.displayName,
        email: user.email,
        photoUrl: user.photoUrl,
        invitedBy: invite.invitedBy,
        joinedAt: now,
      }
      tx.set(orgMemberDoc(invite.targetId, user.uid), memberData)
      // Increment denormalized count
      const orgSnap = await getDoc(orgDoc(invite.targetId))
      if (orgSnap.exists()) {
        tx.update(orgDoc(invite.targetId), {
          memberCount: (orgSnap.data().memberCount ?? 0) + 1,
        })
      }
    } else {
      // Project access is granted in the shared project loop below.
    }

    for (const projectId of projectIds) {
      const memberData: Omit<ProjectMember, 'addedAt'> & {
        addedAt: ReturnType<typeof serverTimestamp>
      } = {
        userId: user.uid,
        role: projectRole,
        folderScope: folderRefs.length > 0 ? 'restricted' : 'all',
        displayName: user.displayName,
        email: user.email,
        photoUrl: user.photoUrl,
        addedBy: invite.invitedBy,
        addedAt: now,
      }
      tx.set(projectMemberDoc(projectId, user.uid), memberData)
      tx.update(projectDoc(projectId), {
        memberUids: arrayUnion(user.uid),
        updatedAt: serverTimestamp(),
      })
    }

    for (const folderRef of folderRefs) {
      const folderRefDoc = folderDoc(folderRef.projectId, folderRef.folderId)
      const folderSnap = await tx.get(folderRefDoc)
      if (folderSnap.exists()) {
        tx.update(folderRefDoc, {
          viewerUids: arrayUnion(user.uid),
          allowedMemberUids: arrayUnion(user.uid),
        })
      }
    }
  })
}

/** Decline or revoke an invite. */
export async function updateInviteStatus(
  inviteId: string,
  status: 'declined' | 'expired',
): Promise<void> {
  await updateDoc(inviteDoc(inviteId), { status })
}

/** Load a single invite document by ID. */
export async function getInviteById(inviteId: string): Promise<StudioInvite | null> {
  const snap = await getDoc(inviteDoc(inviteId))
  if (!snap.exists()) return null
  return docData<StudioInvite>(snap)
}

// ─── Studio Notifications ─────────────────────────────────────────────────────
// Same pattern as WorkHub notifications: one document per recipient, keyed by
// recipientUid. Single-field query — no composite index required.

/** Subscribe to pending studio notifications for the current user. */
export function subscribeStudioNotifications(
  recipientUid: string,
  onData: (items: StudioNotification[]) => void,
): Unsubscribe {
  if (!recipientUid) {
    onData([])
    return () => undefined
  }
  const q = query(studioNotificationsCol(), where('recipientUid', '==', recipientUid))
  return onSnapshot(
    q,
    (snap) => {
      onData(snap.docs.map((d) => docData<StudioNotification>(d)))
    },
    (err) => {
      console.error('[StudioNotif] subscription error:', err)
      onData([])
    },
  )
}

/** Write a studio_notifications document to alert the invitee. Called by the invite sender. */
export async function createStudioInviteNotification(input: {
  recipientUid: string
  createdBy: string
  inviteId: string
  inviteeEmail: string
  inviteeDisplayName?: string
  targetProjectIds?: string[]
  targetFolderRefs?: StudioInviteFolderAccess[]
}): Promise<void> {
  await addDoc(studioNotificationsCol(), {
    recipientUid: input.recipientUid,
    createdBy: input.createdBy,
    type: 'studio_invite',
    inviteId: input.inviteId,
    inviteeEmail: input.inviteeEmail,
    ...(input.inviteeDisplayName ? { inviteeDisplayName: input.inviteeDisplayName } : {}),
    ...(input.targetProjectIds?.length ? { targetProjectIds: input.targetProjectIds } : {}),
    ...(input.targetFolderRefs?.length ? { targetFolderRefs: input.targetFolderRefs } : {}),
    read: false,
    createdAt: serverTimestamp(),
  })
}

export async function createStudioTestNotification(input: {
  recipientUid: string
  createdBy: string
  title?: string
  message: string
}): Promise<void> {
  await addDoc(studioNotificationsCol(), {
    recipientUid: input.recipientUid,
    createdBy: input.createdBy,
    type: 'studio_test',
    ...(input.title ? { title: input.title } : {}),
    message: input.message,
    read: false,
    createdAt: serverTimestamp(),
  })
}

/** Mark a studio notification as read (or delete it after accept/decline). */
export async function deleteStudioNotification(notificationId: string): Promise<void> {
  await deleteDoc(doc(studioNotificationsCol(), notificationId))
}

// ─── Project Reference Library ───────────────────────────────────────────────

export function subscribeToProjectReferenceLibrary(
  projectId: string,
  onData: (items: StudioReferenceAsset[]) => void,
  onError?: (error: Error) => void,
): Unsubscribe {
  return onSnapshot(
    projectReferenceLibraryCol(projectId),
    (snap) => {
      const items = snap.docs
        .map((docSnap) => docData<StudioReferenceAsset>(docSnap))
        .sort((left, right) => {
          const leftAt = resolveRefCreatedAtMs(left.createdAt)
          const rightAt = resolveRefCreatedAtMs(right.createdAt)
          return rightAt - leftAt
        })
      onData(items)
    },
    (err) => onError?.(err),
  )
}

export function subscribeToUserReferenceLibrary(
  userId: string,
  onData: (items: StudioReferenceAsset[]) => void,
  onError?: (error: Error) => void,
): Unsubscribe {
  return onSnapshot(
    query(collectionGroup(db, 'reference_library'), where('createdBy', '==', userId)),
    (snap) => {
      const items = snap.docs
        .map((docSnap) => docData<StudioReferenceAsset>(docSnap))
        .sort((left, right) => {
          const leftAt = resolveRefCreatedAtMs(left.createdAt)
          const rightAt = resolveRefCreatedAtMs(right.createdAt)
          return rightAt - leftAt
        })
      onData(items)
    },
    (err) => onError?.(err),
  )
}

export async function saveProjectReferenceLibraryItem(
  projectId: string,
  item: {
    id: string
    kind: StudioReferenceAssetKind
    url: string
    thumbnailUrl?: string
    name: string
    createdAt: number
    folderId?: string | null
  },
  createdBy: string,
): Promise<void> {
  const thumbnailUrl = (item.thumbnailUrl || '').trim()
  const normalizedFolderId = typeof item.folderId === 'string' && item.folderId.trim()
    ? item.folderId.trim()
    : null
  await setDoc(projectReferenceLibraryDoc(projectId, item.id), {
    projectId,
    ...(normalizedFolderId ? { folderId: normalizedFolderId } : {}),
    kind: item.kind,
    url: item.url,
    ...(thumbnailUrl ? { thumbnailUrl } : {}),
    name: item.name,
    createdBy,
    createdAt: Timestamp.fromMillis(item.createdAt),
  })
}

export async function backfillProjectReferenceLibraryItemThumbnail(
  projectId: string,
  itemId: string,
  thumbnailUrl: string,
): Promise<void> {
  const normalizedThumbnailUrl = thumbnailUrl.trim()
  if (!normalizedThumbnailUrl) {
    return
  }

  await updateDoc(projectReferenceLibraryDoc(projectId, itemId), {
    thumbnailUrl: normalizedThumbnailUrl,
  })
}

export async function renameProjectReferenceLibraryItem(
  projectId: string,
  itemId: string,
  name: string,
): Promise<void> {
  await updateDoc(projectReferenceLibraryDoc(projectId, itemId), { name: name.trim() || 'Reference asset' })
}

export async function deleteProjectReferenceLibraryItem(
  projectId: string,
  itemId: string,
): Promise<void> {
  await deleteDoc(projectReferenceLibraryDoc(projectId, itemId))
}

// ─── Folders ───────────────────────────────────────────────────────────────────

export interface CreateFolderInput {
  projectId: string
  name: string
  parentId?: string | null
}

/** Create a folder inside a project. */
export async function createFolder(
  input: CreateFolderInput,
  userId: string,
): Promise<FolderSummary> {
  const ref = doc(foldersCol(input.projectId))
  const now = serverTimestamp()
  const membersSnap = await getDocs(projectMembersCol(input.projectId))
  const viewerUids = Array.from(new Set(membersSnap.docs
    .map((snap) => snap.data() as Partial<ProjectMember>)
    .filter((member) => member.role === 'owner' || member.role === 'editor' || (member.folderScope ?? 'all') === 'all')
    .map((member) => String(member.userId || '').trim())
    .filter(Boolean)))
  await setDoc(ref, {
    projectId: input.projectId,
    name: input.name,
    parentId: input.parentId ?? null,
    createdBy: userId,
    viewerUids,
    allowedMemberUids: [],
    hiddenMemberUids: [],
    createdAt: now,
  })
  const snap = await getDoc(ref)
  const d = snap.data() as StudioFolder
  return {
    id: snap.id,
    projectId: d.projectId,
    name: d.name,
    parentId: d.parentId,
    createdBy: d.createdBy,
    viewerUids: Array.isArray(d.viewerUids) ? d.viewerUids : [],
    allowedMemberUids: Array.isArray(d.allowedMemberUids) ? d.allowedMemberUids : [],
    hiddenMemberUids: Array.isArray(d.hiddenMemberUids) ? d.hiddenMemberUids : [],
    createdAt: d.createdAt instanceof Timestamp ? d.createdAt.toMillis() : Date.now(),
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// PROJECT CRUD (top-level rename / delete)
// ─────────────────────────────────────────────────────────────────────────────

export async function updateStudioProject(projectId: string, name: string): Promise<void> {
  await updateDoc(projectDoc(projectId), {
    name,
    updatedAt: serverTimestamp(),
  })
}

export async function deleteStudioProject(projectId: string): Promise<void> {
  await deleteDoc(projectDoc(projectId))
}

/** Rename a folder. */
export async function updateFolder(
  projectId: string,
  folderId: string,
  name: string,
): Promise<void> {
  await updateDoc(folderDoc(projectId, folderId), { name })
}

/** Move a folder by updating its parentId (null means root level). */
export async function moveFolder(
  projectId: string,
  folderId: string,
  parentId: string | null,
): Promise<void> {
  await updateDoc(folderDoc(projectId, folderId), { parentId: parentId ?? null })
}

export async function setFolderMemberVisibility(
  projectId: string,
  folderId: string,
  userId: string,
  visibility: 'default' | 'allowed' | 'hidden',
): Promise<void> {
  const ref = folderDoc(projectId, folderId)
  const memberRef = projectMemberDoc(projectId, userId)
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(ref)
    if (!snap.exists()) {
      throw new Error('Folder not found.')
    }
    const memberSnap = await tx.get(memberRef)

    const data = snap.data() as Partial<StudioFolder>
    const memberData = memberSnap.exists() ? memberSnap.data() as Partial<ProjectMember> : null
    const memberFolderScope = memberData?.folderScope ?? 'all'
    const viewers = Array.isArray(data.viewerUids) ? data.viewerUids.filter((uid) => uid && uid !== userId) : []
    const allowed = Array.isArray(data.allowedMemberUids) ? data.allowedMemberUids.filter((uid) => uid && uid !== userId) : []
    const hidden = Array.isArray(data.hiddenMemberUids) ? data.hiddenMemberUids.filter((uid) => uid && uid !== userId) : []

    if (visibility === 'allowed') allowed.push(userId)
    if (visibility === 'hidden') hidden.push(userId)
    if (visibility === 'allowed') viewers.push(userId)
    if (visibility === 'default' && memberFolderScope !== 'restricted') viewers.push(userId)

    tx.update(ref, {
      viewerUids: Array.from(new Set(viewers)),
      allowedMemberUids: Array.from(new Set(allowed)),
      hiddenMemberUids: Array.from(new Set(hidden)),
    })
  })
}

/** Delete a folder (does not cascade-delete contents). */
export async function deleteFolder(projectId: string, folderId: string): Promise<void> {
  await deleteDoc(folderDoc(projectId, folderId))
}

/** Subscribe to all folders in a project, ordered by creation time. */
export function subscribeToProjectFolders(
  projectId: string,
  access: { userId: string; role: ProjectRole | null },
  onResult: (folders: FolderSummary[]) => void,
  onError?: (error: Error) => void,
): Unsubscribe {
  const canReadAllFolders = access.role === 'owner' || access.role === 'editor'
  const q = canReadAllFolders
    ? query(foldersCol(projectId), orderBy('createdAt'))
    : query(foldersCol(projectId), where('viewerUids', 'array-contains', access.userId))
  return onSnapshot(
    q,
    (snap) => {
      const folders: FolderSummary[] = snap.docs.map((d) => {
        const data = d.data() as StudioFolder
        return {
          id: d.id,
          projectId: data.projectId,
          name: data.name,
          parentId: data.parentId,
          createdBy: data.createdBy,
          viewerUids: Array.isArray(data.viewerUids) ? data.viewerUids : [],
          allowedMemberUids: Array.isArray(data.allowedMemberUids) ? data.allowedMemberUids : [],
          hiddenMemberUids: Array.isArray(data.hiddenMemberUids) ? data.hiddenMemberUids : [],
          createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toMillis() : Date.now(),
        }
      }).sort((left, right) => left.createdAt - right.createdAt)
      onResult(folders)
    },
    (err) => onError?.(err),
  )
}
