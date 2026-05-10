/**
 * Generation notification sounds via Web Audio API.
 * No external assets required.
 */

function getAudioContext(): AudioContext | null {
  try {
    return new AudioContext()
  } catch {
    return null
  }
}

function playTone(
  ctx: AudioContext,
  freq: number,
  startTime: number,
  duration: number,
  gainPeak: number,
  type: OscillatorType = 'sine',
) {
  const osc = ctx.createOscillator()
  const gain = ctx.createGain()
  osc.connect(gain)
  gain.connect(ctx.destination)
  osc.type = type
  osc.frequency.setValueAtTime(freq, startTime)
  gain.gain.setValueAtTime(0, startTime)
  gain.gain.linearRampToValueAtTime(gainPeak, startTime + 0.01)
  gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration)
  osc.start(startTime)
  osc.stop(startTime + duration + 0.05)
}

/** Plays a two-note ascending chime for generation success. */
export function playGenerationSuccessSound(): void {
  const ctx = getAudioContext()
  if (!ctx) return
  const t = ctx.currentTime
  // First note: E5
  playTone(ctx, 659.25, t, 0.45, 0.55)
  // Second note: B5 — slightly after
  playTone(ctx, 987.77, t + 0.18, 0.65, 0.45)
  // Soft harmonic shimmer on the second note
  playTone(ctx, 1318.5, t + 0.22, 0.5, 0.12)
  // Auto-close context after sounds finish
  setTimeout(() => { try { void ctx.close() } catch { /* ignore */ } }, 1400)
}

/** Plays a descending buzzy tone for generation failure. */
export function playGenerationFailureSound(): void {
  const ctx = getAudioContext()
  if (!ctx) return
  const t = ctx.currentTime
  // Heavy low thud
  playTone(ctx, 180, t, 0.3, 0.7, 'sawtooth')
  // Descending sweep
  const osc = ctx.createOscillator()
  const gain = ctx.createGain()
  osc.connect(gain)
  gain.connect(ctx.destination)
  osc.type = 'triangle'
  osc.frequency.setValueAtTime(320, t + 0.05)
  osc.frequency.exponentialRampToValueAtTime(110, t + 0.45)
  gain.gain.setValueAtTime(0, t + 0.05)
  gain.gain.linearRampToValueAtTime(0.48, t + 0.08)
  gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.5)
  osc.start(t + 0.05)
  osc.stop(t + 0.6)
  setTimeout(() => { try { void ctx.close() } catch { /* ignore */ } }, 1000)
}
