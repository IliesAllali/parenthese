import { useEffect, useMemo, useRef } from 'react'
import { t } from '../i18n/index.js'
import { persons, unions, filiations } from '../data/mockData'
import { drawCoupleLinks, drawNodes, traceSibship, FIL } from './galaxy/renderers'
import { PERSON_R } from './galaxy/constants'
import { surnameLabel } from '../utils/personName.js'
import { pickPreviewTrio, previewFamilies } from '../utils/previewTrio.js'

// Scène en unités de l'arbre : l'union au centre, les parents de part et d'autre, l'enfant dessous
const HALF_COUPLE = 76
const CHILD_DY = 146
const TOP = 46
const BOTTOM = 92
const SCALE = 0.76
// Bande des onglets, au-dessus de la scène : les vrais onglets de l'arbre (Galaxy.css), à l'échelle de la scène
const TABS_BAND = 34
const PREVIEW_HEIGHT = Math.round((TOP + CHILD_DY + BOTTOM) * SCALE + TABS_BAND)

const LINKS = [{ elkId: 'u', p1Key: 'a', p2Key: 'b' }]
const POS = new Map([
  ['a', { cx: -HALF_COUPLE, cy: 0 }],
  ['b', { cx: HALF_COUPLE, cy: 0 }],
  ['u', { cx: 0, cy: 0 }],
  ['c', { cx: 0, cy: CHILD_DY }],
])

const familyLabel = (name) => (name ? t('Famille {name}', { name: surnameLabel(name) }) : t('Famille'))

// Dessine la scène dans le canevas, à la taille de son cadre
function drawScene(canvas, stage, images, trio, { familyTabs, fullNames }) {
  if (!canvas || !stage) return
  const width = stage.clientWidth
  const height = stage.clientHeight
  if (!width || !height) return
  const dpr = window.devicePixelRatio || 1
  if (canvas.width !== Math.round(width * dpr) || canvas.height !== Math.round(height * dpr)) {
    canvas.width = Math.round(width * dpr)
    canvas.height = Math.round(height * dpr)
  }
  const ctx = canvas.getContext('2d')
  if (!ctx) return
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
  ctx.clearRect(0, 0, width, height)
  const sceneTop = familyTabs ? TABS_BAND : TABS_BAND / 2
  ctx.translate(width / 2, sceneTop + TOP * SCALE)
  ctx.scale(SCALE, SCALE)

  const nodes = [
    { id: 'a', _type: 'person', _data: trio.left },
    { id: 'b', _type: 'person', _data: trio.right },
    { id: 'u', _type: 'union' },
    { id: 'c', _type: 'person', _data: trio.child },
  ]
  const nodeMap = new Map(nodes.map((node) => [node.id, node]))
  const empty = new Map()
  drawCoupleLinks(ctx, LINKS, POS, nodeMap, empty, null, false, 0)
  ctx.strokeStyle = FIL.color
  ctx.lineWidth = FIL.width
  ctx.lineCap = 'round'
  ctx.setLineDash([])
  const childPos = POS.get('c')
  traceSibship(ctx, 'u', POS.get('u'), [{ cx: childPos.cx, cy: childPos.cy - PERSON_R }])
  drawNodes(ctx, { children: nodes }, POS, null, false, 0, {
    nodeRandomData: empty,
    imageCache: images,
    hoverScales: empty,
    selectedGlowScales: empty,
    searchGlowScales: empty,
    mediaHoverState: empty,
    view: null,
    fullNames,
    still: true,
  })
}

// Aperçu des réglages d'affichage : un couple et leur enfant dessinés par le moteur de l'arbre (renderers.js),
// avec les réglages en cours. Dessin immobile, redessiné à chaque changement de réglage.
const DisplayPreview = ({ familyTabs, fullNames, surnameUppercase, portraitShape }) => {
  const stageRef = useRef(null)
  const canvasRef = useRef(null)
  const imagesRef = useRef(new Map())
  const settingsRef = useRef({ familyTabs, fullNames })
  // L'arbre chargé à l'ouverture des paramètres
  const trio = useMemo(() => pickPreviewTrio({ persons, unions, filiations }), [])
  const [family, otherFamily] = previewFamilies(trio)

  // Les capitales et la forme des portraits sont des réglages de l'arbre, déjà appliqués : relus au dessin
  useEffect(() => {
    settingsRef.current = { familyTabs, fullNames }
    drawScene(canvasRef.current, stageRef.current, imagesRef.current, trio, settingsRef.current)
  }, [trio, familyTabs, fullNames, surnameUppercase, portraitShape])

  useEffect(() => {
    const redraw = () => drawScene(canvasRef.current, stageRef.current, imagesRef.current, trio, settingsRef.current)
    const images = imagesRef.current
    for (const person of [trio.left, trio.right, trio.child]) {
      if (!person.photo || images.has(person.photo)) continue
      const img = new Image()
      img.onload = () => { images.set(person.photo, img); redraw() }
      img.src = person.photo
    }
    document.fonts?.ready?.then(redraw)
    const observer = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(redraw) : null
    if (observer && stageRef.current) observer.observe(stageRef.current)
    return () => observer?.disconnect()
  }, [trio])

  return (
    <div className="ts-preview" aria-hidden="true">
      <div ref={stageRef} className="ts-preview-stage" style={{ height: PREVIEW_HEIGHT }}>
        <canvas ref={canvasRef} />
        {familyTabs && (
          <div className="ts-preview-tabs">
            <span className="family-tab is-active"><span className="family-tab-name">{familyLabel(family)}</span></span>
            {otherFamily && <span className="family-tab"><span className="family-tab-name">{familyLabel(otherFamily)}</span></span>}
          </div>
        )}
      </div>
    </div>
  )
}

export default DisplayPreview
