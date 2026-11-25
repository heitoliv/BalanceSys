import { intervaloPeriodo } from "../../src/domain/transacao/Periodo";
import { AplControlarTransacao } from "../../src/application/transacao/AplControlarTransacao";
import { InMemoryTransacaoRepository } from "../InMemoryTransacaoRepository";

describe("fuso e resultados financeiros", () => {
  it("usa fronteiras exclusivas no dia, semana, mês e ano de São Paulo", () => {
    expect(intervaloPeriodo("dia", "2026-12-31").inicio.toISOString()).toBe("2026-12-31T03:00:00.000Z");
    expect(intervaloPeriodo("dia", "2026-12-31").fimExclusivo.toISOString()).toBe("2027-01-01T03:00:00.000Z");
    expect(intervaloPeriodo("semana", "2026-11-22").inicio.toISOString()).toBe("2026-11-16T03:00:00.000Z");
    expect(intervaloPeriodo("semana", "2026-11-22").fimExclusivo.toISOString()).toBe("2026-11-23T03:00:00.000Z");
    expect(intervaloPeriodo("mes", "2026-11-19").fimExclusivo.toISOString()).toBe("2026-12-01T03:00:00.000Z");
    expect(intervaloPeriodo("ano", "2026-11-19").fimExclusivo.toISOString()).toBe("2027-01-01T03:00:00.000Z");
    expect(intervaloPeriodo("dia", "2018-11-04").inicio.toISOString()).toBe("2018-11-04T03:00:00.000Z");
    expect(intervaloPeriodo("dia", "2018-11-04").fimExclusivo.toISOString()).toBe("2018-11-05T02:00:00.000Z");
    expect(() => intervaloPeriodo("dia", "2026-02-30")).toThrow();
  });

  it("separa saldo atual, mês e lançamento futuro, incluindo a data de hoje", async () => {
    const apl = new AplControlarTransacao(new InMemoryTransacaoRepository());
    const base = { prioridade: "IMPORTANTE", categoriaId: "cat", descricao: "Teste" };
    await apl.registrarTransacao({ ...base, tipo: "RECEITA", valor: 100, data: "2026-10-15" }, "ana");
    await apl.registrarTransacao({ ...base, tipo: "DESPESA", valor: 25.5, data: "2026-11-19" }, "ana");
    await apl.registrarTransacao({ ...base, tipo: "RECEITA", valor: 50, data: "2027-01-19" }, "ana");
    const agora = new Date("2026-11-19T15:00:00.000Z");
    const novembro = await apl.obterResumo({ usuarioId: "ana", periodicidade: "mes", referencia: "2026-11-19", agora });
    expect(novembro.saldoAtual).toBe(74.5);
    expect(novembro.resultadoPeriodo?.saldo).toBe(-25.5);
    expect((await apl.obterResumo({ usuarioId: "outra", periodicidade: "mes", referencia: "2026-11-19", agora })).saldoAtual).toBe(0);
    expect((await apl.obterResumo({ usuarioId: "ana", periodicidade: "mes", referencia: "2027-01-19", agora })).resultadoPeriodo?.saldo).toBe(50);
  });
});
