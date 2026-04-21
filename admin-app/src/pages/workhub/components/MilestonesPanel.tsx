import { memo } from 'react'
import type { WorkhubMilestone, WorkhubMilestoneStatus } from '../../../lib/workhubRepo'
import type { MilestoneProgress } from '../hooks/useWorkhubMilestones'
import { MilestoneCard } from './MilestoneCard'

const STATUS_LABELS: Record<string, string> = {
  not_started: 'Not started',
  in_progress: 'In progress',
  at_risk: 'At risk',
  completed: 'Completed',
}

interface MilestonesPanelProps {
  milestones: WorkhubMilestone[]
  milestoneProgress: Record<string, MilestoneProgress>
  canEdit: boolean
  projectName?: string
  onAdd: () => void
  onEdit: (milestone: WorkhubMilestone) => void
  onDelete: (milestoneId: string) => void
  onStatusChange: (milestoneId: string, newStatus: WorkhubMilestoneStatus) => void
}

function openMilestonePrintWindow(
  milestones: WorkhubMilestone[],
  milestoneProgress: Record<string, MilestoneProgress>,
  projectName?: string,
) {
  const today = new Date().toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })
  const rows = milestones.map((ms) => {
    const prog = milestoneProgress[ms.id] ?? { total: 0, completed: 0, pct: 0 }
    const dueStr = ms.dueDate
      ? new Date(ms.dueDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
      : '—'
    const isOverdue = ms.dueDate && ms.status !== 'completed' && new Date(ms.dueDate) < new Date()
    const statusLabel = STATUS_LABELS[ms.status] ?? ms.status
    return `
      <tr>
        <td><span class="dot" style="background:${ms.color || '#6366f1'}"></span>${ms.name}</td>
        <td>${statusLabel}</td>
        <td class="${isOverdue ? 'overdue' : ''}">${dueStr}</td>
        <td>${prog.completed}/${prog.total}</td>
        <td>
          <div class="bar-wrap"><div class="bar-fill" style="width:${prog.pct}%;background:${ms.color || '#6366f1'}"></div></div>
          ${prog.pct}%
        </td>
        <td class="desc">${ms.description || ''}</td>
      </tr>`
  }).join('')

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Milestones${projectName ? ` — ${projectName}` : ''}</title>
  <style>
    body { font-family: system-ui, sans-serif; font-size: 12px; color: #111; margin: 24px; }
    h1 { font-size: 18px; margin: 0 0 4px; }
    .meta { color: #555; font-size: 11px; margin-bottom: 20px; }
    table { width: 100%; border-collapse: collapse; }
    th { background: #f4f4f5; text-align: left; padding: 6px 10px; font-size: 11px; border-bottom: 2px solid #ddd; }
    td { padding: 8px 10px; border-bottom: 1px solid #eee; vertical-align: middle; }
    .dot { display: inline-block; width: 8px; height: 8px; border-radius: 50%; margin-right: 6px; vertical-align: middle; }
    .bar-wrap { display: inline-block; width: 60px; height: 6px; background: #e5e7eb; border-radius: 3px; vertical-align: middle; margin-right: 4px; }
    .bar-fill { height: 100%; border-radius: 3px; }
    .overdue { color: #dc2626; font-weight: 600; }
    .desc { color: #555; font-size: 11px; max-width: 200px; }
    @media print { body { margin: 0; } }
  </style>
</head>
<body>
  <h1>Milestones${projectName ? ` — ${projectName}` : ''}</h1>
  <div class="meta">Printed on ${today} · ${milestones.length} milestone${milestones.length !== 1 ? 's' : ''}</div>
  <table>
    <thead>
      <tr>
        <th>Name</th>
        <th>Status</th>
        <th>Due date</th>
        <th>Tasks</th>
        <th>Progress</th>
        <th>Description</th>
      </tr>
    </thead>
    <tbody>${rows}</tbody>
  </table>
  <script>window.onload = function() { window.print(); }<\/script>
</body>
</html>`

  const win = window.open('', '_blank', 'width=900,height=650')
  if (win) {
    win.document.write(html)
    win.document.close()
  }
}

export const MilestonesPanel = memo(function MilestonesPanel({
  milestones,
  milestoneProgress,
  canEdit,
  projectName,
  onAdd,
  onEdit,
  onDelete,
  onStatusChange,
}: MilestonesPanelProps) {
  return (
    <div className="workhub-milestones-panel">
      <div className="workhub-milestones-panel-header">
        <span className="workhub-milestones-panel-title">
          Milestones
          {milestones.length > 0 && (
            <span className="workhub-milestones-count-badge">{milestones.length}</span>
          )}
        </span>
        <div className="workhub-milestones-panel-actions">
          {milestones.length > 0 && (
            <button
              type="button"
              className="workhub-btn workhub-btn-sm workhub-btn-ghost"
              title="Print milestone report"
              onClick={() => openMilestonePrintWindow(milestones, milestoneProgress, projectName)}
            >
              🖨 Print
            </button>
          )}
          {canEdit && (
            <button
              type="button"
              className="workhub-btn workhub-btn-sm workhub-btn-ghost"
              onClick={onAdd}
            >
              + Add
            </button>
          )}
        </div>
      </div>

      {milestones.length === 0 ? (
        <div className="workhub-empty-state workhub-milestones-empty">
          No milestones yet.
          {canEdit && (
            <>
              {' '}
              <button type="button" className="workhub-inline-link" onClick={onAdd}>
                Add the first one.
              </button>
            </>
          )}
        </div>
      ) : (
        <div className="workhub-milestones-list">
          {milestones.map((ms) => (
            <MilestoneCard
              key={ms.id}
              milestone={ms}
              progress={milestoneProgress[ms.id] ?? { total: 0, completed: 0, pct: 0 }}
              canEdit={canEdit}
              onEdit={onEdit}
              onDelete={onDelete}
              onStatusChange={onStatusChange}
            />
          ))}
        </div>
      )}
    </div>
  )
})
