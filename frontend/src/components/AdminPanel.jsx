import { useEffect, useRef, useState } from 'react'
import {
  deleteTree,
  exportGedcom,
  fetchTreeSettings,
  getTree,
  importGedcom,
  updateTree,
  updateTreeSettings,
} from '../api/treeApi'

function normalizeSlug(value) {
  return String(value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

const AdminPanel = ({
  visible,
  treeId,
  authToken,
  onClose,
  onTreeDeleted,
  onGedcomImported,
}) => {
  const [section, setSection] = useState('tree')
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [successMessage, setSuccessMessage] = useState('')

  const [tree, setTree] = useState(null)
  const [treeName, setTreeName] = useState('')
  const [treeDescription, setTreeDescription] = useState('')
  // Contributions de la famille : 'pending' = validées par l'admin, 'direct' = appliquées immédiatement
  const [contributionPolicy, setContributionPolicy] = useState('pending')
  const [savingPolicy, setSavingPolicy] = useState(false)

  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [deleteConfirmName, setDeleteConfirmName] = useState('')
  const [gedcomFile, setGedcomFile] = useState(null)
  const [importingGedcom, setImportingGedcom] = useState(false)
  const gedcomInputRef = useRef(null)

  useEffect(() => {
    if (!visible || !treeId || !authToken) {
      return
    }

    let active = true
    setLoading(true)
    setErrorMessage('')
    setSuccessMessage('')
    setSection('tree')
    setShowDeleteModal(false)
    setDeleteConfirmName('')
    setGedcomFile(null)
    setImportingGedcom(false)

    fetchTreeSettings(treeId, authToken)
      .then((settings) => {
        if (!active || !settings) return
        setContributionPolicy(settings.contributorPolicy === 'direct' ? 'direct' : 'pending')
      })
      .catch(() => {
        // Réglage non chargé : on laisse la valeur par défaut affichée
      })

    getTree(treeId, authToken)
      .then((result) => {
        if (!active) return
        const loadedTree = result?.tree || null
        setTree(loadedTree)
        setTreeName(loadedTree?.name || '')
        setTreeDescription(loadedTree?.description || '')
      })
      .catch(() => {
        if (!active) return
        setErrorMessage("Impossible de charger les paramètres de cet arbre.")
      })
      .finally(() => {
        if (active) setLoading(false)
      })

    return () => {
      active = false
    }
  }, [visible, treeId, authToken])

  const handlePolicyChange = async (nextPolicy) => {
    if (!treeId || !authToken || savingPolicy || nextPolicy === contributionPolicy) return
    const previous = contributionPolicy
    setContributionPolicy(nextPolicy)
    setSavingPolicy(true)
    setErrorMessage('')
    setSuccessMessage('')
    try {
      // Un seul réglage pour la famille, avec ou sans compte
      await updateTreeSettings(treeId, { contributorPolicy: nextPolicy, memberContributionPolicy: nextPolicy }, authToken)
      setSuccessMessage(nextPolicy === 'direct'
        ? 'Les modifications de la famille sont désormais appliquées directement.'
        : 'Vous validez désormais chaque proposition de la famille.')
    } catch {
      setContributionPolicy(previous)
      setErrorMessage("Impossible d'enregistrer ce réglage.")
    } finally {
      setSavingPolicy(false)
    }
  }

  const handleSaveTree = async (event) => {
    event.preventDefault()
    if (!treeId || !authToken || saving || !tree) return

    const nextName = treeName.trim()
    if (nextName.length < 2) {
      setErrorMessage("Le nom de l'arbre est trop court.")
      return
    }

    setSaving(true)
    setErrorMessage('')
    setSuccessMessage('')

    try {
      const payload = {
        name: nextName,
        description: treeDescription.trim() || null,
      }

      const normalized = normalizeSlug(nextName)
      const slugWillChange = normalized && normalized !== tree.slug
      if (slugWillChange) {
        const confirmSlugUpdate = window.confirm(
          'Souhaitez-vous mettre à jour aussi le lien de partage avec ce nouveau nom ?',
        )
        if (confirmSlugUpdate) {
          payload.slug = normalized
        }
      }

      const updated = await updateTree(treeId, payload, authToken)
      setTree(updated)
      setTreeName(updated?.name || nextName)
      setTreeDescription(updated?.description || '')
      setSuccessMessage('Modifications enregistrées.')
    } catch {
      setErrorMessage("Impossible d'enregistrer les modifications.")
    } finally {
      setSaving(false)
    }
  }

  const handleExportGedcom = async () => {
    if (!treeId || !authToken || saving) return
    setSaving(true)
    setErrorMessage('')
    setSuccessMessage('')

    try {
      const { blob, filename } = await exportGedcom(treeId, authToken)
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = filename
      link.click()
      URL.revokeObjectURL(url)
    } catch {
      setErrorMessage('Échec du téléchargement GEDCOM.')
    } finally {
      setSaving(false)
    }
  }

  const readFileAsText = (file) => new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result || ''))
    reader.onerror = () => reject(new Error('read_failed'))
    reader.readAsText(file)
  })

  const handleImportGedcom = async () => {
    if (!treeId || !authToken || saving || !gedcomFile) {
      return
    }

    setSaving(true)
    setImportingGedcom(true)
    setErrorMessage('')
    setSuccessMessage('')

    try {
      const fileContent = await readFileAsText(gedcomFile)
      if (!fileContent.trim()) {
        setErrorMessage("Le fichier GEDCOM est vide.")
        return
      }

      const result = await importGedcom(treeId, fileContent, authToken)
      const personsCreated = Number(result?.personsCreated || 0)
      const unionsCreated = Number(result?.unionsCreated || 0)
      const linksCreated = Number(result?.linksCreated || 0)

      setSuccessMessage(
        `Import GEDCOM terminé : ${personsCreated} personnes, ${unionsCreated} unions, ${linksCreated} filiations.`,
      )
      setGedcomFile(null)
      if (gedcomInputRef.current) {
        gedcomInputRef.current.value = ''
      }
      await onGedcomImported?.(result)
    } catch {
      setErrorMessage("Impossible d'importer ce fichier GEDCOM.")
    } finally {
      setImportingGedcom(false)
      setSaving(false)
    }
  }

  const handleDeleteTree = async () => {
    if (!treeId || !authToken || saving || !tree) return
    if (deleteConfirmName.trim() !== tree.name) {
      setErrorMessage('Le nom saisi ne correspond pas.')
      return
    }

    setSaving(true)
    setErrorMessage('')
    setSuccessMessage('')

    try {
      await deleteTree(treeId, authToken)
      setShowDeleteModal(false)
      onTreeDeleted?.(treeId)
      onClose?.()
    } catch {
      setErrorMessage('Impossible de supprimer cet arbre.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div
      className={`contrib-overlay tree-settings-overlay ${visible ? 'contrib-overlay--open tree-settings-overlay--open' : ''}`}
      onClick={() => {
        if (visible && !showDeleteModal) onClose?.()
      }}
      aria-hidden={!visible}
    >
      <div
        className="contrib-card tree-settings-card"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Paramètres de l'arbre"
      >
        <div className="contrib-header tree-settings-header">
          <div className="contrib-header-text">
            <h1>Paramètres de l'arbre</h1>
            <p>{tree?.name || 'Réglages de cet arbre familial'}</p>
          </div>
          <button type="button" className="ghost" onClick={onClose}>Fermer</button>
        </div>

        <div className="tree-settings-tabs">
          <button type="button" className={`tree-settings-tab ${section === 'tree' ? 'active' : ''}`} onClick={() => setSection('tree')}>Votre arbre</button>
          <button type="button" className={`tree-settings-tab ${section === 'data' ? 'active' : ''}`} onClick={() => setSection('data')}>Données</button>
          <button type="button" className={`tree-settings-tab ${section === 'danger' ? 'active' : ''}`} onClick={() => setSection('danger')}>Paramètres avancés</button>
        </div>

        <div className="tree-settings-content">
          {loading ? (
            <div className="contrib-empty">Chargement...</div>
          ) : (
            <>
              {errorMessage && <div className="contrib-error">{errorMessage}</div>}
              {successMessage && <div className="contrib-ok">{successMessage}</div>}

              {section === 'tree' && (
                <form className="tree-settings-panel" onSubmit={handleSaveTree}>
                  <h2>Votre arbre</h2>
                  <p className="tree-settings-help">Modifiez le nom et la description affichés à votre famille.</p>

                  <label htmlFor="settingsTreeName">Nom de l'arbre</label>
                  <input
                    id="settingsTreeName"
                    type="text"
                    value={treeName}
                    maxLength={120}
                    onChange={(event) => setTreeName(event.target.value)}
                    required
                  />

                  <label htmlFor="settingsTreeDescription">Description (optionnelle)</label>
                  <input
                    id="settingsTreeDescription"
                    type="text"
                    value={treeDescription}
                    maxLength={500}
                    onChange={(event) => setTreeDescription(event.target.value)}
                  />

                  <div className="tree-settings-actions">
                    <button type="submit" className="tree-settings-primary" disabled={saving}>
                      {saving ? 'Enregistrement...' : 'Enregistrer les modifications'}
                    </button>
                  </div>

                  <fieldset className="tree-settings-policy" disabled={savingPolicy}>
                    <legend>Contributions de la famille</legend>
                    <p className="tree-settings-help">
                      Ce que deviennent les ajouts et corrections faits avec le mot de passe de contribution.
                    </p>
                    <label className="tree-settings-radio">
                      <input
                        type="radio"
                        name="contributionPolicy"
                        value="pending"
                        checked={contributionPolicy === 'pending'}
                        onChange={() => handlePolicyChange('pending')}
                      />
                      <span>
                        <strong>Je valide chaque proposition</strong>
                        <small>Rien n'apparaît dans l'arbre avant votre accord.</small>
                      </span>
                    </label>
                    <label className="tree-settings-radio">
                      <input
                        type="radio"
                        name="contributionPolicy"
                        value="direct"
                        checked={contributionPolicy === 'direct'}
                        onChange={() => handlePolicyChange('direct')}
                      />
                      <span>
                        <strong>Les modifications sont appliquées directement</strong>
                        <small>La famille modifie l'arbre sans attendre. Vous gardez l'historique.</small>
                      </span>
                    </label>
                  </fieldset>
                </form>
              )}

              {section === 'data' && (
                <div className="tree-settings-panel">
                  <h2>Données de l'arbre</h2>
                  <p className="tree-settings-help">Récupérez vos informations à tout moment.</p>

                  <div className="tree-settings-row">
                    <div className="tree-settings-row-text">
                      <strong>Importer un fichier GEDCOM</strong>
                      <p>Ajoute les personnes et relations du fichier dans cet arbre.</p>
                    </div>
                    <div className="tree-settings-row-actions">
                      <input
                        ref={gedcomInputRef}
                        className="tree-settings-file-input"
                        type="file"
                        accept=".ged,text/x-gedcom,text/plain"
                        onChange={(event) => setGedcomFile(event.target.files?.[0] || null)}
                      />
                      <button
                        type="button"
                        className="tree-settings-secondary"
                        onClick={() => gedcomInputRef.current?.click()}
                        disabled={saving}
                      >
                        Choisir un fichier
                      </button>
                      {gedcomFile && <span className="tree-settings-file-name">{gedcomFile.name}</span>}
                      <button
                        type="button"
                        className="tree-settings-primary"
                        onClick={handleImportGedcom}
                        disabled={saving || !gedcomFile}
                      >
                        {importingGedcom ? 'Import...' : 'Importer .ged'}
                      </button>
                    </div>
                  </div>

                  <div className="tree-settings-row">
                    <div className="tree-settings-row-text">
                      <strong>Fichier GEDCOM</strong>
                      <p>Format standard généalogique, compatible avec les principaux outils.</p>
                    </div>
                    <div className="tree-settings-row-actions tree-settings-row-actions--inline">
                      <button type="button" className="tree-settings-primary" onClick={handleExportGedcom} disabled={saving}>
                        Télécharger .ged
                      </button>
                    </div>
                  </div>

                  <div className="tree-settings-row tree-settings-row--muted">
                    <div className="tree-settings-row-text">
                      <strong>Sauvegarde complète</strong>
                      <p>Toutes les données et médias (phase 2).</p>
                    </div>
                    <div className="tree-settings-row-actions tree-settings-row-actions--inline">
                      <button type="button" className="tree-settings-secondary" disabled>
                        Télécharger .zip
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {section === 'danger' && (
                <div className="tree-settings-panel tree-settings-panel--danger">
                  <h2>Paramètres avancés</h2>
                  <p className="tree-settings-help">Ces actions ont un impact définitif.</p>

                  <div className="tree-settings-danger-box">
                    <button type="button" className="danger-action" onClick={() => setShowDeleteModal(true)}>
                      Supprimer cet arbre
                    </button>
                    <p>Cette action est irréversible. Toutes les données et médias seront supprimés.</p>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {showDeleteModal && (
        <div className="settings-delete-modal-overlay" onClick={() => !saving && setShowDeleteModal(false)}>
          <div className="settings-delete-modal" onClick={(event) => event.stopPropagation()}>
            <h3>Confirmer la suppression</h3>
            <p>Saisissez le nom de l'arbre pour confirmer : <strong>{tree?.name}</strong></p>
            <input
              type="text"
              value={deleteConfirmName}
              onChange={(event) => setDeleteConfirmName(event.target.value)}
              placeholder="Nom exact de l'arbre"
            />
            <div className="settings-delete-actions">
              <button type="button" className="ghost" onClick={() => setShowDeleteModal(false)} disabled={saving}>
                Annuler
              </button>
              <button type="button" className="danger-action" onClick={handleDeleteTree} disabled={saving}>
                {saving ? 'Suppression...' : 'Supprimer définitivement'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default AdminPanel
