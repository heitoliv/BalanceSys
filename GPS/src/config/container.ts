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
import { EntregaEmailLocal, EntregaEmailSendmail } from "../infrastructure/mail/EntregaEmail";
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
  if (production && (!baseUrl.startsWith("https://") || !process.env.MAIL_SENDMAIL_PATH)) {
    throw new Error("Produção exige APP_BASE_URL HTTPS e MAIL_SENDMAIL_PATH");
  }
  const entrega = production ? new EntregaEmailSendmail(process.env.MAIL_SENDMAIL_PATH!) : new EntregaEmailLocal();
  const repositorio = new PrismaTransacaoRepository(prisma);

  const aplTransacao = new AplControlarTransacao(repositorio);

  return {
    aplTransacao,
    prisma,
    auth: new AuthService(prisma, entrega, baseUrl),
    metas: new GerenciarMetas(new PrismaMetaRepository(prisma)),
    inicializar: async () => {
      await bootstrap(prisma);
    },
  };
}
