import { CalculadoraSaldo } from "../../src/domain/transacao/CalculadoraSaldo";
import { Transacao } from "../../src/domain/transacao/Transacao";
import { TipoTransacao, PrioridadeGasto } from "../../src/domain/shared/enums";

function tx(tipo: TipoTransacao, valor: number): Transacao {
  return Transacao.criar({
    tipo,
    valor,
    descricao: "x",
    data: new Date("2026-03-01"),
    prioridade: PrioridadeGasto.IMPORTANTE,
    usuarioId: "u1",
    categoriaId: "c1",
  });
}

describe("CDP — CalculadoraSaldo (PBI-11)", () => {
  it("lista vazia resulta em saldo zero", () => {
    const r = CalculadoraSaldo.consolidar([]);
    expect(r).toEqual({ totalReceitas: 0, totalDespesas: 0, saldo: 0, quantidade: 0 });
  });

  it("saldo = receitas − despesas", () => {
    const r = CalculadoraSaldo.consolidar([
      tx(TipoTransacao.RECEITA, 4500),
      tx(TipoTransacao.DESPESA, 1200),
      tx(TipoTransacao.DESPESA, 320.9),
    ]);
    expect(r.totalReceitas).toBe(4500);
    expect(r.totalDespesas).toBe(1520.9);
    expect(r.saldo).toBe(2979.1);
    expect(r.quantidade).toBe(3);
  });

  it("não acumula erro de ponto flutuante (0.1 + 0.2)", () => {
    const r = CalculadoraSaldo.consolidar([
      tx(TipoTransacao.DESPESA, 0.1),
      tx(TipoTransacao.DESPESA, 0.2),
    ]);
    expect(r.totalDespesas).toBe(0.3);
    expect(r.saldo).toBe(-0.3);
  });
});
