import { Texture } from "pixi.js"

const RAW = import.meta.glob("./tiles/*.svg", { query: "?raw", import: "default", eager: true }) as Record<string, string>

export const TILE_TEXTURES = ["passport", "stamp", "key", "phone", "card", "envelope"] as const
/** Tile colours for particles and flashes, by kind. */
export const KIND_COLORS = [0x7ab8ff, 0xff5c9a, 0xffe14d, 0x5ff2b6, 0xc77aff, 0xffa95c]

async function rasterize(svg: string, size: number): Promise<Texture> {
  const img = new Image()
  img.src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg)
  await img.decode()
  const canvas = document.createElement("canvas")
  canvas.width = canvas.height = size
  canvas.getContext("2d")!.drawImage(img, 0, 0, size, size)
  return Texture.from(canvas)
}

/** SVG art rasterized once at the on-screen pixel size (crisp on any DPR). */
export async function loadTextures(px: number): Promise<Record<string, Texture>> {
  const out: Record<string, Texture> = {}
  await Promise.all(Object.entries(RAW).map(async ([path, svg]) => {
    const name = path.split("/").pop()!.replace(".svg", "")
    out[name] = await rasterize(svg, name === "spark" ? 64 : Math.max(64, Math.round(px)))
  }))
  return out
}

/** The same SVG art as a data URL, for DOM icons (HUD goals, screens). */
export function svgUrl(name: string): string {
  const raw = RAW[`./tiles/${name}.svg`] ?? ""
  return "data:image/svg+xml;charset=utf-8," + encodeURIComponent(raw)
}
