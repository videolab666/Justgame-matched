const ESC: Record<string, string> = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }
export const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ESC[c])

/** Escape `text` and wrap every flag occurrence in <mark>. */
export function highlight(text: string, flags: string[]): string {
  let html = esc(text)
  for (const f of [...flags].sort((a, b) => b.length - a.length)) {
    const e = esc(f)
    if (e && html.includes(e)) html = html.split(e).join(`<mark>${e}</mark>`)
  }
  return html
}

export function el<K extends keyof HTMLElementTagNameMap>(tag: K, cls = "", html = ""): HTMLElementTagNameMap[K] {
  const e = document.createElement(tag)
  if (cls) e.className = cls
  if (html) e.innerHTML = html
  return e
}
