-- Remove somente os códigos de recuperação; mantém contas, senhas e sessões.
-- O histórico anterior permanece para bancos já migrados.
DROP INDEX IF EXISTS "usuarios_recuperacaoHash_key";
ALTER TABLE "usuarios" DROP COLUMN IF EXISTS "recuperacaoHash", DROP COLUMN IF EXISTS "recuperacaoCriadoEm";
