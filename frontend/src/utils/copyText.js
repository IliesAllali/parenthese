// Copier un texte. navigator.clipboard n'existe qu'en contexte sécurisé (https ou localhost) : une instance
// auto-hébergée servie en http sur le réseau de la maison n'en a pas. On passe alors par une zone de texte
// sélectionnée et execCommand('copy'), toujours accepté dans le geste de l'utilisateur.
export async function copyText(text) {
  const value = String(text ?? '')
  if (!value) return false
  if (navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(value)
      return true
    } catch {
      // Refusé (permission, webview) : la zone de texte peut encore copier
    }
  }
  return copyWithSelection(value)
}

function copyWithSelection(value) {
  if (typeof document === 'undefined') return false
  const area = document.createElement('textarea')
  area.value = value
  area.setAttribute('readonly', '')
  area.style.position = 'fixed'
  area.style.top = '0'
  area.style.left = '0'
  area.style.opacity = '0'
  document.body.appendChild(area)
  area.select()
  let copied
  try {
    copied = document.execCommand('copy')
  } catch {
    copied = false
  }
  area.remove()
  return copied
}
