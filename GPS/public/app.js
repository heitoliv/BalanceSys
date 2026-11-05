// ============================================================================
// cih — Lógica da interface humana (cliente). Conversa com a API da cci.
// Nenhuma regra de negócio aqui: apenas coleta entradas, chama a API e exibe.
// ============================================================================
"use strict";

const API = "/api";
let tipoAtual = "RECEITA";
let categorias = [];

const $ = (s) => document.querySelector(s);
const fmt = (v) =>
  "R$ " + Number(v).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

function dataBR(iso) {
  const d = new Date(iso);
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" });
}
function corCategoria(nome) {
  const mapa = { Renda: "#16a34a", "Alimentação": "#f97316", Transporte: "#2563eb",
    Moradia: "#0d9488", "Saúde": "#dc2626", Lazer: "#7c3aed", Outros: "#64748b" };
  return mapa[nome] || "#64748b";
}

// ---------------------------- Seletor de tipo ------------------------------
$("#bt-receita").onclick = () => setTipo("RECEITA");
$("#bt-despesa").onclick = () => setTipo("DESPESA");
function setTipo(t) {
  tipoAtual = t;
  $("#bt-receita").className = t === "RECEITA" ? "on-rec" : "";
  $("#bt-despesa").className = t === "DESPESA" ? "on-des" : "";
}

// ------------------------------ Carregamento -------------------------------
async function carregarCategorias() {
  const r = await fetch(`${API}/categorias`);
  categorias = await r.json();
  const sel = $("#f-categoria");
  const filtro = $("#filtro-categoria");
  sel.innerHTML = "";
  categorias.forEach((c) => {
    sel.insertAdjacentHTML("beforeend", `<option value="${c.id}">${c.nome}</option>`);
    filtro.insertAdjacentHTML("beforeend", `<option value="${c.id}">${c.nome}</option>`);
  });
}

async function carregarResumo() {
  const r = await fetch(`${API}/resumo`);
  const resumo = await r.json();
  $("#c-receitas").textContent = fmt(resumo.totalReceitas);
  $("#c-despesas").textContent = fmt(resumo.totalDespesas);
  const saldoEl = $("#c-saldo");
  saldoEl.textContent = fmt(resumo.saldo);
  saldoEl.className = "val " + (resumo.saldo >= 0 ? "pos" : "neg");
}

async function carregarLista() {
  const tipo = $("#filtro-tipo").value;
  const cat = $("#filtro-categoria").value;
  const params = new URLSearchParams();
  if (tipo) params.set("tipo", tipo);
  if (cat) params.set("categoriaId", cat);

  const r = await fetch(`${API}/transacoes?${params.toString()}`);
  const lista = await r.json();
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
    corpo.insertAdjacentHTML(
      "beforeend",
      `<tr>
        <td>${escapar(t.descricao)}</td>
        <td><span class="tipo-pill" style="background:${corCategoria(nome)}"></span>${nome}</td>
        <td style="color:var(--suave)">${dataBR(t.data)}</td>
        <td class="valor" style="color:${cor}">${sinal} ${fmt(t.valor)}</td>
        <td><button class="lixo" title="Excluir" data-id="${t.id}">✕</button></td>
      </tr>`
    );
  });

  corpo.querySelectorAll(".lixo").forEach((b) => {
    b.onclick = () => excluir(b.dataset.id);
  });
}

// ------------------------------ Ações --------------------------------------
$("#bt-salvar").onclick = async () => {
  const aviso = $("#aviso");
  aviso.className = "aviso";

  const payload = {
    tipo: tipoAtual,
    valor: parseFloat($("#f-valor").value),
    descricao: $("#f-descricao").value,
    data: $("#f-data").value ? new Date($("#f-data").value).toISOString() : new Date().toISOString(),
    prioridade: $("#f-prioridade").value,
    categoriaId: $("#f-categoria").value,
  };

  $("#bt-salvar").disabled = true;
  try {
    const r = await fetch(`${API}/transacoes`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const corpo = await r.json();
    if (!r.ok) {
      aviso.textContent = corpo.erro || "Não foi possível registrar.";
      aviso.className = "aviso erro";
      return;
    }
    aviso.textContent = "Transação registrada.";
    aviso.className = "aviso ok";
    $("#f-valor").value = "";
    $("#f-descricao").value = "";
    await Promise.all([carregarResumo(), carregarLista()]);
    setTimeout(() => (aviso.className = "aviso"), 2500);
  } catch (e) {
    aviso.textContent = "Erro de conexão com o servidor.";
    aviso.className = "aviso erro";
  } finally {
    $("#bt-salvar").disabled = false;
  }
};

async function excluir(id) {
  if (!confirm("Excluir esta transação?")) return;
  await fetch(`${API}/transacoes/${id}`, { method: "DELETE" });
  await Promise.all([carregarResumo(), carregarLista()]);
}

$("#filtro-tipo").onchange = carregarLista;
$("#filtro-categoria").onchange = carregarLista;

function escapar(s) {
  const d = document.createElement("div");
  d.textContent = s;
  return d.innerHTML;
}

// ------------------------------ Início -------------------------------------
(async function iniciar() {
  $("#f-data").value = new Date().toISOString().slice(0, 10);
  await carregarCategorias();
  await Promise.all([carregarResumo(), carregarLista()]);
})();
