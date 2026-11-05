// ============================================================================
// cgd — Cliente Prisma (conexão com o banco)
// Singleton: uma única instância de PrismaClient por processo, evitando
// esgotamento do pool de conexões em recarregamentos.
// ============================================================================

import { PrismaClient } from "@prisma/client";

declare global {
  // eslint-disable-next-line no-var
  var __prisma: PrismaClient | undefined;
}

export const prisma: PrismaClient =
  global.__prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") {
  global.__prisma = prisma;
}
