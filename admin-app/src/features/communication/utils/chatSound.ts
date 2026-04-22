export interface ChatSoundPrefs {
  muteSend: boolean
  muteReceive: boolean
}

export const CHAT_SOUND_PREFS_KEY = 'qyan:chatSoundPrefs'

export function readChatSoundPrefs(): ChatSoundPrefs {
  if (typeof window === 'undefined') {
    return { muteSend: false, muteReceive: false }
  }
  try {
    const raw = window.localStorage.getItem(CHAT_SOUND_PREFS_KEY)
    if (!raw) return { muteSend: false, muteReceive: false }
    const parsed = JSON.parse(raw) as Partial<ChatSoundPrefs>
    return {
      muteSend: !!parsed.muteSend,
      muteReceive: !!parsed.muteReceive,
    }
  } catch {
    return { muteSend: false, muteReceive: false }
  }
}

export function writeChatSoundPrefs(next: ChatSoundPrefs) {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(CHAT_SOUND_PREFS_KEY, JSON.stringify(next))
}

type ExtendedWindow = Window & {
  webkitAudioContext?: typeof AudioContext
}

let sharedAudioContext: AudioContext | null = null
let unlockListenersAttached = false

function getSharedAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null
  if (sharedAudioContext) return sharedAudioContext
  const AudioCtx = window.AudioContext || (window as ExtendedWindow).webkitAudioContext
  if (!AudioCtx) return null
  sharedAudioContext = new AudioCtx()
  return sharedAudioContext
}

function installAudioUnlockListeners() {
  if (typeof window === 'undefined' || unlockListenersAttached) return
  unlockListenersAttached = true

  const tryUnlock = () => {
    const ctx = getSharedAudioContext()
    if (!ctx) return
    if (ctx.state === 'running') {
      window.removeEventListener('pointerdown', tryUnlock)
      window.removeEventListener('keydown', tryUnlock)
      window.removeEventListener('touchstart', tryUnlock)
      return
    }
    void ctx.resume().finally(() => {
      if (ctx.state === 'running') {
        window.removeEventListener('pointerdown', tryUnlock)
        window.removeEventListener('keydown', tryUnlock)
        window.removeEventListener('touchstart', tryUnlock)
      }
    })
  }

  window.addEventListener('pointerdown', tryUnlock, { passive: true })
  window.addEventListener('keydown', tryUnlock)
  window.addEventListener('touchstart', tryUnlock, { passive: true })
}

function playTone(frequency: number, durationMs: number, gainValue: number) {
  if (typeof window === 'undefined') return
  installAudioUnlockListeners()
  const ctx = getSharedAudioContext()
  if (!ctx) return

  const trigger = () => {
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = 'sine'
    osc.frequency.value = frequency
    gain.gain.value = gainValue
    osc.connect(gain)
    gain.connect(ctx.destination)

    const startAt = ctx.currentTime + 0.005
    const endAt = startAt + (durationMs / 1000)
    osc.start(startAt)
    gain.gain.setValueAtTime(gainValue, startAt)
    gain.gain.exponentialRampToValueAtTime(0.0001, endAt)
    osc.stop(endAt)
  }

  if (ctx.state === 'suspended') {
    void ctx.resume().then(() => {
      if (ctx.state !== 'running') return
      trigger()
    }).catch(() => undefined)
    return
  }

  if (ctx.state !== 'running') return
  trigger()
}

export function playChatSendSound() {
  playTone(720, 90, 0.035)
}

export function playChatReceiveSound() {
  playTone(520, 130, 0.04)
}
