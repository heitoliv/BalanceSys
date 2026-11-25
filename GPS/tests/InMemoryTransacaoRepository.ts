// Duplo de teste: repositório em memória que cumpre a porta do domínio.
// Permite testar domínio e aplicação sem tocar no banco real.

import { Transacao } from "../src/domain/transacao/Transacao";
import {
  TransacaoRepository,
  FiltroPeriodo,
} from "../src/domain/transacao/TransacaoRepository";

export class InMemoryTransacaoRepository implements TransacaoRepository {
  private dados: Transacao[] = [];

  async salvar(t: Transacao): Promise<Transacao> {
    this.dados.push(t);
    return t;
  }

  async listar(f: FiltroPeriodo): Promise<Transacao[]> {
    return this.dados
      .filter((t) => t.usuarioId === f.usuarioId)
      .filter((t) => (f.tipo ? t.tipo === f.tipo : true))
      .filter((t) => (f.categoriaId ? t.categoriaId === f.categoriaId : true))
      .filter((t) => (f.de ? t.data >= f.de : true))
      .filter((t) => (f.ate ? t.data <= f.ate : true))
      .filter((t) => (f.antesDe ? t.data < f.antesDe : true))
      .sort((a, b) => b.data.getTime() - a.data.getTime());
  }

  async buscarPorId(id: string, usuarioId: string): Promise<Transacao | null> {
    return this.dados.find((t) => t.id === id && t.usuarioId === usuarioId) ?? null;
  }

  async remover(id: string, usuarioId: string): Promise<void> {
    this.dados = this.dados.filter(
      (t) => !(t.id === id && t.usuarioId === usuarioId)
    );
  }
  async removerNoPrazo(id: string, usuarioId: string, criadoDepoisDe: Date): Promise<boolean> {
    const row = this.dados.find(t => t.id === id && t.usuarioId === usuarioId && t.criadoEm >= criadoDepoisDe);
    if (!row) return false;
    await this.remover(id, usuarioId);
    return true;
  }
  async atualizarNoPrazo(id: string, usuarioId: string, criadoDepoisDe: Date, transacao: Transacao): Promise<Transacao | null> {
    const index = this.dados.findIndex(t => t.id === id && t.usuarioId === usuarioId && t.criadoEm >= criadoDepoisDe);
    if (index < 0) return null;
    this.dados[index] = Transacao.reconstituir({ ...transacao, id, criadoEm: this.dados[index].criadoEm });
    return this.dados[index];
  }
}
