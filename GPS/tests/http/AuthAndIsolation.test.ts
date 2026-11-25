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
  const prisma = {
    usuario: {
      create: async ({ data }: any) => {
        if (users.has(data.nicknameBusca)) throw { code: "P2002" };
        const row = { ...data, id: `user-${users.size + 1}`, criadoEm: new Date() };
        users.set(data.nicknameBusca, row); return row;
      },
      findUnique: async ({ where }: any) => where.nicknameBusca ? users.get(where.nicknameBusca) ?? null : [...users.values()].find(u => u.id === where.id) ?? null,
      update: async ({ where, data }: any) => {
        const row = [...users.values()].find(u => u.id === where.id);
        if (data.nicknameBusca && users.has(data.nicknameBusca) && users.get(data.nicknameBusca).id !== where.id) throw { code: "P2002" };
        users.delete(row.nicknameBusca); Object.assign(row, data); users.set(row.nicknameBusca, row); return row;
      },
    },
    sessao: {
      create: async ({ data }: any) => { const row = { ...data, id: `session-${sessions.size + 1}` }; sessions.set(data.tokenHash, row); return row; },
      findUnique: async ({ where }: any) => { const row = sessions.get(where.tokenHash); return row ? { ...row, usuario: [...users.values()].find(u => u.id === row.usuarioId) } : null; },
      deleteMany: async ({ where }: any) => { for (const [key, value] of sessions) if (where.tokenHash === key || where.usuarioId === value.usuarioId) sessions.delete(key); },
    },
    $transaction: async (fn: any) => fn(prisma),
    categoria: { findMany: async () => [{ id: "cat-renda", nome: "Renda", tipo: "RECEITA" }, { id: "cat-mercado", nome: "Mercado", tipo: "DESPESA" }] },
  } as unknown as PrismaClient;
  const container = { prisma, auth: new AuthService(prisma), aplTransacao: new AplControlarTransacao(new InMemoryTransacaoRepository()) } as Container;
  return { app: criarApp(container) };
}
const senha = "Secret-password-123!";
const receita = { tipo: "RECEITA", valor: 10.25, descricao: "Venda", data: "2026-11-19T12:00:00.000Z", categoriaId: "cat-renda" };

it("nickname único sem distinção de caixa, sessão e isolamento de transações", async () => {
  const { app } = fixture(); const a = request.agent(app), b = request.agent(app);
  expect((await a.post("/api/auth/cadastro").send({ nome: "Alice", nickname: "Alice_01", senha, confirmarSenha: senha })).status).toBe(201);
  expect((await b.post("/api/auth/cadastro").send({ nome: "Outra", nickname: "alice_01", senha, confirmarSenha: senha })).status).toBe(409);
  expect((await b.post("/api/auth/cadastro").send({ nome: "Bob", nickname: "Bob_02", senha, confirmarSenha: senha })).status).toBe(201);
  expect((await a.get("/api/auth/me")).status).toBe(401);
  const la = await a.post("/api/auth/login").send({ nickname: "ALICE_01", senha });
  const lb = await b.post("/api/auth/login").send({ nickname: "bob_02", senha });
  expect([la.status, lb.status]).toEqual([200, 200]);
  expect(la.headers["set-cookie"][0]).toContain("HttpOnly");
  const tx = await a.post("/api/transacoes").set("X-CSRF-Token", la.body.csrf).send({ ...receita, usuarioId: lb.body.usuario.id });
  expect(tx.status).toBe(201); expect(tx.body.usuarioId).toBe(la.body.usuario.id);
  expect((await b.get("/api/transacoes")).body).toEqual([]);
  expect((await b.delete(`/api/transacoes/${tx.body.id}`).set("X-CSRF-Token", lb.body.csrf)).status).toBe(404);
  expect((await a.post("/api/auth/logout").set("X-CSRF-Token", la.body.csrf)).status).toBe(204);
  expect((await a.get("/api/transacoes")).status).toBe(401);
});
it("valida nickname, senha e confirmação e impede alteração de outra conta", async () => {
  const { app } = fixture(); const a = request.agent(app), b = request.agent(app);
  for (const nickname of ["ab", ".alice", "alice@host", "admin", "álice"]) {
    expect((await a.post("/api/auth/cadastro").send({ nome: "Alice", nickname, senha, confirmarSenha: senha })).status).toBe(422);
  }
  expect((await a.post("/api/auth/cadastro").send({ nome: "Alice", nickname: "Alice_01", senha: "abcdef", confirmarSenha: "abcdef" })).status).toBe(422);
  expect((await a.post("/api/auth/cadastro").send({ nome: "Alice", nickname: "Alice_01", senha, confirmarSenha: "outra" })).body.campo).toBe("confirmarSenha");
  expect((await a.post("/api/auth/cadastro").send({ nome: "Um", nickname: "1alice", senha, confirmarSenha: senha })).status).toBe(201);
  expect((await a.post("/api/auth/cadastro").send({ nome: "Dois", nickname: "_alice", senha, confirmarSenha: senha })).status).toBe(201);
  await a.post("/api/auth/cadastro").send({ nome: "Alice", nickname: "Alice_01", senha, confirmarSenha: senha });
  await b.post("/api/auth/cadastro").send({ nome: "Bob", nickname: "Bob_02", senha, confirmarSenha: senha });
  expect((await a.post("/api/auth/login").send({ nickname: "alice_01", senha: "errada" })).status).toBe(401);
  const la = await a.post("/api/auth/login").send({ nickname: "alice_01", senha });
  const lb = await b.post("/api/auth/login").send({ nickname: "bob_02", senha });
  expect((await a.post("/api/auth/alterar-nickname").set("X-CSRF-Token", la.body.csrf).send({ nickname: "bob_02", senhaAtual: senha })).status).toBe(409);
  expect((await a.post("/api/auth/alterar-nickname").set("X-CSRF-Token", la.body.csrf).send({ nickname: "NovaAlice", senhaAtual: "errada", usuarioId: lb.body.usuario.id })).status).toBe(401);
  expect((await a.post("/api/auth/alterar-nickname").set("X-CSRF-Token", la.body.csrf).send({ nickname: "NovaAlice", senhaAtual: senha, usuarioId: lb.body.usuario.id })).status).toBe(200);
  expect((await a.get("/api/auth/me")).body.usuario.nickname).toBe("NovaAlice");
  expect((await b.get("/api/auth/me")).body.usuario.nickname).toBe("Bob_02");
});
