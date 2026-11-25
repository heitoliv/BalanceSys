export const REQUISITOS_SENHA = "A senha deve ter de 6 a 20 caracteres, uma letra maiúscula, uma minúscula, um número e um caractere especial.";
export const REQUISITOS_NICKNAME = "Use de 3 a 30 caracteres: comece com letra, número ou sublinhado e use apenas letras sem acentos, números, ponto, hífen ou sublinhado.";
const RESERVADOS = new Set(["admin", "root", "support", "suporte", "balancesys"]);

export function senhaValida(senha: unknown): senha is string {
  return typeof senha === "string" && senha.length >= 6 && senha.length <= 20 &&
    /[A-Z]/.test(senha) && /[a-z]/.test(senha) && /[0-9]/.test(senha) && /[^\p{L}\p{N}\s]/u.test(senha);
}

export function validarNickname(input: unknown): { nickname: string; nicknameBusca: string } | null {
  if (typeof input !== "string") return null;
  const nickname = input.trim();
  if (!/^[A-Za-z0-9_][A-Za-z0-9_.-]{2,29}$/.test(nickname)) return null;
  const nicknameBusca = nickname.toLowerCase();
  if (RESERVADOS.has(nicknameBusca)) return null;
  return { nickname, nicknameBusca };
}
