// Captures d'une instance fraîchement installée, pour vérifier à l'œil que l'installation du README marche.
// Lancé par le workflow « Fresh install » : node tools/fresh-install-shots.mjs <adresse> <dossier de sortie>
// Chaque étape est capturée même si la suivante échoue ; le script sort en erreur si une étape a échoué.
import { chromium } from 'playwright'

const [base = 'http://localhost', out = 'shots'] = process.argv.slice(2)
const browser = await chromium.launch({ args: ['--lang=en-US'] })
const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, locale: 'en-US' })
const errors = []
page.on('pageerror', (error) => errors.push(`page error: ${error.message}`))

async function step(name, action) {
  try {
    await action()
  } catch (error) {
    errors.push(`${name}: ${error.message.split('\n')[0]}`)
  }
  await page.waitForTimeout(1500)
  await page.screenshot({ path: `${out}/${name}.png` })
}

const stamp = Date.now().toString(36)

await step('1-demo', () => page.goto(`${base}/?lang=en`, { waitUntil: 'networkidle' }))
await step('2-register', async () => {
  await page.goto(`${base}/?account=register&lang=en`, { waitUntil: 'networkidle' })
  await page.getByLabel('First name', { exact: true }).fill('Camille')
  await page.getByLabel('Email', { exact: true }).fill(`fresh-${stamp}@example.com`)
  await page.getByLabel('Password', { exact: true }).fill(`fresh-install-${stamp}`)
})
await step('3-after-register', () => page.getByRole('button', { name: 'Create my account' }).click())
await step('4-reload', () => page.reload({ waitUntil: 'networkidle' }))

console.log(errors.length ? errors.join('\n') : 'all steps ran')
await browser.close()
if (errors.length) process.exit(1)
