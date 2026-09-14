import { Resend, type ErrorResponse } from 'resend'

import { env } from '../config/env.js'

type WaitlistSignupPayload = {
  email: string
  prenom: string | null
  source: string
}

type LoggerLike = {
  info: (obj: unknown, msg?: string) => void
  warn: (obj: unknown, msg?: string) => void
  error: (obj: unknown, msg?: string) => void
}

const resendClient = env.RESEND_API_KEY ? new Resend(env.RESEND_API_KEY) : null
const hasWaitlistContactTarget = Boolean(env.RESEND_WAITLIST_SEGMENT_ID || env.RESEND_WAITLIST_AUDIENCE_ID)

function isDuplicateLikeError(error: ErrorResponse | null): boolean {
  if (!error?.message) {
    return false
  }

  const normalizedMessage = error.message.toLowerCase()
  return normalizedMessage.includes('already') || normalizedMessage.includes('exists')
}

function sanitizeTagValue(rawValue: string): string {
  const normalized = rawValue.toLowerCase().replace(/[^a-z0-9_-]/g, '_')
  return normalized.slice(0, 256) || 'direct'
}

function escapeHtml(rawValue: string): string {
  return rawValue
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function resolveUnsubscribeLink(): string {
  if (env.RESEND_WAITLIST_UNSUBSCRIBE_URL) {
    return env.RESEND_WAITLIST_UNSUBSCRIBE_URL
  }

  const unsubscribeEmail = (env.RESEND_WAITLIST_REPLY_TO || 'hello@parenthese.io').trim()
  const subject = encodeURIComponent('Désinscription waitlist Parenthèse')
  return `mailto:${unsubscribeEmail}?subject=${subject}`
}

function buildWaitlistEmailHtml(firstName: string, unsubscribeLink: string): string {
  const escapedFirstName = escapeHtml(firstName)
  const escapedUnsubscribeLink = escapeHtml(unsubscribeLink)
  const shareLink = 'https://parenthese.io/?source=waitlist-share'

  return `
<!doctype html>
<html lang="fr">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Parenthèse - inscription confirmée</title>
  </head>
  <body style="margin:0;padding:0;background:#fef9ed;color:#5d524b;font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;">
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#fef9ed;padding:24px 12px;">
      <tr>
        <td align="center">
          <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="max-width:600px;background:#f7ecd9;border:1px solid #eadac0;border-radius:16px;overflow:hidden;">
            <tr>
              <td style="padding:28px 28px 20px;background:linear-gradient(180deg,#fff5df 0%,#fef9ed 100%);text-align:center;">
                <div style="display:inline-flex;align-items:center;gap:10px;">
                  <span style="display:inline-block;width:42px;height:42px;border-radius:10px;background:#a67c52;color:#fef9ed;line-height:42px;font-weight:700;font-size:20px;text-align:center;">P</span>
                  <span style="font-size:22px;font-weight:700;color:#5d524b;">Parenthèse</span>
                </div>
                <h1 style="margin:14px 0 6px;font-size:30px;line-height:1.15;font-weight:700;color:#5d524b;">Merci pour votre inscription</h1>
                <p style="margin:0;font-size:15px;line-height:1.6;color:#6b5e56;">
                  Bonjour ${escapedFirstName}, votre place sur la waitlist Parenthèse est confirmée.
                </p>
              </td>
            </tr>
            <tr>
              <td style="padding:24px 28px 16px;">
                <p style="margin:0 0 14px;font-size:15px;line-height:1.7;color:#5d524b;">
                  Nous vous préviendrons dès que les prochaines invitations seront ouvertes, avec uniquement des nouvelles utiles.
                </p>
                <p style="margin:0 0 16px;font-size:15px;line-height:1.7;color:#5d524b;">
                  Merci de faire partie des premières familles qui nous font confiance.
                </p>
                <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                  <tr>
                    <td style="border-radius:999px;background:#a67c52;">
                      <a href="${shareLink}" style="display:inline-block;padding:12px 20px;color:#fef9ed;text-decoration:none;font-size:14px;font-weight:600;">
                        Partager Parenthèse
                      </a>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td style="padding:18px 28px 26px;border-top:1px solid #eadac0;">
                <p style="margin:0 0 6px;font-size:13px;line-height:1.6;color:#6b5e56;">
                  À bientôt,<br /><strong>Parenthèse</strong>
                </p>
                <p style="margin:0 0 8px;font-size:11px;line-height:1.6;color:#8f7f72;">
                  Vous recevez cet email suite à votre inscription volontaire à la waitlist.
                </p>
                <p style="margin:0;font-size:11px;line-height:1.6;">
                  <a href="${escapedUnsubscribeLink}" style="color:#8f6f52;text-decoration:underline;">Se désinscrire de la waitlist</a>
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`.trim()
}

function buildWaitlistEmailText(firstName: string, unsubscribeLink: string): string {
  const shareLink = 'https://parenthese.io/?source=waitlist-share'

  return [
    `Bonjour ${firstName},`,
    '',
    'Merci, votre inscription à la waitlist Parenthèse est confirmée.',
    'Nous vous écrirons dès que les prochaines invitations seront ouvertes.',
    'Merci de faire partie des premières familles qui nous font confiance.',
    '',
    `Partager Parenthèse : ${shareLink}`,
    '',
    `Se désinscrire: ${unsubscribeLink}`,
    '',
    'À bientôt,',
    'Parenthèse',
  ].join('\n')
}

async function upsertContactInResend(payload: WaitlistSignupPayload): Promise<void> {
  if (!resendClient || !hasWaitlistContactTarget) {
    return
  }

  const createPayload: {
    email: string
    unsubscribed: boolean
    firstName?: string
    segments?: Array<{ id: string }>
    audienceId?: string
  } = {
    email: payload.email,
    unsubscribed: false,
  }

  if (payload.prenom) {
    createPayload.firstName = payload.prenom
  }

  if (env.RESEND_WAITLIST_SEGMENT_ID) {
    createPayload.segments = [{ id: env.RESEND_WAITLIST_SEGMENT_ID }]
  }

  if (env.RESEND_WAITLIST_AUDIENCE_ID) {
    createPayload.audienceId = env.RESEND_WAITLIST_AUDIENCE_ID
  }

  const createResult = await resendClient.contacts.create(createPayload)

  if (!createResult.error) {
    return
  }

  if (!isDuplicateLikeError(createResult.error)) {
    throw new Error(`Resend contact create failed: ${createResult.error.message}`)
  }

  const updatePayload: {
    email: string
    unsubscribed: boolean
    firstName: string | null
    audienceId?: string
  } = {
    email: payload.email,
    unsubscribed: false,
    firstName: payload.prenom ?? null,
  }

  if (env.RESEND_WAITLIST_AUDIENCE_ID) {
    updatePayload.audienceId = env.RESEND_WAITLIST_AUDIENCE_ID
  }

  const updateResult = await resendClient.contacts.update(updatePayload)
  if (updateResult.error) {
    throw new Error(`Resend contact update failed: ${updateResult.error.message}`)
  }

  if (env.RESEND_WAITLIST_SEGMENT_ID) {
    const segmentResult = await resendClient.contacts.segments.add({
      email: payload.email,
      segmentId: env.RESEND_WAITLIST_SEGMENT_ID,
    })

    if (segmentResult.error && !isDuplicateLikeError(segmentResult.error)) {
      throw new Error(`Resend segment add failed: ${segmentResult.error.message}`)
    }
  }
}

async function sendWaitlistConfirmation(payload: WaitlistSignupPayload): Promise<void> {
  if (!resendClient || !env.RESEND_WAITLIST_FROM) {
    return
  }

  const firstName = payload.prenom ?? 'la famille'
  const sourceLabel = payload.source || 'direct'
  const unsubscribeLink = resolveUnsubscribeLink()
  const html = buildWaitlistEmailHtml(firstName, unsubscribeLink)
  const text = buildWaitlistEmailText(firstName, unsubscribeLink)

  const sendResult = await resendClient.emails.send({
    from: env.RESEND_WAITLIST_FROM,
    to: payload.email,
    ...(env.RESEND_WAITLIST_REPLY_TO ? { replyTo: env.RESEND_WAITLIST_REPLY_TO } : {}),
    subject: 'Parenthèse - merci pour votre inscription',
    text,
    html,
    tags: [
      { name: 'flow', value: 'waitlist_signup' },
      { name: 'source', value: sanitizeTagValue(sourceLabel) },
    ],
  })

  if (sendResult.error) {
    throw new Error(`Resend email send failed: ${sendResult.error.message}`)
  }
}

export async function syncWaitlistSignup(payload: WaitlistSignupPayload, log: LoggerLike): Promise<void> {
  if (!resendClient) {
    log.warn({ email: payload.email }, 'Resend waitlist skipped: RESEND_API_KEY is not configured')
    return
  }

  if (!hasWaitlistContactTarget && !env.RESEND_WAITLIST_FROM) {
    log.warn({ email: payload.email }, 'Resend configured but no waitlist segment/audience or sender configured')
    return
  }

  try {
    await upsertContactInResend(payload)
    await sendWaitlistConfirmation(payload)
  } catch (error) {
    log.error({ err: error, email: payload.email, source: payload.source }, 'Waitlist Resend sync failed')
    throw error
  }

  log.info({ email: payload.email, source: payload.source }, 'Waitlist Resend sync completed')
}
