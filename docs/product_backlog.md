# Product Backlog inicial — BalanceSys

Fonte: **Gabarito para Construção do Product Backlog**, fornecido pelo grupo (15 PBIs, seções 2, 4–10). Meta do documento: sistema funcional até **26/11/2026**. Esta página é um índice; os critérios de aceite e a execução ficam nas issues vinculadas. PBIs permanecem abertos até haver evidência do aceite.

## Product Goal

Registrar e categorizar receitas e despesas em até 3 passos, visualizar o saldo mensal em até 2 interações, definir metas de gasto por categoria e receber alertas em 80% e 100% do limite.

## Legenda de gestão

- **P0:** núcleo mínimo ou qualidade crítica, iniciar cedo respeitando dependências.
- **P1:** próximo incremento; priorizar pelo caminho crítico e pela redução de risco.
- **P2:** após o núcleo e as validações prioritárias.
- **Risco:** avaliação inicial do PDF, não corresponde à severidade de um defeito.
- **Tamanho:** S/M/L do PDF, ainda sujeito a refinamento. Não é uma promessa de prazo.

## PBIs e rastreabilidade

| Ordem PDF | PBI | Entrega | Prioridade | Risco | Tamanho | Depende de |
|---:|---|---|---|---|:---:|---|
| 1 | [PBI-01](https://github.com/heitoliv/BalanceSys/issues/38) | Cadastro | P0 | Médio | M | — |
| 2 | [PBI-02](https://github.com/heitoliv/BalanceSys/issues/39) | Login e logout | P0 | Médio | M | 01 |
| 3 | [PBI-03](https://github.com/heitoliv/BalanceSys/issues/40) | Receita | P0 | Médio | M | 02 |
| 4 | [PBI-04](https://github.com/heitoliv/BalanceSys/issues/41) | Despesa | P0 | Médio | M | 02 |
| 5 | [PBI-05](https://github.com/heitoliv/BalanceSys/issues/43) | Categoria manual | P1 | Médio | S | 03, 04 |
| 6 | [PBI-06](https://github.com/heitoliv/BalanceSys/issues/42) | Categoria automática | P1 | Alto | L | 05 |
| 7 | [PBI-07](https://github.com/heitoliv/BalanceSys/issues/44) | Edição/exclusão e RN06 | P1 | Médio | M | 03, 04 |
| 8 | [PBI-08](https://github.com/heitoliv/BalanceSys/issues/45) | Metas por categoria | P1 | Médio | M | 05 |
| 9 | [PBI-09](https://github.com/heitoliv/BalanceSys/issues/46) | Progresso das metas | P1 | Médio | M | 08, 03, 04 |
| 10 | [PBI-10](https://github.com/heitoliv/BalanceSys/issues/47) | Alertas 80%/100% | P1 | Médio | M | 09 |
| 11 | [PBI-11](https://github.com/heitoliv/BalanceSys/issues/48) | Saldo consolidado | P0 | Médio | M | 03, 04 |
| 12 | [PBI-12](https://github.com/heitoliv/BalanceSys/issues/49) | Histórico filtrável | P1 | Baixo | M | 03, 04, 05 |
| 13 | [PBI-13](https://github.com/heitoliv/BalanceSys/issues/50) | Gráfico receitas × despesas | P2 | Baixo | M | 11, 12 |
| 14 | [PBI-14](https://github.com/heitoliv/BalanceSys/issues/51) | Testes e homologação | P0 | Alto | M | 06, 07, 10, 11, 13 para aceite final |
| 15 | [PBI-15](https://github.com/heitoliv/BalanceSys/issues/52) | Entrega final | P1 | Médio | M | 14 |

A ordem acima preserva o PDF. A prioridade é uma proposta operacional: o saldo tem **valor muito alto** e os testes devem começar desde o primeiro incremento, embora a homologação integrada dependa das demais entregas. O PBI-06 tem risco alto de não atingir 70% e merece validação antecipada, sem bloquear o fluxo mínimo de cadastro e registro.

## Sprint 1 candidata

**Objetivo:** permitir que um usuário crie conta, entre e registre receitas e despesas em até 3 passos, com isolamento dos seus dados. Selecionar PBI-01, 02, 03 e 04 após estimar capacidade. PBI-05 é opcional se houver capacidade. Iniciar casos de teste do PBI-14 junto das histórias e validar a base do saldo PBI-11. Não atribuir itens a pessoas sem acordo da equipe.

## Riscos e ações de controle

| Risco identificado no PDF ou na inspeção | Ação de controle |
|---|---|
| Categorização automática abaixo de 70% (R3) | Definir amostra e métrica antes da implementação; medir cedo, manter opção manual e registrar evidência. |
| Sobreposição com outras disciplinas e ausência em período crítico | Limitar trabalho em andamento, dividir histórias na Sprint e revisar capacidade com o grupo. |
| Divergência entre especificações herdadas | Validar regras atuais com professor/equipe; registrar decisão antes de implementar, especialmente obrigatoriedade de categoria e RN06. |
| Subestimativa e prazo curto até 26/11/2026 | Ordenar por dependência e valor; replanejar escopo da Sprint sem declarar critérios atendidos sem teste. |
| Primeiro incremento usa usuário padrão e não inclui autenticação | Integrar PBI-01/02 antes de aceitar isolamento de transações, saldo e filtros. |
| GPS/README.md cita .env.example ausente na árvore atual | Acrescentar exemplo de configuração sem segredos e validar instruções de execução. |

## Fluxo de trabalho e evidências

1. Refinar a issue: confirmar regra, responsável, critérios e tamanho antes de entrar na Sprint.
2. Implementar em branch ligada ao PBI; abrir PR com evidências de teste, efeitos em documentação e referência à issue.
3. Conferir critérios de aceite na interface e na API; registrar resultado, especialmente os limites de 3 passos, 2 interações, 30 dias, 70%, 80%/100% e 60% de cobertura crítica.
4. Encerrar a issue após revisão e aceite. Código parcial em GPS/ é evidência de progresso, não de conclusão.

As issues #23–#28 pertencem à especificação anterior e devem ser revisadas separadamente; não foram duplicadas como histórias de produto. A organização das pastas existentes está descrita no [README geral](../README.md) e a execução técnica em [GPS/README.md](../GPS/README.md).
