import { Router, Request, Response } from "express";
import { GerenciarMetas, ErroMeta } from "../../application/meta/GerenciarMetas";
import { DomainError } from "../../domain/shared/DomainError";

export function criarRotasMeta(apl: GerenciarMetas): Router {
  const router = Router();
  const erro = (e: unknown, res: Response) => {
    if (e instanceof ErroMeta) { res.status(e.status).json({ erro: e.message }); return; }
    if (e instanceof DomainError) { res.status(422).json({ erro: e.message }); return; }
    console.error("[BalanceSys] erro em metas:", e instanceof Error ? e.name : "erro");
    res.status(500).json({ erro: "Erro interno do servidor." });
  };
  const dados = (req: Request) => {
    if (!req.is("application/json")) throw new DomainError("Envie JSON.");
    const { categoriaId, mes, limite } = req.body ?? {};
    if (typeof categoriaId !== "string" || !categoriaId || typeof mes !== "string" || typeof limite !== "number") throw new DomainError("Informe categoria, mês e limite numérico.");
    return { categoriaId, mes, limite };
  };
  router.get("/metas", async (req, res) => {
    try {
      if (req.query.mes !== undefined && typeof req.query.mes !== "string") throw new DomainError("Mês inválido.");
      res.json(await apl.listar(res.locals.usuarioId, req.query.mes as string | undefined));
    } catch (e) { erro(e, res); }
  });
  router.post("/metas", async (req, res) => {
    try { res.status(201).json(await apl.criar(res.locals.usuarioId, dados(req))); }
    catch (e) { erro(e, res); }
  });
  router.put("/metas/:id", async (req, res) => {
    try { res.json(await apl.alterar(req.params.id, res.locals.usuarioId, dados(req))); }
    catch (e) { erro(e, res); }
  });
  router.delete("/metas/:id", async (req, res) => {
    try { await apl.remover(req.params.id, res.locals.usuarioId); res.status(204).send(); }
    catch (e) { erro(e, res); }
  });
  return router;
}
