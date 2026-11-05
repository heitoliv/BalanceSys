// ============================================================================
// CGT — AplControlarTransacao (classe de aplicação)
// ----------------------------------------------------------------------------
// Orquestra os casos de uso do Incremento 1:
//   • UC03 — Registrar Transação (receita/despesa)
//   • UC07 — Filtrar/listar histórico
//   • UC08/RF02 — Resumo consolidado (saldo) do período
//
// Não contém regra de negócio de domínio: recebe requisições das controladoras
// (cci), traduz DTOs em entidades, delega ao domínio e ao repositório (cgd).
// Nenhuma regra reside na interface; esta gerência apenas coordena.
// ============================================================================

import { Transacao } from "../../domain/transacao/Transacao";
import {
  TransacaoRepository,
  FiltroPeriodo,
} from "../../domain/transacao/TransacaoRepository";
import {
  CalculadoraSaldo,
  ResumoFinanceiro,
} from "../../domain/transacao/CalculadoraSaldo";
import { TipoTransacao, PrioridadeGasto } from "../../domain/shared/enums";
import { DomainError } from "../../domain/shared/DomainError";
import {
  RegistrarTransacaoDTO,
  TransacaoView,
  ResumoView,
} from "./dtos";

export class AplControlarTransacao {
  constructor(
    private readonly repositorio: TransacaoRepository,
    private readonly usuarioPadraoId: () => Promise<string>
  ) {}

  /** UC03 — Registrar Transação. */
  async registrarTransacao(dto: RegistrarTransacaoDTO): Promise<TransacaoView> {
    const usuarioId = dto.usuarioId ?? (await this.usuarioPadraoId());

    const data = this.converterData(dto.data);

    const transacao = Transacao.criar({
      tipo: dto.tipo as TipoTransacao,
      valor: dto.valor,
      descricao: dto.descricao,
      data,
      prioridade: dto.prioridade as PrioridadeGasto,
      usuarioId,
      categoriaId: dto.categoriaId,
    });

    const salva = await this.repositorio.salvar(transacao);
    return this.paraView(salva);
  }

  /** UC07 — Listar histórico, opcionalmente filtrado por período/tipo/categoria. */
  async listarTransacoes(params: {
    usuarioId?: string;
    de?: string;
    ate?: string;
    tipo?: string;
    categoriaId?: string;
  }): Promise<TransacaoView[]> {
    const usuarioId = params.usuarioId ?? (await this.usuarioPadraoId());

    const filtro: FiltroPeriodo = {
      usuarioId,
      de: params.de ? this.converterData(params.de) : undefined,
      ate: params.ate ? this.converterData(params.ate) : undefined,
      tipo: params.tipo ? (params.tipo as TipoTransacao) : undefined,
      categoriaId: params.categoriaId,
    };

    const lista = await this.repositorio.listar(filtro);
    return lista.map((t) => this.paraView(t));
  }

  /** UC08/RF02 — Resumo consolidado (receitas, despesas, saldo) do período. */
  async obterResumo(params: {
    usuarioId?: string;
    de?: string;
    ate?: string;
  }): Promise<ResumoView> {
    const usuarioId = params.usuarioId ?? (await this.usuarioPadraoId());
    const lista = await this.repositorio.listar({
      usuarioId,
      de: params.de ? this.converterData(params.de) : undefined,
      ate: params.ate ? this.converterData(params.ate) : undefined,
    });
    const resumo: ResumoFinanceiro = CalculadoraSaldo.consolidar(lista);
    return resumo;
  }

  /** UC04 (parcial) — Remover transação, respeitando a propriedade (RN04). */
  async removerTransacao(id: string, usuarioId?: string): Promise<void> {
    const dono = usuarioId ?? (await this.usuarioPadraoId());
    const existente = await this.repositorio.buscarPorId(id, dono);
    if (!existente) {
      throw new DomainError("Transação não encontrada.");
    }
    await this.repositorio.remover(id, dono);
  }

  // ------------------------------------------------------------------------

  private converterData(iso: string): Date {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) {
      throw new DomainError("A data informada é inválida.");
    }
    return d;
  }

  private paraView(t: Transacao): TransacaoView {
    return {
      id: t.id,
      tipo: t.tipo,
      valor: t.valor,
      descricao: t.descricao,
      data: t.data.toISOString(),
      prioridade: t.prioridade,
      categoriaId: t.categoriaId,
      usuarioId: t.usuarioId,
    };
  }
}
