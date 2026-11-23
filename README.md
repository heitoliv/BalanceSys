# BalanceSys

Sistema web de gestão financeira pessoal desenvolvido para a disciplina de Gerência de Projetos de Software. O objetivo do produto é permitir registrar e categorizar receitas e despesas em até 3 passos, consultar o saldo mensal em até 2 interações, definir metas por categoria e receber alertas em 80% e 100% do limite. A meta de entrega registrada no Product Backlog é **26/11/2026**.

## Onde está cada parte

| Caminho | Conteúdo |
|---|---|
| [GPS/](GPS/) | Aplicação atual em TypeScript, Express e Prisma/PostgreSQL; código, testes e instruções para executar. |
| [GPS/MANUAL_TEST.md](GPS/MANUAL_TEST.md) | Passo a passo local no NixOS e roteiro de revisão no navegador. |
| [docs/](docs/) | Análise, requisitos, casos de uso, diagramas e especificação de projeto. |
| [docs/product_backlog.md](docs/product_backlog.md) | Visão dos 15 PBIs, prioridades, riscos, dependências e Sprint 1 candidata. |
| [docs/diagnostico_2026-11-19.md](docs/diagnostico_2026-11-19.md) | Estado de aceite, arquitetura, migração, testes e riscos desta rodada. |
| [.github/](.github/) | Templates de issues e pull requests. |
| [balancesys_mvp.html](balancesys_mvp.html) | Protótipo HTML avulso; não é o ponto de entrada da aplicação em GPS/. |
| [CONTRIBUTING.md](CONTRIBUTING.md) | Fluxo de contribuição e revisão. |

O código da aplicação fica em GPS/src/, os testes em GPS/tests/, o modelo e as migrações em GPS/prisma/ e a interface em GPS/public/. Não há diretórios src/ ou tests/ na raiz.

## Estado do produto

A branch de trabalho introduz cadastro, login, sessão e PostgreSQL; registro, listagem, saldo e exclusão parcial continuam sujeitos à validação dos critérios de aceite. Trava RN06, categorização automática, metas, alertas e gráfico permanecem pendentes. A existência de código ou teste não encerra um PBI; consulte o diagnóstico e solicite revisão antes de homologar.

## Backlog e execução

As [issues com a label pbi](https://github.com/heitoliv/BalanceSys/issues?q=is%3Aissue+label%3Apbi) representam o Product Backlog do PDF. Cada item registra história, dependências, tamanho, critérios, prioridade e risco. Prioridade P0 indica execução imediata; P1 segue dependências e capacidade; P2 pode vir após o núcleo de valor. As labels de risco apontam incerteza, não conclusão.

**Sprint 1 candidata:** [cadastro](https://github.com/heitoliv/BalanceSys/issues/38), [login/logout](https://github.com/heitoliv/BalanceSys/issues/39), [receita](https://github.com/heitoliv/BalanceSys/issues/40) e [despesa](https://github.com/heitoliv/BalanceSys/issues/41). [Categorização manual](https://github.com/heitoliv/BalanceSys/issues/43) entra se houver capacidade. O [saldo](https://github.com/heitoliv/BalanceSys/issues/48) tem valor muito alto e deve ser validado cedo; [testes e homologação](https://github.com/heitoliv/BalanceSys/issues/51) começam durante os incrementos, com homologação integrada ao final.

As issues antigas de modelagem e documentação continuam como histórico da fase anterior. Antes de selecionar o trabalho da Sprint, confirmar a capacidade da equipe e conferir os critérios que já são atendidos no incremento GPS/.

## Rodar a aplicação

Consulte [GPS/README.md](GPS/README.md) para instalação, migrações, importação SQLite, Compose, API e testes. Execute os comandos a partir de GPS/. O exemplo seguro de ambiente está em `GPS/.env.example`.

## Equipe

Heitor Oliveira, Kaio Henrique, Gabriel Silva, Pedro Vitor e Kaiva Gums, conforme o Product Backlog fornecido pelo grupo.
