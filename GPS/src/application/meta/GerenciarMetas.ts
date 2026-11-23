import { DadosMeta, MetaComProgresso, MetaRepository, MetaView, validarMeta } from "../../domain/meta/MetaGasto";
import { intervaloPeriodo } from "../../domain/transacao/Periodo";
import { calcularProgresso, centavosDecimais, limiaresAtingidos } from "../../domain/meta/ProgressoMeta";
import { DomainError } from "../../domain/shared/DomainError";

export class ErroMeta extends DomainError {
  constructor(message: string, readonly status: 404 | 409) { super(message); }
}
export class GerenciarMetas {
  constructor(private readonly repo: MetaRepository) {}
  async listar(usuarioId: string, mes?: string, agora = new Date()): Promise<MetaComProgresso[]> {
    if (mes && !/^\d{4}-(0[1-9]|1[0-2])$/.test(mes)) throw new DomainError("Mês inválido.");
    const metas = await this.repo.listar(usuarioId, mes);
    const grupos = new Map<string, MetaView[]>();
    for (const meta of metas) grupos.set(meta.mes, [...(grupos.get(meta.mes) ?? []), meta]);
    const gastos = new Map<string, bigint>();
    for (const [mesMeta, grupo] of grupos) {
      const periodo = intervaloPeriodo("mes", `${mesMeta}-15`);
      const fim = new Date(Math.min(periodo.fimExclusivo.getTime(), agora.getTime()));
      if (fim <= periodo.inicio) continue;
      const totais = await this.repo.somarDespesas(usuarioId, grupo.map(m => m.categoriaId), periodo.inicio, fim);
      for (const [categoriaId, total] of totais) gastos.set(`${mesMeta}:${categoriaId}`, total);
    }
    return metas.map(meta => {
      const limite = centavosDecimais(meta.limite.toFixed(2));
      const gasto = gastos.get(`${meta.mes}:${meta.categoriaId}`) ?? 0n;
      return { ...meta, progresso: calcularProgresso(limite, gasto), alertas: limiaresAtingidos(limite, gasto) };
    });
  }
  private async conferir(input: DadosMeta) {
    const categoria = await this.repo.categoria(input.categoriaId);
    if (!categoria) throw new DomainError("Categoria inexistente.");
    validarMeta(input, categoria.tipo);
  }
  async criar(usuarioId: string, input: DadosMeta) {
    await this.conferir(input);
    try { return await this.repo.criar(usuarioId, input); }
    catch (e) { if ((e as any)?.code === "P2002") throw new ErroMeta("Já existe meta para esta categoria e mês.", 409); throw e; }
  }
  async alterar(id: string, usuarioId: string, input: DadosMeta) {
    await this.conferir(input);
    try {
      const meta = await this.repo.alterar(id, usuarioId, input);
      if (!meta) throw new ErroMeta("Meta não encontrada.", 404);
      return meta;
    }
    catch (e) { if ((e as any)?.code === "P2002") throw new ErroMeta("Já existe meta para esta categoria e mês.", 409); throw e; }
  }
  async remover(id: string, usuarioId: string) {
    if (!await this.repo.remover(id, usuarioId)) throw new ErroMeta("Meta não encontrada.", 404);
  }
}
