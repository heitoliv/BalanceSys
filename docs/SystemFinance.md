# Sistema de Controle Financeiro Pessoal

## 1. Visão do Projeto

### Visão Geral
Sistema web simples e funcional para controle de finanças pessoais, permitindo registro de transações e visualização de resumo financeiro.

### Problema que o Sistema Resolve
- Falta de controle sobre despesas e receitas.
- Dificuldade de visualizar saldo atual.
- Necessidade de ferramenta simples para registro financeiro.

### Objetivo Principal
- Registrar transações financeiras (receitas e despesas).
- Calcular saldo automaticamente.
- Visualizar histórico de movimentações.

---

## 2. Escopo do Projeto

### Funcionalidades Implementadas
- Cadastro de usuários
- Sistema de login/logout
- Registro de transações (receitas e despesas)
- Dashboard com resumo financeiro
- Histórico de transações
- Exclusão de transações

## 3. Público-Alvo

### Público Principal
- Adultos que desejam controlar suas finanças.
- Estudantes e trabalhadores.

### Público Secundário
- Pequenos empreendedores.
- Pessoas com objetivos financeiros específicos.

---
## 5. Regras de Negócio

### Cadastro e Autenticação
- O usuário deve possuir um email único no sistema.
- A senha deve ter no mínimo 6 caracteres.
- O usuário só pode acessar seus próprios dados financeiros.

### Transações
- Cada transação deve ter: valor, data, categoria e tipo (entrada ou saída).
- Despesas reduzem o saldo; receitas aumentam o saldo.

### Dashboard
- Deve ser atualizado automaticamente a cada nova transação.
---

## 6. Requisitos Funcionais Implementados

**RF01 — Cadastro de Usuário** 
O sistema permite cadastro com nome, email e senha.

**RF02 — Autenticação** 
Login com email e senha, com sessões PHP.

**RF03 — Registrar Transações** 
Registro de receitas e despesas com valor, data, categoria e descrição.

**RF04 — Excluir Transações** 
Exclusão de transações individuais.

**RF05 — Dashboard Resumido** 
Painel com cards de receitas, despesas e saldo.

**RF06 — Histórico** 
Listagem completa de transações ordenadas por data.

---

## 7. Requisitos Não Funcionais (RNF)

**RNF01 — Usabilidade**
A interface deve ser simples, intuitiva e responsiva, adequada para desktop e mobile.

**RNF02 — Desempenho**
As páginas principais devem carregar em menos de 2 segundos.

**RNF03 — Segurança**
* Senhas devem ser criptografadas.
* O usuário só pode acessar os próprios dados.
* A API deve utilizar HTTPS.

**RNF04 — Confiabilidade**
O sistema deve manter integridade dos dados mesmo após erros inesperados.

**RNF05 — Escalabilidade**
A arquitetura deve permitir aumento de usuários sem queda significativa de desempenho.

**RNF06 — Disponibilidade**
O sistema deve estar disponível 99% do tempo.

**RNF07 — Armazenamento**
Dados devem ser mantidos em banco de dados relacional ou não relacional (dependendo da arquitetura definida).

**RNF08 — Manutenibilidade**
O código deve seguir boas práticas para facilitar manutenção e futuras expansões.

---

## 7. Estrutura de Arquivos

```
controle-financeiro/
├── cadastro.php          # Cadastro de usuários
├── login.php             # Autenticação
├── logout.php            # Encerrar sessão
├── index.php             # Dashboard principal
├── transacao.php         # Lógica de transações
├── conexao.php           # Conexão com MySQL
└── style.css             # Estilos personalizados
```

## 8. Tecnologias Utilizadas

- **Backend:** PHP 7.4+
- **Banco:** MySQL
- **Frontend:** HTML5, CSS3, Bootstrap 5.3
- **Ícones:** Font Awesome 6.4
- **Servidor:** XAMPP/WAMP

## 9. Casos de Uso Implementados

### UC01 — Cadastrar Usuário 
1. Usuário acessa cadastro.php
2. Preenche nome, email e senha
3. Sistema valida email único
4. Cria conta e redireciona para login

### UC02 — Fazer Login 
1. Usuário acessa login.php
2. Insere email e senha
3. Sistema valida credenciais
4. Redireciona para dashboard

### UC03 — Registrar Transação 
1. No dashboard, preenche formulário
2. Seleciona tipo, valor, data, categoria
3. Sistema salva no banco
4. Atualiza totais automaticamente

### UC04 — Excluir Transação 
1. Clica no botão excluir na tabela
2. Confirma exclusão
3. Sistema remove do banco
4. Atualiza lista e totais