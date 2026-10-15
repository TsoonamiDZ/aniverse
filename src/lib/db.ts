import { PrismaClient } from '@prisma/client'
import { PrismaLibSql } from '@prisma/adapter-libsql'
import * as path from 'path'
import * as fs from 'fs'

/**
 * LAZY + BUILD-SAFE database client.
 *
 * During `next build` ("Collecting page data"), env vars may be unavailable.
 * The Proxy's get-trap catches any creation error and returns undefined —
 * the build proceeds. At runtime (API requests), env vars ARE available and
 * the real PrismaClient is created successfully.
 */

function resolveLocalSqliteUrl(): string {
  const tryPaths = [
    path.join(process.cwd(), 'db', 'custom.db'),
    path.join(process.cwd(), '.next', 'standalone', 'db', 'custom.db'),
  ]
  for (const p of tryPaths) {
    try { if (fs.existsSync(p)) return `file:${p}` } catch { /* ignore */ }
  }
  return `file:${path.join(process.cwd(), 'db', 'custom.db')}`
}

function isLibSqlUrl(url: string): boolean {
  return url.startsWith('libsql://') || url.startsWith('libsql:') || url.startsWith('wss://')
}

function createPrismaClient(): PrismaClient {
  const url =
    process.env.DATABASE_URL ||
    process.env.TURSO_DATABASE_URL ||
    resolveLocalSqliteUrl()

  const authToken = process.env.TURSO_AUTH_TOKEN || undefined

  if (isLibSqlUrl(url)) {
    const adapter = new PrismaLibSql({ url, authToken } as any)
    return new PrismaClient({ adapter, log: ['warn', 'error'] } as any)
  }

  if (!process.env.DATABASE_URL && !process.env.TURSO_DATABASE_URL) {
    process.env.DATABASE_URL = url
  }
  return new PrismaClient({ log: ['warn', 'error'] })
}

// ─── Lazy + build-safe singleton ───────────────────────────────────────────
const globalForPrisma = globalThis as unknown as { prisma: PrismaClient | undefined }
let _client: PrismaClient | null = null
let _tried = false

function getClient(): PrismaClient | null {
  if (globalForPrisma.prisma) return globalForPrisma.prisma
  if (_tried) return _client
  _tried = true
  try {
    _client = createPrismaClient()
    if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = _client
  } catch (e) {
    // Build-time: env vars unavailable → fail silently, return null.
    // Runtime: this shouldn't happen (env vars are set). If it does, API
    // routes will get undefined and return a 500 — check /api/health.
    console.warn('[db] init failed (build-time?):', String(e).slice(0, 100))
    _client = null
  }
  return _client
}

/** A lazy, build-safe PrismaClient proxy. Returns undefined during build. */
export const db = new Proxy({} as PrismaClient, {
  get(_target, prop: string) {
    const client = getClient()
    if (!client) return undefined
    const value = (client as any)[prop]
    return typeof value === 'function' ? value.bind(client) : value
  },
})

/** For the /api/health diagnostic. */
export function getResolvedDbUrl(): string {
  return (
    process.env.DATABASE_URL ||
    process.env.TURSO_DATABASE_URL ||
    '(unset — will resolve to local SQLite)'
  )
}
