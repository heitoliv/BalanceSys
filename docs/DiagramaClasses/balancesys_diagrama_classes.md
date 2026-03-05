
---

# 📊 BalanceSys — Documentação Técnica do Sistema

## 📝 1. Visão Geral do Sistema
O **BalanceSys** é uma solução de gestão financeira pessoal que permite o controle total de fluxos de caixa. O sistema destaca-se pela automação de categorias, suporte a anexos (comprovantes), projeções futuras e integração com mensageria (WhatsApp/Telegram).

---

## 🏗️ 2. Especificação das Classes e Atributos

### 👤 Gestão de Identidade
| Classe | Atributos | Descrição Técnica |
| :--- | :--- | :--- |
| **Usuario** | `id`, `nome`, `email`, `senha`, `telefone`, `dataCadastro` | Centraliza a conta única (**RN03**) e garante a segurança dos dados (**RN04**). |
| **IntegracaoMensageria** | `id`, `numeroTelefone`, `plataforma` | Permite o uso de bots para registro via texto ou áudio (**RF11, RF12**). |

### 💰 Movimentações e Planejamento
| Classe | Atributos | Descrição Técnica |
| :--- | :--- | :--- |
| **Transacao** | `id`, `valor`, `data`, `descricao`, `tipo`, `importancia` | O campo `importancia` atende à **RN01**. Suporta Receitas e Despesas. |
| **Categoria** | `id`, `nome`, `descricao` | Base para a categorização automática (**RN02**) e filtros de busca (**RF06**). |
| **MetaFinanceira** | `id`, `valorObjetivo`, `valorAtual`, `dataInicio`, `dataFim` | Vinculada a categorias para monitorar limites de gastos (**RF05**). |
| **Recorrencia** | `id`, `periodicidade`, `dataInicio`, `dataFim` | Gerencia transações agendadas como aluguel ou assinaturas (**RF09**). |
| **Comprovante** | `id`, `nomeArquivo`, `tipoArquivo`, `urlArquivo` | Armazena metadados de PDFs ou imagens anexadas (**RF10**). |

### 📈 Inteligência e Notificações
| Classe | Atributos | Descrição Técnica |
| :--- | :--- | :--- |
| **ProjecaoFinanceira** | `id`, `saldoAtual`, `saldoProjetado`, `dataCalculo` | Algoritmo que estima o saldo futuro baseando-se no histórico (**RF08**). |
| **Relatorio** | `id`, `periodoInicio`, `periodoFim`, `dataGeracao` | Estrutura para exportação de PDFs e planilhas (**RF07, RF14**). |
| **Notificacao** | `id`, `mensagem`, `tipo`, `dataEnvio`, `status` | Alerta sobre saldo negativo (**RN05**), metas e vencimentos (**RF13**). |

---

## 🔠 3. Enumerações
*   **TipoTransacao**
    *   `RECEITA`: Entradas de capital.
    *   `DESPESA`: Saídas de capital.

---

## 🔗 4. Matriz de Relacionamentos (UML)
As associações abaixo refletem as regras de negócio e os fluxos dos Casos de Uso:

| Origem | Papel | Destino | Cardinalidade | Requisito / UC |
| :--- | :--- | :--- | :---: | :--- |
| `Usuario` | *possui* | `Transacao` | **1 : 0..*** | RF03 / UC03 |
| `Usuario` | *define* | `MetaFinanceira` | **1 : 0..*** | RF05 / UC11 |
| `Usuario` | *gera* | `Relatorio` | **1 : 0..*** | RF14 / UC09 |
| `Usuario` | *recebe* | `Notificacao` | **1 : 0..*** | RF13 / UC15 |
| `Usuario` | *consulta* | `ProjecaoFinanceira` | **1 : 0..1** | RF08 / UC13 |
| `Usuario` | *vincula* | `IntegracaoMensageria`| **1 : 0..1** | RF11 / UC14 |
| `Transacao` | *pertence* | `Categoria` | **0..* : 1** | RN02 / UC12 |
| `Transacao` | *possui* | `Recorrencia` | **0..1 : 1** | RF09 / UC06 |
| `Transacao` | *anexa* | `Comprovante` | **0..1 : 1** | RF10 / UC03 |
| `MetaFinanceira` | *relacionada*| `Categoria` | **\* : 1** | RF05 / UC11 |

---

## 🛠️ 5. Regras de Integridade Aplicadas
*   **RN05 (Saldo Negativo):** O sistema valida a soma das `Transacoes` antes de permitir uma nova despesa via `UC03`.
*   **RN06 (Integridade Temporal):** Atributo `data` da `Transacao` é usado para bloquear `UC04` (Exclusão) e `UC05` (Edição) após X dias.
*   **RN04 (Segurança):** Todos os relacionamentos partem do `id` do `Usuario` logado.

---
**BalanceSys - Especificação Completa**
*Desenvolvido para garantir escalabilidade e rastreabilidade total de requisitos.*