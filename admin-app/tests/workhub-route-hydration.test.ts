import { describe, expect, it } from 'vitest'
import { shouldResetSelectedProjectAfterHydration } from '../src/pages/workhub/routeHydrationGuards'

describe('workhub route hydration guards', () => {
  it('keeps project selection during initial deep-link refresh hydration', () => {
    expect(shouldResetSelectedProjectAfterHydration({
      selectedProjectId: 'aXRZMDp3R6iPCX7BbvIt',
      projectsFeedHydrated: false,
      isSelectedProjectVisible: false,
    })).toBe(false)
  })

  it('resets to all when hydration is complete and project is missing', () => {
    expect(shouldResetSelectedProjectAfterHydration({
      selectedProjectId: 'aXRZMDp3R6iPCX7BbvIt',
      projectsFeedHydrated: true,
      isSelectedProjectVisible: false,
    })).toBe(true)
  })

  it('keeps selection when hydrated project is still visible', () => {
    expect(shouldResetSelectedProjectAfterHydration({
      selectedProjectId: 'aXRZMDp3R6iPCX7BbvIt',
      projectsFeedHydrated: true,
      isSelectedProjectVisible: true,
    })).toBe(false)
  })

  it('never resets when selectedProjectId is all', () => {
    expect(shouldResetSelectedProjectAfterHydration({
      selectedProjectId: 'all',
      projectsFeedHydrated: true,
      isSelectedProjectVisible: false,
    })).toBe(false)
  })
})
