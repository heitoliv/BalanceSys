import { mkdir, writeFile } from "fs/promises";
import { join } from "path";
import { randomUUID } from "crypto";
import { spawn } from "child_process";
import { EntregaEmail } from "../../application/usuario/EntregaEmail";

export class EntregaEmailLocal implements EntregaEmail {
  constructor(private readonly pasta = join(process.cwd(), ".local", "mail")) {}
  async enviar(destino: string, assunto: string, corpo: string): Promise<void> {
    await mkdir(this.pasta, { recursive: true, mode: 0o700 });
    const nome = `${Date.now()}-${randomUUID()}.eml`;
    await writeFile(join(this.pasta, nome), `To: ${destino}\nSubject: ${assunto}\n\n${corpo}\n`, { mode: 0o600, flag: "wx" });
  }
}

// Produção: MTA local configurado fora do Git. Nenhum token é enviado ao logger.
export class EntregaEmailSendmail implements EntregaEmail {
  constructor(private readonly binario: string) {}
  enviar(destino: string, assunto: string, corpo: string): Promise<void> {
    if (!this.binario.startsWith("/")) throw new Error("MAIL_SENDMAIL_PATH deve ser absoluto");
    return new Promise((resolve, reject) => {
      const child = spawn(this.binario, ["-t", "-i"], { stdio: ["pipe", "ignore", "ignore"] });
      child.on("error", reject);
      child.on("exit", code => code === 0 ? resolve() : reject(new Error("Falha no envio de e-mail")));
      child.stdin.end(`To: ${destino}\nSubject: ${assunto}\nContent-Type: text/plain; charset=UTF-8\n\n${corpo}\n`);
    });
  }
}
