// ============================================================================
// CDP — Entidade Transacao (entidade central do domínio — ADR-01)
// ----------------------------------------------------------------------------
// Concentra as regras de negócio aplicáveis no registro de uma movimentação:
//   • RN01 — prioridade do gasto (via enum PrioridadeGasto);
//   • validação de valor (E2 — bloqueia valor nulo, negativo ou não-finito);
//   • validação de campos obrigatórios (descrição, data, categoria).
// É agnóstica a persistência: não conhece Prisma, HTTP nem banco de dados.
// ============================================================================

import {
  TipoTransacao,
  PrioridadeGasto,
  isTipoTransacao,
  isPrioridadeGasto,
} from "../shared/enums";
import { DomainError } from "../shared/DomainError";

export interface NovaTransacaoProps {
  tipo: TipoTransacao;
  valor: number;
  descricao: string;
  data: Date;
  prioridade?: PrioridadeGasto | null;
  usuarioId: string;
  categoriaId: string;
}

export interface TransacaoProps extends NovaTransacaoProps {
  id: string;
  criadoEm: Date;
}

export class Transacao {
  readonly id: string;
  readonly tipo: TipoTransacao;
  readonly valor: number;
  readonly descricao: string;
  readonly data: Date;
  readonly prioridade: PrioridadeGasto | null;
  readonly usuarioId: string;
  readonly categoriaId: string;
  readonly criadoEm: Date;

  private constructor(props: TransacaoProps) {
    this.id = props.id;
    this.tipo = props.tipo;
    this.valor = props.valor;
    this.descricao = props.descricao;
    this.data = props.data;
    this.prioridade = props.tipo === TipoTransacao.RECEITA ? null : props.prioridade ?? null;
    this.usuarioId = props.usuarioId;
    this.categoriaId = props.categoriaId;
    this.criadoEm = props.criadoEm;
  }

  /**
   * Fábrica de criação de uma nova transação. Aplica todas as regras de
   * domínio antes de permitir a existência do objeto — um objeto Transacao,
   * uma vez criado, é sempre válido (sempre que surge, é íntegro).
   */
  static criar(props: NovaTransacaoProps): Transacao {
    Transacao.validarTipo(props.tipo);
    Transacao.validarValor(props.valor); // E2
    Transacao.validarDescricao(props.descricao);
    Transacao.validarData(props.data);
    if (props.tipo === TipoTransacao.DESPESA) Transacao.validarPrioridade(props.prioridade); // RN01
    Transacao.validarVinculo(props.usuarioId, "usuário"); // RN04
    Transacao.validarVinculo(props.categoriaId, "categoria");

    return new Transacao({
      ...props,
      id: cryptoRandomId(),
      descricao: props.descricao.trim(),
      criadoEm: new Date(),
    });
  }

  /**
   * Reconstitui uma transação já persistida (vinda da cgd), sem reaplicar as
   * validações de criação — o estado no banco é tido como já consistente.
   */
  static reconstituir(props: TransacaoProps): Transacao {
    return new Transacao(props);
  }

  /** Impacto da transação sobre o saldo: positivo para receita, negativo para despesa. */
  impactoNoSaldo(): number {
    return this.tipo === TipoTransacao.RECEITA ? this.valor : -this.valor;
  }

  // ----------------------- Regras de validação -----------------------------

  private static validarTipo(tipo: unknown): void {
    if (!isTipoTransacao(tipo)) {
      throw new DomainError(
        `Tipo de transação inválido. Use "RECEITA" ou "DESPESA".`
      );
    }
  }

  /** E2 — o valor deve ser um número finito estritamente positivo. */
  private static validarValor(valor: unknown): void {
    if (typeof valor !== "number" || !Number.isFinite(valor)) {
      throw new DomainError("O valor da transação deve ser um número válido.");
    }
    if (valor <= 0) {
      throw new DomainError("O valor da transação deve ser maior que zero.");
    }
    if (!Number.isSafeInteger(Math.round(valor * 100)) || Math.abs(valor * 100 - Math.round(valor * 100)) > 1e-7) {
      throw new DomainError("O valor deve ter no máximo duas casas decimais.");
    }
  }

  private static validarDescricao(descricao: unknown): void {
    if (typeof descricao !== "string" || descricao.trim().length === 0) {
      throw new DomainError("A descrição da transação é obrigatória.");
    }
  }

  private static validarData(data: unknown): void {
    if (!(data instanceof Date) || Number.isNaN(data.getTime())) {
      throw new DomainError("A data da transação é inválida.");
    }
  }

  /** RN01 — somente despesas recebem prioridade de gasto. */
  private static validarPrioridade(prioridade: unknown): void {
    if (!isPrioridadeGasto(prioridade)) {
      throw new DomainError(
        `Prioridade inválida. Use "ESSENCIAL", "IMPORTANTE" ou "OPCIONAL".`
      );
    }
  }

  private static validarVinculo(id: unknown, nome: string): void {
    if (typeof id !== "string" || id.trim().length === 0) {
      throw new DomainError(`O vínculo com ${nome} é obrigatório.`);
    }
  }
}

/**
 * Gera um identificador único. Usa o crypto nativo do Node quando disponível,
 * com uma degradação segura caso o ambiente não o exponha.
 */
function cryptoRandomId(): string {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { randomUUID } = require("crypto") as typeof import("crypto");
    return randomUUID();
  } catch {
    return "tx_" + Date.now().toString(36) + Math.random().toString(36).slice(2);
  }
}
