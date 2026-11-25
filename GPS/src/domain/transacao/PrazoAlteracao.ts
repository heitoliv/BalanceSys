export const PRAZO_ALTERACAO_MS = 30 * 24 * 60 * 60 * 1000;
import { DomainError } from "../shared/DomainError";

export class TransacaoMutacaoError extends DomainError {
  constructor(message: string, readonly status: 404 | 409) { super(message); }
}

// RN06: conta do instante imutável de criação, inclusive no limite exato de 30 dias.
export function dentroDoPrazo(criadoEm: Date, agora: Date): boolean {
  return agora.getTime() <= criadoEm.getTime() + PRAZO_ALTERACAO_MS;
}
