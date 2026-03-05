import { useState } from 'react'
import './AvatarPickerDialog.css'

export const AVATAR_EMOJIS = [
  '🐶', '🐱', '🐭', '🐹', '🐰', '🦊', '🐻', '🐼',
  '🐨', '🐯', '🦁', '🐮', '🐸', '🐵', '🐔', '🐧',
  '🐦', '🦆', '🦉', '🦋', '🐢', '🦖', '🐙', '🦈',
  '🦄', '🐲', '🐺', '🦝', '🐗', '🦔', '🦦', '🦥',
  '🚀', '👾', '🤖', '👻', '🎃', '⭐', '🔥', '❄️',
  '🌊', '⚡', '🎯', '🏆', '💎', '🎮', '🕹️', '🎲',
]

interface AvatarPickerDialogProps {
  isOpen: boolean
  current: string
  onClose: () => void
  onSelect: (emoji: string) => void
}

export function AvatarPickerDialog({ isOpen, current, onClose, onSelect }: AvatarPickerDialogProps) {
  const [hovered, setHovered] = useState<string | null>(null)

  if (!isOpen) return null

  return (
    <div className="avatar-picker-backdrop" onClick={onClose}>
      <div className="avatar-picker-dialog" onClick={e => e.stopPropagation()}>
        <div className="avatar-picker-header">
          <span className="avatar-picker-title">اختر أيقونتك</span>
          <button className="avatar-picker-close" onClick={onClose} type="button">✕</button>
        </div>

        <div className="avatar-picker-grid">
          {AVATAR_EMOJIS.map(emoji => (
            <button
              key={emoji}
              type="button"
              className={`avatar-picker-cell${emoji === current ? ' selected' : ''}${emoji === hovered ? ' hovered' : ''}`}
              onClick={() => { onSelect(emoji); onClose() }}
              onMouseEnter={() => setHovered(emoji)}
              onMouseLeave={() => setHovered(null)}
              title={emoji}
            >
              {emoji}
            </button>
          ))}
        </div>

        {current && (
          <div className="avatar-picker-footer">
            <span className="avatar-picker-current-label">الحالي:</span>
            <span className="avatar-picker-current">{current}</span>
            <button
              type="button"
              className="avatar-picker-remove"
              onClick={() => { onSelect(''); onClose() }}
            >
              إزالة
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
