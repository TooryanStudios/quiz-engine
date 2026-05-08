import { useCallback, useState } from 'react'
import {
  fetchOpenAIImageHealth,
  generateOpenAIImages,
  type OpenAIImageGenerationRequest,
  type OpenAIImageGenerationResponse,
  type OpenAIImageHealth,
} from '../lib/openai/openAIImageClient'

type UseOpenAIImageGenerationOptions = {
  apiBaseUrl?: string
  endpoint?: string
  healthEndpoint?: string
  onSuccess?: (result: OpenAIImageGenerationResponse) => void | Promise<void>
  onError?: (message: string) => void
}

export function useOpenAIImageGeneration({
  apiBaseUrl = '',
  endpoint,
  healthEndpoint,
  onSuccess,
  onError,
}: UseOpenAIImageGenerationOptions = {}) {
  const [isGenerating, setIsGenerating] = useState(false)
  const [lastResult, setLastResult] = useState<OpenAIImageGenerationResponse | null>(null)
  const [lastError, setLastError] = useState('')
  const [health, setHealth] = useState<OpenAIImageHealth | null>(null)
  const [isCheckingHealth, setIsCheckingHealth] = useState(false)

  const generate = useCallback(async (request: OpenAIImageGenerationRequest) => {
    setIsGenerating(true)
    setLastError('')

    try {
      const result = await generateOpenAIImages(request, {
        apiBaseUrl,
        endpoint,
      })
      setLastResult(result)
      await onSuccess?.(result)
      return result
    } catch (error) {
      const message = error instanceof Error ? error.message : 'OpenAI image generation failed.'
      setLastError(message)
      onError?.(message)
      throw error
    } finally {
      setIsGenerating(false)
    }
  }, [apiBaseUrl, endpoint, onError, onSuccess])

  const checkHealth = useCallback(async () => {
    setIsCheckingHealth(true)
    try {
      const result = await fetchOpenAIImageHealth(apiBaseUrl, healthEndpoint)
      setHealth(result)
      return result
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Could not load OpenAI image health status.'
      setLastError(message)
      onError?.(message)
      throw error
    } finally {
      setIsCheckingHealth(false)
    }
  }, [apiBaseUrl, healthEndpoint, onError])

  const reset = useCallback(() => {
    setLastError('')
    setLastResult(null)
  }, [])

  return {
    isGenerating,
    lastResult,
    lastError,
    generate,
    reset,
    health,
    isCheckingHealth,
    checkHealth,
  }
}