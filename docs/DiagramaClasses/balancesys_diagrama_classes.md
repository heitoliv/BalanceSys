# Documentação do Diagrama de Classes — BalanceSys

## Sumário

1. [Visão Geral](#1-visão-geral)
2. [Classes de Entidade](#2-classes-de-entidade)
3. [Serviços e Atores Externos](#3-serviços-e-atores-externos)
4. [Enumerações](#4-enumerações)
5. [Relacionamentos](#5-relacionamentos)
6. [Rastreabilidade com Requisitos](#6-rastreabilidade-com-requisitos)

---

## 1. Visão Geral

O diagrama de classes do **BalanceSys** modela o domínio de um sistema de controle financeiro pessoal. É composto por **14 classes** — entidades de domínio, serviços externos e enumerações — organizadas em cinco domínios funcionais.

> **Decisão de modelagem:** Os relatórios, gráficos e exportação de dados (RF07, RF14) são **funcionalidades do sistema**, não entidades com estado próprio. Por isso, essas responsabilidades foram incorporadas como métodos do `Dashboard`, que aciona o `ServicoExportacao` diretamente. Isso reflete que relatórios são *comportamentos* executados sobre os dados de transações, e não objetos persistíveis.

| Domínio | Classes |
|---|---|
| Autenticação e Identidade | `Usuario`, `Sessao`, `OAuthGoogle` |
| Transações Financeiras | `Transacao`, `Categoria`, `Comprovante`, `TransacaoRecorrente` |
| Metas e Alertas | `Meta`, `Notificacao` |
| Visualização e Exportação | `Dashboard`, `Projecao` |
| Integrações Externas | `BotMensageria`, `ServicoEmail`, `ServicoExportacao` |
| Enumerações de Domínio | `TipoTransacao`, `PrioridadeGasto`, `TipoArquivo`, `Periodicidade`, `TipoNotificacao` |

---

## 2. Classes de Entidade

### 2.1 `Usuario`

**Descrição:** Representa o usuário registrado na plataforma. É a entidade raiz do sistema — todas as transações, metas, notificações e sessões estão vinculadas a um usuário autenticado. Suporta cadastro manual e via OAuth Google.

**Atributos:**

| Atributo | Tipo | Descrição |
|---|---|---|
| `id` | int | Identificador único auto-incremental |
| `nome` | String | Nome completo do usuário |
| `email` | String | E-mail único, usado como identificador de login |
| `senhaHash` | String | Hash da senha (nunca armazenada em texto claro) |
| `telefone` | String | Número vinculado ao bot de mensageria |
| `providerOAuth` | String | Provedor OAuth, se aplicável (ex: "google") |
| `criadoEm` | DateTime | Data de criação da conta |

**Métodos:**

| Método | Descrição |
|---|---|
| `cadastrar()` | Valida unicidade do e-mail e persiste o registro (RF01, RN03) |
| `login()` | Autentica credenciais e inicia sessão (RF01, RN04) |
| `logout()` | Invalida o token de sessão ativo (RF01) |
| `vincularTelefone()` | Associa número de telefone para uso com o bot de mensageria (RF11, RF12) |

**Requisitos:** RF01 | **Regras:** RN03, RN04

---

### 2.2 `Sessao`

**Descrição:** Controla o ciclo de vida de uma sessão autenticada. Garante que apenas o usuário legítimo acesse seus próprios dados, implementando o requisito de autorização por token (RN04).

**Atributos:**

| Atributo | Tipo | Descrição |
|---|---|---|
| `token` | String | Token JWT ou equivalente |
| `expiracao` | DateTime | Data/hora de expiração da sessão |

**Métodos:**

| Método | Descrição |
|---|---|
| `iniciar()` | Cria e armazena o token de sessão |
| `invalidar()` | Revoga o token, encerrando a sessão |
| `validar()` | Verifica se o token é válido e não expirou |

**Requisitos:** RF01 | **Regras:** RN04

---

### 2.3 `Transacao` ⭐

**Descrição:** Núcleo do sistema financeiro. Representa qualquer movimentação de entrada (receita) ou saída (despesa) registrada pelo usuário. É a origem dos cálculos do `Dashboard` e das tendências da `Projecao`. Suporta anexo de comprovante, categorização automática e prioridade de gasto.

**Atributos:**

| Atributo | Tipo | Descrição |
|---|---|---|
| `id` | int | Identificador único |
| `valor` | float | Valor monetário da movimentação |
| `tipo` | TipoTransacao | RECEITA ou DESPESA |
| `descricao` | String | Texto livre usado para categorização automática |
| `data` | Date | Data efetiva da movimentação |
| `prioridade` | PrioridadeGasto | Nível de importância do gasto (RN01) |
| `criadoEm` | DateTime | Timestamp de criação do registro |
| `atualizadoEm` | DateTime | Timestamp da última edição |

**Métodos:**

| Método | Descrição |
|---|---|
| `registrar()` | Persiste a transação e aciona recálculo de saldos (RF03) |
| `editar()` | Atualiza campos dentro do prazo permitido (RF04, RN06) |
| `excluir()` | Remove o registro verificando permissão e prazo (RF04, RN04, RN06) |
| `validarPrazoEdicao()` | Verifica se a transação ainda está dentro da janela editável (RN06) |

**Requisitos:** RF03, RF04, RF10 | **Regras:** RN01, RN04, RN05, RN06

---

### 2.4 `Categoria`

**Descrição:** Define as categorias de classificação das transações (ex: Alimentação, Transporte, Saúde). Suporta categorização automática via palavras-chave, implementando a regra de negócio RN02 (UC12).

**Atributos:**

| Atributo | Tipo | Descrição |
|---|---|---|
| `id` | int | Identificador único |
| `nome` | String | Nome da categoria (ex: "Alimentação") |
| `icone` | String | Referência ao ícone visual da categoria |
| `palavrasChave` | String[] | Array de termos para matching automático |

**Métodos:**

| Método | Descrição |
|---|---|
| `classificarAutomaticamente(descricao)` | Analisa o texto da transação e sugere a categoria mais provável (RN02, UC12) |

**Requisitos:** RF06, RF14 | **Regras:** RN02

---

### 2.5 `Comprovante`

**Descrição:** Representa um arquivo (imagem ou PDF) anexado como evidência de uma transação. Implementa RF10. A validação do formato impede uploads de tipos não suportados.

**Atributos:**

| Atributo | Tipo | Descrição |
|---|---|---|
| `id` | int | Identificador único |
| `urlArquivo` | String | Caminho ou URL de armazenamento do arquivo |
| `tipoArquivo` | TipoArquivo | IMAGEM ou PDF |
| `uploadEm` | DateTime | Timestamp do upload |

**Métodos:**

| Método | Descrição |
|---|---|
| `validarFormato()` | Verifica se o arquivo é do tipo aceito — IMAGEM ou PDF (RF10) |

**Requisitos:** RF10

---

### 2.6 `TransacaoRecorrente`

**Descrição:** Permite agendar transações periódicas (ex: salário mensal, aluguel, assinaturas). O sistema gera automaticamente instâncias de `Transacao` nas datas programadas, sem necessidade de registro manual pelo usuário.

**Atributos:**

| Atributo | Tipo | Descrição |
|---|---|---|
| `id` | int | Identificador único |
| `valor` | float | Valor da transação recorrente |
| `descricao` | String | Descrição do agendamento |
| `periodicidade` | Periodicidade | Frequência: DIARIA, SEMANAL, MENSAL ou ANUAL |
| `proximaData` | Date | Próxima data de lançamento automático |
| `ativa` | Boolean | Flag de ativação do agendamento |

**Métodos:**

| Método | Descrição |
|---|---|
| `agendar()` | Salva a regra de recorrência no sistema |
| `cancelar()` | Desativa o agendamento sem apagar o histórico já lançado |
| `gerarTransacao()` | Cria uma instância de `Transacao` na data programada |

**Requisitos:** RF09

---

### 2.7 `Meta`

**Descrição:** Define limites de gastos ou objetivos de economia que o usuário deseja acompanhar. A cada nova transação registrada, o sistema verifica o progresso e pode disparar notificações motivacionais ou de alerta.

**Atributos:**

| Atributo | Tipo | Descrição |
|---|---|---|
| `id` | int | Identificador único |
| `nome` | String | Nome da meta (ex: "Economizar para viagem") |
| `valorLimite` | float | Valor alvo da meta |
| `valorAtual` | float | Valor acumulado até o momento |
| `dataInicio` | Date | Início do período de acompanhamento |
| `dataFim` | Date | Fim do período de acompanhamento |

**Métodos:**

| Método | Descrição |
|---|---|
| `calcularProgresso()` | Retorna o percentual atingido da meta (RF05, RF16) |
| `verificarAlerta()` | Dispara `Notificacao` ao atingir 80% ou 100% do limite (RF13, RF17) |
| `atualizar()` | Recalcula `valorAtual` após cada nova transação |

**Requisitos:** RF05, RF16, RF17

---

### 2.8 `Dashboard`

**Descrição:** Painel central do usuário. Agrega totais de receitas, despesas e saldo, e é o ponto de entrada para gráficos, relatórios e exportação de dados. Gráficos e relatórios são **funcionalidades** expostas como métodos — não entidades independentes. Quando o usuário solicita exportação, o `Dashboard` aciona o `ServicoExportacao` diretamente.

**Atributos:**

| Atributo | Tipo | Descrição |
|---|---|---|
| `totalReceitas` | float | Soma de todas as receitas do período selecionado |
| `totalDespesas` | float | Soma de todas as despesas do período selecionado |
| `saldoAtual` | float | Saldo calculado: totalReceitas − totalDespesas |

**Métodos:**

| Método | Descrição |
|---|---|
| `calcularTotais()` | Soma receitas e despesas para o período selecionado (RF02) |
| `renderizar()` | Atualiza todos os painéis visuais na interface |
| `gerarGrafico(filtros)` | Compila dados de `Transacao` e renderiza gráficos por período, categoria ou tipo (RF14) |
| `exportarPDF()` | Aciona `ServicoExportacao` para gerar PDF com os dados exibidos (RF07) |
| `exportarPlanilha()` | Aciona `ServicoExportacao` para gerar planilha com os dados exibidos (RF07) |

**Requisitos:** RF02, RF07, RF14

---

### 2.9 `Projecao`

**Descrição:** Calcula tendências futuras de saldo com base no histórico de transações do usuário. Exige ao menos 2 meses de dados para gerar estimativas confiáveis. Caso o histórico seja insuficiente, o sistema exibe um aviso informativo.

**Atributos:**

| Atributo | Tipo | Descrição |
|---|---|---|
| `mesesHistorico` | int | Quantidade de meses de histórico analisados |
| `tendenciaGastos` | float[] | Array com médias de despesas por mês |
| `tendenciaReceitas` | float[] | Array com médias de receitas por mês |

**Métodos:**

| Método | Descrição |
|---|---|
| `calcularProjecao()` | Aplica algoritmo de tendência e projeta o saldo futuro (RF08) |
| `validarHistoricoSuficiente()` | Verifica se há dados de ao menos 2 meses disponíveis |

**Requisitos:** RF08

---

### 2.10 `Notificacao`

**Descrição:** Representa um alerta gerado automaticamente pelo sistema para o usuário, cobrindo situações como saldo baixo, vencimentos de contas e aproximação ou superação de metas. Pode ser entregue via push na interface web ou por e-mail via `ServicoEmail`.

**Atributos:**

| Atributo | Tipo | Descrição |
|---|---|---|
| `id` | int | Identificador único |
| `tipo` | TipoNotificacao | Categoria do alerta (ver enumeração) |
| `mensagem` | String | Texto do alerta a ser exibido ao usuário |
| `lida` | Boolean | Indica se o usuário já visualizou o alerta |
| `enviadaEm` | DateTime | Timestamp de geração e envio |

**Métodos:**

| Método | Descrição |
|---|---|
| `enviar()` | Publica o alerta no canal correspondente — push ou e-mail (RF13) |
| `marcarComoLida()` | Atualiza o flag `lida` para verdadeiro |

**Requisitos:** RF13, RF15, RF17

---

## 3. Serviços e Atores Externos

### 3.1 `OAuthGoogle`

**Descrição:** Serviço externo de autenticação que permite ao usuário criar conta ou fazer login usando sua conta Google (OAuth 2.0), eliminando a necessidade de cadastro manual de senha.

| Método | Descrição |
|---|---|
| `autenticar()` | Redireciona para o fluxo de autorização Google e obtém o token |
| `retornarDadosUsuario()` | Retorna nome e e-mail do usuário após autorização |

**Relacionado a:** UC01, UC02 | RF01

---

### 3.2 `BotMensageria`

**Descrição:** Interface de comunicação que permite registrar transações ou consultar saldo por mensagem de texto ou áudio via WhatsApp ou Telegram, sem necessidade de acessar o sistema web. O número de telefone do usuário deve estar previamente vinculado à conta.

| Método | Descrição |
|---|---|
| `processarMensagem(texto)` | Interpreta mensagem de texto em linguagem natural |
| `processarAudio(audio)` | Converte áudio em texto e processa o comando |
| `responder(mensagem)` | Envia resposta ao usuário no chat |
| `vincularConta(telefone)` | Associa o número de telefone à conta do usuário |

**Relacionado a:** RF11, RF12 | UC14

---

### 3.3 `ServicoEmail`

**Descrição:** Serviço SMTP externo responsável pelo envio de alertas e resumos financeiros por e-mail. Falhas no envio são registradas internamente sem interromper o fluxo principal do sistema.

| Método | Descrição |
|---|---|
| `enviarAlerta(destinatario, mensagem)` | Envia e-mail de alerta (ex: meta atingida, saldo baixo) |
| `enviarResumo(destinatario, dados)` | Envia resumo financeiro periódico ao usuário |

**Relacionado a:** RF13 | UC11, UC15

---

### 3.4 `ServicoExportacao`

**Descrição:** Serviço (biblioteca dompdf ou equivalente) responsável pela geração de arquivos PDF e planilhas a partir dos dados financeiros do usuário. É acionado diretamente pelo `Dashboard` quando o usuário solicita exportação.

| Método | Descrição |
|---|---|
| `gerarPDF(dados)` | Gera e retorna arquivo PDF com os dados recebidos |
| `gerarPlanilha(dados)` | Gera e retorna planilha (.xlsx ou .csv) com os dados recebidos |

**Relacionado a:** RF07 | UC10

---

## 4. Enumerações

| Enumeração | Valores | Usada em |
|---|---|---|
| `TipoTransacao` | `RECEITA`, `DESPESA` | `Transacao`, `Dashboard` |
| `PrioridadeGasto` | `ESSENCIAL`, `IMPORTANTE`, `OPCIONAL` | `Transacao` (RN01) |
| `TipoArquivo` | `IMAGEM`, `PDF` | `Comprovante` |
| `Periodicidade` | `DIARIA`, `SEMANAL`, `MENSAL`, `ANUAL` | `TransacaoRecorrente` |
| `TipoNotificacao` | `SALDO_BAIXO`, `META_ATINGIDA`, `META_PROXIMA`, `VENCIMENTO`, `MOTIVACIONAL` | `Notificacao` |

---

## 5. Relacionamentos

### 5.1 Associações

| Origem | Destino | Multiplicidade | Descrição |
|---|---|---|---|
| `Usuario` | `Transacao` | 1 → 0..* | Um usuário registra múltiplas transações |
| `Usuario` | `Meta` | 1 → 0..* | Um usuário define múltiplas metas |
| `Usuario` | `TransacaoRecorrente` | 1 → 0..* | Um usuário agenda múltiplas recorrências |
| `Usuario` | `Notificacao` | 1 → 0..* | Um usuário recebe múltiplas notificações |
| `Usuario` | `Sessao` | 1 → 1 | Um usuário possui exatamente uma sessão ativa |
| `Usuario` | `Dashboard` | 1 → 1 | Cada usuário tem seu próprio dashboard |
| `Transacao` | `Comprovante` | 1 → 0..1 | Uma transação pode ter zero ou um comprovante |
| `Transacao` | `Categoria` | 0..* → 1 | Múltiplas transações pertencem a uma categoria |
| `Meta` | `Notificacao` | 1 → 0..* | Uma meta pode disparar múltiplos alertas |
| `Meta` | `Categoria` | 0..1 → 1 | Uma meta pode ser associada a uma categoria específica |

### 5.2 Dependências

| Origem | Destino | Descrição |
|---|---|---|
| `OAuthGoogle` | `Usuario` | Autentica e fornece dados para criação do usuário |
| `TransacaoRecorrente` | `Transacao` | Gera instâncias de `Transacao` nas datas programadas |
| `BotMensageria` | `Transacao` | Cria transações a partir de mensagens enviadas pelo usuário |
| `BotMensageria` | `Dashboard` | Consulta saldo e totais para responder ao usuário |
| `Dashboard` | `Transacao` | Consolida dados de transações para exibição e gráficos |
| `Dashboard` | `Meta` | Exibe barras de progresso das metas ativas |
| `Dashboard` | `ServicoExportacao` | Aciona geração de PDF ou planilha (RF07) |
| `Projecao` | `Transacao` | Baseia os cálculos de tendência no histórico de transações |
| `Notificacao` | `ServicoEmail` | Envia alertas por e-mail via SMTP |

### 5.3 Uso de Enumerações

| Classe | Enumeração | Contexto |
|---|---|---|
| `Transacao` | `TipoTransacao` | Distingue RECEITA de DESPESA em cada registro |
| `Transacao` | `PrioridadeGasto` | Classifica a importância do gasto (RN01) |
| `Comprovante` | `TipoArquivo` | Valida se o upload é IMAGEM ou PDF |
| `TransacaoRecorrente` | `Periodicidade` | Define o intervalo de repetição do agendamento |
| `Notificacao` | `TipoNotificacao` | Categoriza o tipo de alerta enviado ao usuário |

---

## 6. Rastreabilidade com Requisitos

| Classe | RFs Atendidos | RNs Atendidas | UCs Relacionados |
|---|---|---|---|
| `Usuario` | RF01 | RN03, RN04 | UC01, UC02, UC16 |
| `Sessao` | RF01 | RN04 | UC02, UC16 |
| `Transacao` | RF03, RF04, RF10 | RN01, RN04, RN05, RN06 | UC03, UC04, UC05 |
| `Categoria` | RF06, RF14 | RN02 | UC12 |
| `Comprovante` | RF10 | — | UC03, UC05 |
| `TransacaoRecorrente` | RF09 | — | UC06 |
| `Meta` | RF05, RF16, RF17 | — | UC11 |
| `Dashboard` | RF02, RF07, RF14 | — | UC08, UC09, UC10 |
| `Projecao` | RF08 | — | UC13 |
| `Notificacao` | RF13, RF15, RF17 | — | UC15 |
| `BotMensageria` | RF11, RF12 | — | UC14 |
| `ServicoEmail` | RF13 | — | UC11, UC15 |
| `ServicoExportacao` | RF07 | — | UC10 |
| `OAuthGoogle` | RF01 | — | UC01, UC02 |
