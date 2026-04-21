import { useState, useEffect } from 'react'
import type { WorkhubMilestone, WorkhubMilestoneStatus, WorkhubProject } from '../../../lib/workhubRepo'
import type { MilestoneFormData } from '../hooks/useWorkhubMilestones'

const STATUS_OPTIONS: Array<{ value: WorkhubMilestoneStatus; label: string }> = [
  { value: 'not_started', label: 'Not started' },
  { value: 'in_progress', label: 'In progress' },
  { value: 'at_risk', label: 'At risk' },
  { value: 'completed', label: 'Completed' },
]

const DEFAULT_COLORS = [
  '#6366f1', '#0ea5e9', '#10b981', '#f59e0b',
  '#ef4444', '#8b5cf6', '#ec4899', '#64748b',
]

interface MilestoneCreateEditDialogProps {
  open: boolean
  milestone: WorkhubMilestone | null
  project: WorkhubProject | null
  onSave: (formData: MilestoneFormData) => void
  onClose: () => void
}

export function MilestoneCreateEditDialog({
  open,
  milestone,
  project,
  onSave,
  onClose,
}: MilestoneCreateEditDialogProps) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [status, setStatus] = useState<WorkhubMilestoneStatus>('not_started')
  const [color, setColor] = useState(DEFAULT_COLORS[0])
  const [nameError, setNameError] = useState('')
  const [dateError, setDateError] = useState('')

  useEffect(() => {
    if (open) {
      setName(milestone?.name ?? '')
      setDescription(milestone?.description ?? '')
      setDueDate(milestone?.dueDate ?? '')
      setStatus(milestone?.status ?? 'not_started')
      setColor(milestone?.color || project?.color || DEFAULT_COLORS[0])
      setNameError('')
      setDateError('')
    }
  }, [open, milestone, project])

  if (!open) return null

  function validate(): boolean {
    let valid = true
    if (!name.trim()) {
      setNameError('Name is required')
      valid = false
    } else {
      setNameError('')
    }
    if (dueDate && project?.projectStartDate && dueDate < project.projectStartDate) {
      setDateError('Due date cannot be before the project start date')
      valid = false
    } else {
      setDateError('')
    }
    return valid
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!validate()) return
    onSave({ name: name.trim(), description: description.trim(), dueDate, status, color })
  }

  return (
    <div className="workhub-modal-backdrop" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <div
        className="workhub-modal workhub-milestone-dialog"
        onMouseDown={(e) => e.stopPropagation()}
        style={{ maxWidth: 440, width: '100%' }}
      >
        <div className="workhub-modal-header">
          <h2 className="workhub-modal-title">
            {milestone ? 'Edit milestone' : 'New milestone'}
          </h2>
          <button type="button" className="workhub-modal-close" onClick={onClose} aria-label="Close">✕</button>
        </div>

        <form onSubmit={handleSubmit} className="workhub-modal-body" noValidate>
          <div className="workhub-form-field">
            <label className="workhub-field-label">Name *</label>
            <input
              className={`workhub-input${nameError ? ' is-error' : ''}`}
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Phase 1 delivery"
              autoFocus
            />
            {nameError && <span className="workhub-field-error">{nameError}</span>}
          </div>

          <div className="workhub-form-field">
            <label className="workhub-field-label">Description</label>
            <textarea
              className="workhub-input workhub-textarea"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional description or acceptance criteria"
              rows={3}
            />
          </div>

          <div className="workhub-form-row-2col">
            <div className="workhub-form-field">
              <label className="workhub-field-label">Due date</label>
              <input
                className={`workhub-input${dateError ? ' is-error' : ''}`}
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
              />
              {dateError && <span className="workhub-field-error">{dateError}</span>}
            </div>

            <div className="workhub-form-field">
              <label className="workhub-field-label">Status</label>
              <select
                className="workhub-input workhub-select"
                value={status}
                onChange={(e) => setStatus(e.target.value as WorkhubMilestoneStatus)}
              >
                {STATUS_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="workhub-form-field">
            <label className="workhub-field-label">Color</label>
            <div className="workhub-milestone-color-row">
              {DEFAULT_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  className={`workhub-milestone-color-swatch${color === c ? ' is-active' : ''}`}
                  style={{ background: c }}
                  onClick={() => setColor(c)}
                  aria-label={c}
                />
              ))}
            </div>
          </div>

          <div className="workhub-modal-actions">
            <button type="button" className="workhub-btn workhub-btn-ghost" onClick={onClose}>Cancel</button>
            <button type="submit" className="workhub-btn workhub-btn-primary">
              {milestone ? 'Save changes' : 'Create milestone'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
