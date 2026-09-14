import { useEffect, useMemo, useState } from 'react'
import './TreeCreationWizard.css'

const INITIAL_STATE = {
  treeName: '',
  selfFirstName: '',
  selfLastName: '',
  selfBirthYear: '',
  photoFile: null,
}

function TreeCreationWizard({
  visible,
  loading,
  defaultFirstName = '',
  onClose,
  onSubmit,
}) {
  const [step, setStep] = useState(1)
  const [form, setForm] = useState(INITIAL_STATE)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!visible) {
      return
    }

    setStep(1)
    setError('')
    setForm((current) => ({
      ...INITIAL_STATE,
      treeName: current.treeName || '',
      selfFirstName: defaultFirstName || '',
    }))
  }, [defaultFirstName, visible])

  const canContinue = useMemo(() => form.treeName.trim().length >= 2 && !loading, [form.treeName, loading])
  const canCreate = useMemo(() => {
    if (loading) return false
    return form.selfFirstName.trim().length > 0 && form.selfLastName.trim().length > 0
  }, [form.selfFirstName, form.selfLastName, loading])

  if (!visible) {
    return null
  }

  const updateField = (key, value) => {
    setForm((current) => ({ ...current, [key]: value }))
  }

  const handleContinue = () => {
    if (!canContinue) return
    setError('')
    setStep(2)
  }

  const handleCreate = async (event) => {
    event.preventDefault()
    if (!canCreate) return

    setError('')
    const submitError = await onSubmit({
      treeName: form.treeName.trim(),
      selfFirstName: form.selfFirstName.trim(),
      selfLastName: form.selfLastName.trim(),
      selfBirthYear: form.selfBirthYear.trim(),
      photoFile: form.photoFile || null,
    })

    if (submitError) {
      setError(submitError)
    }
  }

  return (
    <div className="tree-wizard-overlay" role="dialog" aria-modal="true">
      <div className="tree-wizard-card">
        {step === 1 ? (
          <>
            <h2>Comment s appelle votre famille ?</h2>
            <p>Ce nom apparaitra sur votre arbre et dans le lien de partage.</p>

            <label htmlFor="wizardTreeName">Nom de la famille</label>
            <input
              id="wizardTreeName"
              type="text"
              autoFocus
              maxLength={120}
              value={form.treeName}
              onChange={(event) => updateField('treeName', event.target.value)}
              placeholder="Famille Martin"
              required
            />

            <div className="tree-wizard-actions">
              <button type="button" className="ghost" onClick={onClose} disabled={loading}>
                Fermer
              </button>
              <button type="button" onClick={handleContinue} disabled={!canContinue}>
                Continuer
              </button>
            </div>
          </>
        ) : (
          <form onSubmit={handleCreate} className="tree-wizard-form">
            <h2>Commencez par vous.</h2>
            <p>Votre arbre sera cree avec votre premiere fiche.</p>

            <label htmlFor="wizardSelfFirstName">Votre prenom</label>
            <input
              id="wizardSelfFirstName"
              type="text"
              maxLength={120}
              value={form.selfFirstName}
              onChange={(event) => updateField('selfFirstName', event.target.value)}
              required
            />

            <label htmlFor="wizardSelfLastName">Votre nom</label>
            <input
              id="wizardSelfLastName"
              type="text"
              maxLength={120}
              value={form.selfLastName}
              onChange={(event) => updateField('selfLastName', event.target.value)}
              required
            />

            <label htmlFor="wizardSelfBirthYear">Annee de naissance (optionnel)</label>
            <input
              id="wizardSelfBirthYear"
              type="number"
              min="1000"
              max="2999"
              value={form.selfBirthYear}
              onChange={(event) => updateField('selfBirthYear', event.target.value)}
              placeholder="1990"
            />

            <label htmlFor="wizardSelfPhoto">Ajouter une photo (optionnel)</label>
            <input
              id="wizardSelfPhoto"
              type="file"
              accept="image/*"
              onChange={(event) => updateField('photoFile', event.target.files?.[0] || null)}
            />

            {error && <div className="tree-wizard-error">{error}</div>}

            <div className="tree-wizard-actions">
              <button type="button" className="ghost" onClick={() => setStep(1)} disabled={loading}>
                Retour
              </button>
              <button type="submit" disabled={!canCreate}>
                {loading ? 'Creation en cours...' : 'Creer mon arbre'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}

export default TreeCreationWizard
