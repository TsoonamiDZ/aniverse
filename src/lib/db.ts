import { PrismaClient } from '@prisma/client'
import * as path from 'path'
import * as fs from 'fs'

/**
 * Database client that works in BOTH environments:
 *  - Local dev / sandbox:  DATABASE_URL = file:./db/custom.db  → default PrismaClient (SQLite file).
 *  - Vercel / serverless:  DATABASE_URL = libsql://<turso>?authToken=... → PrismaClient with the
 *    libSQL driver adapter (Turso), which works on ephemeral serverless filesystems.
 *
 * The schema stays `provider = "sqlite"` (libSQL is SQLite-compatible) — only the connection
 * differs, so no schema churn between dev and prod.
 */

/** Resolve a robust local SQLite file path (project-root/db/custom.db). */
function resolveLocalSqliteUrl(): string {
  const tryPaths = [
    path.join(process.cwd(), 'db', 'custom.db'),
    path.join(process.cwd(), '.next', 'standalone', 'db', 'custom.db'),
  ]
  for (const p of tryPaths) {
    try {
      if (fs.existsSync(p)) return `file:${p}`
    } catch {
      /* ignore */
    }
  }
  return `file:${path.join(process.cwd(), 'db', 'custom.db')}`
}

function isLibSqlUrl(url: string): boolean {
  return url.startsWith('libsql://') || url.startsWith('libsql:') || url.startsWith('wss://')
}

async function createPrismaClient(): Promise<PrismaClient> {
  const url = process.env.DATABASE_URL || resolveLocalSqliteUrl()

  // Remote libSQL (Turso) → use the driver adapter.
  if (isLibSqlUrl(url)) {
    const { PrismaLibSQL } = await import('@prisma/adapter-libsql')
    const { createClient } = await import('@libsql/client')
    // authToken may be in the URL query (?authToken=...) — pass url as-is; the libsql
    // client parses it. Also allow a separate TURSO_AUTH_TOKEN env var.
    const libsql = createClient({
      url,
      authToken: process.env.TURSO_AUTH_TOKEN || undefined,
    })
    const adapter = new PrismaLibSQL(libsql)
    return new PrismaClient({ adapter, log: ['warn', 'error'] } as any)
  }

  // Local SQLite file → default client (with the robust path).
  if (!process.env.DATABASE_URL) process.env.DATABASE_URL = url
  return new PrismaClient({ log: ['warn', 'error'] })
}

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
  prismaPromise: Promise<PrismaClient> | undefined
}

/** A ready PrismaClient (libSQL adapter on Vercel, SQLite file locally). */
export const dbPromise: Promise<PrismaClient> =
  globalForPrisma.prismaPromise ??
  (async () => {
    const client = await createPrismaClient()
    if (process.env.NODE_ENV !== 'production') {
      globalForPrisma.prisma = client
      globalForPrisma.prismaPromise = dbPromise
    }
    return client
  })()

// Back-compat: many imports use `db` directly. Provide a thenable proxy that
// resolves to the client, OR — for the common sync local case — eagerly resolve.
export const db: PrismaClient = new Proxy({} as PrismaClient, {
  get(_t, prop) {
    // Lazily resolve the real client on first property access.
    let client = globalForPrisma.prisma
    if (!client) {
      // Kick off creation if not started.
      if (!globalForPrisma.prismaPromise) globalForPrisma.prismaPromise = dbPromise
      // For sync access we need a resolved client — fall back to a throw with guidance.
      throw new Error(
        'db accessed before ready. Await `import { dbPromise } from "@/lib/db"` first, ' +
          'or ensure DATABASE_URL is a local file: URL.'
      )
    }
    const val = (client as any)[prop]
    return typeof val === 'function' ? val.bind(client) : val
  },
})

/** Eagerly initialise (call once at startup) so `db` is usable synchronously. */
export async function initDb(): Promise<PrismaClient> {
  return dbPromise
}

/** For the /api/health diagnostic. */
export function getResolvedDbUrl(): string {
  return process.env.DATABASE_URL || '(unset — will resolve to local SQLite)'
}
