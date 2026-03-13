import { useState, useEffect, useRef } from 'react'
import './AvatarPickerDialog.css'

// ── Avatar data organised by category ────────────────────────────────────────
const AVATAR_CATEGORIES = [
  {
    id: 'animals' as const,
    label: 'Animals',
    labelAr: 'الحيوانات',
    icon: '🐾',
    emojis: [
      '🐶','🐱','🐭','🐹','🐰','🦊','🐻','🐼','🐨','🐯',
      '🦁','🐮','🐸','🐵','🐔','🐧','🦆','🦉','🦋','🐢',
      '🦖','🦄','🐺','🦜','🦔','🐙','🦈','🦩','🦢','🦚',
      '🐗','🦓','🦒','🦬','🦣','🦥','🦦','🐬','🐳','🦭',
      '🦘','🐘','🦏','🦛','🐊','🐅','🐆','🦌','🫎','🦫',
    ],
  },
  {
    id: 'fantasy' as const,
    label: 'Fantasy',
    labelAr: 'خيال',
    icon: '✨',
    emojis: [
      '🚀','👾','🤖','👻','🎃','🧙','🦸','🐉','🌟','💫',
      '✨','🔮','🎩','🪄','🧝','🧞','🐲','🌙','🌠','🛸',
      '🗡️','🛡️','🏹','⚔️','🧙‍♀️','🧚','🧚‍♀️','🧜','🧜‍♀️','🦹',
      '🦹‍♀️','🧟','🧟‍♀️','🪬','🗝️','🧿','🕯️','🛕','🏰','🌌',
    ],
  },
  {
    id: 'elements' as const,
    label: 'Elements',
    labelAr: 'عناصر',
    icon: '⚡',
    emojis: [
      '🔥','💧','⚡','❄️','🌊','🌪️','🌈','☀️','🌙','🌺',
      '🌸','🍀','🌿','💥','🌋','🌍','🪸','☄️','⭐','🌟',
      '🌼','🌻','🍁','🍂','🍄','🪵','🪨','🌫️','🌤️','⛈️',
      '🌬️','🫧','🌱','🌲','🌳','🏔️','🏜️','🏝️','🌋','🌠',
    ],
  },
  {
    id: 'play' as const,
    label: 'Play',
    labelAr: 'لعب',
    icon: '🎮',
    emojis: [
      '🎮','🕹️','🎲','🏆','🥇','💎','🎯','🎳','⚽','🎸',
      '🚂','🪀','🧲','🧸','🎭','🥊','🏅','🎵','🎪','🥁',
      '🏀','🏐','🏉','🥏','🏓','🏸','🏒','⛳','🏄','🚴',
      '🏇','🎿','🧗','🧩','♟️','🪄','📸','🎬','🎨','📚',
    ],
  },
]

type CategoryId = typeof AVATAR_CATEGORIES[number]['id']

/** Flat list of all avatars — exported for use elsewhere */
export const AVATAR_EMOJIS: string[] = AVATAR_CATEGORIES.flatMap(c => c.emojis)

export interface AvatarPickerDialogProps {
  isOpen: boolean
  current: string
  onClose: () => void
  onSelect: (emoji: string) => void
  /** Dialog heading. Defaults to locale-aware text based on `dir`. */
  title?: string
  /** Text direction of the dialog. Default: `'rtl'`. */
  dir?: 'ltr' | 'rtl'
  /** Label for the remove button. */
  removeLabel?: string
}

export function AvatarPickerDialog({
  isOpen,
  current,
  onClose,
  onSelect,
  title,
  dir = 'rtl',
  removeLabel,
}: AvatarPickerDialogProps) {
  const [activeCategory, setActiveCategory] = useState<CategoryId | 'all'>('all')
  const [search, setSearch] = useState('')
  const searchRef = useRef<HTMLInputElement>(null)

  const isRtl = dir === 'rtl'

  // Reset state and focus search when opened
  useEffect(() => {
    if (isOpen) {
      setSearch('')
      setActiveCategory('all')
      setTimeout(() => searchRef.current?.focus(), 60)
    }
  }, [isOpen])

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.preventDefault(); onClose() }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [isOpen, onClose])

  if (!isOpen) return null

  const q = search.trim()
  const pool = activeCategory === 'all'
    ? AVATAR_EMOJIS
    : (AVATAR_CATEGORIES.find(c => c.id === activeCategory)?.emojis ?? [])
  const emojis = q ? pool.filter(e => e.includes(q)) : pool

  const displayTitle = title ?? (isRtl ? 'اختر أيقونتك' : 'Choose Your Avatar')
  const removeLbl    = removeLabel ?? (isRtl ? 'إزالة' : 'Remove')

  return (
    <div
      className="apd-backdrop"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={displayTitle}
    >
      <div
        className="apd-dialog"
        dir={dir}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="apd-header">
          <span className="apd-title">{displayTitle}</span>
          <button className="apd-close" onClick={onClose} type="button" aria-label="Close">✕</button>
        </div>

        {/* Search */}
        <div className="apd-search-wrap">
          <span className="apd-search-icon">🔍</span>
          <input
            ref={searchRef}
            className="apd-search"
            type="text"
            placeholder={isRtl ? 'بحث أو الصق رمزاً…' : 'Search or paste an emoji…'}
            value={search}
            onChange={e => setSearch(e.target.value)}
            aria-label="Search avatars"
          />
          {q && (
            <button
              className="apd-search-clear"
              type="button"
              onClick={() => setSearch('')}
              aria-label="Clear"
            >✕</button>
          )}
        </div>

        {/* Category tabs — hidden while searching */}
        {!q && (
          <div className="apd-tabs">
            <button
              type="button"
              className={`apd-tab${activeCategory === 'all' ? ' is-active' : ''}`}
              onClick={() => setActiveCategory('all')}
            >
              {isRtl ? '⊞ الكل' : '⊞ All'}
            </button>
            {AVATAR_CATEGORIES.map(cat => (
              <button
                key={cat.id}
                type="button"
                className={`apd-tab${activeCategory === cat.id ? ' is-active' : ''}`}
                onClick={() => setActiveCategory(cat.id)}
              >
                {cat.icon} {isRtl ? cat.labelAr : cat.label}
              </button>
            ))}
          </div>
        )}

        {/* Grid */}
        <div className="apd-grid-wrap">
          {emojis.length === 0 ? (
            <div className="apd-empty">
              {isRtl ? '🔍 لا توجد نتائج' : '🔍 No results'}
            </div>
          ) : (
            <div className="apd-grid">
              {emojis.map(emoji => (
                <button
                  key={emoji}
                  type="button"
                  className={`apd-cell${emoji === current ? ' is-selected' : ''}`}
                  onClick={() => { onSelect(emoji); onClose() }}
                  title={emoji}
                >
                  {emoji}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="apd-footer">
          {current ? (
            <>
              <span className="apd-footer-label">{isRtl ? 'الحالي:' : 'Current:'}</span>
              <span className="apd-footer-current">{current}</span>
              <button
                type="button"
                className="apd-remove-btn"
                onClick={() => { onSelect(''); onClose() }}
              >
                {removeLbl}
              </button>
            </>
          ) : (
            <span className="apd-footer-hint">
              {isRtl ? 'اضغط على أيقونة للاختيار' : 'Tap an icon to select'}
            </span>
          )}
        </div>
      </div>
    </div>
  )
}
