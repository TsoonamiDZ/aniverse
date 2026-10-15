import { PrismaClient } from '@prisma/client'
import { PrismaLibSql } from '@prisma/adapter-libsql'
import * as path from 'path'
import * as fs from 'fs'

/**
 * LAZY database client — the PrismaClient is NOT created at module load (which
 * happens during `next build`'s "Generating static pages" phase, when env vars
 * may not be available). Instead, it's created on FIRST property access (i.e.,
 * when an API route actually queries the DB at runtime).
 *
 * Supports BOTH:
 *  - Local dev / sandbox:  DATABASE_URL = file:./db/custom.db (or unset → auto-resolved)
 *  - Vercel / serverless:  DATABASE_URL (or TURSO_DATABASE_URL) = libsql://<turso>
 *                         → PrismaLibSql adapter with Config { url, authToken }
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
  // Read the URL from DATABASE_URL OR TURSO_DATABASE_URL (the Vercel Turso
  // integration sets the latter). Fall back to local SQLite file.
  const url =
    process.env.DATABASE_URL ||
    process.env.TURSO_DATABASE_URL ||
    resolveLocalSqliteUrl()

  // Auth token: TURSO_AUTH_TOKEN (standard) OR parsed from the URL query.
  const authToken = process.env.TURSO_AUTH_TOKEN || undefined

  if (isLibSqlUrl(url)) {
    // PrismaLibSql takes a Config object ({ url, authToken }) — it creates
    // the @libsql/client internally on connect().
    const adapter = new PrismaLibSql({ url, authToken } as any)
    return new PrismaClient({ adapter, log: ['warn', 'error'] } as any)
  }

  // Local SQLite file → default client (with the robust resolved path).
  if (!process.env.DATABASE_URL && !process.env.TURSO_DATABASE_URL) {
    process.env.DATABASE_URL = url
  }
  return new PrismaClient({ log: ['warn', 'error'] })
}

// ─── Lazy singleton via Proxy ──────────────────────────────────────────────
// The real PrismaClient is created on FIRST property access, NOT at module load.
// This prevents build-time failures (env vars not available during `next build`).

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient | undefined }

let _client: PrismaClient | null = null

function getClient(): PrismaClient {
  if (globalForPrisma.prisma) return globalForPrisma.prisma
  if (!_client) {
    _client = createPrismaClient()
    if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = _client
  }
  return _client
}

/** A lazy PrismaClient — safe during build (no connection until first query). */
export const db = new Proxy({} as PrismaClient, {
  get(_target, prop: string) {
    const client = getClient()
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
