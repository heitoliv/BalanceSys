# Estrutura do Banco de Dados - Sistema de Controle Financeiro

Este documento explica a estrutura atual do banco de dados implementado no sistema.

## Tabelas Implementadas

### 1. Tabela: usuarios
**Função:** Armazena os dados dos usuários do sistema.

**Campos:**
- `id` (INT, AUTO_INCREMENT, PRIMARY KEY) - Identificador único
- `nome` (VARCHAR(100)) - Nome completo do usuário
- `email` (VARCHAR(100), UNIQUE) - Email para login (único)
- `senha` (VARCHAR(255)) - Senha do usuário
- `data_criacao` (TIMESTAMP) - Data de criação da conta

**Relacionamentos:** Um usuário pode ter muitas transações (1:N)

### 2. Tabela: transacoes
**Função:** Registra todas as movimentações financeiras dos usuários.

**Campos:**
- `id` (INT, AUTO_INCREMENT, PRIMARY KEY) - Identificador único
- `usuario_id` (INT, FOREIGN KEY) - Referência ao usuário
- `tipo` (ENUM: 'receita', 'despesa') - Tipo da transação
- `valor` (DECIMAL(10,2)) - Valor da transação
- `data` (DATE) - Data da transação
- `categoria` (VARCHAR(100)) - Categoria da transação
- `descricao` (TEXT) - Descrição opcional
- `data_criacao` (TIMESTAMP) - Data de registro no sistema

**Relacionamentos:** 
- Pertence a um usuário (N:1)
- Chave estrangeira: `usuario_id` → `usuarios.id`

## Relacionamentos

```
usuarios (1) ←→ (N) transacoes
```

**Explicação:**
- Um usuário pode ter múltiplas transações
- Cada transação pertence a apenas um usuário
- Ao excluir um usuário, suas transações são excluídas automaticamente (CASCADE)

## Funcionalidades do Sistema

### Cadastro e Autenticação
- Usuários se cadastram com nome, email e senha
- Email deve ser único no sistema
- Login realizado com email e senha

### Transações
- Usuários registram receitas e despesas
- Cada transação tem valor, data, categoria e descrição opcional
- Sistema calcula automaticamente:
  - Total de receitas
  - Total de despesas  
  - Saldo (receitas - despesas)

### Segurança
- Cada usuário só acessa suas próprias transações
- Validação de sessão em todas as páginas protegidas
- Escape de strings SQL para prevenir injection

## SQL de Criação

```sql
-- Tabela de usuários
CREATE TABLE usuarios (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nome VARCHAR(100) NOT NULL,
    email VARCHAR(100) NOT NULL UNIQUE,
    senha VARCHAR(255) NOT NULL,
    data_criacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabela de transações
CREATE TABLE transacoes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    usuario_id INT NOT NULL,
    tipo ENUM('receita', 'despesa') NOT NULL,
    valor DECIMAL(10, 2) NOT NULL,
    data DATE NOT NULL,
    categoria VARCHAR(100) NOT NULL,
    descricao TEXT,
    data_criacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE
);
```

## Resumo
Este banco de dados simples e eficiente permite que o sistema registre transações financeiras de múltiplos usuários, mantendo os dados organizados e seguros. A estrutura atual suporta todas as funcionalidades implementadas no sistema.