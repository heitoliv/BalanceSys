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

integration("PostgreSQL: recuperação por código único, rotação e isolamento", async () => {
  if (!new URL(url!).pathname.slice(1).startsWith("balancesys_test_")) throw new Error("Banco isolado obrigatório");
  const prisma = new PrismaClient({ datasources: { db: { url } } });
  const app = criarApp({ prisma, auth: new AuthService(prisma) } as Container);
  const a = request.agent(app), b = request.agent(app);
  const sufixo = randomUUID().slice(0, 8);
  const nicknameA = `_conta${sufixo}`, nicknameB = `2conta${sufixo}`;
  const senha = "Senha-A1!";
  try {
    const cadastroA = await a.post("/api/auth/cadastro").send({ nome: "Alice", nickname: nicknameA, senha, confirmarSenha: senha });
    const cadastroB = await b.post("/api/auth/cadastro").send({ nome: "Bob", nickname: nicknameB, senha, confirmarSenha: senha });
    expect([cadastroA.status, cadastroB.status]).toEqual([201, 201]);
    expect(cadastroA.headers["cache-control"]).toBe("no-store");
    const codigo = cadastroA.body.codigoRecuperacao;
    expect(codigo).toMatch(/^[a-f0-9]{64}$/);
    const armazenado = await prisma.usuario.findUnique({ where: { nicknameBusca: nicknameA } });
    expect(armazenado?.recuperacaoHash).not.toBe(codigo);
    const loginA = await a.post("/api/auth/login").send({ nickname: nicknameA.toUpperCase(), senha });
    const loginB = await b.post("/api/auth/login").send({ nickname: nicknameB, senha });
    expect([loginA.status, loginB.status]).toEqual([200, 200]);
    const rota = "/api/auth/recuperar-senha";
    const body = { nickname: nicknameA, codigo, senha: "NovaSenha1!", confirmarSenha: "NovaSenha1!" };
    expect((await request(app).post(rota).send({ ...body, codigo: cadastroB.body.codigoRecuperacao })).status).toBe(401);
    expect((await request(app).post(rota).send({ ...body, nickname: `nunca${sufixo}` })).status).toBe(401);
    expect((await request(app).post(rota).send({ ...body, confirmarSenha: "diferente" })).status).toBe(422);
    const recuperacao = await request(app).post(rota).send(body);
    expect(recuperacao.status).toBe(200);
    expect(recuperacao.headers["cache-control"]).toBe("no-store");
    expect(recuperacao.body.codigoRecuperacao).toMatch(/^[a-f0-9]{64}$/);
    expect(recuperacao.body.codigoRecuperacao).not.toBe(codigo);
    expect((await a.get("/api/auth/me")).status).toBe(401);
    expect((await b.get("/api/auth/me")).status).toBe(200);
    expect((await request(app).post(rota).send(body)).status).toBe(401);
    expect((await a.post("/api/auth/login").send({ nickname: nicknameA, senha })).status).toBe(401);
    const novoLogin = await a.post("/api/auth/login").send({ nickname: nicknameA, senha: "NovaSenha1!" });
    expect(novoLogin.status).toBe(200);
    expect((await a.post("/api/auth/gerar-codigo-recuperacao").send({ senhaAtual: "NovaSenha1!" })).status).toBe(403);
    expect((await a.post("/api/auth/gerar-codigo-recuperacao").set("X-CSRF-Token", novoLogin.body.csrf).send({ senhaAtual: "errada" })).status).toBe(401);
    const gerado = await a.post("/api/auth/gerar-codigo-recuperacao").set("X-CSRF-Token", novoLogin.body.csrf).send({ senhaAtual: "NovaSenha1!" });
    expect(gerado.status).toBe(200);
    expect((await request(app).post(rota).send({ ...body, codigo: recuperacao.body.codigoRecuperacao, senha: "OutraSenha1!", confirmarSenha: "OutraSenha1!" })).status).toBe(401);
    expect((await request(app).post(rota).send({ ...body, codigo: gerado.body.codigoRecuperacao, senha: "OutraSenha1!", confirmarSenha: "OutraSenha1!" })).status).toBe(200);
  } finally {
    const ids = (await prisma.usuario.findMany({ where: { nicknameBusca: { in: [nicknameA, nicknameB] } }, select: { id: true } })).map(u => u.id);
    await prisma.sessao.deleteMany({ where: { usuarioId: { in: ids } } });
    await prisma.usuario.deleteMany({ where: { id: { in: ids } } });
    await prisma.$disconnect();
  }
}, 30000);
