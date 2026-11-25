// ============================================================================
// CIU — Montagem do servidor HTTP (Express)
// Liga as rotas da controladora, serve a interface estática (cih) e expõe a
// função de criação do app para que os testes a usem sem subir uma porta.
// ============================================================================

import express, { Express } from "express";
import path from "path";
import { Container } from "../../config/container";
import { criarRotasTransacao } from "./CtrlTransacao";
import { criarRotasAuth, tokenDaRequisicao, origemPermitida } from "./CtrlAuth";
import { criarRotasMeta } from "./CtrlMeta";

export function criarApp(container: Container): Express {
  const app = express();
  if (process.env.TRUST_PROXY === "1") app.set("trust proxy", 1);
  app.disable("x-powered-by");
  app.use((_req, res, next) => { res.setHeader("Referrer-Policy", "no-referrer"); next(); });
  app.use(express.json({ limit: "16kb" }));
  app.get("/health", async (_req, res) => {
    try { await container.prisma.$queryRaw`SELECT 1`; res.json({ status: "ok" }); }
    catch { res.status(503).json({ status: "unavailable" }); }
  });
  app.use("/api/auth", criarRotasAuth(container.auth));

  const listarCategorias = async () =>
    container.prisma.categoria.findMany({ orderBy: { nome: "asc" } });

  app.use("/api", async (req, res, next) => {
    try {
      const usuario = await container.auth.autenticar(tokenDaRequisicao(req));
      if (!usuario) { res.status(401).json({ erro: "Autenticação necessária." }); return; }
      if (!["GET", "HEAD", "OPTIONS"].includes(req.method) && (!origemPermitida(req) || !container.auth.verificarCsrf(req.get("x-csrf-token"), usuario.csrfToken))) {
        res.status(403).json({ erro: "Requisição não autorizada." }); return;
      }
      res.locals.usuarioId = usuario.id;
      next();
    } catch (e) { next(e); }
  }, criarRotasTransacao(container.aplTransacao, listarCategorias), criarRotasMeta(container.metas));

  // Interface humana (cih) — página estática servida da pasta public.
  app.use(express.static(path.resolve(__dirname, "../../../public")));

  app.use((error: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    const status = typeof error === "object" && error !== null && "status" in error ? error.status : undefined;
    if (status === 400 || status === 413) { res.status(status).json({ erro: "Corpo da requisição inválido." }); return; }
    console.error("[BalanceSys] falha HTTP:", error instanceof Error ? error.name : "erro");
    res.status(500).json({ erro: "Erro interno do servidor." });
  });

  return app;
}
