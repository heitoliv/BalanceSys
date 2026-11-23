/** Operator-only credential setup for imported users without a password. */
import { readFileSync, statSync } from "fs";
import { PrismaClient } from "@prisma/client";
import { gerarSenhaHash } from "../src/application/usuario/AuthService";
import { validarEmail } from "../src/domain/usuario/PoliticaConta";

async function main() {
  const path = process.argv[2];
  if (!path) throw new Error("Usage: ts-node scripts/claim_imported_user.ts PRIVATE.json");
  if ((statSync(path).mode & 0o077) !== 0) throw new Error("Credential file must be owner-only (chmod 600)");
  const input = JSON.parse(readFileSync(path, "utf8"));
  const email = validarEmail(input.email)?.emailBusca;
  const senha = input.senha;
  if (!email || typeof senha !== "string") throw new Error("File needs email and senha");
  const senhaHash = await gerarSenhaHash(senha);
  const prisma = new PrismaClient();
  try {
    const result = await prisma.usuario.updateMany({ where: { emailBusca: email, senhaHash: null }, data: { senhaHash } });
    if (result.count !== 1) throw new Error("No unclaimed imported user found");
    console.log("Credential set for one imported account.");
  } finally { await prisma.$disconnect(); }
}
main().catch(e => { console.error(e.message); process.exitCode = 1; });
