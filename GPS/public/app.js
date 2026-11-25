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
  $("#impacto-meta").classList.remove("meta-impacto-excedida");
  $("#impacto-meta").setAttribute("role", "status");
  cancelarEdicao();
  $("#auth-mensagem").textContent = "";
  $("#auth-mensagem").className = "aviso";
  ocultarCodigo("auth");
  ocultarCodigo("conta");
  for (const id of ["auth-nickname", "auth-senha", "auth-confirmar", "auth-codigo", "conta-codigo-senha", "conta-nickname-novo", "conta-nickname-senha", "conta-senha-atual", "conta-senha-nova", "conta-senha-confirmar"]) $("#" + id).value = "";
  atualizarRegrasConta();
  $("#conta-mensagem").textContent = "";
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
  for (const campo of ["nome", "nickname", "senha", "confirmacao", "codigo"]) $("#erro-" + campo).textContent = "";
}
function ocultarCodigo(local) {
  $("#" + local + "-codigo-gerado").textContent = "";
  $("#" + local + "-codigo-caixa").classList.add("oculto");
  if (local === "auth") { $("#auth-form").classList.remove("oculto"); $("#auth-links").classList.remove("oculto"); }
}
function mostrarCodigo(local, codigo) {
  $("#" + local + "-codigo-gerado").textContent = codigo;
  $("#" + local + "-codigo-caixa").classList.remove("oculto");
  if (local === "auth") { $("#auth-form").classList.add("oculto"); $("#auth-links").classList.add("oculto"); }
  $("#" + local + "-codigo-caixa").scrollIntoView({ block: "nearest" });
  $("#" + local + "-codigo-ok").focus();
}
$("#auth-codigo-ok").onclick = () => { ocultarCodigo("auth"); $("#auth-nickname").focus(); };
$("#conta-codigo-ok").onclick = () => { ocultarCodigo("conta"); $("#conta-codigo-senha").focus(); };
function modo(novo, aviso = "") {
  modoAuth = novo;
  limparErrosAuth();
  mensagemAuth(aviso);
  const cadastro = novo === "cadastro", recuperar = novo === "recuperar";
  $("#auth-titulo").textContent = recuperar ? "Recuperar senha" : cadastro ? "Criar conta" : "Entrar";
  $("#auth-ajuda").textContent = recuperar ? "Informe seu nome de usuário, código de recuperação e nova senha. O código antigo será invalidado." : cadastro ? "Escolha um nome de usuário único e uma senha." : "Entre com seu nome de usuário e senha.";
  $("#auth-enviar").textContent = recuperar ? "Alterar senha" : cadastro ? "Cadastrar" : "Entrar";
  $("#campo-nome").classList.toggle("oculto", !cadastro);
  $("#campo-codigo").classList.toggle("oculto", !recuperar);
  $("#campo-confirmacao").classList.toggle("oculto", !cadastro && !recuperar);
  $("#regras-senha").classList.toggle("oculto", !cadastro && !recuperar);
  $("#auth-recuperar").classList.toggle("oculto", novo !== "login");
  $("#auth-alternar").textContent = cadastro || recuperar ? "Voltar ao login" : "Criar conta";
  $("#auth-senha").autocomplete = cadastro || recuperar ? "new-password" : "current-password";
  $("#auth-senha").value = "";
  $("#auth-confirmar").value = "";
  $("#auth-codigo").value = "";
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
  botao.setAttribute("aria-label", `${visivel ? "Ocultar" : "Mostrar"} ${botao.dataset.label || (campo.id === "auth-confirmar" ? "confirmação da senha" : "senha")}`);
  botao.textContent = visivel ? "Ocultar" : "Mostrar";
  campo.focus();
}));
$("#auth-alternar").onclick = ev => { ev.preventDefault(); modo(modoAuth === "login" ? "cadastro" : "login"); };
$("#auth-recuperar").onclick = ev => { ev.preventDefault(); modo("recuperar"); };
$("#auth-form").onsubmit = async (ev) => {
  ev.preventDefault();
  const nickname = $("#auth-nickname").value.trim();
  const senha = $("#auth-senha").value;
  limparErrosAuth();
  if (!/^[A-Za-z0-9_][A-Za-z0-9_.-]{2,29}$/.test(nickname) || ["admin", "root", "support", "suporte", "balancesys"].includes(nickname.toLowerCase())) {
    $("#erro-nickname").textContent = "Escolha um nome de usuário válido."; return;
  }
  if (modoAuth === "cadastro" || modoAuth === "recuperar") {
    if (!atualizarRegras()) { $("#erro-senha").textContent = "Atenda aos requisitos ainda não marcados."; return; }
    if (senha !== $("#auth-confirmar").value) { $("#erro-confirmacao").textContent = "As senhas não coincidem."; return; }
  }
  if (modoAuth === "login" && !senha) { $("#erro-senha").textContent = "Informe a senha."; return; }
  if (modoAuth === "recuperar" && !/^[a-f0-9]{64}$/i.test($("#auth-codigo").value.trim())) { $("#erro-codigo").textContent = "Informe o código de recuperação de 64 caracteres."; return; }
  $("#auth-enviar").disabled = true;
  try {
    const corpo = modoAuth === "cadastro" ? { nome: $("#auth-nome").value, nickname, senha, confirmarSenha: $("#auth-confirmar").value } : modoAuth === "recuperar" ? { nickname, codigo: $("#auth-codigo").value.trim(), senha, confirmarSenha: $("#auth-confirmar").value } : { nickname, senha };
    const rota = modoAuth === "cadastro" ? "cadastro" : modoAuth === "recuperar" ? "recuperar-senha" : "login";
    const r = await fetch(`${API}/auth/${rota}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(corpo) });
    const data = await r.json();
    if (!r.ok) { if (data.campo) $("#erro-" + (data.campo === "confirmarSenha" ? "confirmacao" : data.campo)).textContent = data.erro; throw new Error(data.erro); }
    if (modoAuth === "cadastro" || modoAuth === "recuperar") { modo("login", data.mensagem); mostrarCodigo("auth", data.codigoRecuperacao); return; }
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
  $("#conta-nickname").textContent = usuario.nickname;
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
$("#conta-nickname-form").onsubmit = async ev => {
  ev.preventDefault();
  const erro = $("#conta-nickname-erro");
  erro.textContent = "";
  try {
    const r = await fetch(`${API}/auth/alterar-nickname`, { method: "POST", headers: { "Content-Type": "application/json", "X-CSRF-Token": csrf }, body: JSON.stringify({ nickname: $("#conta-nickname-novo").value, senhaAtual: $("#conta-nickname-senha").value }) });
    const data = await r.json();
    if (!r.ok) throw new Error(data.erro);
    $("#conta-nickname").textContent = data.nickname;
    $("#conta-nickname-novo").value = "";
    $("#conta-nickname-senha").value = "";
    $("#conta-mensagem").textContent = data.mensagem;
  } catch (e) { erro.textContent = e.message || "Não foi possível alterar o nome de usuário."; }
};

$("#conta-codigo-form").onsubmit = async ev => {
  ev.preventDefault();
  $("#conta-codigo-erro").textContent = "";
  try {
    const r = await fetch(`${API}/auth/gerar-codigo-recuperacao`, { method: "POST", headers: { "Content-Type": "application/json", "X-CSRF-Token": csrf }, body: JSON.stringify({ senhaAtual: $("#conta-codigo-senha").value }) });
    const data = await r.json();
    if (!r.ok) throw new Error(data.erro);
    $("#conta-codigo-senha").value = "";
    mostrarCodigo("conta", data.codigoRecuperacao);
  } catch (e) { $("#conta-codigo-erro").textContent = e.message || "Não foi possível gerar o código."; }
};

function atualizarRegrasConta() {
  const senha = $("#conta-senha-nova").value;
  const regras = { tamanho: senha.length >= 6 && senha.length <= 20, maiuscula: /[A-Z]/.test(senha), minuscula: /[a-z]/.test(senha), numero: /[0-9]/.test(senha), especial: /[^\p{L}\p{N}\s]/u.test(senha) };
  for (const [nome, ok] of Object.entries(regras)) {
    const item = $(`[data-regra-conta="${nome}"]`);
    item.classList.toggle("ok", ok);
    item.textContent = `${ok ? "✓" : "○"} ${item.textContent.replace(/^[✓○] /, "")}`;
  }
  return Object.values(regras).every(Boolean);
}
$("#conta-senha-nova").addEventListener("input", atualizarRegrasConta);
$("#conta-senha-form").onsubmit = async ev => {
  ev.preventDefault();
  const senhaAtual = $("#conta-senha-atual").value;
  const novaSenha = $("#conta-senha-nova").value;
  const confirmarSenha = $("#conta-senha-confirmar").value;
  for (const campo of ["atual", "nova", "confirmar"]) $("#conta-senha-erro-" + campo).textContent = "";
  if (!senhaAtual) { $("#conta-senha-erro-atual").textContent = "Informe a senha atual."; return; }
  if (!atualizarRegrasConta()) { $("#conta-senha-erro-nova").textContent = "Atenda aos requisitos ainda não marcados."; return; }
  if (novaSenha !== confirmarSenha) { $("#conta-senha-erro-confirmar").textContent = "As senhas não coincidem."; return; }
  $("#conta-senha-salvar").disabled = true;
  try {
    const r = await fetch(`${API}/auth/alterar-senha`, { method: "POST", headers: { "Content-Type": "application/json", "X-CSRF-Token": csrf }, body: JSON.stringify({ senhaAtual, novaSenha, confirmarSenha }) });
    const data = await r.json();
    if (!r.ok) {
      if (data.campo) $("#conta-senha-erro-" + ({ senhaAtual: "atual", novaSenha: "nova", confirmarSenha: "confirmar" })[data.campo]).textContent = data.erro;
      if (r.status === 401 && !data.campo) { mostrarAuth(); modo("login", "Sessão expirada. Entre novamente."); return; }
      $("#conta-mensagem").textContent = data.erro || "Não foi possível alterar a senha.";
      return;
    }
    mostrarAuth(); modo("login", data.mensagem);
  } catch { $("#conta-mensagem").textContent = "Serviço indisponível. Tente novamente."; }
  finally { $("#conta-senha-salvar").disabled = false; }
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
  if (!despesas.length) { impacto.textContent = ""; impacto.classList.remove("meta-impacto-excedida"); impacto.setAttribute("role", "status"); return; }
  // Nova mutação deve ser anunciada mesmo se o total permanecer igual após edição.
  impacto.textContent = "";
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
      return `Meta de ${categoria} em ${mes}: despesas registradas ${fmt(p.gastoConsiderado)} de ${fmt(meta.limite)} (${Number(p.percentualUtilizacao).toLocaleString("pt-BR", { maximumFractionDigits: 2 })}%). ${p.excedente > 0 ? `Atenção: meta ultrapassada em ${fmt(p.excedente)}.` : p.restante === 0 ? "Limite alcançado." : `Restam ${fmt(p.restante)}.`}`;
    });
    const excedida = despesas.some(([chave, alvo]) => porMes.get(chave.slice(0, 7)).find(m => m.categoriaId === alvo.categoriaId)?.situacao === "EXCEDIDA");
    impacto.classList.toggle("meta-impacto-excedida", excedida);
    impacto.setAttribute("role", excedida ? "alert" : "status");
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
function descricaoAlerta(meta) {
  const periodo = new Date(`${meta.mes}-15T12:00:00Z`).toLocaleDateString("pt-BR", { month: "long", year: "numeric", timeZone: "UTC" });
  const p = meta.progresso;
  const percentual = Number(p.percentualUtilizacao).toLocaleString("pt-BR", { maximumFractionDigits: 2 });
  const base = `${meta.categoriaNome}, ${periodo}: despesas registradas ${fmt(p.gastoConsiderado)} de ${fmt(meta.limite)} (${percentual}%).`;
  if (meta.situacao === "EXCEDIDA") return `ATENÇÃO: META ULTRAPASSADA. ${base} Excedeu ${fmt(p.excedente)}.`;
  if (meta.situacao === "LIMITE") return `Limite alcançado. ${base}`;
  if (meta.situacao === "ATENCAO") return `Atenção à meta. ${base} Restam ${fmt(p.restante)}.`;
  return `${base} Restam ${fmt(p.restante)}.`;
}
async function carregarAlertasMesAtual() {
  const versao = ++alertasVersao;
  try {
    const mes = hojeLocal().slice(0, 7);
    const metasAtuais = await lerJson(await fetch(`${API}/metas?mes=${mes}`));
    if (versao !== alertasVersao) return true;
    const lista = $("#alertas-metas-lista");
    const notificacoes = metasAtuais.filter(meta => meta.situacao !== "SEM_GASTOS");
    const conteudo = JSON.stringify(notificacoes.map(meta => [meta.id, descricaoAlerta(meta)]));
    if (lista.dataset.conteudo !== conteudo) {
      lista.replaceChildren(...notificacoes.map(meta => {
        const li = document.createElement("li");
        li.className = meta.situacao === "EXCEDIDA" ? "meta-alerta-excedida" : meta.situacao === "LIMITE" ? "meta-alerta-limite" : "meta-alerta-progresso";
        li.textContent = descricaoAlerta(meta);
        return li;
      }));
      lista.dataset.conteudo = conteudo;
    }
    $("#alertas-metas").classList.toggle("oculto", notificacoes.length === 0);
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
    texto.textContent = `Despesas registradas ${fmt(p.gastoConsiderado)} · ${percentual}% utilizado. ${p.excedente > 0 ? `Excedeu ${fmt(p.excedente)}.` : p.restante === 0 ? "Limite alcançado." : `Restam ${fmt(p.restante)}.`}`;
    const barra = document.createElement("progress"); barra.max = 100; barra.value = Math.min(100, p.percentualUtilizacao);
    barra.setAttribute("aria-label", `${percentual}% do limite de ${meta.categoriaNome} utilizado`);
    progresso.append(texto, barra);
    if (meta.situacao !== "SEM_GASTOS") {
      const avisos = document.createElement("ul"); avisos.className = "alertas-linha";
      const li = document.createElement("li"); li.textContent = descricaoAlerta(meta);
      if (meta.situacao === "EXCEDIDA") li.className = "meta-alerta-excedida";
      avisos.append(li);
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
function mostrarAvisoMeta(texto, erro = false) { $("#meta-aviso").textContent = texto; $("#meta-aviso").className = `aviso ${erro ? "erro" : "ok"}`; $("#meta-aviso").setAttribute("role", erro ? "alert" : "status"); }
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
    const alterando = Boolean(metaEdicaoId);
    mostrarAvisoMeta(alterando ? "Meta atualizada." : "Meta criada.");
    cancelarEdicaoMeta(); $("#meta-limite").value = ""; $("#metas-filtro-mes").value = payload.mes;
    const [carregou] = await Promise.all([carregarMetas(), carregarAlertasMesAtual()]);
    const atual = metas.find(meta => meta.id === data.id);
    if (carregou && atual) {
      mostrarAvisoMeta(`${alterando ? "Meta atualizada." : "Meta criada."} ${descricaoAlerta(atual)}`);
      if (atual.situacao === "EXCEDIDA") { $("#meta-aviso").classList.add("meta-impacto-excedida"); $("#meta-aviso").setAttribute("role", "alert"); }
    }
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
  modo("login");
  const r = await fetch(`${API}/auth/me`);
  if (!r.ok) { mostrarAuth(); return; }
  const data = await r.json(); csrf = data.csrf;
  mostrarApp(data.usuario); await iniciarDados();
})();
