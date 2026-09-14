// Test de bout en bout du flux compte famille, sur un backend local (jamais la prod).
// Usage : node e2e-account.mjs [frontUrl=http://localhost:5173] [apiUrl=http://localhost:4000]
// Scénario :
//   1. API : le propriétaire crée un compte et un arbre partagé (mot de passe contributeur)
//   2. Navigateur A (famille, sans compte) : lien partagé → mot de passe → arbre ouvert en contributeur
//   3. Rechargement : reste contributeur (jeton en poche), sans ressaisie
//   4. Navbar "Créer un compte" → formulaire → compte créé → retour sur l'arbre, rattaché (navbar contributeur connecté)
//   5. Rechargement : l'arbre s'ouvre directement, sans grille d'accès
//   6. API : l'arbre figure dans "mes arbres" du nouveau compte avec le rôle contributor
//   7. Navigateur B (propriétaire) : connexion → paramètres → "modifications appliquées directement" → API confirme
import { spawn } from 'node:child_process'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'

const FRONT = process.argv[2] || 'http://localhost:5173'
const API = process.argv[3] || 'http://localhost:4000'
const BRAVE = process.env.BRAVE_PATH || 'C:\\Program Files\\BraveSoftware\\Brave-Browser\\Application\\brave.exe'
const stamp = Date.now()
const OWNER = { email: `owner-${stamp}@e2e.local`, password: 'OwnerPass-123' }
const FAMILY = { firstName: 'Camille', email: `famille-${stamp}@e2e.local`, password: 'FamilyPass-123' }
const CONTRIB_PASSWORD = 'Contribue-2026'
const VISITOR_PASSWORD = 'Visite-2026'

const sleep = (ms) => new Promise(r => setTimeout(r, ms))
const results = []
function check(name, ok, detail = '') {
  results.push({ name, ok, detail })
  console.log(`${ok ? 'OK ' : 'KO '} ${name}${detail ? ` (${detail})` : ''}`)
}

async function api(pathname, { method = 'GET', token, body } = {}) {
  const r = await fetch(API + pathname, {
    method,
    headers: { ...(body ? { 'Content-Type': 'application/json' } : {}), ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  })
  const text = await r.text()
  let data; try { data = JSON.parse(text) } catch { data = text }
  if (!r.ok) throw new Error(`${r.status} ${method} ${pathname} ${typeof data === 'string' ? data.slice(0, 200) : JSON.stringify(data).slice(0, 200)}`)
  return data
}

// ---------- Navigateur headless minimal (CDP, sans dépendance) ----------
class CDP {
  constructor(ws) { this.ws = ws; this.id = 0; this.pending = new Map()
    ws.onmessage = (m) => { const msg = JSON.parse(m.data); if (msg.id) { const p = this.pending.get(msg.id); this.pending.delete(msg.id); msg.error ? p.reject(new Error(msg.error.message)) : p.resolve(msg.result) } } }
  send(method, params = {}) { const id = ++this.id; this.ws.send(JSON.stringify({ id, method, params })); return new Promise((resolve, reject) => this.pending.set(id, { resolve, reject })) }
  async eval(expression, awaitPromise = true) {
    const r = await this.send('Runtime.evaluate', { expression, awaitPromise, returnByValue: true })
    if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description || 'eval error')
    return r.result.value
  }
}

async function launchBrowser(label) {
  const port = 9400 + Math.floor(Math.random() * 300)
  const profileDir = mkdtempSync(path.join(tmpdir(), `parenthese-e2e-${label}-`))
  const proc = spawn(BRAVE, ['--headless=new', `--remote-debugging-port=${port}`, `--user-data-dir=${profileDir}`, '--window-size=1400,900', '--no-first-run', '--disable-extensions', '--disable-features=Translate,BraveRewards,BraveAds', 'about:blank'], { stdio: 'ignore' })
  let version
  for (let i = 0; i < 100 && !version; i++) { try { const r = await fetch(`http://127.0.0.1:${port}/json/version`); if (r.ok) version = await r.json() } catch {} ; if (!version) await sleep(200) }
  if (!version) throw new Error('devtools injoignable')
  const bws = new WebSocket(version.webSocketDebuggerUrl); await new Promise(r => bws.onopen = r)
  const b = new CDP(bws)
  const { targetId } = await b.send('Target.createTarget', { url: 'about:blank' })
  const list = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json()
  const pws = new WebSocket(list.find(t => t.id === targetId).webSocketDebuggerUrl); await new Promise(r => pws.onopen = r)
  const p = new CDP(pws)
  await p.send('Page.enable'); await p.send('Runtime.enable')
  const page = {
    async goto(url) { await p.send('Page.navigate', { url }); await sleep(1500) },
    eval: (expr, awaitPromise = true) => p.eval(expr, awaitPromise),
    async waitFor(expr, ms = 15000) {
      const t0 = Date.now()
      while (Date.now() - t0 < ms) { if (await p.eval(`!!(${expr})`, false)) return true; await sleep(250) }
      return false
    },
    // Renseigne un input contrôlé par React (setter natif + événement input)
    async fill(selector, value) {
      return p.eval(`(() => { const el = document.querySelector(${JSON.stringify(selector)}); if (!el) return false
        const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set
        setter.call(el, ${JSON.stringify(value)}); el.dispatchEvent(new Event('input', { bubbles: true })); return true })()`, false)
    },
    async clickText(selector, text) {
      return p.eval(`(() => { const el = [...document.querySelectorAll(${JSON.stringify(selector)})].find(e => (e.textContent || '').trim() === ${JSON.stringify(text)}); if (!el) return false; el.click(); return true })()`, false)
    },
    async clickLabel(label) {
      return p.eval(`(() => { const el = document.querySelector('button[aria-label=' + JSON.stringify(${JSON.stringify(label)}) + ']'); if (!el) return false; el.click(); return true })()`, false)
    },
    navLabels: () => p.eval(`[...document.querySelectorAll('.contextual-navbar button[aria-label]')].map(b => b.getAttribute('aria-label'))`, false),
    async shot(file) { const { data } = await p.send('Page.captureScreenshot', { format: 'png' }); const { writeFileSync } = await import('node:fs'); writeFileSync(new URL(`./out/${file}`, import.meta.url), Buffer.from(data, 'base64')) },
    close() { try { proc.kill() } catch {} ; try { rmSync(profileDir, { recursive: true, force: true }) } catch {} },
  }
  return page
}

// ---------- 1. Propriétaire + arbre via l'API ----------
const owner = await api('/auth/register', { method: 'POST', body: OWNER })
const createdTree = await api('/trees', { method: 'POST', token: owner.token, body: { name: `Famille E2E ${stamp}`, slug: `famille-e2e-${stamp}`, visitorPassword: VISITOR_PASSWORD, contributorPassword: CONTRIB_PASSWORD } })
const treeObj = createdTree.tree || createdTree
const treeId = treeObj.id, slug = treeObj.slug
check('1. arbre créé par le propriétaire', Boolean(treeId && slug), `slug ${slug}`)

// ---------- 2. Famille sans compte : mot de passe → contributeur ----------
const A = await launchBrowser('famille')
try {
  await A.goto(`${FRONT}/arbre/${slug}`)
  await A.waitFor(`document.querySelector('input[type=password]')`)
  await A.fill('input[type=password]', CONTRIB_PASSWORD)
  await A.clickText('button', "Ouvrir l'arbre")
  const opened2 = await A.waitFor(`document.querySelector('canvas.galaxy-canvas')`)
  if (!opened2) {
    await A.shot('e2e-fail-step2.png')
    console.log('   gate:', await A.eval(`(document.querySelector('.access-gate-error')?.textContent || '') + ' | ' + document.body.innerText.slice(0, 300).replace(/\\n+/g, ' / ')`, false))
  }
  check('2. arbre ouvert avec le mot de passe', opened2)
  await sleep(1000)
  let labels = await A.navLabels()
  check('2. navbar contributeur (sans compte)', labels.includes("Contribuer à l'arbre") && labels.includes('Créer un compte'), labels.join(' | '))

  // ---------- 3. Rechargement : reste contributeur ----------
  await A.goto(`${FRONT}/arbre/${slug}`)
  await A.waitFor(`document.querySelector('canvas.galaxy-canvas')`)
  await sleep(1000)
  labels = await A.navLabels()
  check('3. après rechargement, toujours contributeur sans ressaisie', labels.includes("Contribuer à l'arbre"), labels.join(' | '))

  // ---------- 4. Créer un compte depuis la navbar ----------
  check('4. clic "Créer un compte"', await A.clickLabel('Créer un compte'))
  check('4. écran compte en mode inscription', await A.waitFor(`document.querySelector('#accountFirstName')`))
  const pendingText = await A.eval(`document.querySelector('.account-pending-tree')?.textContent || ''`, false)
  check('4. rappel du retour sur l arbre', pendingText.includes('Famille E2E'), pendingText.trim())
  await A.fill('#accountFirstName', FAMILY.firstName)
  await A.fill('#accountEmail', FAMILY.email)
  await A.fill('#accountPassword', FAMILY.password)
  await A.shot('e2e-register.png')
  await A.clickText('button', 'Créer mon compte')
  check('4. retour sur l arbre après création', await A.waitFor(`document.querySelector('canvas.galaxy-canvas')`, 20000))
  await sleep(1500)
  labels = await A.navLabels()
  check('4. navbar contributeur connecté', labels.includes('Contribuer'), labels.join(' | '))
  const wizardShown = await A.eval(`/appelle votre famille/i.test(document.body.innerText)`, false)
  check('4. pas d assistant "votre arbre" par-dessus', !wizardShown)
  await A.shot('e2e-after-register.png')

  // ---------- 5. Rechargement connecté : ouverture directe ----------
  await A.goto(`${FRONT}/arbre/${slug}`)
  const direct = await A.waitFor(`document.querySelector('canvas.galaxy-canvas')`, 20000)
  const gateShown = await A.eval(`!!document.querySelector('input[type=password]')`, false)
  check('5. rechargement connecté : arbre direct, pas de grille', direct && !gateShown)
  await sleep(1000)
  labels = await A.navLabels()
  check('5. toujours contributeur connecté', labels.includes('Contribuer'), labels.join(' | '))
} finally {
  A.close()
}

// ---------- 6. API : l'arbre est dans le compte famille ----------
const familyLogin = await api('/auth/login', { method: 'POST', body: { email: FAMILY.email, password: FAMILY.password } })
const familyTrees = await api('/trees', { token: familyLogin.token })
const entry = (familyTrees.trees || []).find(t => String(t.id) === String(treeId))
check('6. arbre rattaché au compte famille', Boolean(entry) && entry.role === 'contributor' && entry.accessMode === 'share', entry ? `${entry.role}/${entry.accessMode}` : 'absent')

// ---------- 6b. Contribution avec le compte : en attente de validation (réglage par défaut) ----------
const submitPerson = async (token, firstName) => {
  const r = await api(`/trees/${treeId}/contributions/sessions`, {
    method: 'POST', token,
    body: { title: `Ajout ${firstName}`, changes: [{ entityType: 'person', action: 'create', after: { firstName, lastName: 'E2E' } }] },
  })
  return { status: r.session?.status ?? r.status, raw: r }
}
const pendingSession = await submitPerson(familyLogin.token, 'Proposition')
const pendingList = await api(`/trees/${treeId}/contributions/sessions?status=pending`, { token: owner.token })
check('6b. contribution famille en attente, visible par le propriétaire', pendingSession.status === 'pending' && (pendingList.sessions || []).length === 1, `${pendingSession.status}, ${(pendingList.sessions || []).length} en attente`)

// ---------- 7. Propriétaire : interrupteur contributions ----------
const B = await launchBrowser('owner')
try {
  await B.goto(`${FRONT}/?account=1`)
  await B.waitFor(`document.querySelector('#accountEmail')`)
  await B.fill('#accountEmail', OWNER.email)
  await B.fill('#accountPassword', OWNER.password)
  await B.clickText('button', 'Se connecter')
  check('7. propriétaire connecté, arbre ouvert', await B.waitFor(`document.querySelector('canvas.galaxy-canvas') || document.querySelector('.tree-creation-wizard, .initial-tree-wizard')`, 20000))
  await sleep(1500)
  // fermer un éventuel assistant de premier arbre (arbre vide) puis ouvrir les paramètres via le menu avatar
  await B.clickText('button', 'Plus tard')
  await B.clickText('button', 'Passer')
  await sleep(500)
  await B.eval(`document.querySelector('.nav-avatar')?.click()`, false)
  await sleep(400)
  const opened = await B.eval(`(() => { const el = [...document.querySelectorAll('button')].find(b => /param/i.test(b.textContent || '')); if (!el) return false; el.click(); return true })()`, false)
  check('7. panneau paramètres ouvert', opened && await B.waitFor(`document.querySelector('input[name=contributionPolicy]')`, 10000))
  const before = await api(`/trees/${treeId}/settings`, { token: owner.token })
  check('7. réglage initial = validation', before.settings?.contributorPolicy === 'pending', before.settings?.contributorPolicy)
  await B.eval(`document.querySelector('input[name=contributionPolicy][value=direct]')?.click()`, false)
  await sleep(1500)
  await B.shot('e2e-settings-direct.png')
  const after = await api(`/trees/${treeId}/settings`, { token: owner.token })
  check('7. réglage enregistré = direct', after.settings?.contributorPolicy === 'direct' && after.settings?.memberContributionPolicy === 'direct', `${after.settings?.contributorPolicy}/${after.settings?.memberContributionPolicy}`)
} finally {
  B.close()
}

// ---------- 8. En mode direct : la contribution est appliquée immédiatement ----------
const directSession = await submitPerson(familyLogin.token, 'Directe')
const graph = await api(`/trees/${treeId}/graph`, { token: owner.token })
const applied = (graph.graph?.persons || []).some(p => p.firstName === 'Directe')
check('8. contribution appliquée directement et visible dans l arbre', directSession.status === 'approved' && applied, `${directSession.status}, ${(graph.graph?.persons || []).length} personne(s)`)

// ---------- Nettoyage : les deux comptes de test sont supprimés, l'arbre du propriétaire part avec le sien ----------
if (process.env.CLEANUP === '1') {
  for (const [label, account, token] of [['famille', FAMILY, familyLogin.token], ['propriétaire', OWNER, owner.token]]) {
    try {
      await api('/auth/me', { method: 'DELETE', token, body: { password: account.password } })
      check(`9. compte ${label} supprimé`, true)
    } catch (err) {
      check(`9. compte ${label} supprimé`, false, String(err.message).slice(0, 120))
    }
  }
  try {
    await api(`/trees/${treeId}/graph`, { token: owner.token })
    check('9. arbre de test inaccessible', false, 'le graphe répond encore')
  } catch {
    check('9. arbre de test inaccessible', true)
  }
}

const failed = results.filter(r => !r.ok)
console.log(`\n${results.length - failed.length}/${results.length} contrôles OK`)
process.exit(failed.length ? 1 : 0)
