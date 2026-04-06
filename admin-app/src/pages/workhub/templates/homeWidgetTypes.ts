export type WorkhubHomeWidgetTone = 'neutral' | 'good' | 'warn' | 'danger'

export interface WorkhubHomeWidget {
  id: string
  title: string
  value: string
  detail: string
  tone?: WorkhubHomeWidgetTone
}

export interface WorkhubHomeWidgetMetrics {
  totalTasks: number
  activeTasks: number
  inProgressTasks: number
  urgentTasks: number
  completionRate: number
  projectsCount: number
  restrictedProjectsCount: number
  assignedMembersCount: number
  workspaceClientCount: number
  unreadNotifications: number
  pendingMembersCount: number
  upcomingDeadlineProjectsCount: number
  nearTermDeadlineProjectsCount: number
  overdueProjectsCount: number
  recentActivityCount: number
  taskStatusCounts: Record<string, number>
  taskStatusLabels: Record<string, string>
}