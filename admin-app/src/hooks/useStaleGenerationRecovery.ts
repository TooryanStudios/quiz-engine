import { useEffect, useRef } from 'react'
import { useLabNewLayoutStore } from '../pages/LabNewLayout/useLabNewLayoutStore'
import { useGenerationRunner, type GenerationRequestSettings } from './useGenerationRunner'

const STALE_THRESHOLD_MS = 30 * 60 * 1000 // 30 minutes

export function useStaleGenerationRecovery(apiBaseUrl?: string) {
  const hasRunRef = useRef(false)
  const runner = useGenerationRunner({ apiBaseUrl })

  useEffect(() => {
    if (hasRunRef.current) return
    hasRunRef.current = true

    const { history, updateHistoryItem } = useLabNewLayoutStore.getState()
    const now = Date.now()

    const stale = history.filter(
      (item) =>
        (item.status === 'running' || item.status === 'queued') &&
        now - item.timestamp > STALE_THRESHOLD_MS,
    )

    if (stale.length === 0) return

    const recoverAll = async () => {
      for (const item of stale) {
        const canResume =
          item.taskId &&
          item.provider &&
          item.model &&
          item.ratio &&
          item.resolution &&
          item.duration != null

        if (!canResume) {
          updateHistoryItem(item.id, {
            status: 'failed',
            errorMessage: 'Generation was interrupted and could not be recovered (missing task info).',
          })
          continue
        }

        const settings: GenerationRequestSettings = {
          provider: item.provider as GenerationRequestSettings['provider'],
          model: item.model,
          ratio: item.ratio!,
          duration: item.duration!,
          resolution: item.resolution!,
          generateAudio: item.generateAudio ?? false,
        }

        try {
          const result = await runner.resumeGenerationTask(
            { taskId: item.taskId!, settings },
            { shouldCancel: () => false },
          )

          if (result) {
            updateHistoryItem(item.id, {
              status: 'success',
              resultUrl: result.resultUrl,
              receivedAt: result.receivedAt,
            })
          } else {
            updateHistoryItem(item.id, {
              status: 'failed',
              errorMessage: 'Generation recovery returned no result.',
            })
          }
        } catch {
          updateHistoryItem(item.id, {
            status: 'failed',
            errorMessage: 'Generation timed out after 30+ minutes and could not be recovered.',
          })
        }
      }
    }

    void recoverAll()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
}
