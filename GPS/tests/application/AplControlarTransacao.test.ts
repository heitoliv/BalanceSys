import { AplControlarTransacao } from "../../src/application/transacao/AplControlarTransacao";
import { InMemoryTransacaoRepository } from "../InMemoryTransacaoRepository";

function criarApl() {
  const repo = new InMemoryTransacaoRepository();
  const apl = new AplControlarTransacao(repo, async () => "u-demo");
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
    const view = await apl.registrarTransacao(receita);
    expect(view.id).toBeTruthy();
    expect(view.tipo).toBe("RECEITA");
    expect(view.usuarioId).toBe("u-demo");
  });

  it("UC08 — resumo reflete as transações registradas", async () => {
    const { apl } = criarApl();
    await apl.registrarTransacao(receita);
    await apl.registrarTransacao(despesa);
    const resumo = await apl.obterResumo({});
    expect(resumo.totalReceitas).toBe(4500);
    expect(resumo.totalDespesas).toBe(1200);
    expect(resumo.saldo).toBe(3300);
  });

  it("UC03 — propaga erro de domínio para valor inválido", async () => {
    const { apl } = criarApl();
    await expect(
      apl.registrarTransacao({ ...despesa, valor: -10 })
    ).rejects.toThrow(/maior que zero/);
  });

  it("UC07 — filtra o histórico por tipo", async () => {
    const { apl } = criarApl();
    await apl.registrarTransacao(receita);
    await apl.registrarTransacao(despesa);
    const soDespesas = await apl.listarTransacoes({ tipo: "DESPESA" });
    expect(soDespesas).toHaveLength(1);
    expect(soDespesas[0].descricao).toBe("Aluguel");
  });

  it("UC04 — remove transação existente", async () => {
    const { apl } = criarApl();
    const v = await apl.registrarTransacao(receita);
    await apl.removerTransacao(v.id);
    const lista = await apl.listarTransacoes({});
    expect(lista).toHaveLength(0);
  });

  it("UC04 — remover inexistente lança erro de domínio", async () => {
    const { apl } = criarApl();
    await expect(apl.removerTransacao("nao-existe")).rejects.toThrow(
      /não encontrada/
    );
  });
});
