// ============================================================================
// cgd — Categorias iniciais de apoio ao registro.
// ============================================================================

import { PrismaClient } from "@prisma/client";

const CATEGORIAS_INICIAIS = [
  { nome: "Renda", tipo: "RECEITA" },
  { nome: "Alimentação", tipo: "DESPESA" },
  { nome: "Transporte", tipo: "DESPESA" },
  { nome: "Moradia", tipo: "DESPESA" },
  { nome: "Saúde", tipo: "DESPESA" },
  { nome: "Lazer", tipo: "DESPESA" },
  { nome: "Outros", tipo: "AMBOS" },
];

export async function garantirCategorias(prisma: PrismaClient): Promise<void> {
  for (const cat of CATEGORIAS_INICIAIS) {
    await prisma.categoria.upsert({
      where: { nome: cat.nome },
      update: {},
      create: cat,
    });
  }
}

export async function bootstrap(prisma: PrismaClient): Promise<void> {
  await garantirCategorias(prisma);
}
