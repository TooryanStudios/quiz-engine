import { useCallback, useEffect, useMemo, useState } from 'react'
import { useGenerationRunner } from '../../hooks/useGenerationRunner'
import { buildToorGenRequest } from '../../lib/toorgen/generationRequestBuilder'
import { useLabNewLayoutStore } from './useLabNewLayoutStore'

const CHATBOT_BASE = (import.meta.env.VITE_CHATBOT_API_URL as string | undefined) || ''

export type ComposerModeOption = {
  id: string
  label: string
  promptPlaceholder: string
}

export const composerModeOptions: ComposerModeOption[] = [
  {
    id: 'text',
    label: 'Text only - no references',
    promptPlaceholder: 'Describe the scene, camera, motion, and atmosphere...',
  },
  {
    id: 'image',
    label: 'Image references',
    promptPlaceholder: 'Describe how the selected image should move and evolve...',
  },
  {
    id: 'video',
    label: 'Video + image references',
    promptPlaceholder: 'Describe the final scene to generate...',
  },
  {
    id: 'audio',
    label: 'Audio references',
    promptPlaceholder: 'Describe the scene and how the audio should guide timing and motion...',
  },
]

export const composerConfigChips = ['16:9', '480p', '15s']
export const composerModelChip = 'Atlas Cloud 2.0 Fast'

export type ComposerTemplate = {
  id: string
  label: string
  description: string
  prompt: string
}

export type ComposerRefineAction = {
  id: string
  label: string
  description: string
}

export const composerTemplates: ComposerTemplate[] = [
  {
    id: 'character-reveal',
    label: 'Character Reveal',
    description: 'A polished entrance shot with identity, mood, and camera language.',
    prompt: 'A slow cinematic character reveal in a dim corridor, beginning with silhouette and footfall details before easing into a confident medium shot. Controlled backlight, shallow depth of field, subtle atmosphere haze, and deliberate pacing that builds presence without rushing the moment.',
  },
  {
    id: 'product-beauty',
    label: 'Product Beauty',
    description: 'Clean premium commercial framing for a hero object or device.',
    prompt: 'A premium product beauty shot on a minimal stage with elegant camera drift, controlled reflections, crisp edge lighting, and refined material detail. Start wide, then move into close macro moments that highlight texture, finish, and craftsmanship.',
  },
  {
    id: 'dialogue-scene',
    label: 'Dialogue Scene',
    description: 'Balanced cinematic coverage for a two-person dramatic exchange.',
    prompt: 'An intimate two-person dialogue scene in a quiet interior with restrained camera coverage, subtle shot progression, motivated eyelines, and emotionally grounded pacing. Preserve conversational rhythm, natural body language, and a believable sense of shared space.',
  },
  {
    id: 'drone-arrival',
    label: 'Drone Arrival',
    description: 'A wide environmental reveal that lands on the destination cleanly.',
    prompt: 'A sweeping aerial arrival over a dramatic landscape at golden hour, starting with a broad establishing view and descending toward the final destination with stable, confident motion. Layered geography, atmospheric depth, and a strong sense of scale throughout the move.',
  },
]

export const composerRefineActions: ComposerRefineAction[] = [
  {
    id: 'cinematic',
    label: 'Make More Cinematic',
    description: 'Strengthen framing, lighting, depth, and camera intention.',
  },
  {
    id: 'english-structure',
    label: 'English, Keep Structure',
    description: 'Rewrite in English while preserving ordering and intent.',
  },
  {
    id: 'polish-structure',
    label: 'Correct Language, Keep Structure',
    description: 'Clean phrasing and readability without changing the layout.',
  },
  {
    id: 'refine-full',
    label: 'Refine Full Prompt',
    description: 'Tighten the entire prompt and reduce ambiguity.',
  },
]

function normalizePromptLines(prompt: string): string {
  const normalizedLines = prompt
    .split(/\r?\n/)
    .map((line) => line.replace(/\s+/g, ' ').trim())

  const compacted: string[] = []
  let previousWasBlank = false

  normalizedLines.forEach((line) => {
    if (!line) {
      if (!previousWasBlank) {
        compacted.push('')
      }
      previousWasBlank = true
      return
    }

    compacted.push(line)
    previousWasBlank = false
  })

  return compacted.join('\n').trim()
}

function toSentenceCase(line: string): string {
  if (!line) {
    return line
  }

  return line.charAt(0).toUpperCase() + line.slice(1)
}

function applyRefineActionToPrompt(prompt: string, actionId: string): string {
  const normalizedPrompt = normalizePromptLines(prompt)

  switch (actionId) {
    case 'cinematic':
      return normalizedPrompt
        ? `${normalizedPrompt}\n\nElevate it with cinematic framing, motivated camera movement, stronger depth, textured lighting, and a more atmospheric visual tone.`
        : 'Create a cinematic scene with deliberate framing, motivated camera movement, layered depth, expressive lighting, and a strong atmospheric tone.'
    case 'english-structure':
      return normalizedPrompt
        ? `Rewrite in English while preserving the same structure, sequence, and meaning:\n${normalizedPrompt}`
        : 'Rewrite the prompt in English while preserving the same structure and meaning.'
    case 'polish-structure': {
      if (!normalizedPrompt) {
        return ''
      }

      return normalizedPrompt
        .split('\n')
        .map((line) => (line ? toSentenceCase(line) : ''))
        .join('\n')
    }
    case 'refine-full':
      return normalizedPrompt
        ? `${normalizedPrompt}\n\nRefine the entire prompt for clarity, precision, and flow while preserving the original structure and intent.`
        : 'Refine the full prompt for clarity, precision, and flow while preserving the intended structure.'
    default:
      return prompt
  }
}

export type ComposerReference = {
  id: string
  url: string
  kind: 'video' | 'image' | 'audio'
  name: string
}

export function useLabNewLayoutComposer() {
  const [activeModeId, setActiveModeId] = useState('video')
  const [promptText, setPromptText] = useState('')
  const [isTemplatesMenuOpen, setTemplatesMenuOpen] = useState(false)
  const [isRefineMenuOpen, setRefineMenuOpen] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)
  const [generationStatus, setGenerationStatus] = useState<string>('')
  const [selectedReferences, setSelectedReferences] = useState<ComposerReference[]>([])

  const setCurrentComposerPreview = useLabNewLayoutStore((state) => state.setCurrentComposerPreview)
  const setComposerReferences = useLabNewLayoutStore((state) => state.setComposerReferences)
  const addHistoryItem = useLabNewLayoutStore((state) => state.addHistoryItem)
  const updateHistoryItem = useLabNewLayoutStore((state) => state.updateHistoryItem)

  const runner = useGenerationRunner({
    apiBaseUrl: CHATBOT_BASE,
  })

  const activeMode = useMemo(
    () => composerModeOptions.find((mode) => mode.id === activeModeId) ?? composerModeOptions[0],
    [activeModeId],
  )

  const selectMode = useCallback((modeId: string) => {
    setActiveModeId(modeId)
  }, [])

  const updatePromptText = useCallback((value: string) => {
    setPromptText(value)
  }, [])

  const addReference = useCallback((ref: ComposerReference) => {
    setSelectedReferences((prev) => {
      if (prev.find(r => r.id === ref.id)) return prev
      return [...prev, ref]
    })
  }, [])

  const removeReference = useCallback((id: string) => {
    setSelectedReferences((prev) => prev.filter(r => r.id !== id))
  }, [])

  const toggleTemplatesMenu = useCallback(() => {
    setTemplatesMenuOpen((current) => {
      const next = !current
      if (next) {
        setRefineMenuOpen(false)
      }
      return next
    })
  }, [])

  const toggleRefineMenu = useCallback(() => {
    setRefineMenuOpen((current) => {
      const next = !current
      if (next) {
        setTemplatesMenuOpen(false)
      }
      return next
    })
  }, [])

  const applyTemplate = useCallback((templateId: string) => {
    const selectedTemplate = composerTemplates.find((template) => template.id === templateId)
    if (!selectedTemplate) {
      return
    }

    setPromptText(selectedTemplate.prompt)
    setTemplatesMenuOpen(false)
  }, [])

  const applyRefineAction = useCallback((actionId: string) => {
    setPromptText((current) => applyRefineActionToPrompt(current, actionId))
    setRefineMenuOpen(false)
  }, [])

  const closeMenus = useCallback(() => {
    setTemplatesMenuOpen(false)
    setRefineMenuOpen(false)
  }, [])

  const buildCurrentRequest = useCallback(() => {
    const tab = {
      id: activeModeId,
      requestMode: (activeModeId === 'video' ? 'reference-to-video' : 'text-to-video') as 'reference-to-video' | 'text-to-video',
      fields: selectedReferences.map((ref, idx) => ({ kind: ref.kind, key: `ref_${idx}` as string, isRequired: false, label: '', helpText: '', placeholder: '' })), // We can wire media fields references here later
    }

    const requestState = {
      prompt: promptText,
      mediaUrls: Object.fromEntries(selectedReferences.map((ref, idx) => [`ref_${idx}`, ref.url])),
    }

    const settings = {
      provider: 'atlas' as const,
      model: 'bytedance/seedance-2.0-fast',
      ratio: '16:9',
      duration: 15,
      resolution: '480p',
      generateAudio: false
    }

    const request = buildToorGenRequest({
      tab,
      state: requestState,
      settings,
      mentionReferences: selectedReferences.map(ref => ({ name: ref.name, mention: ref.name, kind: ref.kind, role: 'general', url: ref.url })),
      combinedReferenceTabId: activeModeId, // Pass this to ensure atlas payload builds correctly with reference mode.
    })

    return {
      ...request,
      settings, // include settings to satisfy GenerationRequest signature
    }
  }, [activeModeId, promptText, selectedReferences])

  useEffect(() => {
    const timeout = setTimeout(() => {
      setCurrentComposerPreview(buildCurrentRequest())
    }, 300)
    return () => clearTimeout(timeout)
  }, [buildCurrentRequest, setCurrentComposerPreview])

  useEffect(() => {
    setComposerReferences(selectedReferences)
  }, [selectedReferences, setComposerReferences])

  const startGeneration = useCallback(async () => {
    if (!promptText.trim()) return

    const request = buildCurrentRequest()
    const historyId = Date.now().toString()

    setIsGenerating(true)
    setGenerationStatus('Preparing request...')

    addHistoryItem({
      id: historyId,
      timestamp: Date.now(),
      prompt: promptText,
      model: request.settings.model,
      provider: request.settings.provider,
      ratio: request.settings.ratio,
      resolution: request.settings.resolution,
      duration: request.settings.duration,
      generateAudio: request.settings.generateAudio,
      requestEndpoint: request.endpoint,
      requestPayload: request.body,
      mediaUrls: Object.fromEntries(selectedReferences.map((ref, index) => [`ref_${index + 1}`, ref.url])),
      sourceLabel: 'Composer',
      status: 'queued',
    })

    try {
      const result = await runner.runGeneration(request, {
        onQueued: ({ taskId, submittedAt, settings }) => {
          setGenerationStatus('Queued...')
          updateHistoryItem(historyId, {
            status: 'running',
            taskId,
            submittedAt,
            provider: settings.provider,
            model: settings.model,
            ratio: settings.ratio,
            resolution: settings.resolution,
            duration: settings.duration,
            generateAudio: settings.generateAudio,
          })
        },
        onStatus: (statusText) => {
          setGenerationStatus(statusText)
        }
      })

      if (result) {
        setGenerationStatus('Completed!')
        updateHistoryItem(historyId, {
          status: 'success',
          resultUrl: result.resultUrl,
          taskId: result.taskId,
          submittedAt: result.submittedAt,
          receivedAt: result.receivedAt,
          completedAt: result.receivedAt,
          provider: result.settings.provider,
          model: result.settings.model,
          ratio: result.settings.ratio,
          resolution: result.settings.resolution,
          duration: result.settings.duration,
          generateAudio: result.settings.generateAudio,
        })
      }
    } catch (error) {
      console.error(error)
      const errorMessage = error instanceof Error ? error.message : 'Generation failed.'
      setGenerationStatus(errorMessage)
      updateHistoryItem(historyId, { status: 'failed', errorMessage, completedAt: Date.now() })
    } finally {
      setIsGenerating(false)
    }
  }, [addHistoryItem, buildCurrentRequest, promptText, runner, selectedReferences, updateHistoryItem])

  return {
    activeMode,
    activeModeId,
    applyRefineAction,
    applyTemplate,
    closeMenus,
    composerConfigChips,
    composerModelChip,
    composerModeOptions,
    composerRefineActions,
    composerTemplates,
    isRefineMenuOpen,
    isTemplatesMenuOpen,
    promptText,
    selectMode,
    toggleRefineMenu,
    toggleTemplatesMenu,
    updatePromptText,
    startGeneration,
    isGenerating,
    generationStatus,
    selectedReferences,
    addReference,
    removeReference,
  }
}