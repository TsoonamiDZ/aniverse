import { PrismaClient } from '@prisma/client'
import * as path from 'path'
import * as fs from 'fs'

/**
 * Resolve the SQLite database path ROBUSTLY so the site works on any deploy host
 * regardless of the working directory. Tries (in order):
 *   1. <cwd>/db/custom.db          (project root — `bun run dev`/`start`)
 *   2. <cwd>/.next/standalone/db/custom.db  (standalone server run from there)
 *   3. the value from DATABASE_URL env (fallback)
 */
function resolveDbUrl(): string {
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
  return process.env.DATABASE_URL || `file:${path.join(process.cwd(), 'db', 'custom.db')}`
}

// Prisma reads DATABASE_URL at PrismaClient construction — set the robust path first.
process.env.DATABASE_URL = resolveDbUrl()

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: ['warn', 'error'],
  })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db

/** For the /api/health diagnostic. */
export function getResolvedDbPath(): string {
  return process.env.DATABASE_URL || '(unset)'
}
