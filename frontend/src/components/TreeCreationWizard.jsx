import { useEffect, useMemo, useState } from 'react'
import { FileUp } from 'lucide-react'
import './TreeCreationWizard.css'
import PzBusy from './PzBusy.jsx'
import { t } from '../i18n/index.js'
import { withEmphasis } from '../utils/richText.jsx'

const INITIAL_STATE = {
  selfFirstName: '',
  selfLastName: '',
  selfBirthYear: '',
  // « J'ai déjà un arbre » : fichier GEDCOM exporté d'un logiciel, importé à la création
  start: 'self',
  gedcomFile: null,
}

// Un seul écran avant l'arbre (#251) : « Commencez par vous ». L'arbre s'appelle « Famille » suivi du nom tapé, il se
// renomme dans ses réglages ; un arbre importé s'appelle « Mon arbre ».
function treeNameFor(form) {
  if (form.start === 'import') return t('Mon arbre')
  return t('Famille {name}', { name: form.selfLastName.trim() })
}

function TreeCreationWizard({
  visible,
  loading,
  defaultFirstName = '',
  onClose,
  onSubmit,
}) {
  const [form, setForm] = useState(INITIAL_STATE)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!visible) {
      return
    }

    setError('')
    setForm({ ...INITIAL_STATE, selfFirstName: defaultFirstName || '' })
  }, [defaultFirstName, visible])

  const canCreate = useMemo(() => {
    if (loading) return false
    if (form.start === 'import') return Boolean(form.gedcomFile)
    return form.selfFirstName.trim().length > 0 && form.selfLastName.trim().length > 0
  }, [form.selfFirstName, form.selfLastName, form.start, form.gedcomFile, loading])

  if (!visible) {
    return null
  }

  const updateField = (key, value) => {
    setForm((current) => ({ ...current, [key]: value }))
  }

  const handleCreate = async (event) => {
    event.preventDefault()
    if (!canCreate) return

    setError('')
    if (form.start === 'import') {
      const submitError = await onSubmit({ treeName: treeNameFor(form), gedcomFile: form.gedcomFile })
      if (submitError) setError(submitError)
      return
    }
    const submitError = await onSubmit({
      treeName: treeNameFor(form),
      selfFirstName: form.selfFirstName.trim(),
      selfLastName: form.selfLastName.trim(),
      selfBirthYear: form.selfBirthYear.trim(),
    })

    if (submitError) {
      setError(submitError)
    }
  }

  return (
    <div className="pz-overlay tree-wizard-overlay" role="dialog" aria-modal="true" aria-labelledby="treeWizardTitle">
      <div className="pz-modal tree-wizard-card">
        <form onSubmit={handleCreate} className="tw-form">
          <div className="pz-tabs tw-start" role="tablist" aria-label={t('Point de départ')}>
            <button type="button" role="tab" aria-selected={form.start === 'self'} className={`pz-tab ${form.start === 'self' ? 'is-active' : ''}`} onClick={() => updateField('start', 'self')}>
              {t('Je pars de moi')}
            </button>
            <button type="button" role="tab" aria-selected={form.start === 'import'} className={`pz-tab ${form.start === 'import' ? 'is-active' : ''}`} onClick={() => updateField('start', 'import')}>
              {t("J'ai déjà un arbre")}
            </button>
          </div>

          {form.start === 'import' ? (
            <>
              <div className="pz-modal-head">
                <h2 id="treeWizardTitle" className="pz-title">{withEmphasis(t('Importez <em>votre arbre</em>'))}</h2>
                <p className="pz-sub">{t('Heredis, Geneanet, Gramps, MyHeritage ou Ancestry savent exporter un fichier .ged. Parenthèse reprend les personnes, les liens et les dates, puis vous aide à retrouver les photos.')}</p>
              </div>
              <div className="pz-field">
                <label htmlFor="wizardGedcom" className="tw-photo">
                  <span className="tw-photo-icon" aria-hidden="true"><FileUp size={20} strokeWidth={1.8} /></span>
                  <span className="tw-photo-text">
                    <strong>{form.gedcomFile ? form.gedcomFile.name : t('Choisir le fichier .ged ou le zip')}</strong>
                    <span>{form.gedcomFile ? t('Cliquez pour en choisir un autre') : t('Exporté depuis votre logiciel. Un zip avec le .ged et ses photos fait tout en une fois.')}</span>
                  </span>
                </label>
                <input
                  id="wizardGedcom"
                  className="tw-photo-input"
                  type="file"
                  accept=".ged,.zip,.gdz,text/x-gedcom,text/plain,application/zip"
                  onChange={(event) => updateField('gedcomFile', event.target.files?.[0] || null)}
                />
              </div>
            </>
          ) : (
            <>
          <div className="pz-modal-head">
            <h2 id="treeWizardTitle" className="pz-title">{withEmphasis(t('Commencez <em>par vous</em>'))}</h2>
          </div>

          <div className="pz-row2">
            <div className="pz-field">
              <label htmlFor="wizardSelfFirstName">{t('Votre prénom')}</label>
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
              <label htmlFor="wizardSelfLastName">{t('Votre nom')}</label>
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
            <label htmlFor="wizardSelfBirthYear">{t('Année de naissance')} <span className="tw-optional">{t('facultatif')}</span></label>
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

            </>
          )}

          {error && <div className="pz-error tree-wizard-error" role="alert">{error}</div>}

          <div className="pz-modal-actions tw-actions">
            <button type="button" className="pz-btn pz-btn--ghost" onClick={onClose} disabled={loading}>
              {t('Retour')}
            </button>
            <button type="submit" className="pz-btn pz-btn--primary" disabled={!canCreate}>
              <PzBusy busy={loading} busyLabel={form.start === 'import' ? t('Import en cours') : t("Création de l'arbre")}>
                {form.start === 'import' ? t('Importer mon arbre') : t('Créer mon arbre')}
              </PzBusy>
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default TreeCreationWizard
