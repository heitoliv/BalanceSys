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

export function criarRotasTransacao(
  apl: AplControlarTransacao,
  listarCategorias: () => Promise<Array<{ id: string; nome: string; tipo: string }>>
): Router {
  const router = Router();

  // POST /api/transacoes — UC03: registrar receita/despesa
  router.post("/transacoes", async (req: Request, res: Response) => {
    try {
      const view = await apl.registrarTransacao(req.body);
      res.status(201).json(view);
    } catch (e) {
      tratarErro(e, res);
    }
  });

  // GET /api/transacoes — UC07: listar/filtrar histórico
  router.get("/transacoes", async (req: Request, res: Response) => {
    try {
      const lista = await apl.listarTransacoes({
        de: req.query.de as string | undefined,
        ate: req.query.ate as string | undefined,
        tipo: req.query.tipo as string | undefined,
        categoriaId: req.query.categoriaId as string | undefined,
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
      });
      res.json(resumo);
    } catch (e) {
      tratarErro(e, res);
    }
  });

  // DELETE /api/transacoes/:id — UC04 (parcial)
  router.delete("/transacoes/:id", async (req: Request, res: Response) => {
    try {
      await apl.removerTransacao(req.params.id);
      res.status(204).send();
    } catch (e) {
      tratarErro(e, res);
    }
  });

  // GET /api/categorias — apoio à interface
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
  if (e instanceof DomainError) {
    res.status(422).json({ erro: e.message, tipo: "regra_de_negocio" });
    return;
  }
  // eslint-disable-next-line no-console
  console.error("[BalanceSys] erro inesperado:", e);
  res.status(500).json({ erro: "Erro interno do servidor.", tipo: "tecnico" });
}
