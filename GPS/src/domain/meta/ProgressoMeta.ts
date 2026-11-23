import { DomainError } from "../shared/DomainError";

export type ProgressoMeta = {
  gastoConsiderado: number;
  restante: number;
  excedente: number;
  percentualUtilizacao: number;
};
export type LimiarMeta = 80 | 100;

// Compara centavos exatos: um percentual arredondado para 80,00 não antecipa o alerta.
export function limiaresAtingidos(limiteCentavos: bigint, gastoCentavos: bigint): LimiarMeta[] {
  if (limiteCentavos <= 0n || gastoCentavos < 0n) throw new DomainError("Valores de meta inválidos.");
  const limiares: LimiarMeta[] = [];
  if (gastoCentavos * 100n >= limiteCentavos * 80n) limiares.push(80);
  if (gastoCentavos >= limiteCentavos) limiares.push(100);
  return limiares;
}

// O banco soma DECIMAL(18,2); a conversão preserva centavos sem ponto flutuante.
export function centavosDecimais(valor: string): bigint {
  if (!/^\d+(?:\.\d{1,2})?$/.test(valor)) throw new DomainError("Valor monetário inválido.");
  const [inteiro, fracao = ""] = valor.split(".");
  return BigInt(inteiro) * 100n + BigInt(fracao.padEnd(2, "0"));
}

function numeroSeguro(centavos: bigint): number {
  if (centavos > BigInt(Number.MAX_SAFE_INTEGER)) throw new DomainError("Total monetário fora da faixa segura.");
  return Number(centavos) / 100;
}

export function calcularProgresso(limiteCentavos: bigint, gastoCentavos: bigint): ProgressoMeta {
  if (limiteCentavos <= 0n || gastoCentavos < 0n) throw new DomainError("Valores de meta inválidos.");
  const diferenca = limiteCentavos - gastoCentavos;
  // Percentual com duas casas, arredondado para o centésimo mais próximo.
  const percentualCentésimos = (gastoCentavos * 10000n + limiteCentavos / 2n) / limiteCentavos;
  if (percentualCentésimos > BigInt(Number.MAX_SAFE_INTEGER)) throw new DomainError("Percentual fora da faixa segura.");
  return {
    gastoConsiderado: numeroSeguro(gastoCentavos),
    restante: numeroSeguro(diferenca > 0n ? diferenca : 0n),
    excedente: numeroSeguro(diferenca < 0n ? -diferenca : 0n),
    percentualUtilizacao: Number(percentualCentésimos) / 100,
  };
}
