import { AplControlarTransacao } from "../../src/application/transacao/AplControlarTransacao";
import { InMemoryTransacaoRepository } from "../InMemoryTransacaoRepository";
import { Transacao } from "../../src/domain/transacao/Transacao";
import { TipoTransacao, PrioridadeGasto } from "../../src/domain/shared/enums";
import { PRAZO_ALTERACAO_MS, dentroDoPrazo } from "../../src/domain/transacao/PrazoAlteracao";

const criadoEm = new Date("2026-10-01T12:00:00.000Z");
const limite = new Date(criadoEm.getTime() + PRAZO_ALTERACAO_MS);
const dto = { tipo: "DESPESA", valor: 25.5, descricao: "Alterada", data: "2027-01-10", categoriaId: "lazer", prioridade: "OPCIONAL" };
function fixture() {
  const repo = new InMemoryTransacaoRepository();
  const apl = new AplControlarTransacao(repo);
  const row = Transacao.reconstituir({ id: "tx-a", tipo: TipoTransacao.DESPESA, valor: 10, descricao: "Antiga", data: new Date("2027-01-01"), prioridade: PrioridadeGasto.ESSENCIAL, usuarioId: "alice", categoriaId: "lazer", criadoEm });
  return { repo, apl, row };
}

describe("PBI-07 / RN06", () => {
  it("permite o instante exato do 30º dia e bloqueia um milissegundo depois", async () => {
    expect(dentroDoPrazo(criadoEm, limite)).toBe(true);
    expect(dentroDoPrazo(criadoEm, new Date(limite.getTime() + 1))).toBe(false);
    const { repo, apl, row } = fixture();
    await repo.salvar(row);
    const editada = await apl.editarTransacao(row.id, dto, "alice", limite);
    expect(editada.valor).toBe(25.5);
    expect(editada.criadoEm).toBe(criadoEm.toISOString());
    await expect(apl.editarTransacao(row.id, dto, "alice", new Date(limite.getTime() + 1))).rejects.toThrow(/Prazo/);
    await expect(apl.removerTransacao(row.id, "alice", new Date(limite.getTime() + 1))).rejects.toThrow(/Prazo/);
    await apl.removerTransacao(row.id, "alice", limite);
    await expect(apl.removerTransacao(row.id, "alice", limite)).rejects.toThrow(/não encontrada/);
  });

  it("impede edição e exclusão por outra conta, e valida despesa", async () => {
    const { repo, apl, row } = fixture();
    await repo.salvar(row);
    await expect(apl.editarTransacao(row.id, dto, "bob", criadoEm)).rejects.toThrow(/não encontrada/);
    await expect(apl.removerTransacao(row.id, "bob", criadoEm)).rejects.toThrow(/não encontrada/);
    await expect(apl.editarTransacao(row.id, { ...dto, prioridade: undefined }, "alice", criadoEm)).rejects.toThrow(/Prioridade/);
    expect((await apl.listarTransacoes({ usuarioId: "alice" }))[0].valor).toBe(10);
  });
});
