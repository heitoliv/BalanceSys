import { AplControlarTransacao } from "../../src/application/transacao/AplControlarTransacao";
import { InMemoryTransacaoRepository } from "../InMemoryTransacaoRepository";

function criarApl() {
  const repo = new InMemoryTransacaoRepository();
  const apl = new AplControlarTransacao(repo);
  return { repo, apl };
}

const receita = {
  tipo: "RECEITA",
  valor: 4500,
  descricao: "Salário",
  data: "2026-03-15T00:00:00.000Z",
  prioridade: "ESSENCIAL",
  categoriaId: "c-renda",
};
const despesa = {
  tipo: "DESPESA",
  valor: 1200,
  descricao: "Aluguel",
  data: "2026-03-05T00:00:00.000Z",
  prioridade: "ESSENCIAL",
  categoriaId: "c-moradia",
};

describe("CGT — AplControlarTransacao (UC03, UC07, UC08)", () => {
  it("UC03 — registra uma receita e devolve a view", async () => {
    const { apl } = criarApl();
    const view = await apl.registrarTransacao(receita, "u1");
    expect(view.id).toBeTruthy();
    expect(view.tipo).toBe("RECEITA");
    expect(view.usuarioId).toBe("u1");
  });

  it("UC08 — resumo reflete as transações registradas", async () => {
    const { apl } = criarApl();
    await apl.registrarTransacao(receita, "u1");
    await apl.registrarTransacao(despesa, "u1");
    const resumo = await apl.obterResumo({ usuarioId: "u1" });
    expect(resumo.totalReceitas).toBe(4500);
    expect(resumo.totalDespesas).toBe(1200);
    expect(resumo.saldo).toBe(3300);
  });

  it("UC03 — propaga erro de domínio para valor inválido", async () => {
    const { apl } = criarApl();
    await expect(
      apl.registrarTransacao({ ...despesa, valor: -10 }, "u1")
    ).rejects.toThrow(/maior que zero/);
  });

  it("UC07 — filtra o histórico por tipo", async () => {
    const { apl } = criarApl();
    await apl.registrarTransacao(receita, "u1");
    await apl.registrarTransacao(despesa, "u1");
    const soDespesas = await apl.listarTransacoes({ usuarioId: "u1", tipo: "DESPESA" });
    expect(soDespesas).toHaveLength(1);
    expect(soDespesas[0].descricao).toBe("Aluguel");
  });

  it("UC04 — remove transação existente", async () => {
    const { apl } = criarApl();
    const v = await apl.registrarTransacao(receita, "u1");
    await apl.removerTransacao(v.id, "u1");
    const lista = await apl.listarTransacoes({ usuarioId: "u1" });
    expect(lista).toHaveLength(0);
  });

  it("UC04 — remover inexistente lança erro de domínio", async () => {
    const { apl } = criarApl();
    await expect(apl.removerTransacao("nao-existe", "u1")).rejects.toThrow(
      /não encontrada/
    );
  });

  it("isola histórico, saldo e exclusão entre dois usuários", async () => {
    const { apl } = criarApl();
    const a = await apl.registrarTransacao(receita, "alice");
    await apl.registrarTransacao(despesa, "bob");
    expect(await apl.listarTransacoes({ usuarioId: "alice" })).toHaveLength(1);
    expect((await apl.obterResumo({ usuarioId: "bob" })).saldo).toBe(-1200);
    await expect(apl.removerTransacao(a.id, "bob")).rejects.toThrow(/não encontrada/);
    expect(await apl.listarTransacoes({ usuarioId: "alice" })).toHaveLength(1);
  });
});
