// Audit rendu de la landing (SPA) : textes des CTA, liens, formulaire, capture pleine page.
// Usage : node landing-check.mjs [url=https://parenthese.io/]
import { spawn } from 'node:child_process'
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'

const URLS = process.argv.length > 2 ? process.argv.slice(2) : ['https://parenthese.io/', 'https://parenthese.io/?source=app-shared']
const BRAVE = process.env.BRAVE_PATH || 'C:\\Program Files\\BraveSoftware\\Brave-Browser\\Application\\brave.exe'
const sleep = (ms) => new Promise(r => setTimeout(r, ms))

class CDP {
  constructor(ws) { this.ws = ws; this.id = 0; this.pending = new Map()
    ws.onmessage = (m) => { const msg = JSON.parse(m.data); if (msg.id) { const p = this.pending.get(msg.id); this.pending.delete(msg.id); msg.error ? p.reject(new Error(msg.error.message)) : p.resolve(msg.result) } } }
  send(method, params = {}) { const id = ++this.id; this.ws.send(JSON.stringify({ id, method, params })); return new Promise((resolve, reject) => this.pending.set(id, { resolve, reject })) }
  async eval(expression) { const r = await this.send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true }); if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description || 'eval'); return r.result.value }
}

const port = 9700 + Math.floor(Math.random() * 200)
const profileDir = mkdtempSync(path.join(tmpdir(), 'parenthese-landing-'))
const proc = spawn(BRAVE, ['--headless=new', `--remote-debugging-port=${port}`, `--user-data-dir=${profileDir}`, '--window-size=1400,900', '--no-first-run', '--disable-extensions', 'about:blank'], { stdio: 'ignore' })
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
const errors = []
pws.addEventListener('message', (m) => { const msg = JSON.parse(m.data); if (msg.method === 'Runtime.exceptionThrown') errors.push(msg.params.exceptionDetails?.exception?.description || 'exception') })

for (const [i, url] of URLS.entries()) {
  await p.send('Page.navigate', { url })
  await sleep(4000)
  const info = await p.eval(`(() => ({
    title: document.title,
    h1: [...document.querySelectorAll('h1')].map(h => h.textContent.trim()),
    links: [...document.querySelectorAll('a[href]')].map(a => ({ text: a.textContent.trim().slice(0, 60), href: a.href })).filter(l => !/fonts\\./.test(l.href)),
    buttons: [...document.querySelectorAll('button')].map(b => b.textContent.trim().slice(0, 60)).filter(Boolean),
    forms: [...document.querySelectorAll('form')].map(f => ({ inputs: [...f.querySelectorAll('input')].map(i => i.type + (i.name ? ':' + i.name : '') + (i.placeholder ? '(' + i.placeholder + ')' : '')), submit: f.querySelector('button[type=submit],button')?.textContent.trim() })),
    iframes: [...document.querySelectorAll('iframe')].map(f => f.src),
    textSample: document.body.innerText.replace(/\\s+/g, ' ').slice(0, 900),
    height: document.documentElement.scrollHeight,
  }))()`)
  console.log(`\n=== ${url}`)
  console.log(JSON.stringify(info, null, 1))
  const { data } = await p.send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true, clip: { x: 0, y: 0, width: 1400, height: Math.min(info.height, 6000), scale: 0.5 } })
  writeFileSync(new URL(`./out/landing-${i}.png`, import.meta.url), Buffer.from(data, 'base64'))
}
console.log('\nerreurs JS :', errors.length ? errors : 'aucune')
process.exit(0)
