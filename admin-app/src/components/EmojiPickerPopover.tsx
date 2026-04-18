import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

// ─── Default emoji sets ───────────────────────────────────────────────────────

export const EMOJI_SET_GENERAL: string[] = [
  '📝', '📋', '📌', '💡', '✅', '📊', '📁', '🗂️', '🔍', '💬',
  '🎯', '🛠️', '📎', '🔖', '📐', '📈', '🗒️', '⭐', '🔒', '🧩',
]

export const EMOJI_SET_PROJECTS: string[] = [
  '🚀', '📁', '🗂️', '🏗️', '🔧', '⚙️', '🎨', '📐', '📊', '📈',
  '💼', '🏢', '🌐', '🔗', '🛡️', '📦', '🔬', '🎯', '✅', '💡',
]

export const EMOJI_SET_DOCUMENTS: string[] = [
  '📝', '📄', '📋', '📃', '📜', '🗒️', '📑', '📌', '🔖', '💡',
  '✅', '📊', '📈', '💬', '🔍', '🧩', '⭐', '🎯', '📎', '🗺️',
]

// ─── Component ────────────────────────────────────────────────────────────────

export interface EmojiPickerPopoverProps {
  /** Current value — highlighted in the grid */
  value?: string
  /** Called when user selects an emoji */
  onSelect: (emoji: string) => void
  /** Called when user clicks "Clear". Not rendered when undefined. */
  onClear?: () => void
  /** Called when the popover should close (Escape, outside click) */
  onClose: () => void
  /** Custom emoji set. Defaults to EMOJI_SET_GENERAL. */
  emojis?: string[]
  /** Number of columns in the grid. Default 5. */
  columns?: number
  /** Show search input. Default true. */
  showSearch?: boolean
  /**
   * When provided the popover renders via a React portal attached to
   * document.body and positions itself (fixed) below this element.
   * This escapes any overflow:hidden / scroll-container clipping.
   */
  anchorEl?: HTMLElement | null
}

export function EmojiPickerPopover({
  value,
  onSelect,
  onClear,
  onClose,
  emojis = EMOJI_SET_GENERAL,
  columns = 5,
  showSearch = true,
  anchorEl,
}: EmojiPickerPopoverProps) {
  const [query, setQuery] = useState('')
  const rootRef = useRef<HTMLDivElement>(null)

  // Compute fixed position from anchor element
  const [fixedStyle, setFixedStyle] = useState<React.CSSProperties>({})
  useEffect(() => {
    if (!anchorEl) return
    const rect = anchorEl.getBoundingClientRect()
    setFixedStyle({
      position: 'fixed',
      top: rect.bottom + 4,
      left: rect.left,
      zIndex: 9999,
    })
  }, [anchorEl])

  // Close on outside click
  useEffect(() => {
    function onPointerDown(e: PointerEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        onClose()
      }
    }
    document.addEventListener('pointerdown', onPointerDown, { capture: true })
    return () => document.removeEventListener('pointerdown', onPointerDown, { capture: true })
  }, [onClose])

  // Close on Escape
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') { e.stopPropagation(); onClose() }
    }
    document.addEventListener('keydown', onKey, { capture: true })
    return () => document.removeEventListener('keydown', onKey, { capture: true })
  }, [onClose])

  const filtered = query.trim()
    ? emojis.filter((e) => e.includes(query.trim()))
    : emojis

  const popover = (
    <div
      ref={rootRef}
      className="wh-emoji-picker"
      style={{ '--wh-emoji-cols': columns, ...fixedStyle } as React.CSSProperties}
      role="dialog"
      aria-label="Pick an emoji"
      onClick={(e) => e.stopPropagation()}
    >
      {showSearch && (
        <input
          className="wh-emoji-picker-search"
          type="text"
          placeholder="Search…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          autoFocus
        />
      )}
      <div className="wh-emoji-picker-grid" role="listbox" aria-label="Emojis">
        {filtered.length === 0 ? (
          <p className="wh-emoji-picker-empty">No match</p>
        ) : (
          filtered.map((emoji) => (
            <button
              key={emoji}
              type="button"
              role="option"
              aria-selected={emoji === value}
              className={`wh-emoji-picker-opt${emoji === value ? ' is-active' : ''}`}
              onClick={() => { onSelect(emoji); onClose() }}
              title={emoji}
            >
              {emoji}
            </button>
          ))
        )}
      </div>
      {onClear && value && (
        <button
          type="button"
          className="wh-emoji-picker-clear"
          onClick={() => { onClear(); onClose() }}
        >
          Clear icon
        </button>
      )}
    </div>
  )

  if (anchorEl) {
    return createPortal(popover, document.body)
  }

  return popover
}
