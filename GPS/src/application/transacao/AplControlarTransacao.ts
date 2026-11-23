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
import { intervaloPeriodo } from "../../domain/transacao/Periodo";
import { PRAZO_ALTERACAO_MS, dentroDoPrazo, TransacaoMutacaoError } from "../../domain/transacao/PrazoAlteracao";
import {
  RegistrarTransacaoDTO,
  TransacaoView,
  ResumoView,
} from "./dtos";

export class AplControlarTransacao {
  constructor(private readonly repositorio: TransacaoRepository) {}

  /** UC03 — Registrar Transação. */
  async registrarTransacao(dto: RegistrarTransacaoDTO, usuarioId: string): Promise<TransacaoView> {

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
    usuarioId: string;
    de?: string;
    ate?: string;
    antesDe?: string;
    tipo?: string;
    categoriaId?: string;
  }): Promise<TransacaoView[]> {
    const usuarioId = params.usuarioId;

    const filtro: FiltroPeriodo = {
      usuarioId,
      de: params.de ? this.converterData(params.de) : undefined,
      ate: params.ate ? this.converterData(params.ate) : undefined,
      antesDe: params.antesDe ? this.converterData(params.antesDe) : undefined,
      tipo: params.tipo ? (params.tipo as TipoTransacao) : undefined,
      categoriaId: params.categoriaId,
    };

    const lista = await this.repositorio.listar(filtro);
    return lista.map((t) => this.paraView(t));
  }

  /** UC08/RF02 — Resumo consolidado (receitas, despesas, saldo) do período. */
  async obterResumo(params: {
    usuarioId: string;
    de?: string;
    ate?: string;
    periodicidade?: string;
    referencia?: string;
    agora?: Date;
  }): Promise<ResumoView> {
    const usuarioId = params.usuarioId;
    const agora = params.agora ?? new Date();
    const periodo = intervaloPeriodo(params.periodicidade ?? "mes", params.referencia, agora);
    const atual = CalculadoraSaldo.consolidar(await this.repositorio.listar({ usuarioId, antesDe: new Date(agora.getTime() + 1) }));
    const lista = await this.repositorio.listar({
      usuarioId,
      de: params.de ? this.converterData(params.de) : periodo.inicio,
      ...(params.ate ? { ate: this.converterData(params.ate) } : { antesDe: periodo.fimExclusivo }),
    });
    const resumo: ResumoFinanceiro = CalculadoraSaldo.consolidar(lista);
    return {
      ...atual,
      saldoAtual: atual.saldo,
      resultadoPeriodo: resumo,
      periodo: { periodicidade: periodo.periodicidade, inicio: periodo.inicio.toISOString(), fimExclusivo: periodo.fimExclusivo.toISOString(), fuso: periodo.fuso },
    };
  }

  /** RN06: prazo contado da criação, inclusive no instante exato do 30º dia. */
  private async obterEditavel(id: string, usuarioId: string, agora: Date): Promise<Transacao> {
    const existente = await this.repositorio.buscarPorId(id, usuarioId);
    if (!existente) throw new TransacaoMutacaoError("Transação não encontrada.", 404);
    if (!dentroDoPrazo(existente.criadoEm, agora)) throw new TransacaoMutacaoError("Prazo de 30 dias para alterar esta transação expirou.", 409);
    return existente;
  }

  async editarTransacao(id: string, dto: RegistrarTransacaoDTO, usuarioId: string, agora = new Date()): Promise<TransacaoView> {
    await this.obterEditavel(id, usuarioId, agora);
    const nova = Transacao.criar({ tipo: dto.tipo as TipoTransacao, valor: dto.valor, descricao: dto.descricao,
      data: this.converterData(dto.data), prioridade: dto.prioridade as PrioridadeGasto,
      usuarioId, categoriaId: dto.categoriaId });
    const salva = await this.repositorio.atualizarNoPrazo(id, usuarioId, new Date(agora.getTime() - PRAZO_ALTERACAO_MS), nova);
    if (!salva) throw new TransacaoMutacaoError("Transação não encontrada ou prazo expirado.", 409);
    return this.paraView(salva);
  }

  async removerTransacao(id: string, usuarioId: string, agora = new Date()): Promise<void> {
    await this.obterEditavel(id, usuarioId, agora);
    const removida = await this.repositorio.removerNoPrazo(id, usuarioId, new Date(agora.getTime() - PRAZO_ALTERACAO_MS));
    if (!removida) throw new TransacaoMutacaoError("Transação não encontrada ou prazo expirado.", 409);
  }

  // ------------------------------------------------------------------------

  private converterData(iso: string): Date {
    if (typeof iso !== "string" || !iso.trim()) throw new DomainError("A data informada é inválida.");
    if (/^\d{4}-\d{2}-\d{2}$/.test(iso)) return intervaloPeriodo("dia", iso).inicio;
    if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?(?:Z|[+-]\d{2}:\d{2})$/.test(iso)) throw new DomainError("Use data ISO com fuso ou apenas AAAA-MM-DD.");
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) {
      throw new DomainError("A data informada é inválida.");
    }
    return d;
  }

  private paraView(t: Transacao): TransacaoView {
    return {
      id: t.id,
      criadoEm: t.criadoEm.toISOString(),
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
