// ============================================================================
// Composition Root — montagem das dependências (injeção manual)
// ----------------------------------------------------------------------------
// Único lugar que conhece todas as camadas ao mesmo tempo: liga a interface à
// aplicação e à infraestrutura. Em nenhum outro ponto o domínio importa Prisma.
// ============================================================================

import { prisma } from "../infrastructure/prisma/client";
import { PrismaTransacaoRepository } from "../infrastructure/persistence/PrismaTransacaoRepository";
import { bootstrap } from "../infrastructure/persistence/Bootstrap";
import { AplControlarTransacao } from "../application/transacao/AplControlarTransacao";
import { AuthService } from "../application/usuario/AuthService";
import { GerenciarMetas } from "../application/meta/GerenciarMetas";
import { PrismaMetaRepository } from "../infrastructure/persistence/PrismaMetaRepository";

export interface Container {
  aplTransacao: AplControlarTransacao;
  prisma: typeof prisma;
  auth: AuthService;
  metas: GerenciarMetas;
  inicializar: () => Promise<void>;
}

export function criarContainer(): Container {
  const production = process.env.NODE_ENV === "production";
  const baseUrl = process.env.APP_BASE_URL || "http://localhost:3000";
  if (production) {
    let url: URL;
    try { url = new URL(baseUrl); } catch { throw new Error("Produção exige APP_BASE_URL HTTPS público"); }
    if (url.protocol !== "https:" || url.username || url.password || url.pathname !== "/" || url.search || url.hash ||
        ["localhost", "127.0.0.1"].includes(url.hostname)) throw new Error("Produção exige APP_BASE_URL HTTPS público");
  }
  const repositorio = new PrismaTransacaoRepository(prisma);

  const aplTransacao = new AplControlarTransacao(repositorio);

  return {
    aplTransacao,
    prisma,
    auth: new AuthService(prisma),
    metas: new GerenciarMetas(new PrismaMetaRepository(prisma)),
    inicializar: async () => {
      await bootstrap(prisma);
    },
  };
}
