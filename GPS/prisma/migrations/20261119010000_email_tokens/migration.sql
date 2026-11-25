ALTER TABLE "usuarios" ADD COLUMN "emailBusca" TEXT;
ALTER TABLE "usuarios" ADD COLUMN "emailVerificadoEm" TIMESTAMP(3);
UPDATE "usuarios" SET "emailBusca" = lower("email"), "emailVerificadoEm" = CASE WHEN "senhaHash" IS NOT NULL THEN CURRENT_TIMESTAMP ELSE NULL END;
ALTER TABLE "usuarios" ALTER COLUMN "emailBusca" SET NOT NULL;
CREATE UNIQUE INDEX "usuarios_emailBusca_key" ON "usuarios"("emailBusca");

CREATE TABLE "tokens_conta" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "tokenHash" TEXT NOT NULL,
  "tipo" TEXT NOT NULL,
  "expiraEm" TIMESTAMP(3) NOT NULL,
  "usadoEm" TIMESTAMP(3),
  "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "usuarioId" TEXT NOT NULL,
  CONSTRAINT "tokens_conta_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "tokens_conta_tokenHash_key" ON "tokens_conta"("tokenHash");
CREATE INDEX "tokens_conta_usuarioId_tipo_criadoEm_idx" ON "tokens_conta"("usuarioId", "tipo", "criadoEm");
CREATE INDEX "tokens_conta_expiraEm_idx" ON "tokens_conta"("expiraEm");
