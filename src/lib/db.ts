import { Prisma, PrismaClient } from '@prisma/client'

// Ensure Prisma Decimal values serialize as numbers in JSON responses
Prisma.Decimal.prototype.toJSON = function toJSON() {
  return this.toNumber()
}

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const db = globalForPrisma.prisma ?? new PrismaClient()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db

// Legacy exports for compatibility
export { db as prisma }
