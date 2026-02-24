import { useEffect, useRef, useState } from 'react'
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
} from 'firebase/firestore'
import { auth, db } from '../lib/firebase'
import { useToast } from '../lib/ToastContext'
import { incrementPlatformStat } from '../lib/adminRepo'
import './VoiceLabPage.css'

type SignalData = {
  sdp?: RTCSessionDescriptionInit
  candidate?: RTCIceCandidateInit
}

type SignalDoc = {
  from: string
  to: string
  data: SignalData
}

const rtcConfig: RTCConfiguration = {
  iceServers: [{ urls: ['stun:stun.l.google.com:19302'] }],
}

function makeParticipantId(uid: string) {
  const randomPart = (typeof crypto !== 'undefined' && 'randomUUID' in crypto)
    ? crypto.randomUUID().slice(0, 8)
    : Math.random().toString(36).slice(2, 10)
  return `${uid.slice(0, 8)}-${randomPart}`
}

export function VoiceLabPage() {
  const { showToast } = useToast()
  const [roomId, setRoomId] = useState('test-voice-lab')
  const [joined, setJoined] = useState(false)
  const [joining, setJoining] = useState(false)
  const [muted, setMuted] = useState(false)
  const [peerCount, setPeerCount] = useState(0)
  const [logs, setLogs] = useState<string[]>([])

  const participantIdRef = useRef<string | null>(null)
  const activeRoomIdRef = useRef<string | null>(null)
  const participantDocRef = useRef<ReturnType<typeof doc> | null>(null)
  const localStreamRef = useRef<MediaStream | null>(null)
  const peersRef = useRef<Map<string, RTCPeerConnection>>(new Map())
  const audioRefs = useRef<Map<string, HTMLAudioElement>>(new Map())
  const processedSignalsRef = useRef<Set<string>>(new Set())
  const unsubParticipantsRef = useRef<(() => void) | null>(null)
  const unsubSignalsRef = useRef<(() => void) | null>(null)
  const remoteAudioHostRef = useRef<HTMLDivElement>(null)

  function pushLog(message: string) {
    const time = new Date().toLocaleTimeString()
    setLogs((prev) => [`[${time}] ${message}`, ...prev].slice(0, 40))
  }

  async function sendSignal(targetParticipantId: string, data: SignalData) {
    const senderId = participantIdRef.current
    const activeRoomId = activeRoomIdRef.current
    if (!senderId || !activeRoomId) return
    await addDoc(collection(db, 'voiceRooms', activeRoomId, 'signals'), {
      from: senderId,
      to: targetParticipantId,
      data,
      createdAt: serverTimestamp(),
    })
  }

  function ensureAudioElement(remoteId: string) {
    const existing = audioRefs.current.get(remoteId)
    if (existing) return existing
    const audio = document.createElement('audio')
    audio.autoplay = true
    ;(audio as HTMLAudioElement & { playsInline?: boolean }).playsInline = true
    remoteAudioHostRef.current?.appendChild(audio)
    audioRefs.current.set(remoteId, audio)
    return audio
  }

  function cleanupPeer(remoteId: string) {
    const pc = peersRef.current.get(remoteId)
    if (pc) pc.close()
    peersRef.current.delete(remoteId)

    const audio = audioRefs.current.get(remoteId)
    if (audio) audio.remove()
    audioRefs.current.delete(remoteId)
  }

  async function createPeerConnection(remoteParticipantId: string, initiator: boolean) {
    if (peersRef.current.has(remoteParticipantId)) return peersRef.current.get(remoteParticipantId)

    const localStream = localStreamRef.current
    if (!localStream) return null

    const pc = new RTCPeerConnection(rtcConfig)
    peersRef.current.set(remoteParticipantId, pc)
    localStream.getTracks().forEach((track) => pc.addTrack(track, localStream))

    pc.onicecandidate = (event) => {
      if (!event.candidate) return
      void sendSignal(remoteParticipantId, { candidate: event.candidate.toJSON() })
    }

    pc.ontrack = (event) => {
      const audio = ensureAudioElement(remoteParticipantId)
      audio.srcObject = event.streams[0]
    }

    pc.onconnectionstatechange = () => {
      pushLog(`Peer ${remoteParticipantId.slice(-6)}: ${pc.connectionState}`)
    }

    if (initiator) {
      try {
        const offer = await pc.createOffer({ offerToReceiveAudio: true })
        await pc.setLocalDescription(offer)
        await sendSignal(remoteParticipantId, { sdp: pc.localDescription ?? undefined })
      } catch {
        pushLog(`Failed to create offer for ${remoteParticipantId.slice(-6)}`)
      }
    }

    return pc
  }

  async function handleSignal(signal: SignalDoc) {
    const remoteId = signal.from
    const pc = await createPeerConnection(remoteId, false)
    if (!pc) return

    if (signal.data.sdp) {
      await pc.setRemoteDescription(new RTCSessionDescription(signal.data.sdp))
      if (signal.data.sdp.type === 'offer') {
        const answer = await pc.createAnswer()
        await pc.setLocalDescription(answer)
        await sendSignal(remoteId, { sdp: pc.localDescription ?? undefined })
      }
      return
    }

    if (signal.data.candidate) {
      try {
        await pc.addIceCandidate(new RTCIceCandidate(signal.data.candidate))
      } catch {
        pushLog(`Invalid ICE candidate from ${remoteId.slice(-6)}`)
      }
    }
  }

  async function joinVoiceTest() {
    const user = auth.currentUser
    if (!user) {
      showToast({ type: 'error', message: 'You must be signed in to use Voice Lab.' })
      return
    }

    const sanitizedRoom = roomId.trim().toLowerCase()
    if (!/^test-[a-z0-9-]{3,36}$/.test(sanitizedRoom)) {
      showToast({ type: 'error', message: 'Use a test room id like: test-your-team' })
      return
    }

    setJoining(true)
    void incrementPlatformStat('voiceLabTests')
    try {
      const localStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false })
      localStreamRef.current = localStream

      await setDoc(doc(db, 'voiceRooms', sanitizedRoom), {
        createdAt: serverTimestamp(),
        createdBy: user.uid,
        experimental: true,
      }, { merge: true })
      activeRoomIdRef.current = sanitizedRoom

      const participantId = makeParticipantId(user.uid)
      participantIdRef.current = participantId
      const participantDoc = doc(db, 'voiceRooms', sanitizedRoom, 'participants', participantId)
      participantDocRef.current = participantDoc
      await setDoc(participantDoc, {
        uid: user.uid,
        joinedAt: serverTimestamp(),
      })

      const participantsQ = query(
        collection(db, 'voiceRooms', sanitizedRoom, 'participants'),
        orderBy('joinedAt', 'asc')
      )

      unsubParticipantsRef.current = onSnapshot(participantsQ, (snap) => {
        const localParticipantId = participantIdRef.current
        if (!localParticipantId) return

        const remoteIds = snap.docs
          .map((entry) => entry.id)
          .filter((id) => id !== localParticipantId)

        setPeerCount(remoteIds.length)

        const activeSet = new Set(remoteIds)
        for (const existingRemoteId of peersRef.current.keys()) {
          if (!activeSet.has(existingRemoteId)) cleanupPeer(existingRemoteId)
        }

        remoteIds.forEach((remoteId) => {
          if (!peersRef.current.has(remoteId) && localParticipantId < remoteId) {
            void createPeerConnection(remoteId, true)
          }
        })
      })

      const signalsQ = query(
        collection(db, 'voiceRooms', sanitizedRoom, 'signals'),
        orderBy('createdAt', 'asc')
      )

      unsubSignalsRef.current = onSnapshot(signalsQ, (snap) => {
        const localParticipantId = participantIdRef.current
        if (!localParticipantId) return

        snap.docChanges().forEach((change) => {
          if (change.type !== 'added') return
          const signalId = change.doc.id
          if (processedSignalsRef.current.has(signalId)) return
          processedSignalsRef.current.add(signalId)

          const signal = change.doc.data() as SignalDoc
          if (signal.to !== localParticipantId) return
          void handleSignal(signal)
        })
      })

      setRoomId(sanitizedRoom)
      setJoined(true)
      pushLog(`Joined room ${sanitizedRoom}`)
      showToast({ type: 'success', message: 'Voice Lab connected (experimental).' })
    } catch {
      showToast({ type: 'error', message: 'Could not start mic/voice session.' })
      await leaveVoiceTest()
    } finally {
      setJoining(false)
    }
  }

  async function leaveVoiceTest() {
    unsubParticipantsRef.current?.()
    unsubParticipantsRef.current = null
    unsubSignalsRef.current?.()
    unsubSignalsRef.current = null

    for (const remoteId of peersRef.current.keys()) cleanupPeer(remoteId)

    localStreamRef.current?.getTracks().forEach((track) => track.stop())
    localStreamRef.current = null
    processedSignalsRef.current.clear()
    setPeerCount(0)

    if (participantDocRef.current) {
      try {
        await deleteDoc(participantDocRef.current)
      } catch {
        // best effort for test room cleanup
      }
    }
    participantDocRef.current = null
    participantIdRef.current = null
    activeRoomIdRef.current = null
    setMuted(false)
    setJoined(false)
    pushLog('Disconnected')
  }

  function toggleMute() {
    const stream = localStreamRef.current
    if (!stream) return
    const nextMuted = !muted
    stream.getAudioTracks().forEach((track) => {
      track.enabled = !nextMuted
    })
    setMuted(nextMuted)
  }

  useEffect(() => {
    return () => {
      void leaveVoiceTest()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className="voice-lab-page">
      <div className="voice-lab-card">
        <h2 className="voice-lab-title">Voice Lab (Experimental)</h2>
        <p className="voice-lab-subtitle">
          Testing only. This feature is intentionally limited, unstable, and not production-ready.
        </p>
        <div className="voice-lab-note">
          Test rooms must start with <strong>test-</strong> (example: <strong>test-team-a</strong>).
          Recommended for small tests (2–4 people).
        </div>
      </div>

      <div className="voice-lab-card voice-lab-controls-card">
        <div className="voice-lab-controls-row">
          <input
            value={roomId}
            onChange={(e) => setRoomId(e.target.value)}
            disabled={joined || joining}
            placeholder="test-room-id"
            className="voice-lab-room-input"
          />
          {!joined ? (
            <button
              onClick={() => void joinVoiceTest()}
              disabled={joining}
              className="voice-lab-btn voice-lab-btn-primary"
            >
              {joining ? 'Connecting...' : 'Join Voice Test'}
            </button>
          ) : (
            <>
              <button
                onClick={toggleMute}
                className="voice-lab-btn voice-lab-btn-primary"
              >
                {muted ? 'Unmute' : 'Mute'}
              </button>
              <button
                onClick={() => void leaveVoiceTest()}
                className="voice-lab-btn voice-lab-btn-muted"
              >
                Leave
              </button>
            </>
          )}
          <div className="voice-lab-peer-count">
            Remote peers: {peerCount}
          </div>
        </div>
      </div>

      <div className="voice-lab-card">
        <div className="voice-lab-log-label">Session Log</div>
        <div className="voice-lab-log-box">
          {logs.length === 0 ? 'No events yet.' : logs.map((line, idx) => <div key={`${line}-${idx}`}>{line}</div>)}
        </div>
      </div>

      <div ref={remoteAudioHostRef} className="voice-lab-hidden-audio" />
    </div>
  )
}
