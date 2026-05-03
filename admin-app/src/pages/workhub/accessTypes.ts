export type WorkhubUserAccessMode = 'full' | 'workspace_based'

export interface WorkhubUserWorkspaceDraft {
  enabled: boolean
  level: 'full' | 'custom'
  invited?: boolean
}

export interface WorkhubUserAccessDraft {
  mode: WorkhubUserAccessMode
  workspaceById: Record<string, WorkhubUserWorkspaceDraft>
}
