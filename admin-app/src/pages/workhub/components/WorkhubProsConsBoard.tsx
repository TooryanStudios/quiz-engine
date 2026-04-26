import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type Dispatch,
  type SetStateAction,
} from 'react'
import {
  deleteWorkhubMoodBoard,
  type WorkhubMoodBoard,
  updateWorkhubMoodBoardProsCons,
  updateWorkhubMoodBoardTitle,
} from '../../../lib/workhubRepo'
import {
  applyWorkhubProsConsTemplate,
  buildWorkhubProsConsPersistencePayload,
  evaluateWorkhubProsCons,
  listWorkhubProsConsTemplates,
  resolveWorkhubProsConsTemplate,
  type WorkhubMoodBoardProsCons,
  type WorkhubProsConsCustomFieldDefinition,
  type WorkhubProsConsCustomFieldType,
  type WorkhubProsConsItem,
  type WorkhubProsConsSide,
} from '../../../lib/workhubProsCons'
import { useDetailRailMode } from '../hooks/useDetailRailMode'
import './WorkhubProsConsBoard.css'

type WorkhubSection = 'users' | 'tasks' | 'dashboard' | 'notes' | 'clients' | 'home' | 'moodboard'

type FieldDraft = {
  label: string
  type: WorkhubProsConsCustomFieldType
  appliesTo: 'pros' | 'cons' | 'both'
  options: string
}

type GroupDraft = {
  label: string
  color: string
}

type Recommendation = {
  title: string
  detail: string
  tone: 'positive' | 'neutral' | 'negative'
}

interface WorkhubProsConsBoardProps {
  activeMoodBoard: WorkhubMoodBoard
  setSelectedMoodBoardId: (id: string) => void
  setActiveSection: Dispatch<SetStateAction<WorkhubSection>>
  showToast: (opts: { type: 'success' | 'error' | 'warning' | 'info'; message: string }) => void
}

const DEFAULT_DETAIL_WIDTH = 360
const DETAIL_WIDTH_MIN = 280
const DETAIL_WIDTH_MAX = 540

type ComparisonSection = {
  id: string
  label: string
  isDefault: boolean
}

function createEmptyFieldDraft(): FieldDraft {
  return {
    label: '',
    type: 'text',
    appliesTo: 'both',
    options: '',
  }
}

function createEmptyGroupDraft(): GroupDraft {
  return {
    label: '',
    color: '',
  }
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

function toNumber(value: unknown, fallback: number): number {
  const parsed = typeof value === 'number'
    ? value
    : (typeof value === 'string' ? Number(value) : Number.NaN)
  return Number.isFinite(parsed) ? parsed : fallback
}

function createEntryId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  return `pc-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

function recommendationToneToClass(tone: Recommendation['tone']): string {
  if (tone === 'positive') return 'is-positive'
  if (tone === 'negative') return 'is-negative'
  return 'is-neutral'
}

export function WorkhubProsConsBoard({
  activeMoodBoard,
  setSelectedMoodBoardId,
  setActiveSection,
  showToast,
}: WorkhubProsConsBoardProps) {
  const [fieldDraft, setFieldDraft] = useState<FieldDraft>(() => createEmptyFieldDraft())
  const [groupDraft, setGroupDraft] = useState<GroupDraft>(() => createEmptyGroupDraft())
  const [sectionDraft, setSectionDraft] = useState('')
  const [isEditMode, setIsEditMode] = useState(false)
  const [inlineNewTitles, setInlineNewTitles] = useState<Record<string, string>>({})
  const [selectedTemplateId, setSelectedTemplateId] = useState('blank')
  const [rowTitleDrafts, setRowTitleDrafts] = useState<Record<string, string>>({})
  const [editingRowKey, setEditingRowKey] = useState<string | null>(null)
  const [detailPanelWidth, setDetailPanelWidth] = useState(() => {
    if (typeof window === 'undefined') return DEFAULT_DETAIL_WIDTH
    const stored = Number(window.localStorage.getItem('workhub:proscons:detail-width') || DEFAULT_DETAIL_WIDTH)
    if (!Number.isFinite(stored)) return DEFAULT_DETAIL_WIDTH
    return clamp(stored, DETAIL_WIDTH_MIN, DETAIL_WIDTH_MAX)
  })
  const detailPanelRef = useRef<HTMLElement | null>(null)
  const detailResizeDragRef = useRef<{ startX: number; startWidth: number } | null>(null)
  const {
    mode: detailRailMode,
    setExpanded: setDetailRailExpanded,
    setHidden: setDetailRailHidden,
    toggleCompact: toggleDetailRailCompact,
  } = useDetailRailMode('workhub:proscons:detail-rail-mode', true, 'expanded')

  const templatePresets = useMemo(() => listWorkhubProsConsTemplates(), [])
  const [prosConsData, setProsConsData] = useState<WorkhubMoodBoardProsCons>(
    () => buildWorkhubProsConsPersistencePayload(activeMoodBoard.prosCons),
  )
  const prosConsDataRef = useRef<WorkhubMoodBoardProsCons>(prosConsData)
  const persistVersionRef = useRef(0)

  useEffect(() => {
    const normalized = buildWorkhubProsConsPersistencePayload(activeMoodBoard.prosCons)
    prosConsDataRef.current = normalized
    setProsConsData(normalized)
  }, [activeMoodBoard.id, activeMoodBoard.prosCons])

  useEffect(() => {
    prosConsDataRef.current = prosConsData
  }, [prosConsData])

  useEffect(() => {
    setFieldDraft(createEmptyFieldDraft())
    setGroupDraft(createEmptyGroupDraft())
    setSectionDraft('')
    setInlineNewTitles({})
    setRowTitleDrafts({})
    setEditingRowKey(null)
    setSelectedTemplateId(prosConsData.templateId || 'blank')
  }, [activeMoodBoard.id])

  useEffect(() => {
    setSelectedTemplateId(prosConsData.templateId || 'blank')
  }, [prosConsData.templateId])

  useEffect(() => {
    if (!detailPanelRef.current) return
    if (detailRailMode === 'expanded') {
      detailPanelRef.current.style.width = `${detailPanelWidth}px`
      return
    }
    detailPanelRef.current.style.width = ''
  }, [detailPanelWidth, detailRailMode])

  const persistProsCons = useCallback((next: WorkhubMoodBoardProsCons) => {
    const payload = buildWorkhubProsConsPersistencePayload(next)
    const previous = prosConsDataRef.current
    const nextVersion = persistVersionRef.current + 1
    persistVersionRef.current = nextVersion

    prosConsDataRef.current = payload
    setProsConsData(payload)

    void updateWorkhubMoodBoardProsCons(activeMoodBoard.id, payload).catch((error) => {
      console.error('Failed to update pros/cons board', error)
      if (nextVersion === persistVersionRef.current) {
        prosConsDataRef.current = previous
        setProsConsData(previous)
      }
      showToast({ type: 'error', message: 'Could not save pros & cons changes. Please retry.' })
    })
  }, [activeMoodBoard.id, showToast])

  const [newFixedPropDraft, setNewFixedPropDraft] = useState('')

  const toggleFixedProperty = useCallback((section: ComparisonSection, propName: string, state: 'pros' | 'cons' | 'neutral') => {
    const isSectionItem = (item: WorkhubProsConsItem) => (
      item.title === propName && (section.isDefault ? !item.groupId : item.groupId === section.id)
    )
    const nextPros = prosConsData.pros.filter((item) => !isSectionItem(item))
    const nextCons = prosConsData.cons.filter((item) => !isSectionItem(item))
    const groupId = section.isDefault ? undefined : section.id

    if (state === 'pros') {
      nextPros.push({ id: createEntryId(), title: propName, weight: 3, impact: 5, groupId })
    }
    if (state === 'cons') {
      nextCons.push({ id: createEntryId(), title: propName, weight: 3, impact: 5, groupId })
    }

    persistProsCons({ ...prosConsData, pros: nextPros, cons: nextCons })
  }, [persistProsCons, prosConsData])

  const addFixedProperty = useCallback((name: string) => {
    const prop = name.trim()
    if (!prop) return
    const hasExisting = (prosConsData.fixedProperties || []).some((existing) => existing.toLowerCase() === prop.toLowerCase())
    if (hasExisting) return

    persistProsCons({ ...prosConsData, fixedProperties: [...(prosConsData.fixedProperties || []), prop] })
  }, [persistProsCons, prosConsData])

  const removeFixedProperty = useCallback((name: string) => {
    const nextProps = (prosConsData.fixedProperties || []).filter((prop) => prop !== name)
    const nextPros = prosConsData.pros.filter((item) => item.title !== name)
    const nextCons = prosConsData.cons.filter((item) => item.title !== name)

    persistProsCons({ ...prosConsData, fixedProperties: nextProps, pros: nextPros, cons: nextCons })
  }, [persistProsCons, prosConsData])

  const formatAmount = useCallback((value: number) => {
    if (!Number.isFinite(value)) return '-'
    const currency = (prosConsData.currency || 'USD').trim().toUpperCase()
    try {
      return new Intl.NumberFormat(undefined, {
        style: 'currency',
        currency,
        maximumFractionDigits: 2,
      }).format(value)
    } catch {
      return `${value.toFixed(2)} ${currency}`
    }
  }, [prosConsData.currency])

  const analytics = useMemo(() => evaluateWorkhubProsCons(prosConsData), [prosConsData])

  const suggestions = useMemo(() => {
    const list: string[] = []

    if (!prosConsData.topic?.trim()) {
      list.push('Define the decision topic clearly so all entries are evaluated against one objective.')
    }
    if (prosConsData.pros.length < 3) {
      list.push('Add more upside evidence. At least three concrete benefits improves recommendation quality.')
    }
    if (prosConsData.cons.length < 3) {
      list.push('Capture additional constraints such as timeline, legal, budget, and operational risks.')
    }
    if (Math.abs(analytics.prosPercent - analytics.consPercent) <= 6) {
      list.push('The balance is close. Add one high-impact pro and one high-impact con to stress-test the decision.')
    }
    const costTagged = [...prosConsData.pros, ...prosConsData.cons].filter((item) => Number.isFinite(toNumber(item.amount, Number.NaN))).length
    if (costTagged < 2) {
      list.push('Add monetary values to major points so the net-value estimate reflects real budget pressure.')
    }

    if (!prosConsData.customFields?.length) {
      list.push('Add custom fields (for example confidence, owner, due date proxy) for richer comparison context.')
    }

    if (!prosConsData.groups?.length) {
      list.push('Add groups (for example cost, delivery, risk) to make cluster-level tradeoffs easier to scan.')
    }

    if (list.length === 0) {
      list.push('Your board is well-balanced. Keep reviewing assumptions as new data arrives.')
    }

    return list
  }, [
    analytics.consPercent,
    analytics.prosPercent,
    prosConsData.cons,
    prosConsData.customFields,
    prosConsData.groups,
    prosConsData.pros,
    prosConsData.topic,
  ])

  const updateScoring = useCallback((patch: Partial<NonNullable<WorkhubMoodBoardProsCons['scoring']>>) => {
    persistProsCons({
      ...prosConsData,
      scoring: {
        ...(prosConsData.scoring || {}),
        ...patch,
      },
    })
  }, [persistProsCons, prosConsData])

  const addGroup = useCallback(() => {
    const nextLabel = groupDraft.label.trim()
    if (!nextLabel) {
      showToast({ type: 'warning', message: 'Group label is required.' })
      return
    }

    const nextGroups = [...(prosConsData.groups || []), {
      id: `group_${Date.now()}`,
      label: nextLabel,
      color: groupDraft.color.trim() || undefined,
    }]

    persistProsCons({
      ...prosConsData,
      groups: nextGroups,
      groupBy: 'group',
    })
    setGroupDraft(createEmptyGroupDraft())
  }, [groupDraft.color, groupDraft.label, persistProsCons, prosConsData, showToast])

  const removeGroup = useCallback((groupId: string) => {
    const nextGroups = (prosConsData.groups || []).filter((group) => group.id !== groupId)
    const clearGroup = (item: WorkhubProsConsItem): WorkhubProsConsItem => (
      item.groupId === groupId ? { ...item, groupId: undefined } : item
    )

    persistProsCons({
      ...prosConsData,
      groups: nextGroups,
      pros: prosConsData.pros.map(clearGroup),
      cons: prosConsData.cons.map(clearGroup),
      groupBy: nextGroups.length > 0 ? prosConsData.groupBy : 'none',
    })
  }, [persistProsCons, prosConsData])

  const addCustomField = useCallback(() => {
    const nextLabel = fieldDraft.label.trim()
    if (!nextLabel) {
      showToast({ type: 'warning', message: 'Custom field label is required.' })
      return
    }

    const nextField: WorkhubProsConsCustomFieldDefinition = {
      id: `field_${Date.now()}`,
      label: nextLabel,
      type: fieldDraft.type,
      appliesTo: fieldDraft.appliesTo,
      options: fieldDraft.type === 'select'
        ? fieldDraft.options.split(',').map((entry) => entry.trim()).filter((entry) => entry.length > 0)
        : undefined,
    }

    persistProsCons({
      ...prosConsData,
      customFields: [...(prosConsData.customFields || []), nextField],
    })
    setFieldDraft(createEmptyFieldDraft())
  }, [fieldDraft, persistProsCons, prosConsData, showToast])

  const removeCustomField = useCallback((fieldId: string) => {
    const nextFields = (prosConsData.customFields || []).filter((field) => field.id !== fieldId)

    const clearItemField = (item: WorkhubProsConsItem): WorkhubProsConsItem => {
      const customValues = { ...(item.customValues || {}) }
      delete customValues[fieldId]
      return {
        ...item,
        customValues: Object.keys(customValues).length > 0 ? customValues : undefined,
      }
    }

    persistProsCons({
      ...prosConsData,
      customFields: nextFields,
      pros: prosConsData.pros.map(clearItemField),
      cons: prosConsData.cons.map(clearItemField),
    })
  }, [persistProsCons, prosConsData])

  const applyTemplate = useCallback(() => {
    const next = applyWorkhubProsConsTemplate(prosConsData, selectedTemplateId)
    persistProsCons(next)
    setInlineNewTitles({})
    setRowTitleDrafts({})
    setEditingRowKey(null)

    const templateLabel = resolveWorkhubProsConsTemplate(selectedTemplateId).label
    showToast({ type: 'success', message: `${templateLabel} template applied.` })
  }, [persistProsCons, prosConsData, selectedTemplateId, showToast])

  const comparisonSections = useMemo<ComparisonSection[]>(() => {
    const groups = prosConsData.groups || []
    if (!groups.length) {
      return [{
        id: 'default',
        label: (prosConsData.topic || '').trim() || 'Option 1',
        isDefault: true,
      }]
    }
    return groups.map((group) => ({
      id: group.id,
      label: group.label,
      isDefault: false,
    }))
  }, [prosConsData.groups, prosConsData.topic])

  const getSectionItems = useCallback((side: WorkhubProsConsSide, sectionId: string, isDefault: boolean) => {
    return prosConsData[side].filter((item) => {
      if (isDefault) return !item.groupId
      return item.groupId === sectionId
    })
  }, [prosConsData])

  const sectionModels = useMemo(() => {
    return comparisonSections.map((section) => {
      const pros = getSectionItems('pros', section.id, section.isDefault)
      const cons = getSectionItems('cons', section.id, section.isDefault)
      const analyticsForSection = evaluateWorkhubProsCons({
        ...prosConsData,
        pros,
        cons,
      })
      const sectionScore = analyticsForSection.prosScore - analyticsForSection.consScore

      return {
        section,
        pros,
        cons,
        analytics: analyticsForSection,
        sectionScore,
      }
    })
  }, [comparisonSections, getSectionItems, prosConsData])

  const bestSectionId = useMemo(() => {
    if (!sectionModels.length) return ''
    return sectionModels.reduce((best, current) => {
      if (!best) return current
      return current.sectionScore > best.sectionScore ? current : best
    }, sectionModels[0])?.section.id || ''
  }, [sectionModels])

  const signalSectionModels = useMemo(() => {
    if (isEditMode) return sectionModels
    return [...sectionModels].sort((a, b) => b.sectionScore - a.sectionScore)
  }, [isEditMode, sectionModels])

  const rankedSectionModels = useMemo(() => {
    return [...sectionModels].sort((a, b) => b.sectionScore - a.sectionScore)
  }, [sectionModels])

  const displayedSectionModels = useMemo(() => {
    return isEditMode ? sectionModels : rankedSectionModels
  }, [isEditMode, rankedSectionModels, sectionModels])

  const maxSignalScoreMagnitude = useMemo(() => {
    return signalSectionModels.reduce((max, model) => Math.max(max, Math.abs(model.sectionScore)), 1)
  }, [signalSectionModels])

  const addSection = useCallback(() => {
    const current = prosConsData.groups || []
    if (current.length >= 4) {
      showToast({ type: 'info', message: 'Maximum 4 comparison sections for now.' })
      return
    }

    const nextLabel = sectionDraft.trim() || `Option ${current.length + 1}`
    const nextGroup = {
      id: `group_${Date.now()}`,
      label: nextLabel,
    }

    persistProsCons({
      ...prosConsData,
      groups: [...current, nextGroup],
      groupBy: 'group',
    })
    setSectionDraft('')
  }, [persistProsCons, prosConsData, sectionDraft, showToast])

  const renameSection = useCallback((section: ComparisonSection, nextLabelRaw: string) => {
    const nextLabel = nextLabelRaw.trim()
    if (!nextLabel) return

    if (section.isDefault) {
      persistProsCons({
        ...prosConsData,
        topic: nextLabel,
      })
      return
    }

    const nextGroups = (prosConsData.groups || []).map((group) => (
      group.id === section.id ? { ...group, label: nextLabel } : group
    ))

    persistProsCons({
      ...prosConsData,
      groups: nextGroups,
    })
  }, [persistProsCons, prosConsData])

  const addInlineItem = useCallback((side: WorkhubProsConsSide, section: ComparisonSection) => {
    const key = `${section.id}:${side}`
    const title = (inlineNewTitles[key] || '').trim()
    if (!title) return

    const item: WorkhubProsConsItem = {
      id: createEntryId(),
      title,
      weight: 3,
      impact: 5,
      groupId: section.isDefault ? undefined : section.id,
    }

    persistProsCons({
      ...prosConsData,
      [side]: [...prosConsData[side], item],
    })

    setInlineNewTitles((current) => ({
      ...current,
      [key]: '',
    }))
  }, [inlineNewTitles, persistProsCons, prosConsData])

  const removeItem = useCallback((side: WorkhubProsConsSide, itemId: string) => {
    const nextItems = prosConsData[side].filter((item) => item.id !== itemId)
    persistProsCons({
      ...prosConsData,
      [side]: nextItems,
    })
  }, [persistProsCons, prosConsData])

  const getRowDraftKey = useCallback((side: WorkhubProsConsSide, itemId: string) => `${side}:${itemId}`, [])

  const beginTitleEdit = useCallback((side: WorkhubProsConsSide, itemId: string, currentTitle: string) => {
    const key = getRowDraftKey(side, itemId)
    setRowTitleDrafts((current) => {
      if (current[key] !== undefined) return current
      return {
        ...current,
        [key]: currentTitle,
      }
    })
    setEditingRowKey(key)
  }, [getRowDraftKey])

  const setTitleDraft = useCallback((side: WorkhubProsConsSide, itemId: string, value: string) => {
    const key = getRowDraftKey(side, itemId)
    setRowTitleDrafts((current) => ({
      ...current,
      [key]: value,
    }))
  }, [getRowDraftKey])

  const saveTitleEdit = useCallback((side: WorkhubProsConsSide, itemId: string) => {
    const key = getRowDraftKey(side, itemId)
    const draft = (rowTitleDrafts[key] || '').trim()
    if (!draft) {
      showToast({ type: 'warning', message: 'Title cannot be empty.' })
      return
    }

    const nextItems = prosConsData[side].map((item) => {
      if (item.id !== itemId) return item
      return draft === item.title ? item : { ...item, title: draft }
    })

    persistProsCons({
      ...prosConsData,
      [side]: nextItems,
    })

    setRowTitleDrafts((current) => {
      const next = { ...current }
      delete next[key]
      return next
    })
    setEditingRowKey((current) => (current === key ? null : current))
  }, [getRowDraftKey, persistProsCons, prosConsData, rowTitleDrafts, showToast])

  const confirmRemoveItem = useCallback((side: WorkhubProsConsSide, itemId: string, title: string) => {
    const shouldRemove = typeof window === 'undefined'
      ? true
      : window.confirm(`Remove "${title}" from ${side === 'pros' ? 'pros' : 'cons'}?`)
    if (!shouldRemove) return

    setEditingRowKey((current) => (current === getRowDraftKey(side, itemId) ? null : current))
    removeItem(side, itemId)
  }, [getRowDraftKey, removeItem])

  const handleDeleteBoard = useCallback(() => {
    const shouldDelete = typeof window === 'undefined'
      ? true
      : window.confirm('Delete this Pros & Cons board? This cannot be undone.')
    if (!shouldDelete) return

    void (async () => {
      await deleteWorkhubMoodBoard(activeMoodBoard.id)
      setSelectedMoodBoardId('')
      setActiveSection('dashboard')
    })()
  }, [activeMoodBoard.id, setActiveSection, setSelectedMoodBoardId])

  const handleDetailResizePointerDown = useCallback((event: ReactPointerEvent<HTMLDivElement>) => {
    if (detailRailMode !== 'expanded') return
    event.preventDefault()
    detailResizeDragRef.current = { startX: event.clientX, startWidth: detailPanelWidth }
    event.currentTarget.setPointerCapture(event.pointerId)
  }, [detailPanelWidth, detailRailMode])

  const handleDetailResizePointerMove = useCallback((event: ReactPointerEvent<HTMLDivElement>) => {
    if (!detailResizeDragRef.current || !detailPanelRef.current || detailRailMode !== 'expanded') return
    const dx = detailResizeDragRef.current.startX - event.clientX
    const nextWidth = clamp(detailResizeDragRef.current.startWidth + dx, DETAIL_WIDTH_MIN, DETAIL_WIDTH_MAX)
    setDetailPanelWidth(nextWidth)
  }, [detailRailMode])

  const handleDetailResizePointerUp = useCallback((event: ReactPointerEvent<HTMLDivElement>) => {
    if (!detailResizeDragRef.current) return
    const dx = detailResizeDragRef.current.startX - event.clientX
    const nextWidth = clamp(detailResizeDragRef.current.startWidth + dx, DETAIL_WIDTH_MIN, DETAIL_WIDTH_MAX)
    setDetailPanelWidth(nextWidth)
    if (typeof window !== 'undefined') {
      window.localStorage.setItem('workhub:proscons:detail-width', String(nextWidth))
    }
    detailResizeDragRef.current = null
  }, [])

  return (
    <main className="workhub-section-stack">
      <section className="workhub-panel workhub-proscons-shell">
        <header className="workhub-proscons-header">
          <div className="workhub-proscons-title-wrap">
            <label htmlFor="workhub-proscons-board-title">Board title</label>
            <input
              id="workhub-proscons-board-title"
              className="workhub-proscons-title-input"
              value={activeMoodBoard.title || ''}
              onChange={(event) => {
                void updateWorkhubMoodBoardTitle(activeMoodBoard.id, event.target.value)
              }}
              placeholder="Pros & Cons board title"
            />
          </div>
          <div className="workhub-proscons-header-actions">
            <button
              type="button"
              className={`workhub-proscons-btn is-outline ${prosConsData.fixedPropertiesMode ? 'is-active' : ''}`}
              onClick={() => persistProsCons({ ...prosConsData, fixedPropertiesMode: !prosConsData.fixedPropertiesMode })}
            >
              {prosConsData.fixedPropertiesMode ? 'Switch to Standard Lists' : 'Switch to Fixed Parameters'}
            </button>
            <button
              type="button"
              className="workhub-proscons-btn"
              onClick={() => {
                const url = typeof window === 'undefined' ? '' : window.location.href
                if (!url) return
                if (navigator.clipboard?.writeText) {
                  void navigator.clipboard.writeText(url)
                  showToast({ type: 'success', message: 'Board link copied.' })
                  return
                }
                showToast({ type: 'info', message: 'Copy this URL from the address bar.' })
              }}
            >
              Share
            </button>
            <button type="button" className="workhub-proscons-btn is-danger" onClick={handleDeleteBoard}>Delete</button>
          </div>
        </header>

        <div className="workhub-proscons-layout">
          <div className="workhub-proscons-main">
            {/* Verdict banner */}
            <div className={`workhub-proscons-verdict ${recommendationToneToClass(analytics.recommendation.tone)}`}>
              <div className="workhub-proscons-verdict-body">
                <strong className="workhub-proscons-verdict-label">{analytics.recommendation.title}</strong>
                <span className="workhub-proscons-verdict-detail">{analytics.recommendation.detail}</span>
              </div>
              <div className="workhub-proscons-verdict-metrics">
                <div className="workhub-proscons-verdict-scores">
                  <span className="is-pro">Pros {analytics.prosScore.toFixed(1)}</span>
                  <span className="is-sep">vs</span>
                  <span className="is-con">Cons {analytics.consScore.toFixed(1)}</span>
                  {Number.isFinite(analytics.netAmount) ? (
                    <span className="is-net">&nbsp;· Net {formatAmount(analytics.netAmount)}</span>
                  ) : null}
                </div>
                <div className="workhub-proscons-verdict-track" role="presentation">
                  <span className="is-pro" style={{ width: `${analytics.prosPercent}%` }} />
                  <span className="is-con" style={{ width: `${analytics.consPercent}%` }} />
                </div>
                <div className="workhub-proscons-verdict-pct">
                  <span>{analytics.prosPercent}% pros</span>
                  <span>{analytics.consPercent}% cons</span>
                </div>
              </div>
            </div>

            {/* Overview: visualization + multi-section comparison */}
            <div className={`workhub-proscons-overview ${isEditMode ? 'is-edit-mode' : 'is-results-mode'}`}>
                            <div className="workhub-proscons-viz-col">
                {isEditMode && prosConsData.fixedPropertiesMode ? (
                  <div className="workhub-proscons-matrix-editor">
                    <div className="workhub-proscons-ranking-head">Comparison Parameters</div>
                    <ul className="workhub-proscons-matrix-editor-list">
                      {(prosConsData.fixedProperties || []).map(propName => (
                        <li key={propName} className="workhub-proscons-matrix-editor-item">
                          <span>{propName}</span>
                          <button type="button" className="workhub-proscons-btn is-danger is-icon" onClick={() => removeFixedProperty(propName)}>×</button>
                        </li>
                      ))}
                    </ul>
                    <input 
                      className="workhub-proscons-row-title-input" 
                      placeholder="+ add parameter" 
                      value={newFixedPropDraft} 
                      onChange={e => setNewFixedPropDraft(e.target.value)} 
                      onKeyDown={e => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          addFixedProperty(newFixedPropDraft);
                          setNewFixedPropDraft('');
                        }
                      }}
                      onBlur={() => {
                        if (newFixedPropDraft) {
                          addFixedProperty(newFixedPropDraft);
                          setNewFixedPropDraft('');
                        }
                      }}
                    />
                  </div>
                ) : (
                  <>
                    <div className="workhub-proscons-ranking-head">Best option: {sectionModels.find((model) => model.section.id === bestSectionId)?.section.label || 'N/A'}</div>
                    <div className="workhub-proscons-horizontal-compare" role="presentation" aria-label="Section advantage comparison">
                      {signalSectionModels.map((model) => {
                        const isBest = model.section.id === bestSectionId
                        const label = model.section.label.trim() || 'Option'
                        const width = Math.round((Math.abs(model.sectionScore) / Math.max(maxSignalScoreMagnitude, 0.0001)) * 100)
                        return (
                          <div key={`rank-${model.section.id}`} className={`workhub-proscons-horizontal-col ${isBest ? 'is-best' : ''}`}>
                            <div className="workhub-proscons-horizontal-track">
                              <span
                                className={`workhub-proscons-horizontal-fill ${model.sectionScore >= 0 ? 'is-positive' : 'is-negative'}`}
                                style={{ width: `${Math.max(10, width)}%` }}
                              />
                            </div>
                            <span className={`workhub-proscons-horizontal-score ${model.sectionScore >= 0 ? 'is-positive' : 'is-negative'}`}>
                              {model.sectionScore.toFixed(1)}
                            </span>
                            <span className="workhub-proscons-horizontal-label" title={label}>{label}</span>
                          </div>
                        )
                      })}
                    </div>
                  </>
                )}
              </div>
              <div className="workhub-proscons-sections-wrap">
                {displayedSectionModels.map((model) => {
                  const { section, sectionScore, pros: sectionPros, cons: sectionCons, analytics: sectionAnalytics } = model
                  const rank = rankedSectionModels.findIndex((entry) => entry.section.id === section.id) + 1
                  const isBest = section.id === bestSectionId
                  const visiblePros = sectionPros
                  const visibleCons = sectionCons

                  return (
                    <section key={section.id} className={`workhub-proscons-section-card ${isBest ? 'is-best' : ''} ${isEditMode ? 'is-edit-mode' : 'is-results-mode'}`}>
                      <div className="workhub-proscons-section-head">
                        <div className="workhub-proscons-section-title-wrap">
                          <span className={`workhub-proscons-section-rank rank-${rank > 3 ? 'other' : rank}`}>#{rank}</span>
                          {isEditMode ? (
                            <input
                              className="workhub-proscons-section-title-input"
                              defaultValue={section.label}
                              onBlur={(event) => renameSection(section, event.target.value)}
                              aria-label="Section name"
                            />
                          ) : (
                            <strong>{section.label}</strong>
                          )}
                        </div>
                        <span>{sectionPros.length}p / {sectionCons.length}c</span>
                      </div>
                      <div className="workhub-proscons-section-badge">
                        {isBest ? `Top option · ${sectionAnalytics.recommendation.title}` : sectionAnalytics.recommendation.title}
                      </div>
                      <div className="workhub-proscons-section-balance">
                        <div className="workhub-proscons-section-balance-track" role="presentation">
                          <span className="is-pro" style={{ width: `${sectionAnalytics.prosPercent}%` }} />
                          <span className="is-con" style={{ width: `${sectionAnalytics.consPercent}%` }} />
                        </div>
                        <div className="workhub-proscons-section-balance-text">
                          <span>{sectionAnalytics.prosPercent}% pros</span>
                          <span>{sectionAnalytics.consPercent}% cons</span>
                          <span className={sectionScore >= 0 ? 'is-positive' : 'is-negative'}>Score {sectionScore.toFixed(1)}</span>
                        </div>
                      </div>
                      {prosConsData.fixedPropertiesMode ? (
                        <div className="workhub-proscons-matrix-items" role="list">
                          {(prosConsData.fixedProperties || []).length > 0 ? (prosConsData.fixedProperties || []).map((propName) => {
                            const isPro = sectionPros.some((item) => item.title === propName)
                            const isCon = sectionCons.some((item) => item.title === propName)
                            const stateLabel = isPro ? 'Pro' : isCon ? 'Con' : 'Neutral'
                            const stateClassName = isPro ? 'is-pro' : isCon ? 'is-con' : 'is-neutral'

                            return (
                              <div key={`${section.id}:${propName}`} className="workhub-proscons-matrix-row" role="listitem">
                                <span className="workhub-proscons-matrix-prop" title={propName}>{propName}</span>
                                {isEditMode ? (
                                  <div className="workhub-proscons-matrix-toggles" aria-label={`${propName} value for ${section.label}`}>
                                    <button
                                      type="button"
                                      className={`workhub-proscons-matrix-btn is-pro ${isPro ? 'is-active' : ''}`}
                                      onClick={() => toggleFixedProperty(section, propName, 'pros')}
                                    >
                                      Pro
                                    </button>
                                    <button
                                      type="button"
                                      className={`workhub-proscons-matrix-btn is-neutral ${!isPro && !isCon ? 'is-active' : ''}`}
                                      onClick={() => toggleFixedProperty(section, propName, 'neutral')}
                                    >
                                      -
                                    </button>
                                    <button
                                      type="button"
                                      className={`workhub-proscons-matrix-btn is-con ${isCon ? 'is-active' : ''}`}
                                      onClick={() => toggleFixedProperty(section, propName, 'cons')}
                                    >
                                      Con
                                    </button>
                                  </div>
                                ) : (
                                  <span className={`workhub-proscons-matrix-indicator ${stateClassName}`}>{stateLabel}</span>
                                )}
                              </div>
                            )
                          }) : (
                            <div className="workhub-proscons-matrix-empty">
                              {isEditMode ? 'Add parameters on the left to compare every section.' : 'No fixed parameters yet.'}
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="workhub-proscons-section-columns">
                          <div className="workhub-proscons-items-col is-pro">
                          <div className="workhub-proscons-items-head">
                            <span>Pros</span>
                          </div>
                          <ul className="workhub-proscons-flat-items">
                            {visiblePros.map((item) => {
                              const draftKey = getRowDraftKey('pros', item.id)
                              const isEditing = editingRowKey === draftKey
                              const value = rowTitleDrafts[draftKey] ?? item.title
                              return (
                                <li key={item.id} className="workhub-proscons-flat-item is-pro">
                                  <span className="workhub-proscons-flat-dot" />
                                  {isEditing ? (
                                    <input
                                      className="workhub-proscons-row-title-input"
                                      value={value}
                                      readOnly={!isEditMode}
                                      onChange={(event) => setTitleDraft('pros', item.id, event.target.value)}
                                      onBlur={() => {
                                        if (isEditMode) saveTitleEdit('pros', item.id)
                                      }}
                                      onKeyDown={(event) => {
                                        if (isEditMode && event.key === 'Enter') {
                                          event.preventDefault()
                                          saveTitleEdit('pros', item.id)
                                        }
                                      }}
                                    />
                                  ) : (
                                    <button
                                      type="button"
                                      className="workhub-proscons-row-view-btn"
                                      onClick={() => {
                                        if (isEditMode) beginTitleEdit('pros', item.id, item.title)
                                      }}
                                    >
                                      {item.title}
                                    </button>
                                  )}
                                  {isEditMode ? (
                                    <button
                                      type="button"
                                      className="workhub-proscons-btn is-danger is-icon workhub-proscons-inline-remove"
                                      onClick={() => confirmRemoveItem('pros', item.id, item.title)}
                                      aria-label="Remove pro"
                                    >
                                      ×
                                    </button>
                                  ) : null}
                                </li>
                              )
                            })}
                            {isEditMode ? (
                              <li className="workhub-proscons-flat-item is-input-row">
                                <span className="workhub-proscons-flat-dot" />
                                <input
                                  className="workhub-proscons-row-title-input"
                                  value={inlineNewTitles[`${section.id}:pros`] || ''}
                                  onChange={(event) => setInlineNewTitles((current) => ({
                                    ...current,
                                    [`${section.id}:pros`]: event.target.value,
                                  }))}
                                  onBlur={() => addInlineItem('pros', section)}
                                  onKeyDown={(event) => {
                                    if (event.key === 'Enter') {
                                      event.preventDefault()
                                      addInlineItem('pros', section)
                                    }
                                  }}
                                  placeholder="+ add pro"
                                />
                              </li>
                            ) : null}
                          </ul>
                        </div>

                          <div className="workhub-proscons-items-col is-con">
                          <div className="workhub-proscons-items-head">
                            <span>Cons</span>
                          </div>
                          <ul className="workhub-proscons-flat-items">
                            {visibleCons.map((item) => {
                              const draftKey = getRowDraftKey('cons', item.id)
                              const isEditing = editingRowKey === draftKey
                              const value = rowTitleDrafts[draftKey] ?? item.title
                              return (
                                <li key={item.id} className="workhub-proscons-flat-item is-con">
                                  <span className="workhub-proscons-flat-dot" />
                                  {isEditing ? (
                                    <input
                                      className="workhub-proscons-row-title-input"
                                      value={value}
                                      readOnly={!isEditMode}
                                      onChange={(event) => setTitleDraft('cons', item.id, event.target.value)}
                                      onBlur={() => {
                                        if (isEditMode) saveTitleEdit('cons', item.id)
                                      }}
                                      onKeyDown={(event) => {
                                        if (isEditMode && event.key === 'Enter') {
                                          event.preventDefault()
                                          saveTitleEdit('cons', item.id)
                                        }
                                      }}
                                    />
                                  ) : (
                                    <button
                                      type="button"
                                      className="workhub-proscons-row-view-btn"
                                      onClick={() => {
                                        if (isEditMode) beginTitleEdit('cons', item.id, item.title)
                                      }}
                                    >
                                      {item.title}
                                    </button>
                                  )}
                                  {isEditMode ? (
                                    <button
                                      type="button"
                                      className="workhub-proscons-btn is-danger is-icon workhub-proscons-inline-remove"
                                      onClick={() => confirmRemoveItem('cons', item.id, item.title)}
                                      aria-label="Remove con"
                                    >
                                      ×
                                    </button>
                                  ) : null}
                                </li>
                              )
                            })}
                            {isEditMode ? (
                              <li className="workhub-proscons-flat-item is-input-row">
                                <span className="workhub-proscons-flat-dot" />
                                <input
                                  className="workhub-proscons-row-title-input"
                                  value={inlineNewTitles[`${section.id}:cons`] || ''}
                                  onChange={(event) => setInlineNewTitles((current) => ({
                                    ...current,
                                    [`${section.id}:cons`]: event.target.value,
                                  }))}
                                  onBlur={() => addInlineItem('cons', section)}
                                  onKeyDown={(event) => {
                                    if (event.key === 'Enter') {
                                      event.preventDefault()
                                      addInlineItem('cons', section)
                                    }
                                  }}
                                  placeholder="+ add con"
                                />
                              </li>
                            ) : null}
                          </ul>
                          </div>
                        </div>
                      )}
                    </section>
                  )
                })}
              </div>
            </div>

            <div className="workhub-proscons-bottom-strip">
              <button
                type="button"
                className={`workhub-proscons-btn ${isEditMode ? 'is-primary' : ''}`}
                onClick={() => setIsEditMode((current) => !current)}
              >
                {isEditMode ? 'Done editing' : 'Edit mode'}
              </button>
              {isEditMode ? (
                <>
                  <input
                    className="workhub-proscons-inline-add-section"
                    value={sectionDraft}
                    onChange={(event) => setSectionDraft(event.target.value)}
                    placeholder="Add section (company/option)"
                  />
                  <button type="button" className="workhub-proscons-btn is-primary" onClick={addSection}>Add section</button>
                </>
              ) : null}
              {suggestions.length > 0 ? <p className="workhub-proscons-suggestion-text">{suggestions[0]}</p> : null}
            </div>
          </div>

          {detailRailMode === 'hidden' ? (
            <button
              type="button"
              className="workhub-proscons-show-details"
              onClick={setDetailRailExpanded}
              aria-label="Show details panel"
              title="Show details panel"
            >
              Show details
            </button>
          ) : null}

          {detailRailMode !== 'hidden' && (
            <>
              {detailRailMode === 'expanded' ? (
                <div
                  className="workhub-proscons-detail-resizer"
                  onPointerDown={handleDetailResizePointerDown}
                  onPointerMove={handleDetailResizePointerMove}
                  onPointerUp={handleDetailResizePointerUp}
                />
              ) : null}
              <aside
                ref={detailPanelRef}
                className={`workhub-proscons-detail-rail is-${detailRailMode}`}
              >
                <div className="workhub-proscons-detail-toolbar">
                  <button type="button" className="workhub-proscons-btn" onClick={toggleDetailRailCompact}>
                    {detailRailMode === 'compact' ? 'Expand' : 'Compact'}
                  </button>
                  <button type="button" className="workhub-proscons-btn" onClick={setDetailRailHidden}>Hide</button>
                </div>

                <div className="workhub-proscons-detail-scroll">

                  <div className="workhub-detail-card">
                    <h3>Decision settings</h3>
                    <div className="workhub-proscons-form-grid">
                      <label>
                        Topic
                        <input
                          defaultValue={prosConsData.topic || ''}
                          onBlur={(event) => {
                            persistProsCons({ ...prosConsData, topic: event.target.value })
                          }}
                          placeholder="What decision are we evaluating?"
                        />
                      </label>
                      <label>
                        Currency
                        <input
                          defaultValue={prosConsData.currency || 'USD'}
                          onBlur={(event) => {
                            const nextCurrency = event.target.value.trim().toUpperCase() || 'USD'
                            persistProsCons({ ...prosConsData, currency: nextCurrency })
                          }}
                          placeholder="USD"
                        />
                      </label>
                      <label>
                        Chart variant
                        <select
                          value={prosConsData.chartVariant || 'balance'}
                          onChange={(event) => {
                            persistProsCons({ ...prosConsData, chartVariant: event.target.value as WorkhubMoodBoardProsCons['chartVariant'] })
                          }}
                        >
                          <option value="balance">Balance track</option>
                          <option value="bars">Side-by-side bars</option>
                          <option value="donut">Donut split</option>
                        </select>
                      </label>
                      <label>
                        Grouping mode
                        <select
                          value={prosConsData.groupBy || 'none'}
                          onChange={(event) => {
                            persistProsCons({ ...prosConsData, groupBy: event.target.value as WorkhubMoodBoardProsCons['groupBy'] })
                          }}
                        >
                          <option value="none">No grouping</option>
                          <option value="group">Group by category</option>
                        </select>
                      </label>
                      <label>
                        Objective
                        <textarea
                          defaultValue={prosConsData.objective || ''}
                          onBlur={(event) => {
                            persistProsCons({ ...prosConsData, objective: event.target.value })
                          }}
                          rows={3}
                          placeholder="Define success criteria, constraints, or assumptions"
                        />
                      </label>
                      <label>
                        Recommendation note
                        <textarea
                          defaultValue={prosConsData.recommendationNote || ''}
                          onBlur={(event) => {
                            persistProsCons({ ...prosConsData, recommendationNote: event.target.value })
                          }}
                          rows={2}
                          placeholder="Optional manual note to accompany recommendation"
                        />
                      </label>
                    </div>

                    <div className="workhub-proscons-scoring-grid">
                      <label>
                        Scoring method
                        <select
                          value={prosConsData.scoring?.method || 'weighted_product'}
                          onChange={(event) => updateScoring({ method: event.target.value as 'weighted_product' | 'weighted_sum' })}
                        >
                          <option value="weighted_product">Weighted product</option>
                          <option value="weighted_sum">Weighted sum</option>
                        </select>
                      </label>
                      <label>
                        Amount mode
                        <select
                          value={prosConsData.scoring?.amountMode || 'log'}
                          onChange={(event) => updateScoring({ amountMode: event.target.value as 'none' | 'linear' | 'log' })}
                        >
                          <option value="log">Logarithmic</option>
                          <option value="linear">Linear</option>
                          <option value="none">Ignore amount</option>
                        </select>
                      </label>
                      <label>
                        Weight factor
                        <input
                          type="number"
                          step="0.1"
                          value={String(prosConsData.scoring?.weightFactor ?? 1)}
                          onChange={(event) => updateScoring({ weightFactor: Number(event.target.value) || 1 })}
                        />
                      </label>
                      <label>
                        Impact factor
                        <input
                          type="number"
                          step="0.1"
                          value={String(prosConsData.scoring?.impactFactor ?? 1)}
                          onChange={(event) => updateScoring({ impactFactor: Number(event.target.value) || 1 })}
                        />
                      </label>
                      <label>
                        Amount factor
                        <input
                          type="number"
                          step="0.1"
                          value={String(prosConsData.scoring?.amountFactor ?? 2.2)}
                          onChange={(event) => updateScoring({ amountFactor: Number(event.target.value) || 0 })}
                        />
                      </label>
                      <label>
                        Amount cap
                        <input
                          type="number"
                          step="0.1"
                          value={String(prosConsData.scoring?.amountCap ?? 6)}
                          onChange={(event) => updateScoring({ amountCap: Number(event.target.value) || 0 })}
                        />
                      </label>
                      <label>
                        Go threshold
                        <input
                          type="number"
                          step="1"
                          value={String(prosConsData.scoring?.goThreshold ?? 8)}
                          onChange={(event) => updateScoring({ goThreshold: Number(event.target.value) || 0 })}
                        />
                      </label>
                      <label>
                        Strong go threshold
                        <input
                          type="number"
                          step="1"
                          value={String(prosConsData.scoring?.strongGoThreshold ?? 22)}
                          onChange={(event) => updateScoring({ strongGoThreshold: Number(event.target.value) || 1 })}
                        />
                      </label>
                      <label>
                        No-go threshold
                        <input
                          type="number"
                          step="1"
                          value={String(prosConsData.scoring?.noGoThreshold ?? -8)}
                          onChange={(event) => updateScoring({ noGoThreshold: Number(event.target.value) || 0 })}
                        />
                      </label>
                      <label>
                        Strong no-go threshold
                        <input
                          type="number"
                          step="1"
                          value={String(prosConsData.scoring?.strongNoGoThreshold ?? -22)}
                          onChange={(event) => updateScoring({ strongNoGoThreshold: Number(event.target.value) || -1 })}
                        />
                      </label>
                    </div>
                  </div>

                  <div className="workhub-detail-card">
                    <h3>Templates</h3>
                    <div className="workhub-proscons-form-grid">
                      <label>
                        Template
                        <select value={selectedTemplateId} onChange={(event) => setSelectedTemplateId(event.target.value)}>
                          {templatePresets.map((template) => (
                            <option key={template.id} value={template.id}>{template.label}</option>
                          ))}
                        </select>
                      </label>
                      <p className="workhub-proscons-hint">
                        {resolveWorkhubProsConsTemplate(selectedTemplateId).description}
                      </p>
                      <button type="button" className="workhub-proscons-btn is-primary" onClick={applyTemplate}>Apply template</button>
                    </div>
                  </div>

                  <div className="workhub-detail-card">
                    <h3>Groups</h3>
                    <div className="workhub-proscons-form-grid">
                      <label>
                        Group label
                        <input
                          value={groupDraft.label}
                          onChange={(event) => setGroupDraft((current) => ({ ...current, label: event.target.value }))}
                          placeholder="Examples: Cost, Risk, Delivery"
                        />
                      </label>
                      <label>
                        Color (optional)
                        <input
                          value={groupDraft.color}
                          onChange={(event) => setGroupDraft((current) => ({ ...current, color: event.target.value }))}
                          placeholder="#2f68b8"
                        />
                      </label>
                      <button type="button" className="workhub-proscons-btn" onClick={addGroup}>Add group</button>

                      {(prosConsData.groups || []).length ? (
                        <div className="workhub-proscons-chip-grid">
                          {(prosConsData.groups || []).map((group) => (
                            <div key={group.id} className="workhub-proscons-chip-item">
                              <span>{group.label}</span>
                              <button type="button" className="workhub-proscons-btn is-danger" onClick={() => removeGroup(group.id)}>Remove</button>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="workhub-empty-state">No groups yet.</div>
                      )}
                    </div>
                  </div>

                  <div className="workhub-detail-card">
                    <h3>Custom fields</h3>
                    <div className="workhub-proscons-form-grid">
                      <label>
                        Label
                        <input
                          value={fieldDraft.label}
                          onChange={(event) => setFieldDraft((current) => ({ ...current, label: event.target.value }))}
                          placeholder="Examples: Confidence, Owner, Horizon"
                        />
                      </label>
                      <label>
                        Type
                        <select
                          value={fieldDraft.type}
                          onChange={(event) => setFieldDraft((current) => ({ ...current, type: event.target.value as WorkhubProsConsCustomFieldType }))}
                        >
                          <option value="text">Text</option>
                          <option value="number">Number</option>
                          <option value="boolean">Boolean</option>
                          <option value="select">Select</option>
                        </select>
                      </label>
                      <label>
                        Applies to
                        <select
                          value={fieldDraft.appliesTo}
                          onChange={(event) => setFieldDraft((current) => ({ ...current, appliesTo: event.target.value as FieldDraft['appliesTo'] }))}
                        >
                          <option value="both">Both</option>
                          <option value="pros">Pros only</option>
                          <option value="cons">Cons only</option>
                        </select>
                      </label>
                      {fieldDraft.type === 'select' ? (
                        <label>
                          Options (comma separated)
                          <input
                            value={fieldDraft.options}
                            onChange={(event) => setFieldDraft((current) => ({ ...current, options: event.target.value }))}
                            placeholder="High, Medium, Low"
                          />
                        </label>
                      ) : null}
                      <button type="button" className="workhub-proscons-btn" onClick={addCustomField}>Add field</button>

                      {(prosConsData.customFields || []).length ? (
                        <div className="workhub-proscons-chip-grid">
                          {(prosConsData.customFields || []).map((field) => (
                            <div key={field.id} className="workhub-proscons-chip-item">
                              <span>{field.label} ({field.type})</span>
                              <button type="button" className="workhub-proscons-btn is-danger" onClick={() => removeCustomField(field.id)}>Remove</button>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="workhub-empty-state">No custom fields yet.</div>
                      )}
                    </div>
                  </div>

                </div>
              </aside>
            </>
          )}
        </div>


      </section>
    </main>
  )
}
