import { CanvasSource, Texture } from "pixi.js"

const COLORS = ["#ffffff", "#ffd6f0", "#d6f3ff", "#fff3b0", "#e6d0ff", "#c8ffe9"]

/** Seamless tile of sugar glitter (pastel specks and a few tiny stars) for
 * the board's cell backgrounds. Drawn once on a canvas at screen density. */
export function makeGlitterTexture(px = 96, density = 1): Texture {
  const size = Math.round(px * density)
  const canvas = document.createElement("canvas")
  canvas.width = canvas.height = size
  const g = canvas.getContext("2d")!
  let seed = 7
  const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647 }
  // Specks wrap around the edges so the tile repeats without seams.
  const dot = (x: number, y: number, r: number) => {
    for (const dx of [-size, 0, size]) for (const dy of [-size, 0, size]) {
      g.beginPath(); g.arc(x + dx, y + dy, r, 0, Math.PI * 2); g.fill()
    }
  }
  for (let k = 0; k < 150; k++) {
    g.fillStyle = COLORS[Math.floor(rnd() * COLORS.length)]
    g.globalAlpha = 0.25 + rnd() * 0.6
    dot(rnd() * size, rnd() * size, (0.5 + rnd() * 1.3) * density)
  }
  g.globalAlpha = 0.9
  g.fillStyle = "#ffffff"
  for (let k = 0; k < 5; k++) {
    const x = rnd() * size, y = rnd() * size, s = (2.5 + rnd() * 2) * density
    g.beginPath()
    g.moveTo(x, y - s); g.quadraticCurveTo(x, y, x + s, y); g.quadraticCurveTo(x, y, x, y + s)
    g.quadraticCurveTo(x, y, x - s, y); g.quadraticCurveTo(x, y, x, y - s)
    g.fill()
  }
  // Canvas pixels at screen density, so the tile is `px` world units wide.
  return new Texture({ source: new CanvasSource({ resource: canvas, resolution: density }) })
}
