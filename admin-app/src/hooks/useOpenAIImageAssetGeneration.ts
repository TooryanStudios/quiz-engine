import { useCallback, useMemo, useState } from 'react'
import { storage } from '../lib/firebase'
import {
  fetchOpenAIImageHealth,
  type OpenAIImageFirebaseConfig,
  type OpenAIImageHealth,
} from '../lib/openai/openAIImageClient'
import {
  generateAndSaveOpenAIImageToLibrary,
  type GenerateAndSaveOpenAIImageToLibraryResult,
} from '../lib/openai/openAIImageAssetService'

type UseOpenAIImageAssetGenerationOptions = {
  apiBaseUrl?: string
  endpoint?: string
  healthEndpoint?: string
  firebaseConfig?: OpenAIImageFirebaseConfig
  onSuccess?: (result: GenerateAndSaveOpenAIImageToLibraryResult) => void | Promise<void>
  onError?: (message: string) => void
}

type GenerateAndSaveRequest = {
  prompt: string
  model?: string
  fallbackModel?: string
  size?: string
  quality?: 'auto' | 'low' | 'medium' | 'high'
  background?: 'auto' | 'opaque' | 'transparent'
  outputFormat?: 'png' | 'jpeg' | 'webp'
  outputCompression?: number
  moderation?: 'auto' | 'low'
  n?: number
  title?: string
  assetIndex?: number
  storagePathPrefix?: string
  studioProjectId?: string | null
  authUid?: string
  maxItems?: number
  firebaseConfig?: OpenAIImageFirebaseConfig
}

const readDefaultFirebaseConfig = (): OpenAIImageFirebaseConfig => ({
  apiKey: String(storage.app.options.apiKey || ''),
  authDomain: String(storage.app.options.authDomain || ''),
  projectId: String(storage.app.options.projectId || ''),
  storageBucket: String(storage.app.options.storageBucket || ''),
  messagingSenderId: String(storage.app.options.messagingSenderId || ''),
  appId: String(storage.app.options.appId || ''),
})

export function useOpenAIImageAssetGeneration({
  apiBaseUrl = '',
  endpoint,
  healthEndpoint,
  firebaseConfig,
  onSuccess,
  onError,
}: UseOpenAIImageAssetGenerationOptions = {}) {
  const [isGenerating, setIsGenerating] = useState(false)
  const [lastResult, setLastResult] = useState<GenerateAndSaveOpenAIImageToLibraryResult | null>(null)
  const [lastError, setLastError] = useState('')
  const [health, setHealth] = useState<OpenAIImageHealth | null>(null)
  const [isCheckingHealth, setIsCheckingHealth] = useState(false)

  const defaultFirebaseConfig = useMemo(() => readDefaultFirebaseConfig(), [])

  const generateAndSave = useCallback(async (request: GenerateAndSaveRequest) => {
    setIsGenerating(true)
    setLastError('')

    try {
      const result = await generateAndSaveOpenAIImageToLibrary({
        request: {
          prompt: request.prompt,
          model: request.model,
          fallbackModel: request.fallbackModel,
          size: request.size,
          quality: request.quality,
          background: request.background,
          outputFormat: request.outputFormat,
          outputCompression: request.outputCompression,
          moderation: request.moderation,
          n: request.n,
          title: request.title,
          assetIndex: request.assetIndex,
          storagePathPrefix: request.storagePathPrefix,
          firebaseConfig: request.firebaseConfig || firebaseConfig || defaultFirebaseConfig,
        },
        apiBaseUrl,
        endpoint,
        studioProjectId: request.studioProjectId,
        authUid: request.authUid,
        maxItems: request.maxItems,
      })
      setLastResult(result)
      await onSuccess?.(result)
      return result
    } catch (error) {
      const message = error instanceof Error ? error.message : 'OpenAI image generation and save failed.'
      setLastError(message)
      onError?.(message)
      throw error
    } finally {
      setIsGenerating(false)
    }
  }, [apiBaseUrl, defaultFirebaseConfig, endpoint, firebaseConfig, onError, onSuccess])

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
    generateAndSave,
    reset,
    health,
    isCheckingHealth,
    checkHealth,
  }
}