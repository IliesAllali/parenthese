import { Fragment } from 'react'

// Mise en forme des phrases traduites : le dictionnaire porte le texte, ces deux fonctions posent l'italique.

// Titre traduit d'un bloc : le passage entre <em> et </em> garde son italique
export function withEmphasis(text) {
  const [before, emphasized = '', after = ''] = text.split(/<\/?em>/)
  return <>{before}<em>{emphasized}</em>{after}</>
}

// Phrase traduite d'un bloc : les passages entre astérisques passent en <em>, {slot} reçoit un nœud.
export function richText(text, slotNode = null) {
  return text.split(/(\{slot\})/).flatMap((chunk, chunkIndex) => (
    chunk === '{slot}'
      ? [<Fragment key={`s${chunkIndex}`}>{slotNode}</Fragment>]
      : chunk.split('*').map((part, index) => (index % 2 ? <em key={`${chunkIndex}-${index}`}>{part}</em> : part))
  ))
}
