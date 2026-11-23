import { randomUUID } from "crypto";
import { PrismaClient } from "@prisma/client";
import { AuthService } from "../../src/application/usuario/AuthService";
import { AplControlarTransacao } from "../../src/application/transacao/AplControlarTransacao";
import { PrismaTransacaoRepository } from "../../src/infrastructure/persistence/PrismaTransacaoRepository";

const url = process.env.TEST_DATABASE_URL;
const integration = url ? it : it.skip;

integration("PostgreSQL: cadastro, sessão, transações e saldo isolados", async () => {
  const database = new URL(url!).pathname.slice(1);
  if (!database.startsWith("balancesys_test_")) throw new Error("TEST_DATABASE_URL must name an isolated balancesys_test_* database");
  const prisma = new PrismaClient({ datasources: { db: { url } } });
  const links: string[] = [];
  const auth = new AuthService(prisma, { enviar: async (_to, _subject, body) => { links.push(body.match(/token=([a-f0-9]{64})/)![1]); } }, "http://localhost:3000");
  const apl = new AplControlarTransacao(new PrismaTransacaoRepository(prisma));
  const suffix = randomUUID();
  const emails = [`alice-${suffix}@example.test`, `bob-${suffix}@example.test`];
  const categoryName = `Teste ${suffix}`;
  try {
    const category = await prisma.categoria.create({ data: { nome: categoryName, tipo: "RECEITA" } });
    const alice = await auth.cadastrar({ nome: "Alice", email: emails[0], senha: "Secret-password-123!", confirmarSenha: "Secret-password-123!" });
    const bob = await auth.cadastrar({ nome: "Bob", email: emails[1], senha: "Secret-password-456!", confirmarSenha: "Secret-password-456!" });
    await auth.verificarEmail(links[0]);
    await auth.verificarEmail(links[1]);
    const session = await auth.entrar(emails[0], "Secret-password-123!");
    expect((await auth.autenticar(session.token))?.id).toBe(alice.id);
    const tx = await apl.registrarTransacao({ tipo: "RECEITA", valor: 89.9, descricao: "Teste", data: "2026-11-19T00:00:00.000Z", prioridade: "IMPORTANTE", categoriaId: category.id }, alice.id);
    expect(tx.prioridade).toBeNull();
    expect((await prisma.transacao.findUnique({ where: { id: tx.id } }))?.prioridade).toBe("NAO_APLICA");
    await prisma.transacao.update({ where: { id: tx.id }, data: { prioridade: "ESSENCIAL" } });
    expect((await apl.listarTransacoes({ usuarioId: alice.id }))[0].prioridade).toBeNull();
    expect((await prisma.transacao.findUnique({ where: { id: tx.id } }))?.prioridade).toBe("ESSENCIAL");
    expect((await apl.obterResumo({ usuarioId: alice.id })).saldo).toBe(89.9);
    expect((await apl.obterResumo({ usuarioId: bob.id })).saldo).toBe(0);
    expect(await apl.listarTransacoes({ usuarioId: bob.id })).toEqual([]);
    await expect(apl.removerTransacao(tx.id, bob.id)).rejects.toThrow(/não encontrada/);
    await prisma.sessao.updateMany({ where: { usuarioId: alice.id }, data: { expiraEm: new Date(0) } });
    expect(await auth.autenticar(session.token)).toBeNull();
    await auth.sair(session.token);
    expect(await auth.autenticar(session.token)).toBeNull();
  } finally {
    const ids = (await prisma.usuario.findMany({ where: { email: { in: emails } }, select: { id: true } })).map(r => r.id);
    await prisma.transacao.deleteMany({ where: { usuarioId: { in: ids } } });
    await prisma.sessao.deleteMany({ where: { usuarioId: { in: ids } } });
    await prisma.tokenConta.deleteMany({ where: { usuarioId: { in: ids } } });
    await prisma.usuario.deleteMany({ where: { id: { in: ids } } });
    await prisma.categoria.deleteMany({ where: { nome: categoryName } });
    await prisma.$disconnect();
  }
}, 20000);
