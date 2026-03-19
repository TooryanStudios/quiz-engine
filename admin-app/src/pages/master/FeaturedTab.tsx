import { useState, useMemo } from 'react'
import type { QuizDoc } from '../../types/quiz'
import { setQuizFeatured } from '../../lib/adminRepo'
import { getBestCoverImage } from '../../lib/utils'

interface Props {
  quizzes: (QuizDoc & { id: string })[]
  hasMore: boolean
  loadingMore: boolean
  onLoadMore: () => void
}

const FEATURED_SLOTS = [
  { value: 1, label: 'Hero (1)' },
  { value: 2, label: 'Side A (2)' },
  { value: 3, label: 'Side B (3)' },
  { value: 4, label: 'Curated (4)' },
  { value: 5, label: 'Curated (5)' },
  { value: 6, label: 'Curated (6)' },
  { value: 7, label: 'Curated (7)' },
  { value: 8, label: 'Curated (8)' },
  { value: 9, label: 'Curated (9)' },
]

export function FeaturedTab({ quizzes, hasMore, loadingMore, onLoadMore }: Props) {
  const [isSaving, setIsSaving] = useState(false)
  const [isLoadingAll, setIsLoadingAll] = useState(false)
  
  // Selection Dialog State
  const [activeSlot, setActiveSlot] = useState<typeof FEATURED_SLOTS[0] | null>(null)
  const [searchTerm, setSearchTerm] = useState('')

  // Only public quizzes can be featured
  const publicQuizzes = useMemo(() => {
    return quizzes.filter(q => q.visibility === 'public')
  }, [quizzes])

  const initialSlots = useMemo(() => {
    const map: Record<number, (QuizDoc & { id: string }) | null> = {}
    FEATURED_SLOTS.forEach(slot => {
      map[slot.value] = publicQuizzes.find(q => q.featured && q.featuredPriority === slot.value) || null
    })
    return map
  }, [publicQuizzes])

  const [draftSlots, setDraftSlots] = useState<Record<number, (QuizDoc & { id: string }) | null> | null>(null)
  const currentSlots = draftSlots || initialSlots
  const hasChanges = draftSlots !== null

  function handleLocalAssign(quiz: QuizDoc & { id: string }, slotValue: number) {
    const newSlots = { ...currentSlots }
    Object.keys(newSlots).forEach(key => {
      if (newSlots[Number(key)]?.id === quiz.id) {
        newSlots[Number(key)] = null
      }
    })
    newSlots[slotValue] = quiz
    setDraftSlots(newSlots)
    setActiveSlot(null)
    setSearchTerm('')
  }

  function handleLocalRemove(slotValue: number) {
    const newSlots = { ...currentSlots }
    newSlots[slotValue] = null
    setDraftSlots(newSlots)
  }

  async function handleSave() {
    if (!draftSlots) return
    setIsSaving(true)
    try {
      const quizzesToUpdate = new Set<string>()
      
      FEATURED_SLOTS.forEach(slot => {
        const initQuiz = initialSlots[slot.value]
        const draftQuiz = draftSlots[slot.value]
        
        if (initQuiz?.id !== draftQuiz?.id) {
          if (initQuiz) quizzesToUpdate.add(initQuiz.id)
          if (draftQuiz) quizzesToUpdate.add(draftQuiz.id)
        }
      })

      const promises = Array.from(quizzesToUpdate).map(id => {
        const assignedSlot = FEATURED_SLOTS.find(s => draftSlots[s.value]?.id === id)
        if (assignedSlot) {
          return setQuizFeatured(id, true, assignedSlot.value)
        } else {
          return setQuizFeatured(id, false)
        }
      })

      await Promise.all(promises)
      setDraftSlots(null)
    } finally {
      setIsSaving(false)
    }
  }

  // Filter and sort for the dialog
  const searchResults = useMemo(() => {
    let results = publicQuizzes
    if (searchTerm.trim()) {
      const lowerTheme = searchTerm.toLowerCase()
      results = results.filter(q => 
        (q.title || '').toLowerCase().includes(lowerTheme) || 
        q.ownerId.includes(searchTerm)
      )
    }
    return results.sort((a, b) => (b.totalPlays || 0) - (a.totalPlays || 0)).slice(0, 50)
  }, [publicQuizzes, searchTerm])


  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
        <div>
          <h2 style={{ marginBottom: '0.5rem', fontSize: '1.25rem', color: 'var(--text-bright)' }}>🌟 Featured Content Manager</h2>
          <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.85rem' }}>
            Click on any slot below to assign a new public quiz or game to it. Don't forget to save!
          </p>
        </div>
        
        {hasChanges && (
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
            <button
              disabled={isSaving}
              onClick={() => setDraftSlots(null)}
              style={{
                padding: '0.5rem 1rem',
                border: '1px solid var(--border-strong)',
                background: 'transparent',
                color: 'var(--text)',
                borderRadius: '6px',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              Discard Changes
            </button>
            <button
              disabled={isSaving}
              onClick={() => void handleSave()}
              style={{
                padding: '0.5rem 1.5rem',
                border: 'none',
                background: '#2563eb',
                color: 'white',
                borderRadius: '6px',
                fontWeight: 600,
                cursor: 'pointer',
                opacity: isSaving ? 0.7 : 1
              }}
            >
              {isSaving ? 'Saving...' : 'Save Settings'}
            </button>
          </div>
        )}
      </div>

      {/* Slots Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
        gap: '1.25rem',
        marginBottom: '2rem'
      }}>
        {FEATURED_SLOTS.map(slot => {
          const matchedQuiz = currentSlots[slot.value]

          return (
            <div 
              key={slot.value} 
              onClick={() => {
                // If clicked, open the dialog for this slot
                setActiveSlot(slot)
                setSearchTerm('')
              }}
              style={{
              border: `2px solid ${matchedQuiz ? 'var(--border-strong)' : 'var(--border-mid)'}`,
              borderRadius: '12px',
              padding: '1.25rem',
              background: matchedQuiz ? 'var(--bg-card)' : 'var(--bg-surface)',
              position: 'relative',
              boxShadow: matchedQuiz ? 'var(--shadow-sm)' : 'none',
              cursor: 'pointer',
              transition: 'transform 0.15s ease, box-shadow 0.15s ease'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-2px)'
                e.currentTarget.style.boxShadow = 'var(--shadow-md)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)'
                e.currentTarget.style.boxShadow = matchedQuiz ? 'var(--shadow-sm)' : 'none'
              }}
            >
              <div style={{ fontSize: '0.8rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.75rem' }}>
                Slot: {slot.label}
              </div>

              {matchedQuiz ? (() => {
                const draftQuiz = draftSlots?.[slot.value]
                const initQuiz = initialSlots[slot.value]
                const isDirty = draftQuiz?.id !== initQuiz?.id

                const coverImage = getBestCoverImage(matchedQuiz.coverImage, matchedQuiz.questions ?? [])
                const fallbackGradient = 'linear-gradient(135deg, #3b82f6, #8b5cf6)'

                return (
                <>
                  <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.25rem' }}>
                    <div style={{
                      width: '60px',
                      height: '60px',
                      borderRadius: '8px',
                      flexShrink: 0,
                      backgroundImage: coverImage ? `url("${coverImage}")` : undefined,
                      backgroundSize: 'cover',
                      backgroundPosition: 'center',
                      background: coverImage ? '#0f172a' : fallbackGradient,
                      boxShadow: 'inset 0 0 0 1px rgba(0,0,0,0.1)'
                    }} />
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.3rem' }}>
                        <div style={{ fontWeight: 700, fontSize: '1.05rem', color: 'var(--text-bright)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {matchedQuiz.title || 'Untitled'}
                        </div>
                        {isDirty && (
                          <span style={{ fontSize: '0.65rem', background: '#fef08a', color: '#854d0e', padding: '0.1rem 0.4rem', borderRadius: '4px', fontWeight: 700 }}>NEW</span>
                        )}
                      </div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-dim)' }}>
                        <span style={{ fontFamily: 'monospace' }}>{matchedQuiz.ownerId.slice(0, 8)}...</span>
                      </div>
                    </div>
                  </div>
                  <button
                    disabled={isSaving}
                    onClick={(e) => {
                      e.stopPropagation() // Prevent opening the dialog
                      handleLocalRemove(slot.value)
                    }}
                    style={{
                      width: '100%',
                      padding: '0.5rem',
                      background: '#fee2e2',
                      color: '#b91c1c',
                      border: '1px solid #fecaca',
                      borderRadius: '6px',
                      fontWeight: 700,
                      fontSize: '0.8rem',
                      cursor: 'pointer',
                      opacity: isSaving ? 0.5 : 1,
                      transition: 'background 0.15s'
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = '#fca5a5'}
                    onMouseLeave={e => e.currentTarget.style.background = '#fee2e2'}
                  >
                    Remove from Slot
                  </button>
                </>
              )})() : (
                <div style={{ 
                  color: 'var(--text-dim)', 
                  fontSize: '0.95rem', 
                  fontWeight: 600,
                  padding: '2rem 0',
                  textAlign: 'center',
                  background: 'var(--bg-deep)',
                  borderRadius: '8px',
                  border: '1px dashed var(--border-strong)'
                }}>
                  + Click to Assign Game
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Assignment Dialog */}
      {activeSlot !== null && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.6)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999
        }}>
          <div style={{ 
            background: 'var(--bg-card)', 
            padding: '1.5rem', 
            borderRadius: '16px',
            boxShadow: '0 10px 40px rgba(0,0,0,0.3)',
            minWidth: '450px', maxWidth: '90vw',
            border: '1px solid var(--border)'
          }}>
            <h3 style={{ marginTop: 0, marginBottom: '0.5rem', fontSize: '1.25rem', color: 'var(--text-bright)' }}>
              Assign to {activeSlot.label}
            </h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '1rem' }}>
              Search for a public game or quiz to feature in this slot.
            </p>

            {hasMore && (
              <div style={{
                marginBottom: '1rem',
                padding: '0.75rem',
                background: 'rgba(245,158,11,0.1)',
                border: '1px solid rgba(245,158,11,0.3)',
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '0.75rem'
              }}>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-mid)' }}>
                  <strong style={{ color: '#f59e0b' }}>⚠️ Not all quizzes loaded.</strong> Showing first {quizzes.length}. Click to load all.
                </div>
                <button
                  disabled={isLoadingAll || loadingMore}
                  onClick={async () => {
                    setIsLoadingAll(true)
                    try {
                      while (hasMore) {
                        await onLoadMore()
                        // Small delay to prevent overwhelming Firestore
                        await new Promise(resolve => setTimeout(resolve, 100))
                      }
                    } finally {
                      setIsLoadingAll(false)
                    }
                  }}
                  style={{
                    padding: '0.4rem 0.9rem',
                    background: '#f59e0b',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '6px',
                    fontWeight: 700,
                    fontSize: '0.75rem',
                    cursor: isLoadingAll || loadingMore ? 'default' : 'pointer',
                    opacity: isLoadingAll || loadingMore ? 0.6 : 1,
                    whiteSpace: 'nowrap'
                  }}
                >
                  {isLoadingAll ? 'Loading...' : 'Load All'}
                </button>
              </div>
            )}

            <input
              autoFocus
              type="text"
              placeholder="Search by title or owner ID..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              style={{
                width: '100%',
                padding: '0.7rem 1rem',
                borderRadius: '8px',
                border: '2px solid var(--border-strong)',
                background: 'var(--bg-input)',
                color: 'var(--text)',
                marginBottom: '1rem',
                fontSize: '0.95rem',
                outline: 'none'
              }}
            />

            <div style={{ 
              maxHeight: '400px', 
              overflowY: 'auto', 
              border: '1px solid var(--border)',
              borderRadius: '8px',
              background: 'var(--bg-surface)'
            }}>
              {isLoadingAll ? (
                <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                  <div style={{ marginBottom: '0.5rem', fontSize: '1.5rem' }}>⏳</div>
                  <div>Loading all quizzes...</div>
                </div>
              ) : searchResults.length === 0 ? (
                 <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                   No public quizzes found matching your search.
                 </div>
              ) : (
                searchResults.map(q => {
                  const isCurrentlyAssignedHere = currentSlots[activeSlot.value]?.id === q.id
                  
                  return (
                    <div 
                      key={q.id}
                      style={{ 
                        padding: '0.75rem 1rem', 
                        borderBottom: '1px solid var(--border)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '1rem',
                        background: isCurrentlyAssignedHere ? 'rgba(37,99,235,0.08)' : 'transparent'
                      }}
                    >
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <div style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--text-bright)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {q.title || 'Untitled'}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                          Plays: {(q.totalPlays || 0).toLocaleString()} • Owner: <span style={{ fontFamily: 'monospace' }}>{q.ownerId.slice(0,8)}</span>
                        </div>
                      </div>
                      
                      <button
                        disabled={isSaving || isCurrentlyAssignedHere}
                        onClick={() => handleLocalAssign(q as QuizDoc & { id: string }, activeSlot.value)}
                        style={{
                          padding: '0.4rem 1rem',
                          background: isCurrentlyAssignedHere ? 'var(--bg-deep)' : '#2563eb',
                          color: isCurrentlyAssignedHere ? 'var(--text-dim)' : 'white',
                          border: 'none',
                          borderRadius: '6px',
                          fontWeight: 600,
                          fontSize: '0.8rem',
                          cursor: isCurrentlyAssignedHere ? 'default' : 'pointer',
                          flexShrink: 0,
                          opacity: isSaving ? 0.6 : 1
                        }}
                      >
                        {isCurrentlyAssignedHere ? 'Current' : 'Assign'}
                      </button>
                    </div>
                  )
                })
              )}
            </div>
            
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1.5rem' }}>
              <button 
                onClick={() => {
                  setActiveSlot(null)
                  setSearchTerm('')
                }}
                style={{
                  padding: '0.5rem 1.25rem',
                  background: 'transparent',
                  border: '1px solid var(--border-strong)',
                  color: 'var(--text)',
                  borderRadius: '6px',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
