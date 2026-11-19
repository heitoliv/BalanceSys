# BalanceSys

Sistema web de gestão financeira pessoal desenvolvido para a disciplina de Gerência de Projetos de Software. O objetivo do produto é permitir registrar e categorizar receitas e despesas em até 3 passos, consultar o saldo mensal em até 2 interações, definir metas por categoria e receber alertas em 80% e 100% do limite. A meta de entrega registrada no Product Backlog é **26/11/2026**.

## Onde está cada parte

| Caminho | Conteúdo |
|---|---|
| [GPS/](GPS/) | Aplicação atual em TypeScript, Express e Prisma/SQLite; código, testes e instruções para executar. |
| [docs/](docs/) | Análise, requisitos, casos de uso, diagramas e especificação de projeto. |
| [docs/product_backlog.md](docs/product_backlog.md) | Visão dos 15 PBIs, prioridades, riscos, dependências e Sprint 1 candidata. |
| [.github/](.github/) | Templates de issues e pull requests. |
| [balancesys_mvp.html](balancesys_mvp.html) | Protótipo HTML avulso; não é o ponto de entrada da aplicação em GPS/. |
| [CONTRIBUTING.md](CONTRIBUTING.md) | Fluxo de contribuição e revisão. |

O código da aplicação fica em GPS/src/, os testes em GPS/tests/, o modelo e as migrações em GPS/prisma/ e a interface em GPS/public/. Não há diretórios src/ ou tests/ na raiz.

## Estado do produto

O primeiro incremento em GPS/ possui registro de transações, listagem com filtros, cálculo de saldo e exclusão parcial, usando um usuário de exemplo. Cadastro e autenticação, trava RN06, categorização automática, metas, alertas e gráfico ainda exigem implementação ou validação. A existência de código não encerra um PBI: seus critérios de aceite e a integração com usuários autenticados precisam ser demonstrados.

## Backlog e execução

As [issues com a label pbi](https://github.com/heitoliv/BalanceSys/issues?q=is%3Aissue+label%3Apbi) representam o Product Backlog do PDF. Cada item registra história, dependências, tamanho, critérios, prioridade e risco. Prioridade P0 indica execução imediata; P1 segue dependências e capacidade; P2 pode vir após o núcleo de valor. As labels de risco apontam incerteza, não conclusão.

**Sprint 1 candidata:** [cadastro](https://github.com/heitoliv/BalanceSys/issues/38), [login/logout](https://github.com/heitoliv/BalanceSys/issues/39), [receita](https://github.com/heitoliv/BalanceSys/issues/40) e [despesa](https://github.com/heitoliv/BalanceSys/issues/41). [Categorização manual](https://github.com/heitoliv/BalanceSys/issues/43) entra se houver capacidade. O [saldo](https://github.com/heitoliv/BalanceSys/issues/48) tem valor muito alto e deve ser validado cedo; [testes e homologação](https://github.com/heitoliv/BalanceSys/issues/51) começam durante os incrementos, com homologação integrada ao final.

As issues antigas de modelagem e documentação continuam como histórico da fase anterior. Antes de selecionar o trabalho da Sprint, confirmar a capacidade da equipe e conferir os critérios que já são atendidos no incremento GPS/.

## Rodar a aplicação

Consulte [GPS/README.md](GPS/README.md) para instalação, migrações, execução, API e testes. Execute os comandos a partir de GPS/. A documentação instrui copiar .env.example, mas esse arquivo não aparece na árvore atual do repositório; a equipe deve fornecer a configuração local do banco antes de rodar as migrações.

## Equipe

Heitor Oliveira, Kaio Henrique, Gabriel Silva, Pedro Vitor e Kaiva Gums, conforme o Product Backlog fornecido pelo grupo.
