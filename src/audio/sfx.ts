/** Synthesized sound effects (WebAudio): no audio files to download or license. */
let ctx: AudioContext | null = null
let master: GainNode | null = null
let enabled = true

function ac(): AudioContext | null {
  if (!enabled) return null
  if (!ctx) {
    const C = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!C) return null
    ctx = new C()
    master = ctx.createGain()
    master.gain.value = 0.45
    master.connect(ctx.destination)
  }
  return ctx
}

function tone(type: OscillatorType, f0: number, f1: number, dur: number, vol: number, delay = 0) {
  const c = ac(); if (!c || !master) return
  const t = c.currentTime + delay
  const o = c.createOscillator(), g = c.createGain()
  o.type = type
  o.frequency.setValueAtTime(f0, t)
  o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur)
  g.gain.setValueAtTime(0.0001, t)
  g.gain.exponentialRampToValueAtTime(vol, t + 0.008)
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur)
  o.connect(g).connect(master)
  o.start(t); o.stop(t + dur + 0.02)
}

function noise(dur: number, vol: number, f0: number, f1: number, q = 1, delay = 0) {
  const c = ac(); if (!c || !master) return
  const t = c.currentTime + delay
  const buf = c.createBuffer(1, Math.ceil(c.sampleRate * dur), c.sampleRate)
  const d = buf.getChannelData(0)
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1
  const src = c.createBufferSource(); src.buffer = buf
  const bp = c.createBiquadFilter(); bp.type = "bandpass"; bp.Q.value = q
  bp.frequency.setValueAtTime(f0, t); bp.frequency.exponentialRampToValueAtTime(f1, t + dur)
  const g = c.createGain()
  g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur)
  src.connect(bp).connect(g).connect(master)
  src.start(t); src.stop(t + dur)
}

export const sfx = {
  unlock() { const c = ac(); if (c?.state === "suspended") void c.resume() },
  setEnabled(v: boolean) { enabled = v; if (!v && ctx) { void ctx.close(); ctx = null; master = null } },
  /** Tile pop; pitch climbs with the cascade index (the "combo ladder"). */
  pop(cascade: number) {
    const f = 520 * Math.pow(1.122, Math.min(cascade, 10))
    tone("triangle", f * 1.5, f, 0.12, 0.35)
    tone("sine", f * 2, f * 2.6, 0.06, 0.12)
    noise(0.05, 0.12, 3000, 1500, 0.8)
  },
  special() {
    tone("sawtooth", 180, 1400, 0.32, 0.18)
    tone("triangle", 360, 2200, 0.32, 0.18)
    noise(0.35, 0.25, 400, 4000, 0.7)
  },
  boom() { tone("sine", 140, 40, 0.45, 0.6); noise(0.4, 0.35, 1200, 120, 0.6) },
  fake() { tone("square", 92, 70, 0.2, 0.12); tone("square", 97, 66, 0.2, 0.08) },
  fakeDie() { tone("sawtooth", 600, 90, 0.22, 0.14); noise(0.16, 0.2, 5000, 800, 1.2) },
  swap() { noise(0.09, 0.08, 900, 2400, 1.5) },
  error() { tone("square", 330, 300, 0.09, 0.12); tone("square", 247, 220, 0.12, 0.12, 0.1) },
  good() { [660, 880, 1320].forEach((f, k) => tone("triangle", f, f, 0.14, 0.25, k * 0.07)) },
  bad() { tone("sawtooth", 300, 110, 0.4, 0.2); noise(0.3, 0.15, 800, 200, 1) },
  win() { [523, 659, 784, 1047, 1319].forEach((f, k) => tone("triangle", f, f * 1.01, 0.22, 0.28, k * 0.09)) },
  whoosh() { noise(0.28, 0.2, 300, 3000, 0.9) },
  tick() { tone("sine", 1400, 1400, 0.03, 0.08) },
}
