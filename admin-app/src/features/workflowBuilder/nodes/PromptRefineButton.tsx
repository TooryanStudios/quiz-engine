import { memo, useCallback, useState } from 'react'
import { Sparkles, Loader } from 'lucide-react'

const CHATBOT_BASE = (import.meta.env.VITE_CHATBOT_API_URL as string | undefined) || ''
const apiUrl = (path: string) => `${CHATBOT_BASE.replace(/\/$/, '')}${path}`

type PromptRefineButtonProps = {
  prompt: string
  onApply: (refined: string) => void
  disabled?: boolean
  className?: string
  title?: string
}

export const PromptRefineButton = memo(function PromptRefineButton({
  prompt,
  onApply,
  disabled,
  className,
  title,
}: PromptRefineButtonProps) {
  const [isRefining, setIsRefining] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleClick = useCallback(async (event: React.MouseEvent) => {
    event.stopPropagation()
    const text = (prompt || '').trim()
    if (!text || isRefining) return
    setError(null)
    setIsRefining(true)
    try {
      const response = await fetch(apiUrl('/api/refine-prompt'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: text }),
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok || !data.refined) {
        setError(data?.error || 'Refinement failed')
        return
      }
      onApply(String(data.refined))
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setIsRefining(false)
    }
  }, [prompt, isRefining, onApply])

  const isDisabled = disabled || isRefining || !prompt.trim()
  const tooltip = error ? `Refine failed: ${error}` : (title || 'Refine prompt with AI')

  return (
    <button
      type="button"
      className={`workflow-builder-node__refine-btn nodrag${className ? ` ${className}` : ''}${error ? ' workflow-builder-node__refine-btn--error' : ''}`}
      onClick={handleClick}
      disabled={isDisabled}
      title={tooltip}
      aria-label={tooltip}
    >
      {isRefining ? <Loader size={12} className="wf-spin" /> : <Sparkles size={12} />}
      <span>{isRefining ? 'Refining…' : 'Refine'}</span>
    </button>
  )
})
