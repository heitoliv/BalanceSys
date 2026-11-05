// ============================================================================
// CGT — Objetos de transferência de dados (DTOs) da gerência de transações
// Fronteira entre a interface (cci/cih) e o domínio: dados crus entram aqui.
// ============================================================================

export interface RegistrarTransacaoDTO {
  tipo: string;
  valor: number;
  descricao: string;
  data: string; // ISO-8601, vindo da interface
  prioridade: string;
  categoriaId: string;
  usuarioId?: string; // opcional: resolvido para o usuário padrão no Incremento 1
}

export interface TransacaoView {
  id: string;
  tipo: string;
  valor: number;
  descricao: string;
  data: string;
  prioridade: string;
  categoriaId: string;
  categoriaNome?: string;
  usuarioId: string;
}

export interface ResumoView {
  totalReceitas: number;
  totalDespesas: number;
  saldo: number;
  quantidade: number;
}
