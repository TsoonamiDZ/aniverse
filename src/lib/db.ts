import { PrismaClient } from '@prisma/client'
import { PrismaLibSql } from '@prisma/adapter-libsql'

import * as path from 'path'
import * as fs from 'fs'

/**
 * Database client — works in BOTH environments:
 *  - Local dev / sandbox:  DATABASE_URL = file:./db/custom.db (or unset → auto-resolved)
 *                         → default PrismaClient (local SQLite file).
 *  - Vercel / serverless:  DATABASE_URL = libsql://<turso>?authToken=...
 *                         → PrismaClient with the libSQL driver adapter (Turso, remote).
 *
 * The schema stays `provider = "sqlite"` (libSQL is SQLite-compatible) — only the
 * connection differs, so writes PERSIST on Vercel when using Turso.
 *
 * Construction is fully SYNCHRONOUS (createClient + PrismaLibSQL + PrismaClient are
 * all sync), so existing `db.anime.findMany(...)` call sites work unchanged.
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

function createPrismaClient(): PrismaClient {
  const url = process.env.DATABASE_URL || resolveLocalSqliteUrl()

  // Remote libSQL (Turso) → use the driver adapter so writes persist on serverless.
  if (isLibSqlUrl(url)) {
    // PrismaLibSql takes a Config object ({ url, authToken }) — NOT a pre-created
    // @libsql/client Client. It creates the client internally on connect().
    const adapter = new PrismaLibSql({
      url,
      authToken: process.env.TURSO_AUTH_TOKEN || undefined,
    } as any);
    return new PrismaClient({ adapter, log: ['warn', 'error'] } as any);
  }

  // Local SQLite file → default client (with the robust resolved path).
  if (!process.env.DATABASE_URL) process.env.DATABASE_URL = url
  return new PrismaClient({ log: ['warn', 'error'] })
}

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const db =
  globalForPrisma.prisma ??
  (() => {
    const client = createPrismaClient()
    if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = client
    return client
  })()

/** For the /api/health diagnostic. */
export function getResolvedDbUrl(): string {
  return process.env.DATABASE_URL || '(unset — will resolve to local SQLite)'
}
