import { useMemo, useState } from 'react'
import PzBusy from './PzBusy.jsx'
import { t } from '../i18n/index.js'

const EMPTY_FORM = {
  selfFirstName: '',
  selfLastName: '',
  selfBirthYear: '',
  parent1FirstName: '',
  parent1LastName: '',
  parent2FirstName: '',
  parent2LastName: '',
}

function toDateFromYear(yearText) {
  const year = Number.parseInt(yearText, 10)
  if (!Number.isFinite(year) || year < 1000 || year > 2999) {
    return null
  }

  return `${year.toString().padStart(4, '0')}-01-01`
}

const InitialTreeWizard = ({ loading, errorMessage, onSubmit, onSkip }) => {
  const [form, setForm] = useState(EMPTY_FORM)

  const canSubmit = useMemo(() => {
    return (
      form.selfFirstName.trim().length > 0 &&
      form.selfLastName.trim().length > 0 &&
      form.parent1FirstName.trim().length > 0 &&
      form.parent1LastName.trim().length > 0 &&
      form.parent2FirstName.trim().length > 0 &&
      form.parent2LastName.trim().length > 0 &&
      !loading
    )
  }, [form, loading])

  const updateField = (key, value) => {
    setForm((current) => ({ ...current, [key]: value }))
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    if (!canSubmit) return

    await onSubmit({
      self: {
        firstName: form.selfFirstName.trim(),
        lastName: form.selfLastName.trim(),
        birthDate: toDateFromYear(form.selfBirthYear.trim()),
      },
      parent1: {
        firstName: form.parent1FirstName.trim(),
        lastName: form.parent1LastName.trim(),
      },
      parent2: {
        firstName: form.parent2FirstName.trim(),
        lastName: form.parent2LastName.trim(),
      },
    })
  }

  return (
    <div className="wizard-overlay">
      <form className="wizard-card" onSubmit={handleSubmit}>

        <div className="wizard-persons">

          <div className="wizard-person">
            <div className="wizard-person-label wizard-person-label--self">{t('Vous')}</div>
            <div className="wizard-person-fields">
              <input
                type="text"
                placeholder={t('Prénom')}
                value={form.selfFirstName}
                onChange={(e) => updateField('selfFirstName', e.target.value)}
                required
              />
              <input
                type="text"
                placeholder={t('Nom')}
                value={form.selfLastName}
                onChange={(e) => updateField('selfLastName', e.target.value)}
                required
              />
            </div>
            <input
              className="wizard-year"
              type="number"
              placeholder={t('Année de naissance (optionnel)')}
              min="1000"
              max="2999"
              value={form.selfBirthYear}
              onChange={(e) => updateField('selfBirthYear', e.target.value)}
            />
          </div>

          <div className="wizard-person">
            <div className="wizard-person-label">{t('Parent 1')}</div>
            <div className="wizard-person-fields">
              <input
                type="text"
                placeholder={t('Prénom')}
                value={form.parent1FirstName}
                onChange={(e) => updateField('parent1FirstName', e.target.value)}
                required
              />
              <input
                type="text"
                placeholder={t('Nom')}
                value={form.parent1LastName}
                onChange={(e) => updateField('parent1LastName', e.target.value)}
                required
              />
            </div>
          </div>

          <div className="wizard-person">
            <div className="wizard-person-label">{t('Parent 2')}</div>
            <div className="wizard-person-fields">
              <input
                type="text"
                placeholder={t('Prénom')}
                value={form.parent2FirstName}
                onChange={(e) => updateField('parent2FirstName', e.target.value)}
                required
              />
              <input
                type="text"
                placeholder={t('Nom')}
                value={form.parent2LastName}
                onChange={(e) => updateField('parent2LastName', e.target.value)}
                required
              />
            </div>
          </div>

        </div>

        {errorMessage && <div className="wizard-error">{errorMessage}</div>}

        <button type="submit" disabled={!canSubmit}>
          <PzBusy busy={loading} busyLabel={t('Création en cours')}>{t('Créer les 3 personnes')}</PzBusy>
        </button>

        <button type="button" className="ghost" onClick={onSkip} disabled={loading}>
          {t('Plus tard')}
        </button>

      </form>
    </div>
  )
}

export default InitialTreeWizard
