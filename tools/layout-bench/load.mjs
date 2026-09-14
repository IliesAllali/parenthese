// Charge une fixture (arbre réel) dans le format Galaxy via loadGraphData (code du repo, inchangé)
import { readFileSync } from 'node:fs'
import { fileURLToPath, pathToFileURL } from 'node:url'

export const REPO = fileURLToPath(new URL('../../frontend/src/', import.meta.url))
const mockData = await import(pathToFileURL(`${REPO}data/mockData.js`).href)

export async function loadFixture(name = process.env.FIXTURE || 'famille') {
  const raw = JSON.parse(readFileSync(new URL(`./fixtures/${name}-graph.json`, import.meta.url), 'utf8'))
  mockData.loadGraphData(raw.graph, { apiBaseUrl: '', authToken: '' })
  return {
    persons: mockData.persons,
    unions: mockData.unions,
    filiations: mockData.filiations,
    medias: mockData.medias,
  }
}

export const constants = await import(pathToFileURL(`${REPO}components/galaxy/constants.js`).href)
export const layoutModule = await import(pathToFileURL(`${REPO}components/galaxy/elkLayout.js`).href)
