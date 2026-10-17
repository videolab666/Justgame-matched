/** Installable app: service worker (production only) and the install prompt. */
type InstallEvent = Event & { prompt(): Promise<void>; userChoice: Promise<{ outcome: string }> }
let deferred: InstallEvent | null = null
const listeners = new Set<() => void>()

addEventListener("beforeinstallprompt", (e) => {
  e.preventDefault()
  deferred = e as InstallEvent
  listeners.forEach((f) => f())
})

export function registerSW() {
  if (!import.meta.env.PROD || !("serviceWorker" in navigator)) return
  const go = () => { navigator.serviceWorker.register("./sw.js").catch(() => {}) }
  // Called after async boot: "load" may already have fired.
  if (document.readyState === "complete") go()
  else addEventListener("load", go, { once: true })
}

const standalone = () => matchMedia("(display-mode: standalone)").matches || (navigator as unknown as { standalone?: boolean }).standalone === true
const ios = () => /iPhone|iPad|iPod/.test(navigator.userAgent)

export function installState(): "installed" | "prompt" | "ios" | "none" {
  if (standalone()) return "installed"
  if (deferred) return "prompt"
  if (ios()) return "ios"
  return "none"
}

export async function promptInstall(): Promise<boolean> {
  if (!deferred) return false
  const e = deferred
  deferred = null
  await e.prompt()
  return (await e.userChoice).outcome === "accepted"
}

export function onInstallable(f: () => void) { listeners.add(f) }
