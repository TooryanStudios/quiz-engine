import { useEffect, useMemo, useRef, useState } from 'react'
import type { WorkhubClient, WorkhubProject, WorkhubWorkspace } from '../../../lib/workhubRepo'
import { canViewProject, resolveEffectiveProjectIntent } from '../projectUtils'
import { getTemplateCreationIntentMeta, resolveWorkspaceTemplateIntents } from '../templateCreationMeta'
import { resolveWorkhubWorkspaceTemplateForWorkspace } from '../workspaceTemplates'
import {
  type WorkhubEntityFinderEntry,
  scoreWorkhubEntityFinderEntry,
} from '../finderUtils'

interface UseWorkhubGlobalFinderParams {
  projects: WorkhubProject[]
  visibleWorkspaceById: Record<string, WorkhubWorkspace>
  allClientById: Record<string, WorkhubClient>
  currentUid: string
  isPrivilegedMember: boolean
  workspaceByIdForFiltering: Record<string, WorkhubWorkspace>
  /** Called when the Ctrl+K shortcut fires (before opening), e.g. to close other menus. */
  onBeforeOpen?: () => void
}

export function useWorkhubGlobalFinder({
  projects,
  visibleWorkspaceById,
  allClientById,
  currentUid,
  isPrivilegedMember,
  workspaceByIdForFiltering,
  onBeforeOpen,
}: UseWorkhubGlobalFinderParams) {
  const [globalFinderOpen, setGlobalFinderOpen] = useState(false)
  const [globalFinderQuery, setGlobalFinderQuery] = useState('')
  const [globalFinderActiveIndex, setGlobalFinderActiveIndex] = useState(0)
  const globalFinderInputRef = useRef<HTMLInputElement | null>(null)

  // Keep onBeforeOpen stable in effects without adding it to dependency arrays.
  const onBeforeOpenRef = useRef(onBeforeOpen)
  onBeforeOpenRef.current = onBeforeOpen

  // Ctrl+K / Cmd+K global shortcut to open the finder.
  useEffect(() => {
    const handleShortcut = (event: KeyboardEvent) => {
      if (!(event.ctrlKey || event.metaKey)) return
      if (event.key.toLowerCase() !== 'k') return
      event.preventDefault()
      onBeforeOpenRef.current?.()
      setGlobalFinderQuery('')
      setGlobalFinderActiveIndex(0)
      setGlobalFinderOpen(true)
    }
    window.addEventListener('keydown', handleShortcut)
    return () => window.removeEventListener('keydown', handleShortcut)
  }, [])

  // Auto-focus + select the input when the finder opens.
  useEffect(() => {
    if (!globalFinderOpen) return
    const frameId = window.requestAnimationFrame(() => {
      globalFinderInputRef.current?.focus()
      globalFinderInputRef.current?.select()
    })
    return () => window.cancelAnimationFrame(frameId)
  }, [globalFinderOpen])

  // Escape key closes the finder.
  useEffect(() => {
    if (!globalFinderOpen) return
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      event.preventDefault()
      setGlobalFinderOpen(false)
      setGlobalFinderQuery('')
      setGlobalFinderActiveIndex(0)
    }
    window.addEventListener('keydown', handleEscape)
    return () => window.removeEventListener('keydown', handleEscape)
  }, [globalFinderOpen])

  // Build the full, filterable entry list whenever projects or workspace data changes.
  const globalFinderEntries = useMemo(() => {
    const entries: WorkhubEntityFinderEntry[] = []

    projects.forEach((item, index) => {
      const workspace = visibleWorkspaceById[item.workspaceId]
      if (!workspace) return

      const workspaceAccessLevel = workspace.memberAccessLevels?.[currentUid] || 'custom'
      const canSeeWorkspaceProjects = isPrivilegedMember || workspaceAccessLevel === 'full'
      if (!canViewProject(item, currentUid, canSeeWorkspaceProjects)) return

      const workspaceTemplateId = resolveWorkhubWorkspaceTemplateForWorkspace(workspace).templateId
      const workspaceIntentSet = new Set(resolveWorkspaceTemplateIntents(workspaceTemplateId))
      const effectiveIntent = resolveEffectiveProjectIntent(item, workspaceByIdForFiltering, workspaceIntentSet)
      if (!workspaceIntentSet.has(effectiveIntent)) return

      const intentMeta = getTemplateCreationIntentMeta(effectiveIntent, workspaceTemplateId)
      const clientName = (item.clientId ? (allClientById[item.clientId]?.name || '') : '').trim()
      const description = (item.description || '').trim()

      entries.push({
        projectId: item.id,
        workspaceId: item.workspaceId,
        name: item.name,
        workspaceName: workspace.name,
        subjectLabel: intentMeta.subjectLabel,
        clientName,
        nameLower: item.name.toLowerCase(),
        workspaceNameLower: workspace.name.toLowerCase(),
        subjectLabelLower: intentMeta.subjectLabel.toLowerCase(),
        clientNameLower: clientName.toLowerCase(),
        descriptionLower: description.toLowerCase(),
        searchableText: [item.name, workspace.name, intentMeta.subjectLabel, clientName, description].join(' ').toLowerCase(),
        order: index,
      })
    })

    return entries
  }, [allClientById, currentUid, isPrivilegedMember, projects, visibleWorkspaceById, workspaceByIdForFiltering])

  // Score + sort + slice the entries against the current query.
  const globalFinderResults = useMemo(() => {
    const normalizedQuery = globalFinderQuery.trim().toLowerCase()
    const maxResults = normalizedQuery ? 36 : 18

    return globalFinderEntries
      .map((entry) => ({
        entry,
        score: scoreWorkhubEntityFinderEntry(entry, normalizedQuery),
      }))
      .filter(({ score }) => normalizedQuery ? score > 0 : true)
      .sort((left, right) => {
        if (right.score !== left.score) return right.score - left.score
        if (left.entry.order !== right.entry.order) return left.entry.order - right.entry.order
        return left.entry.name.localeCompare(right.entry.name)
      })
      .slice(0, maxResults)
      .map(({ entry }) => entry)
  }, [globalFinderEntries, globalFinderQuery])

  const globalFinderResolvedActiveIndex = useMemo(
    () => (globalFinderResults.length === 0 ? -1 : Math.min(globalFinderActiveIndex, globalFinderResults.length - 1)),
    [globalFinderActiveIndex, globalFinderResults.length],
  )

  function closeGlobalFinder() {
    setGlobalFinderOpen(false)
    setGlobalFinderQuery('')
    setGlobalFinderActiveIndex(0)
  }

  return {
    globalFinderOpen,
    setGlobalFinderOpen,
    globalFinderQuery,
    setGlobalFinderQuery,
    globalFinderActiveIndex,
    setGlobalFinderActiveIndex,
    globalFinderInputRef,
    globalFinderEntries,
    globalFinderResults,
    globalFinderResolvedActiveIndex,
    closeGlobalFinder,
  }
}

export type { WorkhubEntityFinderEntry }
