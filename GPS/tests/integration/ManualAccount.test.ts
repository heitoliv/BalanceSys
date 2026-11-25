import request from "supertest";
import { randomUUID } from "crypto";
import { PrismaClient } from "@prisma/client";
import { AuthService } from "../../src/application/usuario/AuthService";
import { criarApp } from "../../src/interface/http/server";
import { Container } from "../../src/config/container";
import { redefinirSenhaManual } from "../../src/scripts/resetPasswordManual";

const url = process.env.TEST_DATABASE_URL;
const integration = url ? it : it.skip;
integration("PostgreSQL: nickname, troca de senha e reset administrativo isolado", async () => {
  if (!new URL(url!).pathname.slice(1).startsWith("balancesys_test_")) throw new Error("Banco isolado obrigatório");
  const prisma = new PrismaClient({ datasources: { db: { url } } });
  const app = criarApp({ prisma, auth: new AuthService(prisma) } as Container);
  const a = request.agent(app), b = request.agent(app);
  const aNick = `alice-${randomUUID().slice(0, 8)}`, bNick = `bob-${randomUUID().slice(0, 8)}`;
  const senhaA = "Senha-A1!", senhaB = "Senha-B1!";
  try {
    expect((await a.post("/api/auth/cadastro").send({ nome: "Alice", nickname: aNick, senha: senhaA, confirmarSenha: senhaA })).status).toBe(201);
    expect((await b.post("/api/auth/cadastro").send({ nome: "Bob", nickname: bNick, senha: senhaB, confirmarSenha: senhaB })).status).toBe(201);
    expect((await a.post("/api/auth/login").send({ nickname: aNick, senha: "errada" })).status).toBe(401);
    const la = await a.post("/api/auth/login").send({ nickname: aNick, senha: senhaA });
    const lb = await b.post("/api/auth/login").send({ nickname: bNick, senha: senhaB });
    expect([la.status, lb.status]).toEqual([200, 200]);
    expect((await a.post("/api/auth/alterar-senha").send({ senhaAtual: senhaA, novaSenha: "Nova-A1!", confirmarSenha: "Nova-A1!" })).status).toBe(403);
    expect((await a.post("/api/auth/alterar-senha").set("X-CSRF-Token", la.body.csrf).send({ senhaAtual: senhaA, novaSenha: "Nova-A1!", confirmarSenha: "outra", usuarioId: lb.body.usuario.id })).status).toBe(422);
    expect((await a.post("/api/auth/alterar-senha").set("X-CSRF-Token", la.body.csrf).send({ senhaAtual: senhaA, novaSenha: "Nova-A1!", confirmarSenha: "Nova-A1!", usuarioId: lb.body.usuario.id })).status).toBe(200);
    expect((await a.get("/api/auth/me")).status).toBe(401);
    expect((await b.get("/api/auth/me")).body.usuario.nickname).toBe(bNick);
    expect((await a.post("/api/auth/login").send({ nickname: aNick, senha: senhaA })).status).toBe(401);
    expect((await a.post("/api/auth/login").send({ nickname: aNick, senha: "Nova-A1!" })).status).toBe(200);
    await expect(redefinirSenhaManual(prisma, aNick, "inválida")).rejects.toThrow();
    await redefinirSenhaManual(prisma, aNick, "Admin-A1!");
    expect((await a.get("/api/auth/me")).status).toBe(401);
    expect((await a.post("/api/auth/login").send({ nickname: aNick, senha: "Admin-A1!" })).status).toBe(200);
  } finally {
    const ids = (await prisma.usuario.findMany({ where: { nicknameBusca: { in: [aNick, bNick] } }, select: { id: true } })).map(u => u.id);
    await prisma.transacao.deleteMany({ where: { usuarioId: { in: ids } } });
    await prisma.metaGasto.deleteMany({ where: { usuarioId: { in: ids } } });
    await prisma.sessao.deleteMany({ where: { usuarioId: { in: ids } } });
    await prisma.usuario.deleteMany({ where: { id: { in: ids } } });
    await prisma.$disconnect();
  }
}, 30000);

integration("PostgreSQL: cadastro não gera código nem abre recuperação pública", async () => {
  if (!new URL(url!).pathname.slice(1).startsWith("balancesys_test_")) throw new Error("Banco isolado obrigatório");
  const prisma = new PrismaClient({ datasources: { db: { url } } });
  const app = criarApp({ prisma, auth: new AuthService(prisma) } as Container);
  const nickname = `_semcodigo${randomUUID().slice(0, 8)}`;
  try {
    const cadastro = await request(app).post("/api/auth/cadastro").send({ nome: "Pessoa", nickname, senha: "Senha-A1!", confirmarSenha: "Senha-A1!" });
    expect(cadastro.status).toBe(201);
    expect(cadastro.body).not.toHaveProperty("codigoRecuperacao");
    expect(cadastro.headers["set-cookie"]).toBeUndefined();
    expect((await request(app).post("/api/auth/recuperar-senha").send({ nickname, codigo: "a".repeat(64), senha: "NovaSenha1!" })).status).toBe(404);
    expect((await request(app).post("/api/auth/gerar-codigo-recuperacao").send({ senhaAtual: "Senha-A1!" })).status).toBe(404);
    expect((await request(app).post("/api/auth/login").send({ nickname, senha: "NovaSenha1!" })).status).toBe(401);
    expect((await request(app).post("/api/auth/login").send({ nickname, senha: "Senha-A1!" })).status).toBe(200);
  } finally {
    const user = await prisma.usuario.findUnique({ where: { nicknameBusca: nickname } });
    if (user) { await prisma.sessao.deleteMany({ where: { usuarioId: user.id } }); await prisma.usuario.delete({ where: { id: user.id } }); }
    await prisma.$disconnect();
  }
}, 30000);
