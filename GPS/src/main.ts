// ============================================================================
// Ponto de entrada da aplicação BalanceSys — Incremento 1
// ============================================================================

import { criarContainer } from "./config/container";
import { criarApp } from "./interface/http/server";

const PORTA = Number(process.env.PORT ?? 3000);

async function iniciar(): Promise<void> {
  const container = criarContainer();
  await container.inicializar(); // garante usuário padrão + categorias

  const app = criarApp(container);

  app.listen(PORTA, () => {
    // eslint-disable-next-line no-console
    console.log(`BalanceSys rodando em http://localhost:${PORTA}`);
  });
}

iniciar().catch((e) => {
  // eslint-disable-next-line no-console
  console.error("Falha ao iniciar o BalanceSys:", e);
  process.exit(1);
});
