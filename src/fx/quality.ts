/** Effect budget. `reducedMotion` (setting or OS) turns off shake, slow-mo and
 * heavy filters; `heavy` drops automatically when the first seconds run slow. */
export const quality = {
  reducedMotion: matchMedia?.("(prefers-reduced-motion: reduce)")?.matches ?? false,
  heavy: true,
  maxParticles: 600,
  frames: 0,
  elapsed: 0,
  decided: false,
  /** Feed frame times; after ~3 s decide once whether the device keeps up. */
  sample(dtMs: number) {
    if (this.decided) return
    this.frames++
    this.elapsed += dtMs
    if (this.elapsed < 3000) return
    this.decided = true
    const fps = (this.frames * 1000) / this.elapsed
    if (fps < 45) { this.heavy = false; this.maxParticles = 200 }
  },
  get fancy() { return this.heavy && !this.reducedMotion },
}
