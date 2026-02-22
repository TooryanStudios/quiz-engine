import { createContext, useContext, useState } from 'react'
import type { ReactNode } from 'react'

export interface DialogOptions {
  title: string
  message: string
  confirmText?: string
  cancelText?: string
  onConfirm: () => void | Promise<void>
  onCancel?: () => void
  isDangerous?: boolean
}

interface DialogContextType {
  show: (options: DialogOptions) => void
  hide: () => void
  isOpen: boolean
  dialog: DialogOptions | null
}

const DialogContext = createContext<DialogContextType | undefined>(undefined)

export function DialogProvider({ children }: { children: ReactNode }) {
  const [dialog, setDialog] = useState<DialogOptions | null>(null)
  const [isOpen, setIsOpen] = useState(false)

  const show = (options: DialogOptions) => {
    setDialog(options)
    setIsOpen(true)
  }

  const hide = () => {
    setIsOpen(false)
    setTimeout(() => setDialog(null), 300) // Allow animation to complete
  }

  return (
    <DialogContext.Provider value={{ show, hide, isOpen, dialog }}>
      {children}
    </DialogContext.Provider>
  )
}

export function useDialog() {
  const context = useContext(DialogContext)
  if (!context) {
    throw new Error('useDialog must be used within DialogProvider')
  }
  return context
}
