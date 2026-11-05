// ============================================================================
// CIU — Montagem do servidor HTTP (Express)
// Liga as rotas da controladora, serve a interface estática (cih) e expõe a
// função de criação do app para que os testes a usem sem subir uma porta.
// ============================================================================

import express, { Express } from "express";
import path from "path";
import { Container } from "../../config/container";
import { criarRotasTransacao } from "./CtrlTransacao";

export function criarApp(container: Container): Express {
  const app = express();
  app.use(express.json());

  const listarCategorias = async () =>
    container.prisma.categoria.findMany({ orderBy: { nome: "asc" } });

  app.use("/api", criarRotasTransacao(container.aplTransacao, listarCategorias));

  // Interface humana (cih) — página estática servida da pasta public.
  app.use(express.static(path.resolve(__dirname, "../../../public")));

  return app;
}
