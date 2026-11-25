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
    let totalReceitas = 0n;
    let totalDespesas = 0n;

    for (const t of transacoes) {
      if (t.tipo === TipoTransacao.RECEITA) {
        totalReceitas += BigInt(Math.round(t.valor * 100));
      } else {
        totalDespesas += BigInt(Math.round(t.valor * 100));
      }
    }

    // Arredondamento a 2 casas evita acúmulo de erro de ponto flutuante no saldo.
    return {
      totalReceitas: deCentavos(totalReceitas),
      totalDespesas: deCentavos(totalDespesas),
      saldo: deCentavos(totalReceitas - totalDespesas),
      quantidade: transacoes.length,
    };
  }
}

function deCentavos(valor: bigint): number {
  if (valor > BigInt(Number.MAX_SAFE_INTEGER) || valor < BigInt(Number.MIN_SAFE_INTEGER)) {
    throw new Error("Total monetário fora da faixa segura.");
  }
  return Number(valor) / 100;
}
