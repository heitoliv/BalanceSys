// ============================================================================
// Seed — cria apenas categorias iniciais; contas são criadas pelo cadastro.
// Executar após a migração:  npm run seed
// ============================================================================

import { PrismaClient } from "@prisma/client";
import { bootstrap } from "../src/infrastructure/persistence/Bootstrap";

const prisma = new PrismaClient();

async function main() {
  await bootstrap(prisma);
  console.log("Categorias iniciais verificadas; nenhum usuário de demonstração foi criado.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
