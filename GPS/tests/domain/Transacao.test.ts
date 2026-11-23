import { Transacao } from "../../src/domain/transacao/Transacao";
import { TipoTransacao, PrioridadeGasto } from "../../src/domain/shared/enums";
import { DomainError } from "../../src/domain/shared/DomainError";

const base = {
  tipo: TipoTransacao.DESPESA,
  valor: 100,
  descricao: "Mercado",
  data: new Date("2026-03-10"),
  prioridade: PrioridadeGasto.IMPORTANTE,
  usuarioId: "u1",
  categoriaId: "c1",
};

describe("CDP — Transacao (regras de domínio)", () => {
  it("cria uma transação válida", () => {
    const t = Transacao.criar(base);
    expect(t.id).toBeTruthy();
    expect(t.valor).toBe(100);
    expect(t.descricao).toBe("Mercado");
  });

  it("E2 — rejeita valor zero", () => {
    expect(() => Transacao.criar({ ...base, valor: 0 })).toThrow(DomainError);
  });

  it("E2 — rejeita valor negativo", () => {
    expect(() => Transacao.criar({ ...base, valor: -5 })).toThrow(
      /maior que zero/
    );
  });

  it("E2 — rejeita valor não numérico", () => {
    expect(() =>
      Transacao.criar({ ...base, valor: NaN })
    ).toThrow(DomainError);
  });

  it("rejeita descrição vazia", () => {
    expect(() => Transacao.criar({ ...base, descricao: "   " })).toThrow(
      /descrição/
    );
  });

  it("rejeita data inválida", () => {
    expect(() =>
      Transacao.criar({ ...base, data: new Date("data-invalida") })
    ).toThrow(/data/);
  });

  it("RN01 — rejeita prioridade fora do enum", () => {
    expect(() =>
      Transacao.criar({ ...base, prioridade: "QUALQUER" as PrioridadeGasto })
    ).toThrow(/Prioridade/);
  });
  it("RN01 exige prioridade apenas para despesa e preserva receita sem classificação", () => {
    expect(() => Transacao.criar({ ...base, prioridade: undefined })).toThrow(/Prioridade/);
    const receita = Transacao.criar({ ...base, tipo: TipoTransacao.RECEITA, prioridade: undefined });
    expect(receita.prioridade).toBeNull();
    const antiga = Transacao.reconstituir({ ...base, tipo: TipoTransacao.RECEITA, id: "antiga", criadoEm: new Date() });
    expect(antiga.prioridade).toBeNull();
  });

  it("rejeita tipo inválido", () => {
    expect(() =>
      Transacao.criar({ ...base, tipo: "OUTRO" as TipoTransacao })
    ).toThrow(/Tipo/);
  });

  it("RN04 — exige vínculo com usuário", () => {
    expect(() => Transacao.criar({ ...base, usuarioId: "" })).toThrow(
      /usuário/
    );
  });

  it("impacto no saldo: receita é positivo, despesa é negativo", () => {
    const receita = Transacao.criar({ ...base, tipo: TipoTransacao.RECEITA });
    const despesa = Transacao.criar({ ...base, tipo: TipoTransacao.DESPESA });
    expect(receita.impactoNoSaldo()).toBe(100);
    expect(despesa.impactoNoSaldo()).toBe(-100);
  });

  it("normaliza a descrição (trim)", () => {
    const t = Transacao.criar({ ...base, descricao: "  Aluguel  " });
    expect(t.descricao).toBe("Aluguel");
  });
});
