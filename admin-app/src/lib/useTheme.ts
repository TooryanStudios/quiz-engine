import { useState, useEffect } from 'react'

export function useTheme(): 'dark' | 'light' {
  const [theme, setTheme] = useState<'dark' | 'light'>(
    () => (document.body.getAttribute('data-theme') as 'dark' | 'light') || 'dark'
  )

  useEffect(() => {
    const observer = new MutationObserver(() => {
      const t = document.body.getAttribute('data-theme') as 'dark' | 'light'
      setTheme(t || 'dark')
    })
    observer.observe(document.body, { attributes: true, attributeFilter: ['data-theme'] })
    return () => observer.disconnect()
  }, [])

  return theme
}
