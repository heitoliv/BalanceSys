// ============================================================================
// cih — Lógica da interface humana (cliente). Conversa com a API da cci.
// Nenhuma regra de negócio aqui: apenas coleta entradas, chama a API e exibe.
// ============================================================================
"use strict";

const API = "/api";
let tipoAtual = "RECEITA";
let categorias = [];
let csrf = "";
let modoAuth = "login";
let tokenLink = "";
let edicaoId = "";
let edicaoAnterior = null;
let metaEdicaoId = "";
let metas = [];
let metasVersao = 0;
let alertasVersao = 0;
let impactoVersao = 0;

const $ = (s) => document.querySelector(s);
const fmt = (v) =>
  "R$ " + Number(v).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

function mostrarApp(usuario) {
  $("#app-header").style.display = "block";
  $("#area-auth").style.display = "none";
  $("#area-app").style.display = "block";
  $("#topo-acoes").style.display = "flex";
  $("#usuario-nome").textContent = usuario.nome;
}
function mostrarAuth() {
  csrf = "";
  metasVersao++;
  alertasVersao++;
  impactoVersao++;
  $("#app-header").style.display = "none";
  $("#area-app").style.display = "none";
  $("#area-conta").classList.add("oculto");
  $("#area-metas").classList.add("oculto");
  $("#area-financas").classList.remove("oculto");
  $("#topo-acoes").style.display = "none";
  $("#area-auth").style.display = "block";
  $("#usuario-nome").textContent = "";
  $("#lista").replaceChildren();
  $("#c-receitas").textContent = fmt(0);
  $("#c-despesas").textContent = fmt(0);
  $("#c-saldo").textContent = fmt(0);
  $("#c-resultado").textContent = fmt(0);
  $("#f-valor").value = "";
  $("#f-descricao").value = "";
  $("#impacto-meta").textContent = "";
  cancelarEdicao();
  $("#auth-mensagem").textContent = "";
  $("#auth-mensagem").className = "aviso";
  categorias = [];
  metas = [];
  $("#metas-lista").replaceChildren();
  $("#alertas-metas").classList.add("oculto");
  $("#alertas-metas-lista").replaceChildren();
  delete $("#alertas-metas-lista").dataset.conteudo;
  cancelarEdicaoMeta();
  $("#meta-limite").value = "";
  $("#metas-filtro-mes").value = "";
  $("#meta-aviso").className = "aviso";
  $("#meta-aviso").textContent = "";
  $("#filtro-categoria").replaceChildren(new Option("Todas as categorias", ""));
}
async function lerJson(r) {
  if (r.status === 401) {
    mostrarAuth();
    $("#auth-mensagem").textContent = "Sessão expirada. Entre novamente.";
    $("#auth-mensagem").className = "aviso erro";
    throw new Error("Sessão expirada.");
  }
  if (!r.ok) throw new Error("Falha ao carregar os dados.");
  return r.json();
}
function mensagemAuth(texto, erro = false) {
  $("#auth-mensagem").textContent = texto;
  $("#auth-mensagem").className = texto ? `aviso ${erro ? "erro" : "ok"}` : "aviso";
}
function limparErrosAuth() {
  for (const campo of ["nome", "email", "senha", "confirmacao"]) $("#erro-" + campo).textContent = "";
}
function modo(novo, aviso = "") {
  modoAuth = novo;
  limparErrosAuth();
  mensagemAuth(aviso);
  const cadastro = novo === "cadastro", reset = novo === "redefinir";
  $("#auth-titulo").textContent = ({ login: "Entrar", cadastro: "Criar conta", recuperar: "Recuperar senha", reenviar: "Reenviar verificação", verificar: "Verificar e-mail", redefinir: "Definir nova senha" })[novo];
  $("#auth-ajuda").textContent = ({ login: "Entre com seu e-mail e senha.", cadastro: "Crie sua conta e verifique o link enviado.", recuperar: "Enviaremos um link se o endereço estiver apto.", reenviar: "Solicite outro link se o anterior expirou. Um novo pedido pode ser feito após dois minutos.", verificar: "Confirme o link recebido para liberar o login.", redefinir: "Escolha uma nova senha. As sessões antigas serão encerradas." })[novo];
  $("#auth-enviar").textContent = ({ login: "Entrar", cadastro: "Cadastrar", recuperar: "Enviar link", reenviar: "Reenviar link", verificar: "Verificar e-mail", redefinir: "Alterar senha" })[novo];
  $("#campo-nome").classList.toggle("oculto", !cadastro);
  $("#campo-email").classList.toggle("oculto", novo === "verificar" || reset);
  $("#campo-senha").classList.toggle("oculto", !["login", "cadastro", "redefinir"].includes(novo));
  $("#campo-confirmacao").classList.toggle("oculto", !cadastro && !reset);
  $("#regras-senha").classList.toggle("oculto", !cadastro && !reset);
  $("#auth-alternar").textContent = cadastro ? "Já tenho conta" : "Criar conta";
  $("#auth-senha").autocomplete = cadastro || reset ? "new-password" : "current-password";
  $("#auth-senha").value = "";
  $("#auth-confirmar").value = "";
  atualizarRegras();
}
function atualizarRegras() {
  const senha = $("#auth-senha").value;
  const regras = { tamanho: senha.length >= 6 && senha.length <= 20, maiuscula: /[A-Z]/.test(senha), minuscula: /[a-z]/.test(senha), numero: /[0-9]/.test(senha), especial: /[^\p{L}\p{N}\s]/u.test(senha) };
  for (const [nome, ok] of Object.entries(regras)) {
    const item = $(`[data-regra="${nome}"]`);
    item.classList.toggle("ok", ok);
    item.textContent = `${ok ? "✓" : "○"} ${item.textContent.replace(/^[✓○] /, "")}`;
  }
  return Object.values(regras).every(Boolean);
}
$("#auth-senha").addEventListener("input", atualizarRegras);
$("#auth-confirmar").addEventListener("input", () => { $("#erro-confirmacao").textContent = ""; });
document.querySelectorAll(".mostrar-senha").forEach(botao => botao.addEventListener("click", () => {
  const campo = $("#" + botao.dataset.campo);
  const visivel = campo.type === "password";
  campo.type = visivel ? "text" : "password";
  botao.setAttribute("aria-pressed", String(visivel));
  botao.setAttribute("aria-label", `${visivel ? "Ocultar" : "Mostrar"} ${campo.id === "auth-confirmar" ? "confirmação da senha" : "senha"}`);
  botao.textContent = visivel ? "Ocultar" : "Mostrar";
  campo.focus();
}));
$("#auth-alternar").onclick = ev => { ev.preventDefault(); modo(modoAuth === "cadastro" ? "login" : "cadastro"); };
$("#auth-recuperar").onclick = ev => { ev.preventDefault(); modo("recuperar"); };
$("#auth-reenviar").onclick = ev => { ev.preventDefault(); modo("reenviar"); };
$("#auth-form").onsubmit = async (ev) => {
  ev.preventDefault();
  const email = $("#auth-email").value;
  const senha = $("#auth-senha").value;
  limparErrosAuth();
  if (!["verificar", "redefinir"].includes(modoAuth) && !email.trim()) { $("#erro-email").textContent = "Informe o e-mail."; return; }
  if (!["verificar", "redefinir"].includes(modoAuth) && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) { $("#erro-email").textContent = "Informe um e-mail válido."; return; }
  if (["cadastro", "redefinir"].includes(modoAuth)) {
    if (!atualizarRegras()) { $("#erro-senha").textContent = "Atenda aos requisitos ainda não marcados."; return; }
    if (senha !== $("#auth-confirmar").value) { $("#erro-confirmacao").textContent = "As senhas não coincidem."; return; }
  }
  if (modoAuth === "login" && !senha) { $("#erro-senha").textContent = "Informe a senha."; return; }
  $("#auth-enviar").disabled = true;
  try {
    const rota = ({ login: "login", cadastro: "cadastro", recuperar: "solicitar-recuperacao", reenviar: "reenviar-verificacao", verificar: "verificar", redefinir: "redefinir-senha" })[modoAuth];
    const corpo = modoAuth === "cadastro" ? { nome: $("#auth-nome").value, email, senha, confirmarSenha: $("#auth-confirmar").value }
      : modoAuth === "login" ? { email, senha }
      : modoAuth === "recuperar" || modoAuth === "reenviar" ? { email }
      : modoAuth === "verificar" ? { token: tokenLink }
      : { token: tokenLink, senha, confirmarSenha: $("#auth-confirmar").value };
    const r = await fetch(`${API}/auth/${rota}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(corpo) });
    const data = await r.json();
    if (!r.ok) { if (data.campo) $("#erro-" + (data.campo === "confirmarSenha" ? "confirmacao" : data.campo)).textContent = data.erro; throw new Error(data.erro); }
    if (modoAuth !== "login") {
      if (["cadastro", "verificar", "redefinir"].includes(modoAuth)) modo("login", data.mensagem);
      else mensagemAuth(data.mensagem);
      return;
    }
    csrf = data.csrf;
    $("#auth-senha").value = "";
    mostrarApp(data.usuario);
    await iniciarDados();
  } catch (e) { mensagemAuth(e.message || "Serviço indisponível. Tente novamente mais tarde.", true); }
  finally { $("#auth-enviar").disabled = false; }
};
$("#bt-sair").onclick = async () => {
  try {
    const r = await fetch(`${API}/auth/logout`, { method: "POST", headers: { "X-CSRF-Token": csrf } });
    if (r.ok || r.status === 401) mostrarAuth();
    else alert("Não foi possível encerrar a sessão.");
  } catch { alert("Sem conexão para encerrar a sessão."); }
};
$("#bt-inicio").onclick = () => {
  $("#area-conta").classList.add("oculto");
  $("#area-metas").classList.add("oculto");
  $("#area-financas").classList.remove("oculto");
  $("#bt-inicio").setAttribute("aria-current", "page");
  $("#bt-conta").removeAttribute("aria-current");
  $("#bt-metas").removeAttribute("aria-current");
  $("#bt-inicio").focus();
};
$("#bt-conta").onclick = async () => {
  const r = await fetch(`${API}/auth/me`);
  if (r.status === 401) { mostrarAuth(); return; }
  if (!r.ok) { $("#conta-mensagem").textContent = "Não foi possível carregar a conta."; return; }
  const { usuario } = await r.json();
  $("#conta-nome").textContent = usuario.nome;
  $("#conta-email").textContent = usuario.email;
  $("#conta-verificacao").textContent = usuario.emailVerificadoEm ? "E-mail verificado" : "Verificação pendente";
  $("#conta-criada").textContent = usuario.criadoEm ? dataBR(usuario.criadoEm) : "Não informado";
  $("#area-financas").classList.add("oculto");
  $("#area-metas").classList.add("oculto");
  $("#area-conta").classList.remove("oculto");
  $("#bt-conta").setAttribute("aria-current", "page");
  $("#bt-inicio").removeAttribute("aria-current");
  $("#bt-metas").removeAttribute("aria-current");
  $("#conta-titulo").setAttribute("tabindex", "-1");
  $("#conta-titulo").focus();
};
$("#bt-recuperar-conta").onclick = async () => {
  const aviso = $("#conta-mensagem");
  const r = await fetch(`${API}/auth/me`);
  if (r.status === 401) { mostrarAuth(); return; }
  if (!r.ok) { aviso.textContent = "Serviço indisponível. Tente novamente."; return; }
  const { usuario } = await r.json();
  const pedido = await fetch(`${API}/auth/solicitar-recuperacao`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: usuario.email }) });
  aviso.textContent = pedido.ok ? "Se a conta estiver apta, enviaremos um link ao seu e-mail." : "Não foi possível solicitar o link agora.";
};

function dataBR(iso) {
  const d = new Date(iso);
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric", timeZone: "America/Sao_Paulo" });
}
function diaDaTransacao(data) {
  return /^\d{4}-\d{2}-\d{2}$/.test(data) ? data :
    new Intl.DateTimeFormat("sv-SE", { timeZone: "America/Sao_Paulo", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(data));
}
function mesDaTransacao(data) { return diaDaTransacao(data).slice(0, 7); }
async function atualizarImpactoMetas(alvos) {
  const versao = ++impactoVersao;
  const impacto = $("#impacto-meta");
  const despesas = [...new Map(alvos.filter(a => a?.tipo === "DESPESA").map(a => [`${mesDaTransacao(a.data)}:${a.categoriaId}`, a])).entries()];
  if (!despesas.length) { impacto.textContent = ""; return; }
  const meses = [...new Set(despesas.map(([chave]) => chave.slice(0, 7)))];
  try {
    const respostas = await Promise.all(meses.map(async mes => {
      const r = await fetch(`${API}/metas?mes=${mes}`);
      return { mes, metas: await lerJson(r) };
    }));
    if (versao !== impactoVersao) return true;
    const porMes = new Map(respostas.map(r => [r.mes, r.metas]));
    const mensagens = despesas.map(([chave, alvo]) => {
      const mes = chave.slice(0, 7);
      const meta = porMes.get(mes).find(m => m.categoriaId === alvo.categoriaId);
      const categoria = categorias.find(c => c.id === alvo.categoriaId)?.nome ?? "categoria selecionada";
      if (!meta) return `Sem meta de gasto para ${categoria} em ${mes}.`;
      const p = meta.progresso;
      return `Meta de ${categoria} em ${mes}: gasto ${fmt(p.gastoConsiderado)} de ${fmt(meta.limite)} (${Number(p.percentualUtilizacao).toLocaleString("pt-BR", { maximumFractionDigits: 2 })}%). ${p.excedente > 0 ? `Excedeu ${fmt(p.excedente)}.` : p.restante === 0 ? "Limite alcançado." : `Restam ${fmt(p.restante)}.`}${diaDaTransacao(alvo.data) > hojeLocal() ? " O lançamento futuro ainda não consome a meta." : ""}`;
    });
    impacto.textContent = mensagens.join(" ");
    return true;
  } catch {
    if (versao !== impactoVersao) return true;
    impacto.textContent = "O lançamento foi salvo, mas não foi possível consultar o progresso da meta agora.";
    return false;
  }
}
async function atualizarAposTransacao(alvos) {
  const resultados = await Promise.allSettled([carregarResumo(), carregarLista(), carregarMetas(), carregarAlertasMesAtual(), atualizarImpactoMetas(alvos)]);
  return resultados.every(r => r.status === "fulfilled" && r.value !== false);
}
function hojeLocal() { return new Intl.DateTimeFormat("sv-SE", { timeZone: "America/Sao_Paulo", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date()); }
function parametrosPeriodo() { return new URLSearchParams({ periodicidade: $("#periodicidade").value, referencia: $("#referencia").value }); }
function corCategoria(nome) {
  const mapa = { Renda: "#16a34a", "Alimentação": "#f97316", Transporte: "#2563eb",
    Moradia: "#0d9488", "Saúde": "#dc2626", Lazer: "#7c3aed", Outros: "#64748b" };
  return mapa[nome] || "#64748b";
}
function descricaoAlerta(meta, limiar) {
  const periodo = new Date(`${meta.mes}-15T12:00:00Z`).toLocaleDateString("pt-BR", { month: "long", year: "numeric", timeZone: "UTC" });
  return `${meta.categoriaNome}, ${periodo}: atingiu ${limiar}% da meta. Gasto considerado ${fmt(meta.progresso.gastoConsiderado)} de ${fmt(meta.limite)}.`;
}
async function carregarAlertasMesAtual() {
  const versao = ++alertasVersao;
  try {
    const mes = hojeLocal().slice(0, 7);
    const metasAtuais = await lerJson(await fetch(`${API}/metas?mes=${mes}`));
    if (versao !== alertasVersao) return true;
    const lista = $("#alertas-metas-lista");
    const mensagens = metasAtuais.flatMap(meta => meta.alertas.map(limiar => descricaoAlerta(meta, limiar)));
    if (lista.dataset.conteudo !== JSON.stringify(mensagens)) {
      lista.replaceChildren(...mensagens.map(mensagem => { const li = document.createElement("li"); li.textContent = mensagem; return li; }));
      lista.dataset.conteudo = JSON.stringify(mensagens);
    }
    $("#alertas-metas").classList.toggle("oculto", mensagens.length === 0);
    return true;
  } catch {
    if (versao !== alertasVersao) return true;
    $("#alertas-metas").classList.remove("oculto");
    $("#alertas-metas-lista").replaceChildren();
    const li = document.createElement("li"); li.textContent = "Não foi possível atualizar os alertas das metas."; $("#alertas-metas-lista").append(li);
    return false;
  }
}

// ---------------------------- Seletor de tipo ------------------------------
$("#bt-receita").onclick = () => setTipo("RECEITA");
$("#bt-despesa").onclick = () => setTipo("DESPESA");
function setTipo(t) {
  tipoAtual = t;
  $("#campo-prioridade").classList.toggle("oculto", t !== "DESPESA");
  $("#bt-receita").className = t === "RECEITA" ? "on-rec" : "";
  $("#bt-despesa").className = t === "DESPESA" ? "on-des" : "";
  $("#bt-receita").setAttribute("aria-pressed", String(t === "RECEITA"));
  $("#bt-despesa").setAttribute("aria-pressed", String(t === "DESPESA"));
  const sel = $("#f-categoria");
  const anterior = sel.value;
  sel.replaceChildren();
  categorias.filter(c => c.tipo === t || c.tipo === "AMBOS").forEach(c => {
    const opt = document.createElement("option"); opt.value = c.id; opt.textContent = c.nome; sel.append(opt);
  });
  if ([...sel.options].some(o => o.value === anterior)) sel.value = anterior;
}

// ------------------------------ Carregamento -------------------------------
async function carregarCategorias() {
  const r = await fetch(`${API}/categorias`);
  categorias = await lerJson(r);
  const sel = $("#f-categoria");
  sel.replaceChildren();
  setTipo(tipoAtual);
  const metaSel = $("#meta-categoria");
  metaSel.replaceChildren();
  categorias.filter(c => c.tipo === "DESPESA" || c.tipo === "AMBOS").forEach(c => metaSel.append(new Option(c.nome, c.id)));
}

$("#bt-metas").onclick = async () => {
  $("#area-financas").classList.add("oculto");
  $("#area-conta").classList.add("oculto");
  $("#area-metas").classList.remove("oculto");
  $("#bt-metas").setAttribute("aria-current", "page");
  $("#bt-inicio").removeAttribute("aria-current");
  $("#bt-conta").removeAttribute("aria-current");
  $("#meta-mes").value ||= hojeLocal().slice(0, 7);
  $("#metas-filtro-mes").value ||= hojeLocal().slice(0, 7);
  await carregarMetas();
  $("#metas-titulo").setAttribute("tabindex", "-1");
  $("#metas-titulo").focus();
};
async function carregarMetas() {
  const versao = ++metasVersao;
  const mes = $("#metas-filtro-mes").value;
  try {
    const resultado = await lerJson(await fetch(`${API}/metas?mes=${encodeURIComponent(mes)}`));
    if (versao !== metasVersao) return true;
    metas = resultado;
  }
  catch { $("#meta-aviso").textContent = "Não foi possível carregar as metas."; $("#meta-aviso").className = "aviso erro"; return false; }
  const corpo = $("#metas-lista"); corpo.replaceChildren();
  $("#metas-vazio").classList.toggle("oculto", metas.length > 0);
  metas.forEach(meta => {
    const tr = document.createElement("tr");
    for (const valor of [meta.mes, meta.categoriaNome, fmt(meta.limite)]) {
      const td = document.createElement("td"); td.textContent = valor; tr.append(td);
    }
    const progresso = document.createElement("td"); progresso.className = "progresso-meta";
    const p = meta.progresso;
    if (p.excedente > 0) progresso.classList.add("excedida");
    const texto = document.createElement("p");
    const percentual = Number(p.percentualUtilizacao).toLocaleString("pt-BR", { maximumFractionDigits: 2 });
    texto.textContent = `Gasto ${fmt(p.gastoConsiderado)} · ${percentual}% utilizado. ${p.excedente > 0 ? `Excedeu ${fmt(p.excedente)}.` : p.restante === 0 ? "Limite alcançado." : `Restam ${fmt(p.restante)}.`}`;
    const barra = document.createElement("progress"); barra.max = 100; barra.value = Math.min(100, p.percentualUtilizacao);
    barra.setAttribute("aria-label", `${percentual}% do limite de ${meta.categoriaNome} utilizado`);
    progresso.append(texto, barra);
    if (meta.alertas.length) {
      const avisos = document.createElement("ul"); avisos.className = "alertas-linha";
      meta.alertas.forEach(limiar => { const li = document.createElement("li"); li.textContent = descricaoAlerta(meta, limiar); avisos.append(li); });
      progresso.append(avisos);
    }
    tr.append(progresso);
    const td = document.createElement("td"); td.className = "acoes-linha";
    const editar = document.createElement("button"); editar.type = "button"; editar.className = "acao-linha"; editar.textContent = "Editar"; editar.setAttribute("aria-label", `Editar meta de ${meta.categoriaNome} em ${meta.mes}`);
    editar.onclick = () => { metaEdicaoId = meta.id; $("#meta-mes").value = meta.mes; $("#meta-categoria").value = meta.categoriaId; $("#meta-limite").value = String(meta.limite).replace(".", ","); $("#meta-salvar").textContent = "Salvar meta"; $("#meta-cancelar").classList.remove("oculto"); $("#meta-mes").focus(); };
    const excluir = document.createElement("button"); excluir.type = "button"; excluir.className = "acao-linha excluir"; excluir.textContent = "Excluir"; excluir.setAttribute("aria-label", `Excluir meta de ${meta.categoriaNome} em ${meta.mes}`);
    excluir.onclick = async () => {
      if (!confirm(`Excluir a meta de ${meta.categoriaNome} em ${meta.mes}?`)) return;
      const r = await fetch(`${API}/metas/${meta.id}`, { method: "DELETE", headers: { "X-CSRF-Token": csrf } });
      if (r.status === 401) { mostrarAuth(); return; }
      if (!r.ok) { const data = await r.json(); mostrarAvisoMeta(data.erro || "Não foi possível excluir.", true); return; }
      if (metaEdicaoId === meta.id) cancelarEdicaoMeta();
      mostrarAvisoMeta("Meta excluída."); await Promise.all([carregarMetas(), carregarAlertasMesAtual()]);
    };
    td.append(editar, excluir); tr.append(td); corpo.append(tr);
  });
  return true;
}
function mostrarAvisoMeta(texto, erro = false) { $("#meta-aviso").textContent = texto; $("#meta-aviso").className = `aviso ${erro ? "erro" : "ok"}`; }
function cancelarEdicaoMeta() { metaEdicaoId = ""; $("#meta-salvar").textContent = "Criar meta"; $("#meta-cancelar").classList.add("oculto"); }
$("#meta-cancelar").onclick = cancelarEdicaoMeta;
$("#metas-filtro-mes").onchange = carregarMetas;
$("#meta-form").onsubmit = async ev => {
  ev.preventDefault();
  const texto = $("#meta-limite").value.trim();
  if (!/^\d+(?:[.,]\d{1,2})?$/.test(texto) || Number(texto.replace(",", ".")) <= 0) { mostrarAvisoMeta("Informe um limite positivo com até duas casas decimais.", true); return; }
  const payload = { mes: $("#meta-mes").value, categoriaId: $("#meta-categoria").value, limite: Number(texto.replace(",", ".")) };
  $("#meta-salvar").disabled = true;
  try {
    const r = await fetch(metaEdicaoId ? `${API}/metas/${metaEdicaoId}` : `${API}/metas`, { method: metaEdicaoId ? "PUT" : "POST", headers: { "Content-Type": "application/json", "X-CSRF-Token": csrf }, body: JSON.stringify(payload) });
    if (r.status === 401) { mostrarAuth(); return; }
    const data = await r.json();
    if (!r.ok) { mostrarAvisoMeta(data.erro || "Não foi possível salvar a meta.", true); return; }
    mostrarAvisoMeta(metaEdicaoId ? "Meta atualizada." : "Meta criada."); cancelarEdicaoMeta(); $("#meta-limite").value = ""; $("#metas-filtro-mes").value = payload.mes; await Promise.all([carregarMetas(), carregarAlertasMesAtual()]);
  } catch { mostrarAvisoMeta("Serviço indisponível. Tente novamente.", true); }
  finally { $("#meta-salvar").disabled = false; }
};

async function carregarResumo() {
  const r = await fetch(`${API}/resumo?${parametrosPeriodo()}`);
  const resumo = await lerJson(r);
  $("#c-receitas").textContent = fmt(resumo.resultadoPeriodo.totalReceitas);
  $("#c-despesas").textContent = fmt(resumo.resultadoPeriodo.totalDespesas);
  const resultado = $("#c-resultado");
  resultado.textContent = fmt(resumo.resultadoPeriodo.saldo);
  resultado.className = "val " + (resumo.resultadoPeriodo.saldo >= 0 ? "pos" : "neg");
  const saldoEl = $("#c-saldo");
  saldoEl.textContent = fmt(resumo.saldoAtual);
  saldoEl.className = "val " + (resumo.saldoAtual >= 0 ? "pos" : "neg");
  $("#periodo-legenda").textContent = `${dataBR(resumo.periodo.inicio)} a ${dataBR(new Date(new Date(resumo.periodo.fimExclusivo).getTime() - 1).toISOString())} · ${resumo.periodo.fuso}`;
}

let listaVersao = 0;
async function carregarLista() {
  const versao = ++listaVersao;
  const tipo = $("#filtro-tipo").value;
  const filtro = $("#filtro-categoria");
  const cat = filtro.value;
  const params = parametrosPeriodo();
  if (tipo) params.set("tipo", tipo);
  const opcoes = await lerJson(await fetch(`${API}/categorias/historico?${params}`));
  if (versao !== listaVersao) return;
  filtro.replaceChildren(new Option("Todas as categorias", ""));
  for (const c of opcoes) filtro.append(new Option(c.nome, c.id));
  if (opcoes.some(c => c.id === cat)) filtro.value = cat;
  else if (cat) $("#filtro-aviso").textContent = "A categoria anterior não tem lançamentos neste contexto; o filtro foi limpo.";
  else $("#filtro-aviso").textContent = opcoes.length ? "" : "Nenhuma categoria com lançamentos neste contexto.";
  if (filtro.value) params.set("categoriaId", filtro.value);
  const r = await fetch(`${API}/transacoes?${params.toString()}`);
  const lista = await lerJson(r);
  if (versao !== listaVersao) return;
  const corpo = $("#lista");
  corpo.innerHTML = "";

  if (!lista.length) {
    $("#vazio").style.display = "block";
    return;
  }
  $("#vazio").style.display = "none";

  const nomeCat = (id) => (categorias.find((c) => c.id === id) || {}).nome || "—";

  lista.forEach((t) => {
    const nome = nomeCat(t.categoriaId);
    const sinal = t.tipo === "RECEITA" ? "+" : "−";
    const cor = t.tipo === "RECEITA" ? "#16a34a" : "#dc2626";
    const editavel = Date.now() <= new Date(t.criadoEm).getTime() + 30 * 86400000;
    corpo.insertAdjacentHTML(
      "beforeend",
      `<tr>
        <td>${escapar(t.descricao)}</td>
        <td><span class="tipo-pill" style="background:${corCategoria(nome)}"></span>${escapar(nome)}</td>
        <td style="color:var(--suave)">${dataBR(t.data)}</td>
        <td class="valor" style="color:${cor}">${sinal} ${fmt(t.valor)}</td>
        <td><div class="acoes-linha">${editavel ? `<button class="acao-linha editar" type="button" data-id="${t.id}" aria-label="Editar ${escapar(t.descricao)}">Editar</button><button class="acao-linha excluir lixo" type="button" aria-label="Excluir ${escapar(t.descricao)}" data-id="${t.id}">Excluir</button>` : "Prazo encerrado"}</div></td>
      </tr>`
    );
  });

  corpo.querySelectorAll(".lixo").forEach((b) => {
    b.onclick = () => excluir(b.dataset.id, lista.find(t => t.id === b.dataset.id));
  });
  corpo.querySelectorAll(".editar").forEach(b => { b.onclick = () => iniciarEdicao(lista.find(t => t.id === b.dataset.id)); });
}

function cancelarEdicao() {
  edicaoId = "";
  edicaoAnterior = null;
  $("#bt-salvar").textContent = "Registrar transação";
  $("#bt-cancelar-edicao").classList.add("oculto");
}
$("#bt-cancelar-edicao").onclick = cancelarEdicao;
function iniciarEdicao(t) {
  if (!t) return;
  edicaoId = t.id;
  edicaoAnterior = { tipo: t.tipo, categoriaId: t.categoriaId, data: t.data };
  setTipo(t.tipo);
  $("#f-valor").value = String(t.valor).replace(".", ",");
  $("#f-descricao").value = t.descricao;
  $("#f-data").value = new Intl.DateTimeFormat("sv-SE", { timeZone: "America/Sao_Paulo", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(t.data));
  $("#f-categoria").value = t.categoriaId;
  if (t.prioridade) $("#f-prioridade").value = t.prioridade;
  $("#bt-salvar").textContent = "Salvar alterações";
  $("#bt-cancelar-edicao").classList.remove("oculto");
  $("#f-valor").focus();
}

// ------------------------------ Ações --------------------------------------
$("#transacao-form").onsubmit = async (ev) => {
  ev.preventDefault();
  const aviso = $("#aviso");
  aviso.className = "aviso";

  if (!$("#f-valor").value || !$("#f-data").value || !$("#f-descricao").value.trim()) {
    aviso.textContent = "Informe valor, data e descrição.";
    aviso.className = "aviso erro";
    return;
  }
  const valorTexto = $("#f-valor").value.trim();
  if (!/^\d+(?:[.,]\d{1,2})?$/.test(valorTexto) || Number(valorTexto.replace(",", ".")) <= 0) {
    aviso.textContent = "Informe valor positivo com no máximo duas casas decimais.";
    aviso.className = "aviso erro";
    return;
  }

  const payload = {
    tipo: tipoAtual,
    valor: Number(valorTexto.replace(",", ".")),
    descricao: $("#f-descricao").value,
    data: $("#f-data").value,
    ...(tipoAtual === "DESPESA" ? { prioridade: $("#f-prioridade").value } : {}),
    categoriaId: $("#f-categoria").value,
  };

  $("#bt-salvar").disabled = true;
  const eraEdicao = Boolean(edicaoId);
  const anterior = edicaoAnterior;
  try {
    const r = await fetch(edicaoId ? `${API}/transacoes/${edicaoId}` : `${API}/transacoes`, {
      method: edicaoId ? "PUT" : "POST",
      headers: { "Content-Type": "application/json", "X-CSRF-Token": csrf },
      body: JSON.stringify(payload),
    });
    const corpo = await r.json();
    if (r.status === 401) { mostrarAuth(); return; }
    if (!r.ok) {
      aviso.textContent = corpo.erro || "Não foi possível registrar.";
      aviso.className = "aviso erro";
      return;
    }
    aviso.textContent = eraEdicao ? "Transação atualizada." : "Transação registrada.";
    aviso.className = "aviso ok";
    $("#f-valor").value = "";
    $("#f-descricao").value = "";
    $("#f-data").value = hojeLocal();
    cancelarEdicao();
    const atualizado = await atualizarAposTransacao([anterior, payload]);
    if (!atualizado) { aviso.textContent += " Alguns dados da tela não foram atualizados; confira antes de registrar novamente."; aviso.className = "aviso erro"; }
  } catch (e) {
    aviso.textContent = "Não foi possível confirmar o registro. Confira o histórico antes de tentar novamente.";
    aviso.className = "aviso erro";
  } finally {
    $("#bt-salvar").disabled = false;
  }
};

async function excluir(id, anterior) {
  if (!confirm("Excluir esta transação definitivamente? O saldo e o histórico serão atualizados.")) return;
  const aviso = $("#aviso");
  try {
    const r = await fetch(`${API}/transacoes/${id}`, { method: "DELETE", headers: { "X-CSRF-Token": csrf } });
    if (r.status === 401) { mostrarAuth(); return; }
    if (!r.ok) { aviso.textContent = (await r.json()).erro || "Não foi possível excluir."; aviso.className = "aviso erro"; return; }
    if (edicaoId === id) cancelarEdicao();
    aviso.textContent = "Transação excluída."; aviso.className = "aviso ok";
    const atualizado = await atualizarAposTransacao([anterior]);
    if (!atualizado) { aviso.textContent += " Alguns dados da tela não foram atualizados; confira antes de tentar novamente."; aviso.className = "aviso erro"; }
  } catch { aviso.textContent = "Não foi possível confirmar a exclusão. Confira o histórico antes de tentar novamente."; aviso.className = "aviso erro"; }
}

$("#filtro-tipo").onchange = carregarLista;
$("#filtro-categoria").onchange = carregarLista;
$("#periodicidade").onchange = () => Promise.all([carregarResumo(), carregarLista()]);
$("#referencia").onchange = () => Promise.all([carregarResumo(), carregarLista()]);

function escapar(s) {
  const d = document.createElement("div");
  d.textContent = s;
  return d.innerHTML;
}

// ------------------------------ Início -------------------------------------
async function iniciarDados() {
  $("#f-data").value = hojeLocal();
  $("#referencia").value ||= hojeLocal();
  $("#metas-filtro-mes").value ||= hojeLocal().slice(0, 7);
  await carregarCategorias();
  await Promise.all([carregarResumo(), carregarLista(), carregarAlertasMesAtual()]);
}
(async function iniciar() {
  const link = new URLSearchParams(location.search);
  const acao = link.get("acao");
  if ((acao === "verificar" || acao === "recuperar") && link.get("token")) {
    tokenLink = link.get("token");
    history.replaceState(null, "", location.pathname);
    mostrarAuth();
    modo(acao === "verificar" ? "verificar" : "redefinir");
    return;
  }
  const r = await fetch(`${API}/auth/me`);
  if (!r.ok) { mostrarAuth(); return; }
  const data = await r.json(); csrf = data.csrf;
  mostrarApp(data.usuario); await iniciarDados();
})();
