/** Redefinição administrativa local, sem endpoint público nem entrega por e-mail. */
import { lstatSync, readFileSync } from "fs";
import { PrismaClient } from "@prisma/client";
import { AuthError, gerarSenhaHash } from "../application/usuario/AuthService";
import { validarNickname } from "../domain/usuario/PoliticaConta";

class ErroResetManual extends Error {}

export async function redefinirSenhaManual(prisma: PrismaClient, identificador: string, novaSenha: string): Promise<void> {
  const nicknameBusca = validarNickname(identificador)?.nicknameBusca;
  if (!nicknameBusca) throw new ErroResetManual("Identificador inválido.");
  const senhaHash = await gerarSenhaHash(novaSenha);
  await prisma.$transaction(async tx => {
    const usuario = await tx.usuario.findUnique({ where: { nicknameBusca }, select: { id: true } });
    if (!usuario) throw new ErroResetManual("Conta não encontrada.");
    await tx.usuario.update({ where: { id: usuario.id }, data: { senhaHash } });
    await tx.sessao.deleteMany({ where: { usuarioId: usuario.id } });
  });
}

async function main(): Promise<void> {
  const [identificador, arquivo] = process.argv.slice(2);
  if (!identificador || !arquivo) throw new ErroResetManual("Informe o identificador da conta e o caminho do arquivo privado com a nova senha.");
  let estado;
  try { estado = lstatSync(arquivo); } catch { throw new ErroResetManual("Arquivo privado de senha não encontrado."); }
  if (!estado.isFile() || (estado.mode & 0o077) !== 0 || estado.size > 64) throw new ErroResetManual("O arquivo da senha deve ser regular, pequeno e acessível apenas ao dono (modo 600).");
  const novaSenha = readFileSync(arquivo, "utf8").replace(/\r?\n$/, "");
  const prisma = new PrismaClient();
  try {
    await redefinirSenhaManual(prisma, identificador, novaSenha);
    console.log("Senha da conta redefinida; sessões antigas revogadas.");
  } finally { await prisma.$disconnect(); }
}

if (require.main === module) main().catch(error => {
  console.error("Redefinição não concluída:", error instanceof ErroResetManual || error instanceof AuthError ? error.message : error instanceof Error ? error.name : "erro");
  process.exitCode = 1;
});
