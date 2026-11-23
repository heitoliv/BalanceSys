import { DomainError } from "../shared/DomainError";

export const FUSO_APLICACAO = "America/Sao_Paulo";
export type Periodicidade = "dia" | "semana" | "mes" | "ano";
const formatador = new Intl.DateTimeFormat("en-US", { timeZone: FUSO_APLICACAO, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23" });

function partes(data: Date) {
  const p = Object.fromEntries(formatador.formatToParts(data).map(v => [v.type, Number(v.value)]));
  return { ano: p.year, mes: p.month, dia: p.day, hora: p.hour, minuto: p.minute, segundo: p.second };
}

function meiaNoite(ano: number, mes: number, dia: number): Date {
  const alvo = Date.UTC(ano, mes - 1, dia);
  const dataAlvo = ano * 10000 + mes * 100 + dia;
  let inicio = alvo - 18 * 3600000;
  let fim = alvo + 18 * 3600000;
  while (inicio < fim) {
    const meio = Math.floor((inicio + fim) / 2);
    const p = partes(new Date(meio));
    const dataLocal = p.ano * 10000 + p.mes * 100 + p.dia;
    if (dataLocal < dataAlvo) inicio = meio + 1;
    else fim = meio;
  }
  return new Date(inicio);
}

export function intervaloPeriodo(periodicidade: string, referencia?: string, agora = new Date()) {
  if (!["dia", "semana", "mes", "ano"].includes(periodicidade)) throw new DomainError("Periodicidade inválida.");
  const hoje = partes(agora);
  const texto = referencia ?? `${hoje.ano}-${String(hoje.mes).padStart(2, "0")}-${String(hoje.dia).padStart(2, "0")}`;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(texto)) throw new DomainError("Data de referência inválida.");
  const [ano, mes, dia] = texto.split("-").map(Number);
  const base = new Date(Date.UTC(ano, mes - 1, dia));
  if (base.getUTCFullYear() !== ano || base.getUTCMonth() + 1 !== mes || base.getUTCDate() !== dia) throw new DomainError("Data de referência inválida.");
  let inicio = base;
  let fim: Date;
  if (periodicidade === "dia") fim = new Date(Date.UTC(ano, mes - 1, dia + 1));
  else if (periodicidade === "semana") {
    const deslocamento = (base.getUTCDay() + 6) % 7;
    inicio = new Date(Date.UTC(ano, mes - 1, dia - deslocamento));
    fim = new Date(inicio.getTime() + 7 * 86400000);
  } else if (periodicidade === "mes") {
    inicio = new Date(Date.UTC(ano, mes - 1, 1));
    fim = new Date(Date.UTC(ano, mes, 1));
  } else {
    inicio = new Date(Date.UTC(ano, 0, 1));
    fim = new Date(Date.UTC(ano + 1, 0, 1));
  }
  return {
    periodicidade: periodicidade as Periodicidade,
    fuso: FUSO_APLICACAO,
    inicio: meiaNoite(inicio.getUTCFullYear(), inicio.getUTCMonth() + 1, inicio.getUTCDate()),
    fimExclusivo: meiaNoite(fim.getUTCFullYear(), fim.getUTCMonth() + 1, fim.getUTCDate()),
  };
}
