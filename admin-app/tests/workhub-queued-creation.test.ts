import { describe, expect, it, vi } from 'vitest'
import { finishQueuedCreation } from '../src/lib/workhubQueuedCreation'

describe('local creation feedback', () => {
  it('opens editing before a slow server confirms and does not reopen it on confirmation', async () => {
    let acknowledge!: () => void
    const write = new Promise<void>(resolve => { acknowledge = resolve })
    const edit = vi.fn()
    const completed = vi.fn()
    const creation = finishQueuedCreation('local-id', write, edit).then(completed)
    expect(edit).toHaveBeenCalledWith('local-id')
    await Promise.resolve()
    expect(completed).not.toHaveBeenCalled()
    acknowledge()
    await creation
    expect(completed).toHaveBeenCalledWith('local-id')
    expect(edit).toHaveBeenCalledTimes(1)
  })
  it('still rejects failed writes instead of reporting successful creation', async () => {
    let reject!: (error: Error) => void
    const write = new Promise<void>((_, fail) => { reject = fail })
    const edit = vi.fn()
    const creation = finishQueuedCreation('local-id', write, edit)
    const assertion = expect(creation).rejects.toThrow('permission-denied')
    expect(edit).toHaveBeenCalledTimes(1)
    reject(new Error('permission-denied'))
    await assertion
  })
  it('preserves awaited creation for callers without immediate feedback', async () => {
    await expect(finishQueuedCreation('saved-id', Promise.resolve())).resolves.toBe('saved-id')
  })
})
