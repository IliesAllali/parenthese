// Image Open Graph = capture réelle de l'illustration du hero de la landing (canvas), posée sur le fond crème.
// Usage : node og-from-hero.mjs [urlLanding=http://127.0.0.1:4173/]  → landing/public/og-image.png (1200×630)
//         + og-image-hero.png (variante : hero complet, titre + illustration) pour choisir.
import { spawn } from 'node:child_process'
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { Resvg } from '@resvg/resvg-js'

const URL_ = process.argv[2] || 'http://127.0.0.1:4173/'
const BRAVE = process.env.BRAVE_PATH || 'C:\\Program Files\\BraveSoftware\\Brave-Browser\\Application\\brave.exe'
const root = fileURLToPath(new URL('../../', import.meta.url))
const sleep = (ms) => new Promise(r => setTimeout(r, ms))

class CDP {
  constructor(ws) { this.ws = ws; this.id = 0; this.pending = new Map()
    ws.onmessage = (m) => { const msg = JSON.parse(m.data); if (msg.id) { const p = this.pending.get(msg.id); this.pending.delete(msg.id); msg.error ? p.reject(new Error(msg.error.message)) : p.resolve(msg.result) } } }
  send(method, params = {}) { const id = ++this.id; this.ws.send(JSON.stringify({ id, method, params })); return new Promise((resolve, reject) => this.pending.set(id, { resolve, reject })) }
  async eval(expression) { const r = await this.send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true }); if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description || 'eval'); return r.result.value }
}

const port = 9800 + Math.floor(Math.random() * 100)
const profileDir = mkdtempSync(path.join(tmpdir(), 'parenthese-og-'))
const proc = spawn(BRAVE, ['--headless=new', `--remote-debugging-port=${port}`, `--user-data-dir=${profileDir}`, '--window-size=1600,1000', '--force-device-scale-factor=2', '--no-first-run', '--disable-extensions', '--hide-scrollbars', 'about:blank'], { stdio: 'ignore' })
process.on('exit', () => { try { proc.kill() } catch {} ; try { rmSync(profileDir, { recursive: true, force: true }) } catch {} })
let version
for (let i = 0; i < 100 && !version; i++) { try { const r = await fetch(`http://127.0.0.1:${port}/json/version`); if (r.ok) version = await r.json() } catch {} ; if (!version) await sleep(200) }
const bws = new WebSocket(version.webSocketDebuggerUrl); await new Promise(r => bws.onopen = r)
const b = new CDP(bws)
const { targetId } = await b.send('Target.createTarget', { url: 'about:blank' })
const list = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json()
const pws = new WebSocket(list.find(t => t.id === targetId).webSocketDebuggerUrl); await new Promise(r => pws.onopen = r)
const p = new CDP(pws)
await p.send('Page.enable'); await p.send('Runtime.enable')
await p.send('Page.navigate', { url: URL_ })
await sleep(6000) // polices, photos et animation d'entrée de l'illustration

// Zone de l'illustration : le canvas du hero (première section)
const rect = await p.eval(`(() => { const c = document.querySelector('section canvas'); if (!c) return null; const r = c.getBoundingClientRect(); return { x: r.left, y: r.top, w: r.width, h: r.height } })()`)
if (!rect) throw new Error('canvas du hero introuvable')
const shotIllu = await p.send('Page.captureScreenshot', { format: 'png', clip: { x: rect.x, y: rect.y, width: rect.w, height: rect.h, scale: 2 } })

// Variante : le hero complet (titre + illustration)
const hero = await p.eval(`(() => { const s = document.querySelector('section'); const r = s.getBoundingClientRect(); return { x: r.left, y: 0, w: r.width, h: Math.min(r.height, 900) } })()`)
const shotHero = await p.send('Page.captureScreenshot', { format: 'png', clip: { x: hero.x, y: hero.y, width: hero.w, height: hero.h, scale: 2 } })

// Composition 1200×630 : illustration centrée sur le fond crème (dégradé identique au hero)
function compose(pngBase64, srcW, srcH, { fit = 'contain', pad = 30, zoom = 1 } = {}) {
  const W = 1200, H = 630
  let w, h
  if (fit === 'cover') { const s = Math.max(W / srcW, H / srcH); w = srcW * s; h = srcH * s }
  else { const s = Math.min((W - pad * 2) / srcW, (H - pad * 2) / srcH) * zoom; w = srcW * s; h = srcH * s }
  const x = (W - w) / 2, y = (H - h) / 2
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${W}" height="${H}">
    <defs><linearGradient id="bg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FFF5DF"/><stop offset="0.52" stop-color="#FEF9ED"/><stop offset="1" stop-color="#FFF5DF"/></linearGradient></defs>
    <rect width="${W}" height="${H}" fill="url(#bg)"/>
    <image x="${x}" y="${y}" width="${w}" height="${h}" preserveAspectRatio="xMidYMid ${fit === 'cover' ? 'slice' : 'meet'}" xlink:href="data:image/png;base64,${pngBase64}"/>
  </svg>`
  return new Resvg(svg, { fitTo: { mode: 'width', value: W } }).render().asPng()
}

// L'illustration a beaucoup de marge autour du graphe : on zoome pour que la famille remplisse le cadre (ZOOM, défaut 1.4)
writeFileSync(`${root}landing/public/og-image.png`, compose(shotIllu.data, rect.w * 2, rect.h * 2, { fit: 'contain', pad: 0, zoom: Number(process.env.ZOOM || 1.4) }))
writeFileSync(`${root}landing/public/og-image-hero.png`, compose(shotHero.data, hero.w * 2, hero.h * 2, { fit: 'cover' }))
console.log(`illustration ${Math.round(rect.w)}×${Math.round(rect.h)} css px → landing/public/og-image.png ; hero complet → og-image-hero.png`)
process.exit(0)
