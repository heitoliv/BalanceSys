// ============================================================================
// cgd — PrismaTransacaoRepository (DAO concreto)
// ----------------------------------------------------------------------------
// Implementa a porta TransacaoRepository definida no domínio, traduzindo entre
// as entidades de domínio e as linhas do banco. É o único ponto do sistema que
// conhece o Prisma; trocar o mecanismo de persistência afeta só esta classe.
// ============================================================================

import { PrismaClient, Prisma } from "@prisma/client";
import { Transacao } from "../../domain/transacao/Transacao";
import {
  TransacaoRepository,
  FiltroPeriodo,
} from "../../domain/transacao/TransacaoRepository";
import { TipoTransacao, PrioridadeGasto } from "../../domain/shared/enums";

export class PrismaTransacaoRepository implements TransacaoRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async salvar(transacao: Transacao): Promise<Transacao> {
    const row = await this.prisma.transacao.create({
      data: {
        id: transacao.id,
        tipo: transacao.tipo,
        valor: transacao.valor.toFixed(2),
        descricao: transacao.descricao,
        data: transacao.data,
        prioridade: transacao.prioridade ?? "NAO_APLICA",
        usuarioId: transacao.usuarioId,
        categoriaId: transacao.categoriaId,
      },
    });
    return this.paraDominio(row);
  }

  async listar(filtro: FiltroPeriodo): Promise<Transacao[]> {
    const where: Record<string, unknown> = { usuarioId: filtro.usuarioId };

    if (filtro.tipo) where.tipo = filtro.tipo;
    if (filtro.categoriaId) where.categoriaId = filtro.categoriaId;
    if (filtro.de || filtro.ate || filtro.antesDe) {
      where.data = {
        ...(filtro.de ? { gte: filtro.de } : {}),
        ...(filtro.ate ? { lte: filtro.ate } : {}),
        ...(filtro.antesDe ? { lt: filtro.antesDe } : {}),
      };
    }

    const rows = await this.prisma.transacao.findMany({
      where,
      orderBy: { data: "desc" },
    });
    return rows.map((r) => this.paraDominio(r));
  }

  async buscarPorId(id: string, usuarioId: string): Promise<Transacao | null> {
    const row = await this.prisma.transacao.findFirst({
      where: { id, usuarioId },
    });
    return row ? this.paraDominio(row) : null;
  }

  async remover(id: string, usuarioId: string): Promise<void> {
    // deleteMany com usuarioId garante que só o proprietário remova (RN04).
    await this.prisma.transacao.deleteMany({ where: { id, usuarioId } });
  }
  async removerNoPrazo(id: string, usuarioId: string, criadoDepoisDe: Date): Promise<boolean> {
    const result = await this.prisma.transacao.deleteMany({ where: { id, usuarioId, criadoEm: { gte: criadoDepoisDe } } });
    return result.count === 1;
  }

  async atualizarNoPrazo(id: string, usuarioId: string, criadoDepoisDe: Date, transacao: Transacao): Promise<Transacao | null> {
    return this.prisma.$transaction(async tx => {
      const result = await tx.transacao.updateMany({ where: { id, usuarioId, criadoEm: { gte: criadoDepoisDe } }, data: {
        tipo: transacao.tipo, valor: transacao.valor.toFixed(2), descricao: transacao.descricao,
        data: transacao.data, prioridade: transacao.prioridade ?? "NAO_APLICA", categoriaId: transacao.categoriaId,
      } });
      if (result.count !== 1) return null;
      const row = await tx.transacao.findUniqueOrThrow({ where: { id } });
      return this.paraDominio(row);
    });
  }

  // ------------------------------------------------------------------------

  private paraDominio(row: {
    id: string;
    tipo: string;
    valor: Prisma.Decimal;
    descricao: string;
    data: Date;
    prioridade: string;
    usuarioId: string;
    categoriaId: string;
    criadoEm: Date;
  }): Transacao {
    return Transacao.reconstituir({
      id: row.id,
      tipo: row.tipo as TipoTransacao,
      valor: row.valor.toNumber(),
      descricao: row.descricao,
      data: row.data,
      prioridade: row.prioridade as PrioridadeGasto,
      usuarioId: row.usuarioId,
      categoriaId: row.categoriaId,
      criadoEm: row.criadoEm,
    });
  }
}
