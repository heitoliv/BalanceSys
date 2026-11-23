export const REQUISITOS_SENHA = "A senha deve ter de 6 a 20 caracteres, uma letra maiúscula, uma minúscula, um número e um caractere especial.";

export function senhaValida(senha: unknown): senha is string {
  return typeof senha === "string" && senha.length >= 6 && senha.length <= 20 &&
    /[A-Z]/.test(senha) && /[a-z]/.test(senha) && /[0-9]/.test(senha) && /[^\p{L}\p{N}\s]/u.test(senha);
}

export function validarEmail(input: unknown): { email: string; emailBusca: string } | null {
  if (typeof input !== "string") return null;
  const value = input.trim();
  const match = /^([^\s@]+)@([^\s@]+\.[^\s@]+)$/.exec(value);
  if (!match || value.length > 254) return null;
  const email = `${match[1]}@${match[2].toLowerCase()}`;
  return { email, emailBusca: email.toLowerCase() };
}
