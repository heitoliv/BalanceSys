-- Identificadores provisórios são determinísticos e não contêm dados pessoais.
-- Faça backup privado e guarde o mapa de contas antes de aplicar esta migração.
ALTER TABLE "usuarios" ADD COLUMN "nickname" TEXT;
ALTER TABLE "usuarios" ADD COLUMN "nicknameBusca" TEXT;
WITH ordenados AS (
  SELECT id, row_number() OVER (ORDER BY id) AS numero FROM "usuarios"
)
UPDATE "usuarios" u SET "nickname" = 'usuario_' || o.numero,
  "nicknameBusca" = 'usuario_' || o.numero
FROM ordenados o WHERE u.id = o.id;
ALTER TABLE "usuarios" ALTER COLUMN "nickname" SET NOT NULL;
ALTER TABLE "usuarios" ALTER COLUMN "nicknameBusca" SET NOT NULL;
CREATE UNIQUE INDEX "usuarios_nickname_key" ON "usuarios"("nickname");
CREATE UNIQUE INDEX "usuarios_nicknameBusca_key" ON "usuarios"("nicknameBusca");
ALTER TABLE "usuarios" ADD CONSTRAINT "usuarios_nickname_formato" CHECK ("nickname" ~ '^[A-Za-z][A-Za-z0-9_.-]{2,29}$');
ALTER TABLE "usuarios" ADD CONSTRAINT "usuarios_nickname_busca" CHECK ("nicknameBusca" = lower("nickname"));
DROP TABLE IF EXISTS "tokens_conta";
DROP INDEX IF EXISTS "usuarios_email_key";
DROP INDEX IF EXISTS "usuarios_emailBusca_key";
ALTER TABLE "usuarios" DROP COLUMN "email", DROP COLUMN "emailBusca", DROP COLUMN "emailVerificadoEm";
