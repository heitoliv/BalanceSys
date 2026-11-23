import { DomainError } from "../shared/DomainError";
import { LimiarMeta, ProgressoMeta } from "./ProgressoMeta";

export type DadosMeta = { categoriaId: string; mes: string; limite: number };
export type MetaView = { id: string; categoriaId: string; categoriaNome: string; mes: string; limite: number; moeda: string; inicio: string; fimExclusivo: string; criadoEm: Date; atualizadoEm: Date };
export type MetaComProgresso = MetaView & { progresso: ProgressoMeta; alertas: LimiarMeta[] };
export function proximoMes(mes: string): string {
  const [ano, numero] = mes.split("-").map(Number);
  return numero === 12 ? `${ano + 1}-01` : `${ano}-${String(numero + 1).padStart(2, "0")}`;
}
export function validarMeta(input: DadosMeta, tipoCategoria: string): void {
  if (tipoCategoria !== "DESPESA" && tipoCategoria !== "AMBOS") throw new DomainError("Escolha uma categoria de despesa.");
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(input.mes)) throw new DomainError("Informe o mês no formato AAAA-MM.");
  if (typeof input.limite !== "number" || !Number.isFinite(input.limite) || input.limite <= 0 ||
      !Number.isSafeInteger(Math.round(input.limite * 100)) || Math.abs(input.limite * 100 - Math.round(input.limite * 100)) > 1e-7)
    throw new DomainError("Informe um limite positivo em reais, com até duas casas decimais.");
}

export interface MetaRepository {
  categoria(id: string): Promise<{ id: string; tipo: string; nome: string } | null>;
  listar(usuarioId: string, mes?: string): Promise<MetaView[]>;
  criar(usuarioId: string, input: DadosMeta): Promise<MetaView>;
  alterar(id: string, usuarioId: string, input: DadosMeta): Promise<MetaView | null>;
  remover(id: string, usuarioId: string): Promise<boolean>;
  somarDespesas(usuarioId: string, categoriaIds: string[], inicio: Date, fimExclusivo: Date): Promise<Map<string, bigint>>;
}
