import { PrismaClient } from "@prisma/client";
import { randomBytes, scrypt as scryptCallback, timingSafeEqual, createHash } from "crypto";
import { promisify } from "util";
import { EntregaEmail } from "./EntregaEmail";
import { REQUISITOS_SENHA, senhaValida, validarEmail } from "../../domain/usuario/PoliticaConta";

const scrypt = promisify(scryptCallback);
const VIDA_SESSAO_MS = 12 * 60 * 60 * 1000;
const VIDA_LINK_MS = 30 * 60 * 1000;
const INTERVALO_REENVIO_MS = 2 * 60 * 1000;
const hashToken = (value: string) => createHash("sha256").update(value).digest("hex");
type TipoLink = "VERIFICACAO" | "RECUPERACAO";
const RESPOSTA_LINK = "Se o endereço estiver apto, enviaremos um link. Confira seu e-mail.";

export async function gerarSenhaHash(senha: string): Promise<string> {
  if (!senhaValida(senha)) throw new AuthError(REQUISITOS_SENHA, 422, "senha");
  const salt = randomBytes(16).toString("hex");
  const hash = (await scrypt(senha, salt, 64) as Buffer).toString("hex");
  return `scrypt:${salt}:${hash}`;
}

export class AuthError extends Error {
  constructor(message: string, readonly status: number, readonly campo?: string) { super(message); }
}

export class AuthService {
  constructor(private readonly prisma: PrismaClient, private readonly entrega: EntregaEmail, private readonly baseUrl: string) {}

  async cadastrar(input: { nome: unknown; email: unknown; senha: unknown; confirmarSenha?: unknown }) {
    const nome = typeof input.nome === "string" ? input.nome.trim() : "";
    const dadosEmail = validarEmail(input.email);
    const senha = input.senha;
    if (nome.length < 2 || nome.length > 100) throw new AuthError("Informe um nome de 2 a 100 caracteres.", 422, "nome");
    if (!dadosEmail) throw new AuthError("Informe um e-mail válido.", 422, "email");
    if (!senhaValida(senha)) throw new AuthError(REQUISITOS_SENHA, 422, "senha");
    if (input.confirmarSenha !== senha) throw new AuthError("As senhas não coincidem.", 422, "confirmarSenha");
    const senhaHash = await gerarSenhaHash(senha);
    try {
      const usuario = await this.prisma.usuario.create({ data: { nome, email: dadosEmail.email, emailBusca: dadosEmail.emailBusca, senhaHash } });
      await this.emitirLink(usuario.id, usuario.email, "VERIFICACAO");
      return { id: usuario.id, nome: usuario.nome, email: usuario.email, mensagem: "Conta criada. Verifique seu e-mail antes de entrar." };
    } catch (error) {
      if (typeof error === "object" && error !== null && "code" in error && error.code === "P2002") {
        throw new AuthError("Já existe uma conta cadastrada com este e-mail.", 409, "email");
      }
      throw error;
    }
  }

  async entrar(emailInput: unknown, senhaInput: unknown) {
    if (typeof emailInput !== "string" || !emailInput.trim()) throw new AuthError("Informe o e-mail.", 422, "email");
    const dadosEmail = validarEmail(emailInput);
    if (!dadosEmail) throw new AuthError("Informe um e-mail válido.", 422, "email");
    if (typeof senhaInput !== "string" || !senhaInput) throw new AuthError("Informe a senha.", 422, "senha");
    const senha = senhaInput;
    const usuario = await this.prisma.usuario.findUnique({ where: { emailBusca: dadosEmail.emailBusca } });
    const partes = usuario?.senhaHash?.split(":");
    const salt = partes?.length === 3 && partes[0] === "scrypt" ? partes[1] : "00000000000000000000000000000000";
    const calculado = await scrypt(senha.slice(0, 128), salt, 64) as Buffer;
    const esperado = partes?.length === 3 && /^[a-f0-9]{128}$/.test(partes[2]) ? Buffer.from(partes[2], "hex") : Buffer.alloc(64);
    if (!usuario || !partes || senha.length > 128 || !timingSafeEqual(calculado, esperado)) throw new AuthError("E-mail ou senha incorretos. Confira os dados ou recupere sua senha.", 401);
    if (!usuario.emailVerificadoEm) throw new AuthError("Conta ainda não verificada. Use o link enviado ao seu e-mail ou solicite outro.", 403);
    const token = randomBytes(32).toString("hex");
    const csrf = randomBytes(32).toString("hex");
    const sessao = await this.prisma.sessao.create({ data: {
      tokenHash: hashToken(token), csrfToken: csrf, usuarioId: usuario.id,
      expiraEm: new Date(Date.now() + VIDA_SESSAO_MS),
    } });
    return { token, csrf, expiraEm: sessao.expiraEm, usuario: { id: usuario.id, nome: usuario.nome, email: usuario.email } };
  }

  async solicitarLink(emailInput: unknown, tipo: TipoLink): Promise<string> {
    const dadosEmail = validarEmail(emailInput);
    if (!dadosEmail) return RESPOSTA_LINK;
    const usuario = await this.prisma.usuario.findUnique({ where: { emailBusca: dadosEmail.emailBusca } });
    if (!usuario || (tipo === "VERIFICACAO" && usuario.emailVerificadoEm) ||
      (tipo === "RECUPERACAO" && (!usuario.emailVerificadoEm || !usuario.senhaHash))) return RESPOSTA_LINK;
    const recente = await this.prisma.tokenConta.findFirst({ where: {
      usuarioId: usuario.id, tipo, criadoEm: { gte: new Date(Date.now() - INTERVALO_REENVIO_MS) }, usadoEm: null,
    } });
    if (!recente) await this.emitirLink(usuario.id, usuario.email, tipo);
    return RESPOSTA_LINK;
  }

  private async emitirLink(usuarioId: string, email: string, tipo: TipoLink): Promise<void> {
    const token = randomBytes(32).toString("hex");
    await this.prisma.tokenConta.updateMany({ where: { usuarioId, tipo, usadoEm: null }, data: { usadoEm: new Date() } });
    const linha = await this.prisma.tokenConta.create({ data: {
      usuarioId, tipo, tokenHash: hashToken(token), expiraEm: new Date(Date.now() + VIDA_LINK_MS),
    } });
    const acao = tipo === "VERIFICACAO" ? "verificar" : "recuperar";
    const assunto = tipo === "VERIFICACAO" ? "BalanceSys: verifique seu e-mail" : "BalanceSys: redefina sua senha";
    try {
      await this.entrega.enviar(email, assunto, `Abra este link em até 30 minutos:\n${this.baseUrl}/?acao=${acao}&token=${token}\nSe não solicitou, ignore esta mensagem.`);
    } catch (error) {
      await this.prisma.tokenConta.delete({ where: { id: linha.id } });
      throw error;
    }
  }

  private async consumir(token: unknown, tipo: TipoLink, aplicar: (usuarioId: string, tx: any) => Promise<void>): Promise<void> {
    if (typeof token !== "string" || !/^[a-f0-9]{64}$/.test(token)) throw new AuthError("Link inválido. Solicite um novo.", 422);
    await this.prisma.$transaction(async tx => {
      const linha = await tx.tokenConta.findUnique({ where: { tokenHash: hashToken(token) } });
      if (!linha || linha.tipo !== tipo) throw new AuthError("Link inválido. Solicite um novo.", 422);
      if (linha.usadoEm) throw new AuthError("Este link já foi utilizado. Solicite um novo.", 409);
      if (linha.expiraEm <= new Date()) throw new AuthError("Este link expirou. Solicite um novo.", 410);
      const atualizado = await tx.tokenConta.updateMany({ where: { id: linha.id, usadoEm: null, expiraEm: { gt: new Date() } }, data: { usadoEm: new Date() } });
      if (atualizado.count !== 1) throw new AuthError("Este link já foi utilizado ou expirou.", 409);
      await aplicar(linha.usuarioId, tx);
    });
  }

  async verificarEmail(token: unknown): Promise<void> {
    await this.consumir(token, "VERIFICACAO", async (usuarioId, tx) => {
      await tx.usuario.update({ where: { id: usuarioId }, data: { emailVerificadoEm: new Date() } });
    });
  }

  async redefinirSenha(token: unknown, senha: unknown, confirmarSenha: unknown): Promise<void> {
    if (!senhaValida(senha)) throw new AuthError(REQUISITOS_SENHA, 422, "senha");
    if (confirmarSenha !== senha) throw new AuthError("As senhas não coincidem.", 422, "confirmarSenha");
    const senhaHash = await gerarSenhaHash(senha);
    await this.consumir(token, "RECUPERACAO", async (usuarioId, tx) => {
      await tx.usuario.update({ where: { id: usuarioId }, data: { senhaHash } });
      await tx.sessao.deleteMany({ where: { usuarioId } });
    });
  }

  async autenticar(token: string | undefined) {
    if (!token || !/^[a-f0-9]{64}$/.test(token)) return null;
    const sessao = await this.prisma.sessao.findUnique({ where: { tokenHash: hashToken(token) }, include: { usuario: true } });
    if (!sessao || sessao.expiraEm <= new Date()) return null;
    return { id: sessao.usuario.id, nome: sessao.usuario.nome, email: sessao.usuario.email, criadoEm: sessao.usuario.criadoEm, emailVerificadoEm: sessao.usuario.emailVerificadoEm, csrfToken: sessao.csrfToken };
  }

  verificarCsrf(csrf: string | undefined, csrfToken: string): boolean {
    if (!csrf || !/^[a-f0-9]{64}$/.test(csrf)) return false;
    return timingSafeEqual(Buffer.from(csrf, "hex"), Buffer.from(csrfToken, "hex"));
  }

  async sair(token: string | undefined): Promise<void> {
    if (token && /^[a-f0-9]{64}$/.test(token)) {
      await this.prisma.sessao.deleteMany({ where: { tokenHash: hashToken(token) } });
    }
  }
}
