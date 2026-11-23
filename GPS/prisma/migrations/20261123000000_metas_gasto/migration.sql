CREATE TABLE "metas_gasto" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "usuarioId" TEXT NOT NULL,
  "categoriaId" TEXT NOT NULL,
  "mes" TEXT NOT NULL,
  "limite" DECIMAL(18,2) NOT NULL,
  "moeda" TEXT NOT NULL DEFAULT 'BRL',
  "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "atualizadoEm" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "metas_gasto_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "metas_gasto_categoriaId_fkey" FOREIGN KEY ("categoriaId") REFERENCES "categorias"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "metas_gasto_limite_positivo" CHECK ("limite" > 0),
  CONSTRAINT "metas_gasto_mes_valido" CHECK ("mes" ~ '^[0-9]{4}-(0[1-9]|1[0-2])$'),
  CONSTRAINT "metas_gasto_moeda_brl" CHECK ("moeda" = 'BRL')
);
CREATE UNIQUE INDEX "metas_gasto_usuarioId_categoriaId_mes_key" ON "metas_gasto"("usuarioId", "categoriaId", "mes");
CREATE INDEX "metas_gasto_usuarioId_mes_idx" ON "metas_gasto"("usuarioId", "mes");
