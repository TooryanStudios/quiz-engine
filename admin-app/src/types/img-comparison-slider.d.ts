import type { HTMLAttributes } from 'react'

declare module 'react' {
  namespace JSX {
    interface IntrinsicElements {
      'img-comparison-slider': HTMLAttributes<HTMLElement> & {
        value?: number
        hover?: boolean
        direction?: 'horizontal' | 'vertical'
        keyboard?: 'enabled' | 'disabled'
      }
    }
  }
}
