/** Import only into a new PostgreSQL database after prisma migrate deploy, before API startup. */
import { readFileSync } from "fs";
import { PrismaClient, Prisma } from "@prisma/client";

type Row = Record<string, string>;
type Export = { counts: Record<string, number>; totals: Record<string, string>; usuarios: Row[]; categorias: Row[]; transacoes: Row[] };
const prisma = new PrismaClient();

function date(value: string): Date {
  const parsed = new Date(value.endsWith("Z") || /[+-]\d\d:\d\d$/.test(value) ? value : `${value.replace(" ", "T")}Z`);
  if (Number.isNaN(parsed.getTime())) throw new Error(`Invalid date: ${value}`);
  return parsed;
}
function cents(value: string): bigint {
  if (!/^\d+\.\d{2}$/.test(value)) throw new Error(`Invalid exact-cent value: ${value}`);
  const [whole, fraction] = value.split(".");
  return BigInt(whole) * 100n + BigInt(fraction);
}

async function main() {
  const path = process.argv[2];
  if (!path) throw new Error("Usage: ts-node scripts/import_sqlite.ts DATA.export.json");
  const data = JSON.parse(readFileSync(path, "utf8")) as Export;
  if (data.counts.usuarios !== data.usuarios.length || data.counts.categorias !== data.categorias.length || data.counts.transacoes !== data.transacoes.length) throw new Error("Export count mismatch");
  const totals = { RECEITA: 0n, DESPESA: 0n };
  for (const t of data.transacoes) {
    if (t.tipo !== "RECEITA" && t.tipo !== "DESPESA") throw new Error(`Invalid type ${t.id}`);
    totals[t.tipo] += cents(t.valor);
  }
  for (const tipo of ["RECEITA", "DESPESA"] as const) if (totals[tipo] !== cents(data.totals[tipo])) throw new Error(`Export aggregate mismatch: ${tipo}`);

  // Refuse unrelated destination data. Re-running the same import is safe.
  const ids = {
    usuarios: new Set(data.usuarios.map(r => r.id)),
    categorias: new Set(data.categorias.map(r => r.id)),
    transacoes: new Set(data.transacoes.map(r => r.id)),
  };
  for (const r of await prisma.usuario.findMany({ select: { id: true } })) if (!ids.usuarios.has(r.id)) throw new Error("Destination has unrelated users");
  for (const r of await prisma.categoria.findMany({ select: { id: true } })) if (!ids.categorias.has(r.id)) throw new Error("Destination has unrelated categories");
  for (const r of await prisma.transacao.findMany({ select: { id: true } })) if (!ids.transacoes.has(r.id)) throw new Error("Destination has unrelated transactions");

  const outcome = await prisma.$transaction(async tx => {
    for (const [index, r] of [...data.usuarios].sort((a, b) => a.id.localeCompare(b.id)).entries()) await tx.usuario.upsert({ where: { id: r.id }, update: {}, create: { id: r.id, nome: r.nome, nickname: `usuario_${index + 1}`, nicknameBusca: `usuario_${index + 1}`, criadoEm: date(r.criadoEm) } });
    for (const r of data.categorias) await tx.categoria.upsert({ where: { id: r.id }, update: {}, create: { id: r.id, nome: r.nome, tipo: r.tipo } });
    for (const r of data.transacoes) await tx.transacao.upsert({ where: { id: r.id }, update: {}, create: {
      id: r.id, tipo: r.tipo, valor: new Prisma.Decimal(r.valor), descricao: r.descricao,
      data: date(r.data), prioridade: r.prioridade, criadoEm: date(r.criadoEm),
      usuarioId: r.usuarioId, categoriaId: r.categoriaId,
    } });
  const rows = await tx.transacao.findMany({ select: { id: true, tipo: true, valor: true, usuarioId: true, categoriaId: true, data: true, criadoEm: true } });
  const destTotals = { RECEITA: 0n, DESPESA: 0n };
  for (const r of rows) destTotals[r.tipo as "RECEITA" | "DESPESA"] += cents(r.valor.toFixed(2));
  const divergence: string[] = [];
  if (await tx.usuario.count() !== data.counts.usuarios) divergence.push("usuarios count");
  if (await tx.categoria.count() !== data.counts.categorias) divergence.push("categorias count");
  if (rows.length !== data.counts.transacoes) divergence.push("transacoes count");
  for (const tipo of ["RECEITA", "DESPESA"] as const) if (destTotals[tipo] !== totals[tipo]) divergence.push(`${tipo} aggregate`);
  const destUsers = await tx.usuario.findMany({ select: { id: true, nome: true, criadoEm: true } });
  const userById = new Map(destUsers.map(r => [r.id, r]));
  for (const source of data.usuarios) {
    const target = userById.get(source.id);
    if (!target || target.nome !== source.nome || target.criadoEm.getTime() !== date(source.criadoEm).getTime()) divergence.push(`user ${source.id}`);
  }
  const destCategories = await tx.categoria.findMany({ select: { id: true, nome: true, tipo: true } });
  const categoryById = new Map(destCategories.map(r => [r.id, r]));
  for (const source of data.categorias) {
    const target = categoryById.get(source.id);
    if (!target || target.nome !== source.nome || target.tipo !== source.tipo) divergence.push(`category ${source.id}`);
  }
  const transactionById = new Map(rows.map(r => [r.id, r]));
  for (const source of data.transacoes) {
    const target = transactionById.get(source.id);
    if (!target || target.usuarioId !== source.usuarioId || target.categoriaId !== source.categoriaId || target.data.getTime() !== date(source.data).getTime() || target.criadoEm.getTime() !== date(source.criadoEm).getTime() || target.valor.toFixed(2) !== source.valor) divergence.push(`transaction ${source.id}`);
  }
  if (divergence.length) throw new Error("Import verification failed");
  return { counts: data.counts, totals: data.totals, divergence };
  }, { timeout: 60000 });
  console.log(JSON.stringify(outcome));
}

main().catch(e => { console.error(e); process.exitCode = 1; }).finally(() => prisma.$disconnect());
