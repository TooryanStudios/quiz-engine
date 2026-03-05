import { useState } from 'react'
import './SlidePanel.css'
import type { QuizQuestion } from '../../types/quiz'
import type { SlidePanelOrientation } from '../../hooks/useSlidePanel'

type SlidePanelProps = {
  questions: QuizQuestion[]
  activeIndex: number
  orientation: SlidePanelOrientation
  onSelect: (index: number) => void
  onAdd: () => void
  onReorder?: (from: number, to: number) => void
}

function getTypeIcon(q: QuizQuestion): string {
  if (q.miniGameBlockId) return '🎮'
  switch (q.type) {
    case 'single':     return '🔘'
    case 'multi':      return '☑️'
    case 'match':      return '🔗'
    case 'match_plus': return '🔀'
    case 'order':      return '🔢'
    case 'order_plus': return '📊'
    case 'type':       return '✏️'
    case 'boss':       return '👑'
    default:           return '❓'
  }
}

function getTypeLabel(q: QuizQuestion): string {
  if (q.miniGameBlockId) return q.miniGameBlockId
  return q.text?.slice(0, 55) || '(سؤال بدون نص)'
}

export function SlidePanel({
  questions,
  activeIndex,
  orientation,
  onSelect,
  onAdd,
  onReorder,
}: SlidePanelProps) {
  const isHorizontal = orientation === 'bottom'
  const [dragFrom, setDragFrom] = useState<number | null>(null)
  const [dragOver, setDragOver] = useState<number | null>(null)

  const handleDragStart = (i: number) => {
    setDragFrom(i)
    setDragOver(i)
  }

  const handleDragEnter = (i: number) => {
    if (dragFrom !== null && i !== dragOver) setDragOver(i)
  }

  const handleDrop = (i: number) => {
    if (dragFrom !== null && dragFrom !== i && onReorder) {
      onReorder(dragFrom, i)
    }
    setDragFrom(null)
    setDragOver(null)
  }

  const handleDragEnd = () => {
    setDragFrom(null)
    setDragOver(null)
  }

  return (
    <div className={`slide-panel slide-panel--${orientation}`}>
      {/* Thumbnails */}
      <div className={`slide-thumbs--${isHorizontal ? 'row' : 'col'}`}>
        {questions.map((q, i) => {
          const isDragging = dragFrom === i
          const isDropTarget = dragOver === i && dragFrom !== null && dragFrom !== i
          return (
            <button
              key={i}
              type="button"
              draggable={!!onReorder}
              className={[
                'slide-thumb',
                i === activeIndex ? 'slide-thumb--active' : '',
                isDragging ? 'slide-thumb--dragging' : '',
                isDropTarget ? 'slide-thumb--drop-target' : '',
              ].filter(Boolean).join(' ')}
              onClick={() => onSelect(i)}
              onDragStart={() => handleDragStart(i)}
              onDragEnter={() => handleDragEnter(i)}
              onDragOver={(e) => { e.preventDefault() }}
              onDrop={() => handleDrop(i)}
              onDragEnd={handleDragEnd}
              title={q.text || `السؤال ${i + 1}`}
            >
              <div className="slide-thumb-header">
                <span className="slide-thumb-num">{i + 1}</span>
                <span className="slide-thumb-type">{getTypeIcon(q)}</span>
              </div>

              {q.media?.type === 'image' && q.media.url && (
                <div className="slide-thumb-img">
                  <img src={q.media.url} alt="" loading="lazy" />
                </div>
              )}

              <div className="slide-thumb-text">{getTypeLabel(q)}</div>
            </button>
          )
        })}

        {/* Add new button */}
        <button
          type="button"
          className="slide-thumb slide-thumb--add"
          onClick={onAdd}
          title="إضافة سؤال جديد"
        >
          <span className="slide-thumb-add-icon">＋</span>
          <span className="slide-thumb-add-label">إضافة</span>
        </button>
      </div>
    </div>
  )
}
