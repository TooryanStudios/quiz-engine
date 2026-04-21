import { memo } from 'react'
import type { WorkhubMilestone, WorkhubMilestoneStatus } from '../../../lib/workhubRepo'
import type { MilestoneProgress } from '../hooks/useWorkhubMilestones'

const STATUS_LABELS: Record<string, string> = {
  not_started: 'Not started',
  in_progress: 'In progress',
  at_risk: 'At risk',
  completed: 'Completed',
}

const STATUS_COLORS: Record<string, string> = {
  not_started: '#94a3b8',
  in_progress: '#0ea5e9',
  at_risk: '#f59e0b',
  completed: '#10b981',
}

interface MilestoneCardProps {
  milestone: WorkhubMilestone
  progress: MilestoneProgress
  canEdit: boolean
  onEdit: (milestone: WorkhubMilestone) => void
  onDelete: (milestoneId: string) => void
  onStatusChange: (milestoneId: string, newStatus: WorkhubMilestoneStatus) => void
}

function formatDueDate(dueDate: string): { label: string; isOverdue: boolean } {
  if (!dueDate) return { label: '', isOverdue: false }
  const due = new Date(dueDate)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const isOverdue = due < today
  const label = due.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
  return { label, isOverdue }
}

export const MilestoneCard = memo(function MilestoneCard({
  milestone,
  progress,
  canEdit,
  onEdit,
  onDelete,
  onStatusChange,
}: MilestoneCardProps) {
  const { label: dueDateLabel, isOverdue } = formatDueDate(milestone.dueDate || '')
  const dotColor = milestone.color || '#6366f1'
  const statusColor = STATUS_COLORS[milestone.status] ?? '#94a3b8'
  const isCompleted = milestone.status === 'completed'
  const isAtRisk = milestone.status === 'at_risk' || (!isCompleted && isOverdue)

  return (
    <div className={`workhub-milestone-card${isCompleted ? ' is-completed' : ''}${isAtRisk ? ' is-at-risk' : ''}`}>
      <div className="workhub-milestone-card-header">
        <span className="workhub-milestone-dot" style={{ background: dotColor }} />
        <span className="workhub-milestone-name">{milestone.name}</span>
        <span
          className="workhub-milestone-status-badge"
          style={{ color: statusColor, borderColor: statusColor }}
        >
          {STATUS_LABELS[milestone.status] ?? milestone.status}
        </span>
        {canEdit && (
          <div className="workhub-milestone-actions">
            <button
              type="button"
              className="workhub-icon-btn"
              title="Edit milestone"
              onClick={() => onEdit(milestone)}
            >
              ✎
            </button>
            <button
              type="button"
              className="workhub-icon-btn workhub-icon-btn-danger"
              title="Delete milestone"
              onClick={() => onDelete(milestone.id)}
            >
              ✕
            </button>
          </div>
        )}
      </div>

      {milestone.description && (
        <p className="workhub-milestone-description">{milestone.description}</p>
      )}

      <div className="workhub-milestone-meta">
        {dueDateLabel && (
          <span className={`workhub-milestone-due${isOverdue && !isCompleted ? ' is-overdue' : ''}`}>
            {isOverdue && !isCompleted ? '⚠ Overdue · ' : ''}Due {dueDateLabel}
          </span>
        )}
        {isAtRisk && !isOverdue && (
          <span className="workhub-milestone-at-risk-badge">At risk</span>
        )}
      </div>

      <div className="workhub-milestone-progress">
        <div className="workhub-milestone-progress-bar-track">
          <div
            className="workhub-milestone-progress-bar-fill"
            style={{ width: `${progress.pct}%`, background: dotColor }}
          />
        </div>
        <span className="workhub-milestone-progress-label">
          {progress.completed}/{progress.total} tasks · {progress.pct}%
        </span>
      </div>

      {canEdit && (
        <div className="workhub-milestone-status-actions">
          {milestone.status === 'not_started' && (
            <button
              type="button"
              className="workhub-milestone-action-btn is-activate"
              onClick={() => onStatusChange(milestone.id, 'in_progress')}
              title="Activate this milestone"
            >
              ▶ Activate
            </button>
          )}
          {(milestone.status === 'in_progress' || milestone.status === 'at_risk') && (
            <>
              <button
                type="button"
                className="workhub-milestone-action-btn is-complete"
                onClick={() => onStatusChange(milestone.id, 'completed')}
                title="Mark as completed"
              >
                ✓ Complete
              </button>
              {milestone.status === 'in_progress' && (
                <button
                  type="button"
                  className="workhub-milestone-action-btn is-risk"
                  onClick={() => onStatusChange(milestone.id, 'at_risk')}
                  title="Flag as at risk"
                >
                  ⚠ At risk
                </button>
              )}
              {milestone.status === 'at_risk' && (
                <button
                  type="button"
                  className="workhub-milestone-action-btn is-resume"
                  onClick={() => onStatusChange(milestone.id, 'in_progress')}
                  title="Resume — back to in progress"
                >
                  ↩ Resume
                </button>
              )}
            </>
          )}
          {milestone.status === 'completed' && (
            <button
              type="button"
              className="workhub-milestone-action-btn is-reopen"
              onClick={() => onStatusChange(milestone.id, 'in_progress')}
              title="Reopen this milestone"
            >
              ↩ Reopen
            </button>
          )}
        </div>
      )}
    </div>
  )
})
