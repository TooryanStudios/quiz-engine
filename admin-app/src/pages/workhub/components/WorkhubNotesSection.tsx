import { type WorkhubDocument, type WorkhubMember, type WorkhubProject, type WorkhubTaskComment } from '../../../lib/workhubRepo'
import { useWorkhubDocEditorHandlers, type UseWorkhubDocEditorHandlersInput } from '../hooks/useWorkhubDocEditorHandlers'
import { WorkhubDocEditor } from './WorkhubDocEditor'

type WorkspaceSummary = { id: string; name: string }
type ProjectSummary = { id: string; name: string; workspaceId: string; parentProjectId?: string | null }
type DiscussionNotifyMode = 'all' | 'selected' | 'none'

type ProjectBranding = {
  logoUrl?: string
  clientName?: string
  projectName?: string
}

interface WorkhubNotesSectionProps {
  hookInput: UseWorkhubDocEditorHandlersInput
  selectedDocument: WorkhubDocument | undefined
  scopedWorkspaceDocuments: WorkhubDocument[]
  selectedProjectId: string
  projectBrandingByProjectId: Record<string, ProjectBranding>
  taskContextTrail: WorkhubProject[]
  taskContextIconByProjectId: Record<string, string>
  selectedProjectPeriodLabel: string
  selectedProjectSubmissionTimeLabel: string
  onSelectProject: (projectId: string) => void
  busyKey: string
  memberByUid: Record<string, WorkhubMember>
  workspaceProjectById: Record<string, WorkhubProject>
  workhubShareCandidates: WorkhubMember[]
  isImageAttachmentUrl: (value: string) => boolean
  openAttachmentLightbox: (url: string) => void
  formatTime: (value: unknown) => string
  openDocumentCreateDialog: (projectId: string) => void
  onOpenDocumentSettings: (documentId: string) => void
  isMobileLayout: boolean
  discussionComments: WorkhubTaskComment[]
  onDiscussionSend: (text: string) => Promise<void>
  discussionBusy: boolean
  discussionNotifyMode: DiscussionNotifyMode
  discussionNotifyUids: string[]
  discussionNotifyCandidates: Array<{ uid: string; label: string }>
  onDiscussionNotifyModeChange: (mode: DiscussionNotifyMode) => void
  onDiscussionNotifyUidsChange: (uids: string[]) => void
  discussionEditingId: string
  discussionEditingText: string
  onDiscussionEditStart: (comment: WorkhubTaskComment) => void
  onDiscussionEditChange: (value: string) => void
  onDiscussionEditCancel: () => void
  onDiscussionEditSave: (comment: WorkhubTaskComment) => Promise<void>
  discussionEditBusyKey: string
  onDiscussionDelete?: (comment: WorkhubTaskComment) => Promise<void>
  discussionDeleteBusyKey?: string
  currentUid: string
  allWorkspaceIds: WorkspaceSummary[]
  allWorkspaceProjects: ProjectSummary[]
  isPrivilegedMember: boolean
}

export function WorkhubNotesSection({
  hookInput,
  selectedDocument,
  scopedWorkspaceDocuments,
  selectedProjectId,
  projectBrandingByProjectId,
  taskContextTrail,
  taskContextIconByProjectId,
  selectedProjectPeriodLabel,
  selectedProjectSubmissionTimeLabel,
  onSelectProject,
  busyKey,
  memberByUid,
  workspaceProjectById,
  workhubShareCandidates,
  isImageAttachmentUrl,
  openAttachmentLightbox,
  formatTime,
  openDocumentCreateDialog,
  onOpenDocumentSettings,
  isMobileLayout,
  discussionComments,
  onDiscussionSend,
  discussionBusy,
  discussionNotifyMode,
  discussionNotifyUids,
  discussionNotifyCandidates,
  onDiscussionNotifyModeChange,
  onDiscussionNotifyUidsChange,
  discussionEditingId,
  discussionEditingText,
  onDiscussionEditStart,
  onDiscussionEditChange,
  onDiscussionEditCancel,
  onDiscussionEditSave,
  discussionEditBusyKey,
  onDiscussionDelete,
  discussionDeleteBusyKey,
  currentUid,
  allWorkspaceIds,
  allWorkspaceProjects,
  isPrivilegedMember,
}: WorkhubNotesSectionProps) {
  const docEditor = useWorkhubDocEditorHandlers(hookInput)

  return (
    <WorkhubDocEditor
      {...docEditor}
      selectedDocument={selectedDocument}
      scopedWorkspaceDocuments={scopedWorkspaceDocuments}
      selectedProjectId={selectedProjectId}
      projectBrandingByProjectId={projectBrandingByProjectId}
      taskContextTrail={taskContextTrail}
      taskContextIconByProjectId={taskContextIconByProjectId}
      selectedProjectPeriodLabel={selectedProjectPeriodLabel}
      selectedProjectSubmissionTimeLabel={selectedProjectSubmissionTimeLabel}
      onSelectProject={onSelectProject}
      busyKey={busyKey}
      memberByUid={memberByUid}
      workspaceProjectById={workspaceProjectById}
      workhubShareCandidates={workhubShareCandidates}
      isImageAttachmentUrl={isImageAttachmentUrl}
      openAttachmentLightbox={openAttachmentLightbox}
      formatTime={formatTime}
      openDocumentCreateDialog={openDocumentCreateDialog}
      onOpenDocumentSettings={onOpenDocumentSettings}
      isMobileLayout={isMobileLayout}
      discussionComments={discussionComments}
      onDiscussionSend={onDiscussionSend}
      discussionBusy={discussionBusy}
      discussionNotifyMode={discussionNotifyMode}
      discussionNotifyUids={discussionNotifyUids}
      discussionNotifyCandidates={discussionNotifyCandidates}
      onDiscussionNotifyModeChange={onDiscussionNotifyModeChange}
      onDiscussionNotifyUidsChange={onDiscussionNotifyUidsChange}
      discussionEditingId={discussionEditingId}
      discussionEditingText={discussionEditingText}
      onDiscussionEditStart={onDiscussionEditStart}
      onDiscussionEditChange={onDiscussionEditChange}
      onDiscussionEditCancel={onDiscussionEditCancel}
      onDiscussionEditSave={onDiscussionEditSave}
      discussionEditBusyKey={discussionEditBusyKey}
      onDiscussionDelete={onDiscussionDelete}
      discussionDeleteBusyKey={discussionDeleteBusyKey}
      currentUid={currentUid}
      allWorkspaceIds={allWorkspaceIds}
      allWorkspaceProjects={allWorkspaceProjects}
      isPrivilegedMember={isPrivilegedMember}
    />
  )
}
