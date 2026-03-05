import React, { useEffect, useRef } from 'react'

type ToolbarDropdownMenuProps = {
  quizId: string | null
  anchor?: { top: number; right: number }
  onClose: () => void
  onOpenMetadata: () => void
  onPreviewQuiz: () => void
  onCopyLink: () => void
  onShareLink: () => void
  onDeleteQuiz: () => void
}

export function ToolbarDropdownMenu({
  quizId,
  anchor,
  onClose,
  onOpenMetadata,
  onPreviewQuiz,
  onCopyLink,
  onShareLink,
  onDeleteQuiz,
}: ToolbarDropdownMenuProps) {
  const hasQuiz = !!quizId

  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleMouseDown(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose()
      }
    }
    document.addEventListener('mousedown', handleMouseDown)
    return () => document.removeEventListener('mousedown', handleMouseDown)
  }, [onClose])

  const style = anchor
    ? { top: anchor.top, right: anchor.right } as React.CSSProperties
    : undefined

  return (
    <div ref={menuRef} className="editor-toolbar-dropdown" style={style}>
      <button
        type="button"
        onClick={() => { onOpenMetadata(); onClose() }}
        className="editor-toolbar-dropdown-item editor-toolbar-dropdown-item--divider"
      >⚙️ <span>إعدادات الاختبار</span></button>

      <div className="editor-toolbar-dropdown-section">الرابط</div>

      {hasQuiz && (
        <button
          type="button"
          onClick={() => { onPreviewQuiz(); onClose() }}
          className="editor-toolbar-dropdown-item"
        >👁️ <span>معاينة الاختبار</span></button>
      )}

      <button
        type="button"
        onClick={() => { onCopyLink(); onClose() }}
        disabled={!hasQuiz}
        className="editor-toolbar-dropdown-item"
      >📋 <span>نسخ الرابط</span></button>

      <button
        type="button"
        onClick={() => { onShareLink(); onClose() }}
        disabled={!hasQuiz}
        className="editor-toolbar-dropdown-item"
      >🔗 <span>مشاركة الرابط</span></button>

      {hasQuiz && (
        <>
          <div className="editor-toolbar-dropdown-separator" />
          <button
            type="button"
            onClick={() => { onClose(); onDeleteQuiz() }}
            className="editor-toolbar-dropdown-item editor-toolbar-dropdown-item--danger"
          >🗑️ <span>حذف الاختبار</span></button>
        </>
      )}
    </div>
  )
}
