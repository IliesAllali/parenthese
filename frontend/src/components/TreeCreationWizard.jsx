import { useEffect, useMemo, useState } from 'react'
import { ImagePlus } from 'lucide-react'
import './TreeCreationWizard.css'
import PzBusy from './PzBusy.jsx'

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
    <div className="pz-overlay tree-wizard-overlay" role="dialog" aria-modal="true" aria-labelledby="treeWizardTitle">
      <div className="pz-modal tree-wizard-card">
        <div className="tw-steps" aria-label={`Étape ${step} sur 2`}>
          <span className={`tw-step ${step >= 1 ? 'is-on' : ''}`} />
          <span className={`tw-step ${step >= 2 ? 'is-on' : ''}`} />
          <span className="pz-small">Étape {step} sur 2</span>
        </div>

        {step === 1 ? (
          <>
            <div className="pz-modal-head">
              <h2 id="treeWizardTitle" className="pz-title">Comment s'appelle <em>votre famille</em> ?</h2>
              <p className="pz-sub">Ce nom apparaîtra en haut de l'arbre et dans le lien que vous partagerez.</p>
            </div>

            <div className="pz-field">
              <label htmlFor="wizardTreeName">Nom de la famille</label>
              <input
                id="wizardTreeName"
                type="text"
                autoFocus
                maxLength={120}
                value={form.treeName}
                onChange={(event) => updateField('treeName', event.target.value)}
                onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); handleContinue() } }}
                placeholder="Famille Martin"
                required
              />
            </div>

            <div className="pz-modal-actions">
              <button type="button" className="pz-btn pz-btn--ghost" onClick={onClose} disabled={loading}>
                Fermer
              </button>
              <button type="button" className="pz-btn pz-btn--primary" onClick={handleContinue} disabled={!canContinue}>
                Continuer
              </button>
            </div>
          </>
        ) : (
          <form onSubmit={handleCreate} className="tw-form">
            <div className="pz-modal-head">
              <h2 id="treeWizardTitle" className="pz-title">Commencez <em>par vous</em></h2>
              <p className="pz-sub">L'arbre « {form.treeName.trim()} » démarre avec votre fiche. Vous ajouterez les autres ensuite.</p>
            </div>

            <div className="pz-row2">
              <div className="pz-field">
                <label htmlFor="wizardSelfFirstName">Votre prénom</label>
                <input
                  id="wizardSelfFirstName"
                  type="text"
                  maxLength={120}
                  autoComplete="given-name"
                  value={form.selfFirstName}
                  onChange={(event) => updateField('selfFirstName', event.target.value)}
                  required
                />
              </div>
              <div className="pz-field">
                <label htmlFor="wizardSelfLastName">Votre nom</label>
                <input
                  id="wizardSelfLastName"
                  type="text"
                  maxLength={120}
                  autoComplete="family-name"
                  value={form.selfLastName}
                  onChange={(event) => updateField('selfLastName', event.target.value)}
                  required
                />
              </div>
            </div>

            <div className="pz-field">
              <label htmlFor="wizardSelfBirthYear">Année de naissance <span className="tw-optional">facultatif</span></label>
              <input
                id="wizardSelfBirthYear"
                type="number"
                inputMode="numeric"
                min="1000"
                max="2999"
                value={form.selfBirthYear}
                onChange={(event) => updateField('selfBirthYear', event.target.value)}
                placeholder="1990"
              />
            </div>

            <div className="pz-field">
              <span className="pz-label">Votre photo <span className="tw-optional">facultatif</span></span>
              <label htmlFor="wizardSelfPhoto" className="tw-photo">
                <span className="tw-photo-icon" aria-hidden="true"><ImagePlus size={20} strokeWidth={1.8} /></span>
                <span className="tw-photo-text">
                  <strong>{form.photoFile ? form.photoFile.name : 'Choisir une photo'}</strong>
                  <span>{form.photoFile ? 'Cliquez pour en choisir une autre' : 'Un portrait où l\'on voit bien votre visage'}</span>
                </span>
              </label>
              <input
                id="wizardSelfPhoto"
                className="tw-photo-input"
                type="file"
                accept="image/*"
                onChange={(event) => updateField('photoFile', event.target.files?.[0] || null)}
              />
            </div>

            {error && <div className="pz-error tree-wizard-error" role="alert">{error}</div>}

            <div className="pz-modal-actions">
              <button type="button" className="pz-btn pz-btn--ghost" onClick={() => setStep(1)} disabled={loading}>
                Retour
              </button>
              <button type="submit" className="pz-btn pz-btn--primary" disabled={!canCreate}>
                <PzBusy busy={loading} busyLabel="Création de l'arbre">Créer mon arbre</PzBusy>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}

export default TreeCreationWizard
