import { Prisma, PrismaClient } from "@prisma/client";
import { DadosMeta, MetaRepository, MetaView, proximoMes } from "../../domain/meta/MetaGasto";
import { centavosDecimais } from "../../domain/meta/ProgressoMeta";

export class PrismaMetaRepository implements MetaRepository {
  constructor(private readonly prisma: PrismaClient) {}
  categoria(id: string) { return this.prisma.categoria.findUnique({ where: { id }, select: { id: true, tipo: true, nome: true } }); }
  private view(row: Prisma.MetaGastoGetPayload<{ include: { categoria: true } }>): MetaView { return { id: row.id, categoriaId: row.categoriaId, categoriaNome: row.categoria.nome, mes: row.mes, limite: row.limite.toNumber(), moeda: row.moeda, inicio: `${row.mes}-01`, fimExclusivo: `${proximoMes(row.mes)}-01`, criadoEm: row.criadoEm, atualizadoEm: row.atualizadoEm }; }
  async listar(usuarioId: string, mes?: string) { return (await this.prisma.metaGasto.findMany({ where: { usuarioId, ...(mes ? { mes } : {}) }, include: { categoria: true }, orderBy: [{ mes: "desc" }, { criadoEm: "asc" }] })).map(row => this.view(row)); }
  async criar(usuarioId: string, input: DadosMeta) { return this.view(await this.prisma.metaGasto.create({ data: { usuarioId, categoriaId: input.categoriaId, mes: input.mes, limite: input.limite.toFixed(2) }, include: { categoria: true } })); }
  async alterar(id: string, usuarioId: string, input: DadosMeta) {
    return this.prisma.$transaction(async tx => {
      const result = await tx.metaGasto.updateMany({ where: { id, usuarioId }, data: { categoriaId: input.categoriaId, mes: input.mes, limite: input.limite.toFixed(2) } });
      if (!result.count) return null;
      return this.view(await tx.metaGasto.findUniqueOrThrow({ where: { id }, include: { categoria: true } }));
    });
  }
  async remover(id: string, usuarioId: string) { return (await this.prisma.metaGasto.deleteMany({ where: { id, usuarioId } })).count === 1; }
  async somarDespesas(usuarioId: string, categoriaIds: string[], inicio: Date, fimExclusivo: Date): Promise<Map<string, bigint>> {
    if (!categoriaIds.length) return new Map();
    const linhas = await this.prisma.transacao.groupBy({
      by: ["categoriaId"],
      where: { usuarioId, tipo: "DESPESA", categoriaId: { in: categoriaIds }, data: { gte: inicio, lt: fimExclusivo } },
      _sum: { valor: true },
    });
    return new Map(linhas.map(linha => [linha.categoriaId, centavosDecimais(linha._sum.valor?.toFixed(2) ?? "0.00")]));
  }
}
