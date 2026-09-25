import { useSyncExternalStore } from 'react'

// App signale ici si l'arbre charge encore ; BootLoader, monté à côté d'App, l'écoute.
let booting = true
const listeners = new Set()

export function setBooting(value) {
  if (value === booting) return
  booting = value
  listeners.forEach((listener) => listener())
}

function subscribe(listener) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function useBooting() {
  return useSyncExternalStore(subscribe, () => booting)
}
