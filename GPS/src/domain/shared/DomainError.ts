// ============================================================================
// CDP — Erro de domínio
// Distingue violações de regra de negócio de erros técnicos, permitindo à
// camada de interface responder com o status HTTP adequado (422/400).
// ============================================================================

export class DomainError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DomainError";
    // Mantém a cadeia de protótipos correta ao transpilar para ES5/ES2020.
    Object.setPrototypeOf(this, new.target.prototype);
  }
}
