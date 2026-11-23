import { validarMeta, proximoMes } from "../../src/domain/meta/MetaGasto";
import { senhaValida } from "../../src/domain/usuario/PoliticaConta";
import { calcularProgresso, centavosDecimais, limiaresAtingidos } from "../../src/domain/meta/ProgressoMeta";

describe("Regras de metas mensais e senha", () => {
  const meta = { categoriaId: "categoria", mes: "2026-11", limite: 120.25 };
  it("aceita gasto e categoria AMBOS, mas não receita", () => {
    expect(() => validarMeta(meta, "DESPESA")).not.toThrow();
    expect(() => validarMeta(meta, "AMBOS")).not.toThrow();
    expect(() => validarMeta(meta, "RECEITA")).toThrow(/despesa/);
  });
  it("recusa mês inválido, zero e fração de centavo", () => {
    for (const mes of ["2026-00", "2026-13", "2026-1", "2026-11-01"]) expect(() => validarMeta({ ...meta, mes }, "DESPESA")).toThrow();
    for (const limite of [0, -1, 1.001, NaN, Number.MAX_VALUE]) expect(() => validarMeta({ ...meta, limite }, "DESPESA")).toThrow();
  });
  it("calcula fim exclusivo inclusive na virada do ano", () => {
    expect(proximoMes("2026-11")).toBe("2026-12");
    expect(proximoMes("2026-12")).toBe("2027-01");
  });
  it("exige 6 a 20 caracteres com maiúscula, minúscula, número e especial", () => {
    expect(senhaValida("Aa1!aa")).toBe(true);
    for (const senha of ["Aa1!a", "Aa1!" + "a".repeat(17), "Aa!aaa", "AA1!AA", "aa1!aa", "Aa1aaa"]) expect(senhaValida(senha)).toBe(false);
  });
  it("calcula zero, limite exato, excedente e centavos sem divisão por zero", () => {
    expect(calcularProgresso(10000n, 0n)).toEqual({ gastoConsiderado: 0, restante: 100, excedente: 0, percentualUtilizacao: 0 });
    expect(calcularProgresso(10000n, 10000n)).toEqual({ gastoConsiderado: 100, restante: 0, excedente: 0, percentualUtilizacao: 100 });
    expect(calcularProgresso(10000n, 12550n)).toEqual({ gastoConsiderado: 125.5, restante: 0, excedente: 25.5, percentualUtilizacao: 125.5 });
    expect(calcularProgresso(30000n, 100n).percentualUtilizacao).toBe(0.33);
    expect(() => calcularProgresso(0n, 0n)).toThrow();
    expect(centavosDecimais("10.05")).toBe(1005n);
    expect(() => centavosDecimais("10.001")).toThrow();
  });
  it("emite cada limiar uma vez por estado, comparando centavos sem arredondar o gatilho", () => {
    expect(limiaresAtingidos(10000n, 7999n)).toEqual([]);
    expect(limiaresAtingidos(10000n, 8000n)).toEqual([80]);
    expect(limiaresAtingidos(10000n, 9999n)).toEqual([80]);
    expect(limiaresAtingidos(10000n, 10000n)).toEqual([80, 100]);
    expect(limiaresAtingidos(10000n, 12050n)).toEqual([80, 100]);
    expect(limiaresAtingidos(100001n, 80000n)).toEqual([]); // 79,9992%, exibível como 80,00%
    expect(() => limiaresAtingidos(0n, 0n)).toThrow();
  });
});
