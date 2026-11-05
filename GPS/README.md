# BalanceSys — Incremento 1

Sistema de controle financeiro pessoal. Este incremento entrega o **registro de receitas e despesas com persistência real em banco de dados** e o **saldo consolidado** — o fluxo funcional mínimo previsto para a Entrega 2 (Execução e Controle).

> **Para o grupo:** este código segue fielmente a arquitetura em camadas documentada em Projeto de Sistemas (*CDP → CGT → CGD → CIU*). A estrutura de pastas abaixo já está preparada para receber os PBIs seguintes (metas, categorização automática, trava RN06) sem reorganização.

---

## O que está implementado (Incremento 1)

| Caso de uso | Descrição | Onde |
|---|---|---|
| **UC03** | Registrar transação (receita/despesa), com valor, data, descrição, categoria e prioridade (RN01) | `AplControlarTransacao.registrarTransacao` |
| **UC07** | Listar e filtrar histórico (por tipo, categoria, período) | `AplControlarTransacao.listarTransacoes` |
| **UC08 / RF02** | Saldo consolidado (receitas − despesas) | `CalculadoraSaldo` + `obterResumo` |
| **UC04** (parcial) | Excluir transação | `AplControlarTransacao.removerTransacao` |
| Regra **E2** | Bloqueio de valor nulo, negativo ou inválido | `Transacao.criar` |
| Regra **RN01** | Prioridade de gasto na transação | enum `PrioridadeGasto` |
| Regra **RN04** | Transação pertence a um usuário | vínculo obrigatório + filtro por `usuarioId` |

**Fora do escopo deste incremento** (incrementos seguintes): login/cadastro (PBI-01/02), categorização automática (PBI-06), metas e alertas (PBI-08/09/10), trava RN06 (PBI-07), gráficos (PBI-13).

---

## Decisão de projeto: SQLite + Prisma

O Documento de Projeto previa PostgreSQL. Para este incremento, usa-se **SQLite via Prisma**: é um banco relacional real (ACID, SQL, migrações), mas armazenado num único arquivo (`prisma/dev.db`), **sem servidor a configurar** — roda em qualquer máquina do grupo com um `npm install`.

A migração para PostgreSQL, quando o grupo quiser, exige apenas:
1. trocar `provider = "sqlite"` por `provider = "postgresql"` em `prisma/schema.prisma`;
2. apontar `DATABASE_URL` para o servidor Postgres;
3. rodar `npm run prisma:migrate`.

Nenhum outro arquivo muda — essa é a vantagem de isolar a persistência atrás da porta `TransacaoRepository`.

---

## Como rodar

Pré-requisito: **Node.js 18+**.

```bash
# 1. Instalar dependências
npm install

# 2. Criar o arquivo .env (copie do exemplo)
cp .env.example .env

# 3. Criar o banco e as tabelas
npm run prisma:migrate

# 4. (Opcional) Popular com dados de exemplo
npm run seed

# 5. Subir o sistema
npm run dev
```

Acesse **http://localhost:3000**.

### Rodar os testes

```bash
npm test
```

20 testes cobrindo as regras de domínio, o cálculo de saldo e a gerência de aplicação.

---

## Arquitetura de pastas

A estrutura espelha as camadas da arquitetura. **Cada nova funcionalidade entra na camada correspondente, sem tocar nas demais.**

```
balancesys/
├── prisma/
│   ├── schema.prisma        # cgd — modelo de dados (Usuario, Categoria, Transacao)
│   ├── seed.ts              # dados de exemplo
│   └── dev.db               # banco SQLite (gerado; não versionar)
│
├── src/
│   ├── domain/              # ░░ CDP — Camada de Domínio do Problema ░░
│   │   ├── shared/
│   │   │   ├── enums.ts              # TipoTransacao, PrioridadeGasto (RN01)
│   │   │   └── DomainError.ts        # erro de regra de negócio
│   │   └── transacao/
│   │       ├── Transacao.ts          # entidade central (ADR-01) + validações (E2, RN01)
│   │       ├── TransacaoRepository.ts# PORTA de persistência (contrato)
│   │       └── CalculadoraSaldo.ts   # serviço de saldo (PBI-11)
│   │
│   ├── application/         # ░░ CGT — Camada de Gerência de Tarefas ░░
│   │   └── transacao/
│   │       ├── AplControlarTransacao.ts  # orquestra UC03, UC04, UC07, UC08
│   │       └── dtos.ts                    # objetos de transferência
│   │
│   ├── infrastructure/     # ░░ CGD — Camada de Gerência de Dados ░░
│   │   ├── prisma/client.ts                      # conexão (singleton)
│   │   └── persistence/
│   │       ├── PrismaTransacaoRepository.ts       # DAO concreto (implementa a porta)
│   │       └── Bootstrap.ts                       # usuário padrão + categorias
│   │
│   ├── interface/          # ░░ CIU — Camada de Interface com o Usuário ░░
│   │   └── http/
│   │       ├── CtrlTransacao.ts   # cci — controladora (rotas HTTP)
│   │       └── server.ts          # montagem do Express
│   │
│   ├── config/
│   │   └── container.ts    # composition root (injeção de dependências)
│   └── main.ts             # ponto de entrada
│
├── public/                 # cih — interface humana (página servida)
│   ├── index.html
│   └── app.js
│
└── tests/                  # testes das três camadas (PBI-14)
    ├── domain/
    ├── application/
    └── InMemoryTransacaoRepository.ts  # duplo de teste da porta
```

### Onde adicionar os próximos PBIs

| PBI | Onde criar | O que reaproveitar |
|---|---|---|
| **PBI-01/02** — Login/cadastro | nova pasta `domain/usuario/` + `application/usuario/AplPrincipal.ts` + rotas em `interface/http/` | o modelo `Usuario` já existe no schema |
| **PBI-06** — Categorização automática | `domain/categoria/Categoria.ts` com `classificarAutomaticamente()` | campo `palavrasChave` a adicionar na `Categoria` |
| **PBI-07** — Trava RN06 | método `validarPrazoEdicao()` em `Transacao.ts` | a entidade já centraliza as regras |
| **PBI-08/09/10** — Metas e alertas | `domain/meta/` + `application/meta/AplGerenciarMeta.ts` | `CalculadoraSaldo` como referência de serviço |
| **PBI-13** — Gráfico | `interface/` (front) consumindo `/api/resumo` | o endpoint de resumo já existe |

---

## API (endpoints do Incremento 1)

| Método | Rota | Função |
|---|---|---|
| `POST` | `/api/transacoes` | Registrar transação (UC03) |
| `GET` | `/api/transacoes?tipo=&categoriaId=&de=&ate=` | Listar/filtrar (UC07) |
| `GET` | `/api/resumo?de=&ate=` | Saldo consolidado (UC08) |
| `DELETE` | `/api/transacoes/:id` | Excluir (UC04) |
| `GET` | `/api/categorias` | Listar categorias |

---

## Verificação (evidência de teste — produto da Entrega 2)

- **20 testes automatizados** (`npm test`) passando: regras de domínio, cálculo de saldo, gerência de aplicação.
- **Teste de ponta a ponta**: registro via API persiste no banco e o saldo recalcula corretamente (receitas R$ 6.500 − despesas R$ 1.769,90 = saldo R$ 4.730,10).
- **Persistência real confirmada**: os dados sobrevivem ao reinício do processo (lidos diretamente do arquivo `dev.db`).
