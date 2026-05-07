type SoundTone = {
  frequency: number
  durationMs: number
  type?: OscillatorType
  gain?: number
}

function playToneSequence(sequence: SoundTone[]): void {
  try {
    const AudioContextImpl = window.AudioContext || (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!AudioContextImpl) {
      return
    }

    const ctx = new AudioContextImpl()
    let now = ctx.currentTime

    for (const tone of sequence) {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()

      osc.type = tone.type ?? 'sine'
      osc.frequency.value = tone.frequency

      const level = tone.gain ?? 0.035
      gain.gain.setValueAtTime(0.0001, now)
      gain.gain.exponentialRampToValueAtTime(level, now + 0.01)
      gain.gain.exponentialRampToValueAtTime(0.0001, now + tone.durationMs / 1000)

      osc.connect(gain)
      gain.connect(ctx.destination)

      osc.start(now)
      osc.stop(now + tone.durationMs / 1000)

      now += tone.durationMs / 1000 + 0.01
    }

    window.setTimeout(() => {
      void ctx.close()
    }, 300)
  } catch {
    // Sound is optional UX enhancement; failures should be silent.
  }
}

export function playBacklogAddedSound(): void {
  playToneSequence([
    { frequency: 420, durationMs: 60, type: 'triangle', gain: 0.03 },
    { frequency: 560, durationMs: 70, type: 'triangle', gain: 0.035 },
  ])
}

export function playBacklogRemovedSound(): void {
  playToneSequence([
    { frequency: 560, durationMs: 55, type: 'triangle', gain: 0.03 },
    { frequency: 380, durationMs: 75, type: 'triangle', gain: 0.035 },
  ])
}

export function playTaskCompletedSound(): void {
  playToneSequence([
    { frequency: 520, durationMs: 45, type: 'sine', gain: 0.03 },
    { frequency: 780, durationMs: 70, type: 'sine', gain: 0.04 },
  ])
}

export function playTaskUncompletedSound(): void {
  playToneSequence([
    { frequency: 520, durationMs: 45, type: 'sine', gain: 0.025 },
    { frequency: 360, durationMs: 70, type: 'sine', gain: 0.03 },
  ])
}
