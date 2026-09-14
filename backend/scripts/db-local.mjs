import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { spawnSync } from 'node:child_process'

const rootDir = process.cwd()
const localDir = path.join(rootDir, '.local')
const pgRootDir = path.join(localDir, 'postgresql_full', 'pgsql')
const binDir = path.join(pgRootDir, 'bin')
const dataDir = path.join(localDir, 'pgdata')
const logFile = path.join(localDir, 'postgres.log')
const passwordFile = path.join(localDir, 'pgpass.txt')

const pgCtl = path.join(binDir, 'pg_ctl.exe')
const pgIsReady = path.join(binDir, 'pg_isready.exe')
const initdb = path.join(binDir, 'initdb.exe')
const psql = path.join(binDir, 'psql.exe')
const createdb = path.join(binDir, 'createdb.exe')
const postgresConnArgs = ['-w', '-h', '127.0.0.1', '-p', '5432', '-U', 'postgres', '-d', 'postgres']

const defaultStartTimeoutSeconds = 90
const parsedStartTimeoutSeconds = Number(process.env.PG_START_TIMEOUT_SEC ?? defaultStartTimeoutSeconds)
const startTimeoutSeconds = Number.isFinite(parsedStartTimeoutSeconds)
  ? Math.max(20, Math.floor(parsedStartTimeoutSeconds))
  : defaultStartTimeoutSeconds
const startTimeoutMs = (startTimeoutSeconds + 10) * 1000
const readyPollMs = 500
const parsedReadyWaitMs = Number(process.env.PG_READY_WAIT_MS ?? startTimeoutSeconds * 1000)
const readyWaitMs = Number.isFinite(parsedReadyWaitMs)
  ? Math.max(readyPollMs, Math.floor(parsedReadyWaitMs))
  : startTimeoutSeconds * 1000

function run(command, args, options = {}) {
  const { silent = false, timeoutMs, ...spawnOptions } = options
  const result = spawnSync(command, args, {
    encoding: 'utf8',
    stdio: 'pipe',
    timeout: timeoutMs,
    ...spawnOptions,
  })

  if (result.error) {
    if (!silent) {
      console.error(result.error.message)
    }
    return { ...result, status: result.status ?? 1 }
  }

  if (!silent && result.stdout) {
    process.stdout.write(result.stdout)
  }

  if (!silent && result.stderr) {
    process.stderr.write(result.stderr)
  }

  return result
}

function sleep(ms) {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms)
}

function assertBinaryLayout() {
  if (!existsSync(pgCtl) || !existsSync(pgIsReady) || !existsSync(initdb) || !existsSync(psql) || !existsSync(createdb)) {
    console.error('PostgreSQL portable introuvable dans backend/.local/postgresql_full/pgsql/bin')
    console.error('Re-extraire l archive dans backend/.local/postgresql_full')
    process.exit(1)
  }
}

function ensureDataDirInitialized() {
  if (existsSync(path.join(dataDir, 'PG_VERSION'))) {
    return
  }

  mkdirSync(localDir, { recursive: true })
  writeFileSync(passwordFile, 'postgres\n', 'utf8')

  const result = run(initdb, [
    '-D',
    dataDir,
    '-U',
    'postgres',
    `--pwfile=${passwordFile}`,
    '--auth-host=scram-sha-256',
    '--auth-local=trust',
  ])

  if (result.status !== 0) {
    process.exit(result.status ?? 1)
  }
}

function isPostgresAccepting() {
  const result = run(pgIsReady, ['-h', '127.0.0.1', '-p', '5432', '-t', '1'], { silent: true, timeoutMs: 3000 })
  return result.status === 0
}

function printPostgresLogTail(maxLines = 40) {
  if (!existsSync(logFile)) {
    return
  }

  try {
    const content = readFileSync(logFile, 'utf8')
    const lines = content.split(/\r?\n/).filter(Boolean)
    const tail = lines.slice(-maxLines)

    if (tail.length === 0) {
      return
    }

    console.error('Dernieres lignes de backend/.local/postgres.log :')
    for (const line of tail) {
      console.error(line)
    }
  } catch {
    // Keep original error path if reading log fails.
  }
}

function isLogFilePermissionError(result) {
  const stderr = (result.stderr || '').toLowerCase()
  return stderr.includes('could not open log file') && stderr.includes('permission denied')
}

function isConcurrentStartupHint(result) {
  const stderr = (result.stderr || '').toLowerCase()
  return stderr.includes('another server might be running')
}

function runPgStart(targetLogFile) {
  return run(
    pgCtl,
    ['-D', dataDir, '-l', targetLogFile, '-o', '-p 5432', '-w', '-t', String(startTimeoutSeconds), 'start'],
    { timeoutMs: startTimeoutMs },
  )
}

function startPostgres() {
  // Fast path: already reachable.
  if (isPostgresAccepting()) {
    return
  }

  // If process exists but still warming up, readiness polling handles it.
  const status = run(pgCtl, ['-D', dataDir, 'status'], { silent: true, timeoutMs: 5000 })
  if (status.status === 0) {
    return
  }

  console.log(`Demarrage de PostgreSQL (peut prendre jusqu a ~${startTimeoutSeconds}s)...`)
  let start = runPgStart(logFile)

  // If default log file is locked by another postgres process, retry with a unique startup log.
  if (start.status !== 0 && isLogFilePermissionError(start)) {
    const fallbackLogFile = path.join(localDir, `postgres-start-${Date.now()}.log`)
    console.warn(`postgres.log est verrouille, tentative avec ${fallbackLogFile}`)
    start = runPgStart(fallbackLogFile)
  }

  // On some Windows setups, pg_ctl can timeout while postgres still becomes ready.
  if (start.error?.code === 'ETIMEDOUT' && isPostgresAccepting()) {
    console.warn('pg_ctl a depasse le delai, mais PostgreSQL repond deja. Continuation.')
    return
  }

  // A concurrent startup may report an error while another instance finishes booting.
  if (start.status !== 0 && isConcurrentStartupHint(start) && waitForPostgresReady()) {
    console.warn('Instance PostgreSQL detectee pendant le start, continuons apres verification readiness.')
    return
  }

  // Another benign case: non-zero exit while readiness already says OK.
  if (start.status !== 0 && isPostgresAccepting()) {
    console.warn('pg_ctl a retourne une erreur, mais PostgreSQL repond deja. Continuation.')
    return
  }

  if (start.status !== 0) {
    if (start.error?.code === 'ETIMEDOUT') {
      console.error(`Timeout pendant le demarrage PostgreSQL (> ${startTimeoutSeconds}s).`)
    }
    printPostgresLogTail()
    process.exit(start.status ?? 1)
  }
}

function stopPostgres() {
  const stop = run(pgCtl, ['-D', dataDir, 'stop', '-m', 'fast'])
  if (stop.status !== 0) {
    process.exit(stop.status ?? 1)
  }
}

function statusPostgres() {
  const status = run(pgCtl, ['-D', dataDir, 'status'])
  process.exit(status.status ?? 1)
}

function waitForPostgresReady() {
  const attempts = Math.ceil(readyWaitMs / readyPollMs)
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    if (isPostgresAccepting()) {
      return true
    }
    sleep(readyPollMs)
  }
  return false
}

function ensureDatabase() {
  const env = {
    ...process.env,
    PGPASSWORD: 'postgres',
    PGCONNECT_TIMEOUT: '5',
  }

  if (!waitForPostgresReady()) {
    console.error('PostgreSQL demarre mais ne repond pas sur 127.0.0.1:5432.')
    printPostgresLogTail()
    process.exit(1)
  }

  const check = run(
    psql,
    [...postgresConnArgs, '-tAc', "SELECT 1 FROM pg_database WHERE datname='genealogy'"],
    { env, silent: true, timeoutMs: 15000 },
  )

  if (check.status !== 0) {
    console.error('Impossible de verifier la base genealogy.')
    process.exit(check.status ?? 1)
  }

  if (check.stdout.trim() === '1') {
    return
  }

  const create = run(createdb, ['-w', '-h', '127.0.0.1', '-p', '5432', '-U', 'postgres', 'genealogy'], {
    env,
    timeoutMs: 15000,
  })
  if (create.status !== 0) {
    process.exit(create.status ?? 1)
  }
}

function bootstrap() {
  console.log('Verification PostgreSQL local...')
  ensureDataDirInitialized()
  startPostgres()
  console.log('Verification base genealogy...')
  ensureDatabase()
  console.log('PostgreSQL local pret (localhost:5432, db=genealogy, user=postgres).')
}

function main() {
  assertBinaryLayout()

  const action = process.argv[2] || 'status'
  if (action === 'bootstrap') {
    bootstrap()
    return
  }

  if (action === 'start') {
    ensureDataDirInitialized()
    startPostgres()
    return
  }

  if (action === 'stop') {
    stopPostgres()
    return
  }

  if (action === 'status') {
    statusPostgres()
    return
  }

  console.error('Action inconnue. Utiliser: bootstrap | start | stop | status')
  process.exit(1)
}

main()
