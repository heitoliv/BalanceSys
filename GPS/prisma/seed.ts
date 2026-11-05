// ============================================================================
// Seed — popula o banco com usuário padrão, categorias e transações de exemplo.
// Executar após a migração:  npm run seed
// ============================================================================

import { PrismaClient } from "@prisma/client";
import { bootstrap } from "../src/infrastructure/persistence/Bootstrap";

const prisma = new PrismaClient();

async function main() {
  const usuarioId = await bootstrap(prisma);
  const categorias = await prisma.categoria.findMany();
  const catId = (nome: string) =>
    categorias.find((c) => c.nome === nome)!.id;

  const jaTem = await prisma.transacao.count({ where: { usuarioId } });
  if (jaTem > 0) {
    console.log(`Banco já possui ${jaTem} transações; seed de exemplos ignorado.`);
    return;
  }

  const exemplos = [
    { tipo: "RECEITA", valor: 4500, descricao: "Salário", data: new Date("2026-03-15"), prioridade: "ESSENCIAL", categoria: "Renda" },
    { tipo: "DESPESA", valor: 1200, descricao: "Aluguel março", data: new Date("2026-03-05"), prioridade: "ESSENCIAL", categoria: "Moradia" },
    { tipo: "DESPESA", valor: 320, descricao: "Mercado do mês", data: new Date("2026-03-08"), prioridade: "ESSENCIAL", categoria: "Alimentação" },
    { tipo: "DESPESA", valor: 160, descricao: "Gasolina", data: new Date("2026-03-20"), prioridade: "IMPORTANTE", categoria: "Transporte" },
    { tipo: "DESPESA", valor: 89.9, descricao: "Cinema e jantar", data: new Date("2026-03-22"), prioridade: "OPCIONAL", categoria: "Lazer" },
  ];

  for (const e of exemplos) {
    await prisma.transacao.create({
      data: {
        tipo: e.tipo,
        valor: e.valor,
        descricao: e.descricao,
        data: e.data,
        prioridade: e.prioridade,
        usuarioId,
        categoriaId: catId(e.categoria),
      },
    });
  }
  console.log(`Seed concluído: ${exemplos.length} transações de exemplo criadas.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
