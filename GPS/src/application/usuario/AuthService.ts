import { PrismaClient } from "@prisma/client";
import { randomBytes, scrypt as scryptCallback, timingSafeEqual, createHash } from "crypto";
import { promisify } from "util";
import { REQUISITOS_SENHA, REQUISITOS_NICKNAME, senhaValida, validarNickname } from "../../domain/usuario/PoliticaConta";

const scrypt = promisify(scryptCallback);
const VIDA_SESSAO_MS = 12 * 60 * 60 * 1000;
const hashToken = (value: string) => createHash("sha256").update(value).digest("hex");

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
  constructor(private readonly prisma: PrismaClient) {}

  private async conferirSenha(senha: string, senhaHash: string | null | undefined): Promise<boolean> {
    const partes = senhaHash?.split(":");
    const salt = partes?.length === 3 && partes[0] === "scrypt" ? partes[1] : "00000000000000000000000000000000";
    const calculado = await scrypt(senha.slice(0, 128), salt, 64) as Buffer;
    const esperado = partes?.length === 3 && /^[a-f0-9]{128}$/.test(partes[2]) ? Buffer.from(partes[2], "hex") : Buffer.alloc(64);
    return Boolean(partes?.length === 3 && senha.length <= 128 && timingSafeEqual(calculado, esperado));
  }

  async cadastrar(input: { nome: unknown; nickname: unknown; senha: unknown; confirmarSenha?: unknown }) {
    const nome = typeof input.nome === "string" ? input.nome.trim() : "";
    const nickname = validarNickname(input.nickname);
    if (nome.length < 2 || nome.length > 100) throw new AuthError("Informe um nome de 2 a 100 caracteres.", 422, "nome");
    if (!nickname) throw new AuthError(REQUISITOS_NICKNAME, 422, "nickname");
    if (!senhaValida(input.senha)) throw new AuthError(REQUISITOS_SENHA, 422, "senha");
    if (input.confirmarSenha !== input.senha) throw new AuthError("As senhas não coincidem.", 422, "confirmarSenha");
    try {
      const usuario = await this.prisma.usuario.create({ data: { nome, ...nickname, senhaHash: await gerarSenhaHash(input.senha) } });
      return { id: usuario.id, nome: usuario.nome, nickname: usuario.nickname, mensagem: "Conta criada. Entre com seu nome de usuário e senha." };
    } catch (error) {
      if (typeof error === "object" && error !== null && "code" in error && error.code === "P2002")
        throw new AuthError("Este nome de usuário já está em uso.", 409, "nickname");
      throw error;
    }
  }

  async entrar(nicknameInput: unknown, senhaInput: unknown) {
    if (typeof nicknameInput !== "string" || !nicknameInput.trim()) throw new AuthError("Informe o nome de usuário.", 422, "nickname");
    const nickname = validarNickname(nicknameInput);
    if (!nickname) throw new AuthError(REQUISITOS_NICKNAME, 422, "nickname");
    if (typeof senhaInput !== "string" || !senhaInput) throw new AuthError("Informe a senha.", 422, "senha");
    const usuario = await this.prisma.usuario.findUnique({ where: { nicknameBusca: nickname.nicknameBusca } });
    const senhaCorreta = await this.conferirSenha(senhaInput, usuario?.senhaHash);
    if (!usuario || !senhaCorreta) throw new AuthError("Nome de usuário ou senha incorretos.", 401);
    const token = randomBytes(32).toString("hex");
    const csrf = randomBytes(32).toString("hex");
    const sessao = await this.prisma.sessao.create({ data: {
      tokenHash: hashToken(token), csrfToken: csrf, usuarioId: usuario.id,
      expiraEm: new Date(Date.now() + VIDA_SESSAO_MS),
    } });
    return { token, csrf, expiraEm: sessao.expiraEm, usuario: { id: usuario.id, nome: usuario.nome, nickname: usuario.nickname } };
  }

  async alterarNickname(usuarioId: string, novoInput: unknown, senhaAtual: unknown): Promise<string> {
    const nickname = validarNickname(novoInput);
    if (!nickname) throw new AuthError(REQUISITOS_NICKNAME, 422, "nickname");
    if (typeof senhaAtual !== "string" || !senhaAtual) throw new AuthError("Informe a senha atual.", 422, "senhaAtual");
    const usuario = await this.prisma.usuario.findUnique({ where: { id: usuarioId } });
    if (!usuario || !await this.conferirSenha(senhaAtual, usuario.senhaHash)) throw new AuthError("Senha atual incorreta.", 401, "senhaAtual");
    try {
      const atualizado = await this.prisma.usuario.update({ where: { id: usuarioId }, data: nickname });
      return atualizado.nickname;
    } catch (error) {
      if (typeof error === "object" && error !== null && "code" in error && error.code === "P2002")
        throw new AuthError("Este nome de usuário já está em uso.", 409, "nickname");
      throw error;
    }
  }

  async alterarSenha(usuarioId: string, senhaAtual: unknown, novaSenha: unknown, confirmarSenha: unknown): Promise<void> {
    if (typeof senhaAtual !== "string" || !senhaAtual) throw new AuthError("Informe a senha atual.", 422, "senhaAtual");
    if (!senhaValida(novaSenha)) throw new AuthError(REQUISITOS_SENHA, 422, "novaSenha");
    if (confirmarSenha !== novaSenha) throw new AuthError("As senhas não coincidem.", 422, "confirmarSenha");
    const usuario = await this.prisma.usuario.findUnique({ where: { id: usuarioId } });
    if (!usuario || !await this.conferirSenha(senhaAtual, usuario.senhaHash)) throw new AuthError("Senha atual incorreta.", 401, "senhaAtual");
    const senhaHash = await gerarSenhaHash(novaSenha);
    await this.prisma.$transaction(async tx => {
      await tx.usuario.update({ where: { id: usuarioId }, data: { senhaHash } });
      await tx.sessao.deleteMany({ where: { usuarioId } });
    });
  }

  async autenticar(token: string | undefined) {
    if (!token || !/^[a-f0-9]{64}$/.test(token)) return null;
    const sessao = await this.prisma.sessao.findUnique({ where: { tokenHash: hashToken(token) }, include: { usuario: true } });
    if (!sessao || sessao.expiraEm <= new Date()) return null;
    return { id: sessao.usuario.id, nome: sessao.usuario.nome, nickname: sessao.usuario.nickname, criadoEm: sessao.usuario.criadoEm, csrfToken: sessao.csrfToken };
  }

  verificarCsrf(csrf: string | undefined, csrfToken: string): boolean {
    if (!csrf || !/^[a-f0-9]{64}$/.test(csrf)) return false;
    return timingSafeEqual(Buffer.from(csrf, "hex"), Buffer.from(csrfToken, "hex"));
  }

  async sair(token: string | undefined): Promise<void> {
    if (token && /^[a-f0-9]{64}$/.test(token)) await this.prisma.sessao.deleteMany({ where: { tokenHash: hashToken(token) } });
  }
}
