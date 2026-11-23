import request from "supertest";
import { PrismaClient } from "@prisma/client";
import { criarApp } from "../../src/interface/http/server";
import { AuthService } from "../../src/application/usuario/AuthService";
import { AplControlarTransacao } from "../../src/application/transacao/AplControlarTransacao";
import { InMemoryTransacaoRepository } from "../InMemoryTransacaoRepository";
import { Container } from "../../src/config/container";

function fixture() {
  const users = new Map<string, any>();
  const sessions = new Map<string, any>();
  const tokens = new Map<string, any>();
  const links: string[] = [];
  const prisma = {
    usuario: {
      create: async ({ data }: any) => {
        if (users.has(data.emailBusca)) throw { code: "P2002" };
        const row = { ...data, id: `user-${users.size + 1}` };
        users.set(data.emailBusca, row);
        return row;
      },
      findUnique: async ({ where }: any) => users.get(where.emailBusca) ?? null,
      update: async ({ where, data }: any) => { const row = [...users.values()].find(u => u.id === where.id); Object.assign(row, data); return row; },
    },
    sessao: {
      create: async ({ data }: any) => {
        const row = { ...data, id: `session-${sessions.size + 1}` };
        sessions.set(data.tokenHash, row);
        return row;
      },
      findUnique: async ({ where }: any) => {
        const row = sessions.get(where.tokenHash);
        if (!row) return null;
        return { ...row, usuario: [...users.values()].find(u => u.id === row.usuarioId) };
      },
      deleteMany: async ({ where }: any) => { for (const [key, value] of sessions) if (where.tokenHash === key || where.usuarioId === value.usuarioId) sessions.delete(key); },
    },
    tokenConta: {
      create: async ({ data }: any) => { const row = { ...data, id: `token-${tokens.size + 1}`, usadoEm: null, criadoEm: new Date() }; tokens.set(data.tokenHash, row); return row; },
      findUnique: async ({ where }: any) => tokens.get(where.tokenHash) ?? null,
      findFirst: async ({ where }: any) => [...tokens.values()].find(t => t.usuarioId === where.usuarioId && t.tipo === where.tipo && !t.usadoEm && t.criadoEm >= where.criadoEm.gte) ?? null,
      updateMany: async ({ where, data }: any) => { const rows = [...tokens.values()].filter(t => where.id ? t.id === where.id && !t.usadoEm && t.expiraEm > where.expiraEm.gt : t.usuarioId === where.usuarioId && t.tipo === where.tipo && !t.usadoEm); rows.forEach(row => Object.assign(row, data)); return { count: rows.length }; },
      delete: async ({ where }: any) => { const row = [...tokens.values()].find(t => t.id === where.id); if (row) tokens.delete(row.tokenHash); },
    },
    $transaction: async (fn: any) => fn(prisma),
    categoria: { findMany: async () => [{ id: "cat-renda", nome: "Renda", tipo: "RECEITA" }, { id: "cat-mercado", nome: "Mercado", tipo: "DESPESA" }] },
  } as unknown as PrismaClient;
  const entrega = { enviar: async (_to: string, _subject: string, body: string) => { links.push(body.match(/token=([a-f0-9]{64})/)![1]); } };
  const container = { prisma, auth: new AuthService(prisma, entrega, "http://localhost:3000"), aplTransacao: new AplControlarTransacao(new InMemoryTransacaoRepository()) } as Container;
  return { app: criarApp(container), links, tokens, users };
}

const receita = { tipo: "RECEITA", valor: 10.25, descricao: "Venda", data: "2026-11-19T12:00:00.000Z", prioridade: "IMPORTANTE", categoriaId: "cat-renda" };

describe("HTTP: cadastro, sessão, autorização e PBIs 03/04/05/11", () => {
  it("isola duas contas, bloqueia identidade enviada pelo cliente e revoga logout", async () => {
    const { app, links } = fixture();
    const alice = request.agent(app);
    const bob = request.agent(app);
    expect((await request(app).get("/api/resumo")).status).toBe(401);
    expect((await alice.post("/api/auth/cadastro").send({ nome: "Alice", email: "alice@example.test", senha: "Secret-password-123!", confirmarSenha: "Secret-password-123!" })).status).toBe(201);
    expect((await bob.post("/api/auth/cadastro").send({ nome: "Bob", email: "bob@example.test", senha: "Secret-password-456!", confirmarSenha: "Secret-password-456!" })).status).toBe(201);
    expect((await bob.post("/api/auth/cadastro").send({ nome: "Bob", email: "alice@example.test", senha: "Secret-password-456!", confirmarSenha: "Secret-password-456!" })).status).toBe(409);
    expect((await alice.post("/api/auth/login").send({ email: "alice@example.test", senha: "Secret-password-123!" })).status).toBe(403);
    await alice.post("/api/auth/verificar").send({ token: links[0] });
    await bob.post("/api/auth/verificar").send({ token: links[1] });
    const aLogin = await alice.post("/api/auth/login").send({ email: "alice@example.test", senha: "Secret-password-123!" });
    const bLogin = await bob.post("/api/auth/login").send({ email: "bob@example.test", senha: "Secret-password-456!" });
    expect(aLogin.status).toBe(200);
    expect(bLogin.status).toBe(200);
    expect(aLogin.headers["set-cookie"][0]).toContain("HttpOnly");
    expect(aLogin.headers["set-cookie"][0]).toContain("SameSite=Lax");
    expect(aLogin.headers["set-cookie"][0]).not.toContain("Secure");
    expect((await alice.post("/api/transacoes").send(receita)).status).toBe(403);
    const created = await alice.post("/api/transacoes").set("X-CSRF-Token", aLogin.body.csrf).send({ ...receita, usuarioId: bLogin.body.usuario.id });
    expect(created.status).toBe(201);
    expect(created.body.usuarioId).toBe(aLogin.body.usuario.id);
    expect(created.body.prioridade).toBeNull();
    expect((await alice.get("/api/auth/me")).body.usuario.email).toBe("alice@example.test");
    expect((await bob.get("/api/auth/me")).body.usuario.email).toBe("bob@example.test");
    expect((await bob.get("/api/transacoes")).body).toEqual([]);
    expect((await bob.get("/api/categorias/historico")).body).toEqual([]);
    expect((await alice.get("/api/categorias/historico")).body.map((c: any) => c.id)).toEqual(["cat-renda"]);
    expect((await bob.get("/api/resumo")).body.saldo).toBe(0);
    expect((await bob.delete(`/api/transacoes/${created.body.id}`).set("X-CSRF-Token", bLogin.body.csrf)).status).toBe(404);
    expect((await bob.put(`/api/transacoes/${created.body.id}`).set("X-CSRF-Token", bLogin.body.csrf).send(receita)).status).toBe(404);
    expect((await alice.get("/api/resumo")).body.saldo).toBe(10.25);
    expect((await alice.post("/api/auth/logout").set("X-CSRF-Token", aLogin.body.csrf)).status).toBe(204);
    expect((await alice.get("/api/transacoes")).status).toBe(401);
  });

  it("rejeita categoria incompatível e valor com fração de centavo", async () => {
    const { app, links } = fixture();
    const agent = request.agent(app);
    await agent.post("/api/auth/cadastro").send({ nome: "Pessoa", email: "pessoa@example.test", senha: "Secret-password-123!", confirmarSenha: "Secret-password-123!" });
    await agent.post("/api/auth/verificar").send({ token: links[0] });
    const login = await agent.post("/api/auth/login").send({ email: "pessoa@example.test", senha: "Secret-password-123!" });
    const token = login.body.csrf;
    expect((await agent.post("/api/transacoes").set("X-CSRF-Token", token).send({ ...receita, categoriaId: "cat-mercado" })).status).toBe(422);
    expect((await agent.post("/api/transacoes").set("X-CSRF-Token", token).send({ ...receita, valor: 1.001 })).status).toBe(422);
    expect((await agent.post("/api/transacoes").set("X-CSRF-Token", token).send({ ...receita, prioridade: undefined })).status).toBe(201);
    expect((await agent.post("/api/transacoes").set("X-CSRF-Token", token).send({ ...receita, tipo: "DESPESA", categoriaId: "cat-mercado", prioridade: undefined })).status).toBe(422);
  });

  it("marca o cookie como Secure em produção", async () => {
    const anterior = process.env.NODE_ENV;
    process.env.NODE_ENV = "production";
    try {
      const { app, links } = fixture();
      await request(app).post("/api/auth/cadastro").send({ nome: "Pessoa", email: "secure@example.test", senha: "Secret-password-123!", confirmarSenha: "Secret-password-123!" });
      await request(app).post("/api/auth/verificar").send({ token: links[0] });
      const login = await request(app).post("/api/auth/login").send({ email: "secure@example.test", senha: "Secret-password-123!" });
      expect(login.headers["set-cookie"][0]).toContain("Secure");
    } finally {
      if (anterior === undefined) delete process.env.NODE_ENV;
      else process.env.NODE_ENV = anterior;
    }
  });

  it("valida composição, confirmação, duplicidade e não cria sessão no cadastro", async () => {
    const { app, links } = fixture();
    const agent = request.agent(app);
    expect((await agent.post("/api/auth/cadastro").send({ nome: "Ana", email: "ana@example.test", senha: "abcdef", confirmarSenha: "abcdef" })).status).toBe(422);
    expect((await agent.post("/api/auth/cadastro").send({ nome: "Ana", email: "ana@example.test", senha: "Abcdef1!", confirmarSenha: "diferente" })).body.campo).toBe("confirmarSenha");
    const criado = await agent.post("/api/auth/cadastro").send({ nome: "Ana", email: "Ana@Example.Test", senha: "Abcdef1!", confirmarSenha: "Abcdef1!" });
    expect(criado.status).toBe(201);
    expect(criado.headers["set-cookie"]).toBeUndefined();
    expect((await agent.get("/api/auth/me")).status).toBe(401);
    expect((await agent.post("/api/auth/cadastro").send({ nome: "Ana", email: "ana@example.test", senha: "Abcdef1!", confirmarSenha: "Abcdef1!" })).body.erro).toMatch(/Já existe/);
    expect((await agent.post("/api/auth/login").send({ email: "Ana@Example.Test", senha: "Abcdef1!" })).status).toBe(403);
    expect((await agent.post("/api/auth/verificar").send({ token: links[0] })).status).toBe(200);
    expect((await agent.post("/api/auth/verificar").send({ token: links[0] })).status).toBe(409);
    expect((await agent.post("/api/auth/login").send({ email: "ana@example.test", senha: "errada" })).body.erro).toBe("E-mail ou senha incorretos. Confira os dados ou recupere sua senha.");
  });

  it("recupera senha com link único, invalida sessões e não revela e-mail inexistente", async () => {
    const { app, links, tokens } = fixture();
    const agent = request.agent(app);
    await agent.post("/api/auth/cadastro").send({ nome: "Ana", email: "reset@example.test", senha: "Abcdef1!", confirmarSenha: "Abcdef1!" });
    await agent.post("/api/auth/verificar").send({ token: links[0] });
    const login = await agent.post("/api/auth/login").send({ email: "reset@example.test", senha: "Abcdef1!" });
    expect(login.status).toBe(200);
    const desconhecido = await agent.post("/api/auth/solicitar-recuperacao").send({ email: "nunca@example.test" });
    const conhecido = await agent.post("/api/auth/solicitar-recuperacao").send({ email: "reset@example.test" });
    expect(desconhecido.body).toEqual(conhecido.body);
    const token = links[1];
    expect((await agent.post("/api/auth/redefinir-senha").send({ token, senha: "NovaSenha1!", confirmarSenha: "outra" })).status).toBe(422);
    expect((await agent.post("/api/auth/redefinir-senha").send({ token, senha: "NovaSenha1!", confirmarSenha: "NovaSenha1!" })).status).toBe(200);
    expect((await agent.get("/api/auth/me")).status).toBe(401);
    expect((await agent.post("/api/auth/redefinir-senha").send({ token, senha: "OutraSenha1!", confirmarSenha: "OutraSenha1!" })).status).toBe(409);
    expect((await agent.post("/api/auth/login").send({ email: "reset@example.test", senha: "Abcdef1!" })).status).toBe(401);
    expect((await agent.post("/api/auth/login").send({ email: "reset@example.test", senha: "NovaSenha1!" })).status).toBe(200);
    const pedido = await agent.post("/api/auth/solicitar-recuperacao").send({ email: "reset@example.test" });
    expect(pedido.status).toBe(200);
    const hash = [...tokens.keys()].slice(-1)[0];
    tokens.get(hash).expiraEm = new Date(0);
    expect((await agent.post("/api/auth/redefinir-senha").send({ token: links[2], senha: "OutraSenha1!", confirmarSenha: "OutraSenha1!" })).status).toBe(410);
  });

  it("reenvio controlado invalida o link de verificação anterior", async () => {
    const { app, links, tokens } = fixture();
    const agent = request.agent(app);
    await agent.post("/api/auth/cadastro").send({ nome: "Ana", email: "reenviar@example.test", senha: "Abcdef1!", confirmarSenha: "Abcdef1!" });
    const primeiro = [...tokens.values()][0];
    primeiro.criadoEm = new Date(0);
    expect((await agent.post("/api/auth/reenviar-verificacao").send({ email: "reenviar@example.test" })).status).toBe(200);
    expect(links).toHaveLength(2);
    expect((await agent.post("/api/auth/verificar").send({ token: links[0] })).status).toBe(409);
    expect((await agent.post("/api/auth/verificar").send({ token: links[1] })).status).toBe(200);
  });
});
