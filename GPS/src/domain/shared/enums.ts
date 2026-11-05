// ============================================================================
// CDP — Tipos enumerados do domínio
// Vocabulário fechado e verificável (conforme §5.1.1 do Documento de Projeto).
// ============================================================================

export enum TipoTransacao {
  RECEITA = "RECEITA",
  DESPESA = "DESPESA",
}

export enum PrioridadeGasto {
  ESSENCIAL = "ESSENCIAL",
  IMPORTANTE = "IMPORTANTE",
  OPCIONAL = "OPCIONAL",
}

export function isTipoTransacao(v: unknown): v is TipoTransacao {
  return v === TipoTransacao.RECEITA || v === TipoTransacao.DESPESA;
}

export function isPrioridadeGasto(v: unknown): v is PrioridadeGasto {
  return (
    v === PrioridadeGasto.ESSENCIAL ||
    v === PrioridadeGasto.IMPORTANTE ||
    v === PrioridadeGasto.OPCIONAL
  );
}
