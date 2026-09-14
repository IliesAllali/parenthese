import { Resend } from 'resend'

const apiKey = process.env.RESEND_API_KEY
if (!apiKey) {
  console.error('RESEND_API_KEY is missing in environment.')
  process.exit(1)
}

const targetSegmentName = process.env.RESEND_WAITLIST_SEGMENT_NAME || 'parenthese-waitlist'
const preferredDomain = process.env.RESEND_WAITLIST_DOMAIN || 'parenthese.io'
const replyTo = process.env.RESEND_WAITLIST_REPLY_TO || 'hello@parenthese.io'

const resend = new Resend(apiKey)

function formatResendError(prefix, error) {
  if (!error) return prefix
  const code = error.name || 'unknown_error'
  const status = error.statusCode ?? 'n/a'
  const message = error.message || 'unknown message'
  return `${prefix} (${code}, status=${status}): ${message}`
}

function findSegmentByName(items, name) {
  return items.find((item) => String(item.name || '').toLowerCase() === name.toLowerCase())
}

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function withRetry(task, label) {
  const delays = [0, 700, 1400, 2200]
  let lastError = null

  for (let index = 0; index < delays.length; index += 1) {
    if (delays[index] > 0) {
      await wait(delays[index])
    }

    try {
      return await task()
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      lastError = error

      if (!message.includes('rate_limit_exceeded') || index === delays.length - 1) {
        break
      }
    }
  }

  throw new Error(`${label} failed after retries: ${lastError instanceof Error ? lastError.message : String(lastError)}`)
}

function firstVerifiedDomain(domains) {
  return domains.find((domain) => domain?.status === 'verified') || null
}

function chooseSenderDomain(domains, preferred) {
  const preferredVerified = domains.find(
    (domain) => domain?.status === 'verified' && String(domain.name || '').toLowerCase() === preferred.toLowerCase(),
  )
  if (preferredVerified) return preferredVerified.name
  const fallbackVerified = firstVerifiedDomain(domains)
  if (fallbackVerified) return fallbackVerified.name
  return null
}

async function ensureSegment(name) {
  const listResult = await withRetry(() => resend.segments.list({ limit: 100 }), 'segments.list')
  if (listResult.error) {
    throw new Error(formatResendError('Unable to list Resend segments', listResult.error))
  }

  const existing = findSegmentByName(listResult.data?.data || [], name)
  if (existing) {
    return { id: existing.id, created: false }
  }

  const createResult = await withRetry(() => resend.segments.create({ name }), 'segments.create')
  if (createResult.error) {
    throw new Error(formatResendError('Unable to create Resend segment', createResult.error))
  }

  return { id: createResult.data?.id, created: true }
}

async function resolveSenderAddress() {
  const domainResult = await withRetry(() => resend.domains.list({ limit: 100 }), 'domains.list')
  if (domainResult.error) {
    throw new Error(formatResendError('Unable to list Resend domains', domainResult.error))
  }

  const domains = domainResult.data?.data || []
  const domain = chooseSenderDomain(domains, preferredDomain)
  if (!domain) {
    return {
      from: 'Parenthese <onboarding@resend.dev>',
      warning: 'No verified custom domain found. Using onboarding@resend.dev temporarily.',
    }
  }

  return {
    from: `Parenthese <waitlist@${domain}>`,
    warning: null,
  }
}

async function main() {
  const segment = await ensureSegment(targetSegmentName)
  const sender = await resolveSenderAddress()

  const summary = {
    segmentName: targetSegmentName,
    segmentId: segment.id,
    segmentCreatedNow: segment.created,
    fromAddress: sender.from,
    replyToAddress: replyTo,
    warning: sender.warning,
  }

  console.log(JSON.stringify(summary, null, 2))
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error))
  process.exit(1)
})
