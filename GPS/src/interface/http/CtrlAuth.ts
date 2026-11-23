import { Router, Request, Response } from "express";
import { AuthError, AuthService } from "../../application/usuario/AuthService";

const tentativas = new Map<string, { n: number; ate: number }>();
const pedidos = new Map<string, { n: number; ate: number }>();
const COOKIE = "balancesys_session";
const cookieSeguro = () => process.env.NODE_ENV === "production" ? "; Secure" : "";
const cookie = (token: string, idade: number) => `${COOKIE}=${token}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${idade}${cookieSeguro()}`;

export function tokenDaRequisicao(req: Request): string | undefined {
  const part = (req.headers.cookie ?? "").split(";").map(v => v.trim()).find(v => v.startsWith(`${COOKIE}=`));
  return part?.slice(COOKIE.length + 1);
}

export function origemPermitida(req: Request): boolean {
  const origin = req.get("origin");
  if (!origin) return true;
  try { return new URL(origin).host === req.get("host"); } catch { return false; }
}

function erro(res: Response, e: unknown): void {
  if (e instanceof AuthError) { res.status(e.status).json({ erro: e.message, ...(e.campo ? { campo: e.campo } : {}) }); return; }
  console.error("[BalanceSys] falha de autenticação", e instanceof Error ? e.name : "erro");
  res.status(503).json({ erro: "Serviço indisponível. Tente novamente mais tarde." });
}

function limitar(req: Request, res: Response, acao: string): boolean {
  const chaves = [
    { chave: `${acao}:${req.ip}:${String(req.body?.email ?? "").trim().toLowerCase().slice(0, 254)}`, maximo: 5 },
    { chave: `${acao}:${req.ip}:total`, maximo: 20 },
  ];
  const agora = Date.now();
  for (const item of chaves) {
    const atual = pedidos.get(item.chave);
    if (atual && atual.ate > agora && atual.n >= item.maximo) {
      res.status(429).json({ erro: "Muitas solicitações. Tente novamente mais tarde." });
      return false;
    }
  }
  for (const item of chaves) {
    const atual = pedidos.get(item.chave);
    pedidos.set(item.chave, { n: atual && atual.ate > agora ? atual.n + 1 : 1, ate: agora + 15 * 60 * 1000 });
  }
  return true;
}

export function criarRotasAuth(auth: AuthService): Router {
  const router = Router();
  router.post("/cadastro", async (req, res) => {
    if (!origemPermitida(req)) { res.status(403).json({ erro: "Origem inválida." }); return; }
    if (!req.is("application/json")) { res.status(415).json({ erro: "Envie JSON." }); return; }
    if (!limitar(req, res, "cadastro")) return;
    try { res.status(201).json(await auth.cadastrar(req.body ?? {})); } catch (e) { erro(res, e); }
  });
  router.post("/reenviar-verificacao", async (req, res) => {
    if (!origemPermitida(req)) { res.status(403).json({ erro: "Origem inválida." }); return; }
    if (!req.is("application/json")) { res.status(415).json({ erro: "Envie JSON." }); return; }
    if (!limitar(req, res, "verificacao")) return;
    try { res.json({ mensagem: await auth.solicitarLink(req.body?.email, "VERIFICACAO") }); } catch (e) { erro(res, e); }
  });
  router.post("/verificar", async (req, res) => {
    if (!origemPermitida(req)) { res.status(403).json({ erro: "Origem inválida." }); return; }
    if (!req.is("application/json")) { res.status(415).json({ erro: "Envie JSON." }); return; }
    try { await auth.verificarEmail(req.body?.token); res.json({ mensagem: "E-mail verificado. Agora você pode entrar." }); } catch (e) { erro(res, e); }
  });
  router.post("/solicitar-recuperacao", async (req, res) => {
    if (!origemPermitida(req)) { res.status(403).json({ erro: "Origem inválida." }); return; }
    if (!req.is("application/json")) { res.status(415).json({ erro: "Envie JSON." }); return; }
    if (!limitar(req, res, "recuperacao")) return;
    try { res.json({ mensagem: await auth.solicitarLink(req.body?.email, "RECUPERACAO") }); } catch (e) { erro(res, e); }
  });
  router.post("/redefinir-senha", async (req, res) => {
    if (!origemPermitida(req)) { res.status(403).json({ erro: "Origem inválida." }); return; }
    if (!req.is("application/json")) { res.status(415).json({ erro: "Envie JSON." }); return; }
    try { await auth.redefinirSenha(req.body?.token, req.body?.senha, req.body?.confirmarSenha); res.json({ mensagem: "Senha alterada. Entre novamente." }); } catch (e) { erro(res, e); }
  });
  router.post("/login", async (req, res) => {
    if (!origemPermitida(req)) { res.status(403).json({ erro: "Origem inválida." }); return; }
    if (!req.is("application/json")) { res.status(415).json({ erro: "Envie JSON." }); return; }
    const chave = `${req.ip}:${String(req.body?.email ?? "").toLowerCase().slice(0, 254)}`;
    const atual = tentativas.get(chave);
    if (atual && atual.ate > Date.now() && atual.n >= 5) { res.status(429).json({ erro: "Muitas tentativas. Tente novamente mais tarde." }); return; }
    try {
      const sessao = await auth.entrar(req.body?.email, req.body?.senha);
      tentativas.delete(chave);
      res.setHeader("Set-Cookie", cookie(sessao.token, 12 * 60 * 60));
      res.json({ usuario: sessao.usuario, csrf: sessao.csrf, expiraEm: sessao.expiraEm });
    } catch (e) {
      if (e instanceof AuthError && e.status === 401) tentativas.set(chave, { n: (atual?.ate && atual.ate > Date.now() ? atual.n : 0) + 1, ate: Date.now() + 15 * 60 * 1000 });
      erro(res, e);
    }
  });
  router.get("/me", async (req, res) => {
    try {
      const usuario = await auth.autenticar(tokenDaRequisicao(req));
      if (!usuario) { res.status(401).json({ erro: "Autenticação necessária." }); return; }
      res.json({ usuario: { id: usuario.id, nome: usuario.nome, email: usuario.email, criadoEm: usuario.criadoEm, emailVerificadoEm: usuario.emailVerificadoEm }, csrf: usuario.csrfToken });
    } catch (e) { erro(res, e); }
  });
  router.post("/logout", async (req, res) => {
    if (!origemPermitida(req)) { res.status(403).json({ erro: "Origem inválida." }); return; }
    try {
      const usuario = await auth.autenticar(tokenDaRequisicao(req));
      if (!usuario) { res.status(401).json({ erro: "Autenticação necessária." }); return; }
      if (!auth.verificarCsrf(req.get("x-csrf-token"), usuario.csrfToken)) { res.status(403).json({ erro: "Token CSRF inválido." }); return; }
      await auth.sair(tokenDaRequisicao(req));
      res.setHeader("Set-Cookie", cookie("", 0));
      res.status(204).send();
    } catch (e) { erro(res, e); }
  });
  return router;
}
