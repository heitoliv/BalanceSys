// ============================================================================
// cgd — Bootstrap de dados de apoio do Incremento 1
// ----------------------------------------------------------------------------
// Como o fluxo de login (PBI-01/02) pertence a incrementos posteriores, este
// módulo garante a existência de um usuário padrão e das categorias iniciais,
// para que o registro de transações já funademente de ponta a ponta.
// ============================================================================

import { PrismaClient } from "@prisma/client";

const USUARIO_PADRAO = {
  nome: "Usuário Demonstração",
  email: "demo@balancesys.local",
};

const CATEGORIAS_INICIAIS = [
  { nome: "Renda", tipo: "RECEITA" },
  { nome: "Alimentação", tipo: "DESPESA" },
  { nome: "Transporte", tipo: "DESPESA" },
  { nome: "Moradia", tipo: "DESPESA" },
  { nome: "Saúde", tipo: "DESPESA" },
  { nome: "Lazer", tipo: "DESPESA" },
  { nome: "Outros", tipo: "AMBOS" },
];

export async function garantirUsuarioPadrao(
  prisma: PrismaClient
): Promise<string> {
  const existente = await prisma.usuario.findUnique({
    where: { email: USUARIO_PADRAO.email },
  });
  if (existente) return existente.id;

  const criado = await prisma.usuario.create({ data: USUARIO_PADRAO });
  return criado.id;
}

export async function garantirCategorias(prisma: PrismaClient): Promise<void> {
  for (const cat of CATEGORIAS_INICIAIS) {
    await prisma.categoria.upsert({
      where: { nome: cat.nome },
      update: {},
      create: cat,
    });
  }
}

export async function bootstrap(prisma: PrismaClient): Promise<string> {
  await garantirCategorias(prisma);
  return garantirUsuarioPadrao(prisma);
}
