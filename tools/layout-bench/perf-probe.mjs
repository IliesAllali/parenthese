// Sonde de performance de la galaxie dans un navigateur headless séparé (CDP, sans dépendance).
// Usage : TREE_PASSWORD='...' node perf-probe.mjs [url] [dpr]
//   url : l'adresse d'un arbre sur le front local, ex. http://127.0.0.1:5173/arbre/mon-arbre (serveur Vite à lancer avant)
// Sort : cadence au repos / drag / zoom, appels canvas par frame, et top des fonctions au profil CPU.
import { spawn } from 'node:child_process'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'

const URL_ = process.argv[2] || 'http://127.0.0.1:5173/arbre/mon-arbre'
const DPR = Number(process.argv[3] || 1)
const PASSWORD = process.env.TREE_PASSWORD
const BRAVE = process.env.BRAVE_PATH || 'C:\\Program Files\\BraveSoftware\\Brave-Browser\\Application\\brave.exe'
const PORT = 9333 + Math.floor(Math.random() * 200) // port distinct par run (instance headless précédente parfois encore vivante)
if (!PASSWORD) { console.error("TREE_PASSWORD manquant"); process.exit(1) }

const profileDir = mkdtempSync(path.join(tmpdir(), 'parenthese-perf-'))
const browser = spawn(BRAVE, [
  '--headless=new', `--remote-debugging-port=${PORT}`, `--user-data-dir=${profileDir}`,
  '--window-size=1600,900', `--force-device-scale-factor=${DPR}`, '--no-first-run', '--disable-extensions',
  '--disable-features=Translate,BraveRewards,BraveAds', 'about:blank',
], { stdio: 'ignore' })
const cleanup = () => { try { browser.kill() } catch {} ; try { rmSync(profileDir, { recursive: true, force: true }) } catch {} }
process.on('exit', cleanup)

const sleep = (ms) => new Promise(r => setTimeout(r, ms))
async function waitForDevtools() {
  for (let i = 0; i < 100; i++) {
    try { const r = await fetch(`http://127.0.0.1:${PORT}/json/version`); if (r.ok) return await r.json() } catch {}
    await sleep(200)
  }
  throw new Error('devtools injoignable')
}

// Client CDP minimal
class CDP {
  constructor(ws) { this.ws = ws; this.id = 0; this.pending = new Map(); this.events = []
    ws.onmessage = (m) => { const msg = JSON.parse(m.data); if (msg.id) { const p = this.pending.get(msg.id); this.pending.delete(msg.id); msg.error ? p.reject(new Error(msg.error.message)) : p.resolve(msg.result) } else this.events.push(msg) } }
  send(method, params = {}) { const id = ++this.id; this.ws.send(JSON.stringify({ id, method, params })); return new Promise((resolve, reject) => this.pending.set(id, { resolve, reject })) }
  async eval(expression, awaitPromise = true) {
    const r = await this.send('Runtime.evaluate', { expression, awaitPromise, returnByValue: true })
    if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description || 'eval error')
    return r.result.value
  }
}

const version = await waitForDevtools()
const bws = new WebSocket(version.webSocketDebuggerUrl)
await new Promise(r => bws.onopen = r)
const b = new CDP(bws)
const { targetId } = await b.send('Target.createTarget', { url: 'about:blank' })
const list = await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json()
const pageWs = new WebSocket(list.find(t => t.id === targetId).webSocketDebuggerUrl)
await new Promise(r => pageWs.onopen = r)
const p = new CDP(pageWs)
await p.send('Page.enable'); await p.send('Runtime.enable')
await p.send('Page.navigate', { url: URL_ })
await sleep(2500)

// Déverrouillage par le formulaire (setter natif pour que React voie la valeur)
await p.eval(`(() => {
  const input = document.querySelector('input[type=password]') || [...document.querySelectorAll('input')].find(i => /mot de passe/i.test(i.getAttribute('aria-label') || i.placeholder || ''))
  if (!input) return 'no-input'
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set
  setter.call(input, ${JSON.stringify(PASSWORD)})
  input.dispatchEvent(new Event('input', { bubbles: true }))
  const btn = [...document.querySelectorAll('button')].find(b => /ouvrir/i.test(b.textContent))
  btn?.click()
  return 'ok'
})()`, false)

// Attendre la galaxie et la fin de l'animation d'entrée
for (let i = 0; i < 40; i++) { if (await p.eval(`!!document.querySelector('canvas.galaxy-canvas')`, false)) break; await sleep(500) }
console.error('canvas prêt, attente de la fin de l animation d entrée…')
await sleep(16000)

const SAMPLER = `(async () => {
  const canvas = document.querySelector('canvas.galaxy-canvas')
  const proto = CanvasRenderingContext2D.prototype
  const counts = {}
  const wrapped = ['createRadialGradient', 'createLinearGradient', 'fillText', 'measureText', 'drawImage', 'arc', 'fill', 'stroke', 'save', 'restore', 'roundRect', 'setTransform']
  const orig = {}
  for (const m of wrapped) { orig[m] = proto[m]; proto[m] = function (...a) { counts[m] = (counts[m] || 0) + 1; return orig[m].apply(this, a) } }
  let shadowSets = 0
  const sbDesc = Object.getOwnPropertyDescriptor(proto, 'shadowBlur')
  Object.defineProperty(proto, 'shadowBlur', { configurable: true, get: sbDesc.get, set(v) { if (v > 0) shadowSets++; sbDesc.set.call(this, v) } })
  // Temps occupé par frame : durée des callbacks rAF de l'app (le vrai coût main thread)
  const busy = []
  const rafOrig = window.requestAnimationFrame
  window.requestAnimationFrame = (cb) => rafOrig((t) => { const t0 = performance.now(); cb(t); busy.push(performance.now() - t0) })
  const sample = (ms) => new Promise((resolve) => {
    const deltas = []; let last = performance.now(), start = last
    for (const k in counts) delete counts[k]
    shadowSets = 0; busy.length = 0
    const guard = setTimeout(() => resolve({ error: 'pas de frame' }), ms + 5000)
    const tick = (t) => {
      deltas.push(t - last); last = t
      if (t - start < ms) rafOrig(tick)
      else {
        clearTimeout(guard); deltas.shift()
        const sorted = [...deltas].sort((a, b) => a - b); const n = deltas.length
        const b = [...busy].sort((a, c) => a - c); const bn = b.length
        resolve({
          fps: Math.round(1000 / (deltas.reduce((s, d) => s + d, 0) / n)),
          busy_med_ms: bn ? Math.round(b[Math.floor(bn / 2)] * 10) / 10 : null,
          busy_p90_ms: bn ? Math.round(b[Math.floor(bn * 0.9)] * 10) / 10 : null,
          frame_med_ms: Math.round(sorted[Math.floor(n / 2)] * 10) / 10,
          frame_p90_ms: Math.round(sorted[Math.floor(n * 0.9)] * 10) / 10,
          long_frames_over_33ms: deltas.filter(d => d > 33).length,
          per_frame: Object.fromEntries(Object.entries(counts).map(([k, v]) => [k, Math.round(v / n)])),
          shadowBlur_per_frame: Math.round(shadowSets / n),
        })
      }
    }
    rafOrig(tick)
  })
  const rect = canvas.getBoundingClientRect()
  const cx = rect.left + rect.width / 2, cy = rect.top + rect.height / 2
  const mouse = (type, x, y) => canvas.dispatchEvent(new MouseEvent(type, { clientX: x, clientY: y, bubbles: true, buttons: 1 }))
  const rest = await sample(3000)
  mouse('mousedown', cx, cy)
  const dragP = sample(3000); let i = 0
  const dragTimer = setInterval(() => { i++; mouse('mousemove', cx + i * 4, cy + Math.sin(i / 10) * 30) }, 16)
  const drag = await dragP; clearInterval(dragTimer); mouse('mouseup', cx + i * 4, cy)
  const zoomP = sample(3000); let j = 0
  const zoomTimer = setInterval(() => { j++; canvas.dispatchEvent(new WheelEvent('wheel', { clientX: cx, clientY: cy, deltaY: (j % 40 < 20) ? -60 : 60, bubbles: true, cancelable: true })) }, 40)
  const zoom = await zoomP; clearInterval(zoomTimer)
  // Zoomé : ~échelle 1 sur une zone dense (le cas réel de navigation), au repos puis en drag
  // point de zoom : ZOOM_AT (fraction de l'écran) sinon le centre ; ZOOM_STEPS crans de molette
  const [fx, fy] = (${JSON.stringify(process.env.ZOOM_AT || '0.5,0.5')}).split(',').map(Number)
  const zx = rect.left + rect.width * fx, zy = rect.top + rect.height * fy
  for (let k = 0; k < ${Number(process.env.ZOOM_STEPS || 20)}; k++) {
    canvas.dispatchEvent(new WheelEvent('wheel', { clientX: zx, clientY: zy, deltaY: -100, bubbles: true, cancelable: true }))
    await new Promise(r => setTimeout(r, 30))
  }
  await new Promise(r => setTimeout(r, 1500))
  const zoomed_rest = await sample(3000)
  mouse('mousedown', cx, cy)
  const zdP = sample(3000); let z = 0
  const zdTimer = setInterval(() => { z++; mouse('mousemove', cx - z * 6, cy + Math.sin(z / 10) * 30) }, 16)
  const zoomed_drag = await zdP; clearInterval(zdTimer); mouse('mouseup', cx - z * 6, cy)
  for (const m of wrapped) proto[m] = orig[m]
  Object.defineProperty(proto, 'shadowBlur', sbDesc)
  window.requestAnimationFrame = rafOrig
  return { dpr: window.devicePixelRatio, canvas: [canvas.width, canvas.height], rest, drag, zoom, zoomed_rest, zoomed_drag }
})()`
// Captures (SHOTS=prefix) : vue d'ensemble avant mesure, vue zoomée après
const shots = process.env.SHOTS
async function shot(name) {
  if (!shots) return
  const { data } = await p.send('Page.captureScreenshot', { format: 'png' })
  const { writeFileSync } = await import('node:fs')
  writeFileSync(new URL(`./out/${shots}-${name}.png`, import.meta.url), Buffer.from(data, 'base64'))
}
await shot('overview')
const timing = await p.eval(SAMPLER)
await shot('zoomed')

// Profil CPU au repos (3 s), agrégé par fonction (self time)
await p.send('Profiler.enable')
await p.send('Profiler.setSamplingInterval', { interval: 200 })
await p.send('Profiler.start')
await sleep(3000)
const { profile } = await p.send('Profiler.stop')
const byNode = new Map(profile.nodes.map(n => [n.id, n]))
const self = new Map()
const dt = profile.timeDeltas
profile.samples.forEach((id, i) => {
  const n = byNode.get(id); const cf = n.callFrame
  const key = `${cf.functionName || '(anonyme)'} ${cf.url.split('/').slice(-1)[0].split('?')[0]}:${cf.lineNumber + 1}`
  self.set(key, (self.get(key) || 0) + (dt[i] || 0))
})
const total = [...self.values()].reduce((s, v) => s + v, 0)
const top = [...self.entries()].sort((a, b) => b[1] - a[1]).slice(0, 18)
  .map(([k, v]) => ({ fn: k, pct: Math.round(v / total * 1000) / 10 }))

console.log(JSON.stringify({ url: URL_, ...timing, cpu_top: top }, null, 1))
cleanup()
process.exit(0)
