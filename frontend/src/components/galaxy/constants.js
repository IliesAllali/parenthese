// --- Constantes visuelles ---
export const PERSON_W = 120
export const PERSON_H = 120
export const PERSON_R = 28
export const UNION_W = 24
export const UNION_H = PERSON_H
export const UNKNOWN_W = 60
export const UNKNOWN_H = PERSON_H
export const UNKNOWN_R = 18
export const MAX_ORBIT_MEDIAS = 3
export const ORBIT_RADIUS = 55
export const ORBIT_MEDIA_SIZE = 22

// --- Niveau de détail selon le zoom (scale du transform) ---
// En dessous de LOD_SHADOW_MIN_SCALE : pas d'ombre portée (invisible et coûteuse).
// En dessous de LOD_DETAIL_MIN_SCALE : pas de halo, d'orbite de médias ni d'années.
// Le prénom s'estompe entre LOD_LABEL_FADE_OUT et LOD_LABEL_FADE_IN.
export const LOD_SHADOW_MIN_SCALE = 0.6
export const LOD_DETAIL_MIN_SCALE = 0.35
export const LOD_LABEL_FADE_IN = 0.45
export const LOD_LABEL_FADE_OUT = 0.28
// Marge (unités monde) autour de l'écran pour le culling : rayon + orbite + libellé
export const CULL_MARGIN = 140

// --- Constantes animation ---
export const JITTER_RADIUS = 8
// Flottement permanent désactivé : il force un redraw à 60 fps même immobile.
// Remettre > 0 pour le réactiver (ex. 1.2).
export const FLOAT_AMPLITUDE = 0
export const FLOAT_SPEED = 0.0004
export const REPULSION_RADIUS = 90
export const REPULSION_STRENGTH = 2
export const ANGLE_VARIATION = Math.PI / 6

// --- Constantes animation d'entrée ---
// Cascade génération par génération, puis nœud par nœud de gauche à droite. Les délais unitaires
// s'appliquent aux petits arbres ; sur un grand arbre ils sont réduits pour que la cascade tienne
// dans ENTRANCE_MAX_GEN_SPAN (toutes générations) + ENTRANCE_MAX_NODE_SPAN (nœuds d'une génération).
export const ENTRANCE_GEN_DELAY = 500
export const ENTRANCE_NODE_DURATION = 700
export const ENTRANCE_NODE_STAGGER = 80
export const ENTRANCE_MAX_GEN_SPAN = 1600
export const ENTRANCE_MAX_NODE_SPAN = 700
export const ENTRANCE_LINE_DELAY = 200
export const ENTRANCE_LINE_DURATION = 500
export const ENTRANCE_ORBIT_DELAY = 300
export const ENTRANCE_ORBIT_DURATION = 400
export const ENTRANCE_ORBIT_STAGGER = 100

export const COLORS = {
  nodeAlive: '#F7ECD9',
  nodeDead: '#E8DCC8',
  borderAlive: '#A67C52',
  borderDead: '#8B7355',
  text: '#5D524B',
  textLight: '#8B7355',
  link: '#000000',
  linkUnknown: '#8B7355',
  placeholder: '#C5BDB6',
  placeholderBorder: '#A89F97',
  placeholderFill: '#E8E2DC',
}
