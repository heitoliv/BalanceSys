// ============================================================================
// CDP — Porta de persistência de Transacao (padrão Repository/DAO)
// ----------------------------------------------------------------------------
// Contrato que a camada de domínio define e a cgd (infraestrutura) implementa.
// Inverte a dependência: o domínio não conhece Prisma; a infraestrutura é que
// conhece o domínio. É o "utilitário de persistência" previsto na arquitetura.
// ============================================================================

import { Transacao } from "./Transacao";
import { TipoTransacao } from "../shared/enums";

export interface FiltroPeriodo {
  usuarioId: string;
  de?: Date;
  ate?: Date;
  tipo?: TipoTransacao;
  categoriaId?: string;
}

export interface TransacaoRepository {
  salvar(transacao: Transacao): Promise<Transacao>;
  listar(filtro: FiltroPeriodo): Promise<Transacao[]>;
  buscarPorId(id: string, usuarioId: string): Promise<Transacao | null>;
  remover(id: string, usuarioId: string): Promise<void>;
}
