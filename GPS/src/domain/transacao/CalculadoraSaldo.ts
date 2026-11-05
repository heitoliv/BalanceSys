// ============================================================================
// CDP — Serviço de domínio: cálculo de saldo consolidado
// ----------------------------------------------------------------------------
// Saldo = Σ receitas − Σ despesas. Regra pura, sem efeitos colaterais, testável
// isoladamente. Atende ao critério de aceite do PBI-11 (saldo sem divergência).
// ============================================================================

import { Transacao } from "./Transacao";
import { TipoTransacao } from "../shared/enums";

export interface ResumoFinanceiro {
  totalReceitas: number;
  totalDespesas: number;
  saldo: number;
  quantidade: number;
}

export class CalculadoraSaldo {
  /** Consolida uma lista de transações em receitas, despesas e saldo. */
  static consolidar(transacoes: Transacao[]): ResumoFinanceiro {
    let totalReceitas = 0;
    let totalDespesas = 0;

    for (const t of transacoes) {
      if (t.tipo === TipoTransacao.RECEITA) {
        totalReceitas += t.valor;
      } else {
        totalDespesas += t.valor;
      }
    }

    // Arredondamento a 2 casas evita acúmulo de erro de ponto flutuante no saldo.
    return {
      totalReceitas: arredondar(totalReceitas),
      totalDespesas: arredondar(totalDespesas),
      saldo: arredondar(totalReceitas - totalDespesas),
      quantidade: transacoes.length,
    };
  }
}

function arredondar(valor: number): number {
  return Math.round((valor + Number.EPSILON) * 100) / 100;
}
