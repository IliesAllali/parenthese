import { describe, expect, it } from 'vitest'
import {
  getAcceptForMediaType,
  getUploadMimeType,
  inferMediaTypeFromMimeType,
  resolveUploadMediaType,
  validateMediaFile,
} from './mediaUpload'

describe('mediaUpload utils', () => {
  it('infers media type from mime type', () => {
    expect(inferMediaTypeFromMimeType('image/png')).toBe('photo')
    expect(inferMediaTypeFromMimeType('video/mp4')).toBe('video')
    expect(inferMediaTypeFromMimeType('audio/mpeg')).toBe('audio')
    expect(inferMediaTypeFromMimeType('application/pdf')).toBe('document')
    expect(inferMediaTypeFromMimeType('application/geo+json')).toBe('geojson')
    expect(inferMediaTypeFromMimeType('application/gpx+xml')).toBe('gpx')
  })

  it('resolves explicit requested type first', () => {
    expect(resolveUploadMediaType({ type: 'image/png' }, 'document')).toBe('document')
    expect(resolveUploadMediaType({ type: 'image/png' }, 'auto')).toBe('photo')
  })

  it('builds fallback mime type when missing from file', () => {
    expect(getUploadMimeType({ type: '' }, 'photo')).toBe('image/jpeg')
    expect(getUploadMimeType({ type: '' }, 'video')).toBe('video/mp4')
    expect(getUploadMimeType({ type: '' }, 'audio')).toBe('audio/mpeg')
    expect(getUploadMimeType({ type: '' }, 'document')).toBe('application/octet-stream')
    expect(getUploadMimeType({ type: '' }, 'geojson')).toBe('application/geo+json')
    expect(getUploadMimeType({ type: '' }, 'gpx')).toBe('application/gpx+xml')
  })

  it('validates media size constraints', () => {
    expect(validateMediaFile(null, 'photo')).toBe('Selectionnez un fichier.')
    expect(validateMediaFile({ size: 0 }, 'photo')).toBe('Fichier invalide.')
    expect(validateMediaFile({ size: 25 * 1024 * 1024 }, 'document')).toBe('Fichier trop volumineux (max 20 Mo).')
    expect(validateMediaFile({ size: 6 * 1024 * 1024 }, 'photo')).toBe('Image trop volumineuse (max 5 Mo).')
    expect(validateMediaFile({ size: 4 * 1024 * 1024 }, 'photo')).toBe('')
    expect(validateMediaFile(null, 'citation', { citationText: '' })).toBe('Saisissez le texte de la citation.')
    expect(validateMediaFile(null, 'citation', { citationText: 'Toujours avancer' })).toBe('')
  })

  it('returns accept filter by media type', () => {
    expect(getAcceptForMediaType('photo')).toBe('image/*')
    expect(getAcceptForMediaType('video')).toBe('video/*')
    expect(getAcceptForMediaType('audio')).toBe('audio/*')
    expect(getAcceptForMediaType('document')).toContain('.pdf')
    expect(getAcceptForMediaType('citation')).toBe('')
    expect(getAcceptForMediaType('geojson')).toContain('.geojson')
    expect(getAcceptForMediaType('gpx')).toContain('.gpx')
  })
})
