-- Código de recuperação de uso único; armazenado somente como hash.
-- Contas existentes permanecem sem código até gerá-lo autenticadas.
ALTER TABLE "usuarios" ADD COLUMN "recuperacaoHash" TEXT;
ALTER TABLE "usuarios" ADD COLUMN "recuperacaoCriadoEm" TIMESTAMP(3);
CREATE UNIQUE INDEX "usuarios_recuperacaoHash_key" ON "usuarios"("recuperacaoHash");
ALTER TABLE "usuarios" DROP CONSTRAINT "usuarios_nickname_formato";
ALTER TABLE "usuarios" ADD CONSTRAINT "usuarios_nickname_formato" CHECK ("nickname" ~ '^[A-Za-z0-9_][A-Za-z0-9_.-]{2,29}$');
