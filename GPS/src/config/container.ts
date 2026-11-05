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

export interface Container {
  aplTransacao: AplControlarTransacao;
  prisma: typeof prisma;
  inicializar: () => Promise<void>;
}

export function criarContainer(): Container {
  const repositorio = new PrismaTransacaoRepository(prisma);

  // Memoiza o id do usuário padrão para não reconsultar a cada requisição.
  let usuarioPadraoId: string | null = null;
  const obterUsuarioPadrao = async (): Promise<string> => {
    if (usuarioPadraoId) return usuarioPadraoId;
    usuarioPadraoId = await bootstrap(prisma);
    return usuarioPadraoId;
  };

  const aplTransacao = new AplControlarTransacao(
    repositorio,
    obterUsuarioPadrao
  );

  return {
    aplTransacao,
    prisma,
    inicializar: async () => {
      await obterUsuarioPadrao();
    },
  };
}
