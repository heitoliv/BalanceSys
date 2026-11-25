// ============================================================================
// CIU/cci — CtrlTransacao (controladora de interação)
// ----------------------------------------------------------------------------
// Traduz requisições HTTP em chamadas à gerência de tarefas (cgt) e devolve
// respostas. Não contém regra de negócio: só adapta protocolo ↔ aplicação.
// Erros de domínio (DomainError) viram 422; o resto, 500.
// ============================================================================

import { Router, Request, Response } from "express";
import { AplControlarTransacao } from "../../application/transacao/AplControlarTransacao";
import { DomainError } from "../../domain/shared/DomainError";
import { isTipoTransacao } from "../../domain/shared/enums";
import { intervaloPeriodo } from "../../domain/transacao/Periodo";
import { TransacaoMutacaoError } from "../../domain/transacao/PrazoAlteracao";

export function criarRotasTransacao(
  apl: AplControlarTransacao,
  listarCategorias: () => Promise<Array<{ id: string; nome: string; tipo: string }>>
): Router {
  const router = Router();

  // POST /api/transacoes — UC03: registrar receita/despesa
  router.post("/transacoes", async (req: Request, res: Response) => {
    try {
      if (!req.is("application/json")) { res.status(415).json({ erro: "Envie JSON." }); return; }
      if (!req.body || typeof req.body !== "object") throw new DomainError("Dados de transação inválidos.");
      const categoria = (await listarCategorias()).find(c => c.id === req.body.categoriaId);
      if (!categoria || (categoria.tipo !== "AMBOS" && categoria.tipo !== req.body.tipo)) throw new DomainError("Categoria incompatível ou inexistente.");
      const view = await apl.registrarTransacao(req.body, res.locals.usuarioId);
      res.status(201).json(view);
    } catch (e) {
      tratarErro(e, res);
    }
  });

  // GET /api/transacoes — UC07: listar/filtrar histórico
  router.get("/transacoes", async (req: Request, res: Response) => {
    try {
      if (req.query.tipo && !isTipoTransacao(req.query.tipo)) throw new DomainError("Tipo de filtro inválido.");
      const periodo = req.query.periodicidade ? intervaloPeriodo(String(req.query.periodicidade), req.query.referencia as string | undefined) : null;
      const lista = await apl.listarTransacoes({
        de: periodo?.inicio.toISOString() ?? req.query.de as string | undefined,
        ate: req.query.ate as string | undefined,
        antesDe: periodo?.fimExclusivo.toISOString() ?? req.query.antesDe as string | undefined,
        tipo: req.query.tipo as string | undefined,
        categoriaId: req.query.categoriaId as string | undefined,
        usuarioId: res.locals.usuarioId,
      });
      res.json(lista);
    } catch (e) {
      tratarErro(e, res);
    }
  });

  // GET /api/resumo — UC08/RF02: saldo consolidado
  router.get("/resumo", async (req: Request, res: Response) => {
    try {
      const resumo = await apl.obterResumo({
        de: req.query.de as string | undefined,
        ate: req.query.ate as string | undefined,
        periodicidade: req.query.periodicidade as string | undefined,
        referencia: req.query.referencia as string | undefined,
        usuarioId: res.locals.usuarioId,
      });
      res.json(resumo);
    } catch (e) {
      tratarErro(e, res);
    }
  });

  // DELETE /api/transacoes/:id — UC04 (parcial)
  router.put("/transacoes/:id", async (req: Request, res: Response) => {
    try {
      if (!req.is("application/json")) { res.status(415).json({ erro: "Envie JSON." }); return; }
      if (!req.body || typeof req.body !== "object") throw new DomainError("Dados de transação inválidos.");
      const categoria = (await listarCategorias()).find(c => c.id === req.body.categoriaId);
      if (!categoria || (categoria.tipo !== "AMBOS" && categoria.tipo !== req.body.tipo)) throw new DomainError("Categoria incompatível ou inexistente.");
      res.json(await apl.editarTransacao(req.params.id, req.body, res.locals.usuarioId));
    } catch (e) { tratarErro(e, res); }
  });

  router.delete("/transacoes/:id", async (req: Request, res: Response) => {
    try {
      await apl.removerTransacao(req.params.id, res.locals.usuarioId);
      res.status(204).send();
    } catch (e) {
      tratarErro(e, res);
    }
  });

  // GET /api/categorias — apoio à interface
  router.get("/categorias/historico", async (req: Request, res: Response) => {
    try {
      if (req.query.tipo && !isTipoTransacao(req.query.tipo)) throw new DomainError("Tipo de filtro inválido.");
      const periodo = req.query.periodicidade ? intervaloPeriodo(String(req.query.periodicidade), req.query.referencia as string | undefined) : null;
      const transacoes = await apl.listarTransacoes({
        usuarioId: res.locals.usuarioId,
        tipo: req.query.tipo as string | undefined,
        de: periodo?.inicio.toISOString() ?? req.query.de as string | undefined,
        antesDe: periodo?.fimExclusivo.toISOString() ?? req.query.antesDe as string | undefined,
      });
      const usadas = new Set(transacoes.map(t => t.categoriaId));
      res.json((await listarCategorias()).filter(c => usadas.has(c.id)));
    } catch (e) { tratarErro(e, res); }
  });
  router.get("/categorias", async (_req: Request, res: Response) => {
    try {
      res.json(await listarCategorias());
    } catch (e) {
      tratarErro(e, res);
    }
  });

  return router;
}

function tratarErro(e: unknown, res: Response): void {
  if (e instanceof TransacaoMutacaoError) { res.status(e.status).json({ erro: e.message }); return; }
  if (e instanceof DomainError) {
    res.status(422).json({ erro: e.message, tipo: "regra_de_negocio" });
    return;
  }
  // eslint-disable-next-line no-console
  console.error("[BalanceSys] erro inesperado:", e instanceof Error ? e.name : "erro");
  res.status(500).json({ erro: "Erro interno do servidor.", tipo: "tecnico" });
}
