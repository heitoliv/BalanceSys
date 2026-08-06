# Diagrama de Arquitetura — BalanceSys

> Artefato canônico referenciado pela Seção 4.3 da Especificação de Projeto (Issue #24).
> Método: Fábrica de Software (IFES/Serra) — partição única em três camadas. Formato: Mermaid.

## Diagrama de Pacotes (partição única + três camadas)

```mermaid
flowchart TB
    actor(("Usuário"))

    subgraph balancesys["partição: balancesys"]
        direction TB
        subgraph ciu["ciu — Camada de Interface com o Usuário"]
            cih["cih — Interface Humana<br/>classes de visão (Pag... «boundary»)"]
            cci["cci — Controle de Interação<br/>controladoras (Ctrl... «control»)"]
        end
        subgraph cln["cln — Camada de Lógica de Negócio"]
            cgt["cgt — Gerência de Tarefas<br/>classes de aplicação (Apl...)"]
            cdp["cdp — Domínio do Problema<br/>entidades"]
        end
        cgd["cgd — Camada de Gerência de Dados<br/>(padrão DAO)"]
    end

    subgraph util["utilitario"]
        upers["utilitarioPersistencia"]
    end

    subgraph ext["Integrações Externas"]
        oauth["OAuth Google"]
        smtp["ServicoEmail (SMTP)"]
        pdf["dompdf"]
        bot["Bot Mensageria"]
    end

    actor --> cih
    cih -.-> cci
    cci --> cgt
    cgt --> cdp
    cln --> cgd
    cgd -.-> upers
    cci -. autentica .-> oauth
    cgt -. alerta .-> smtp
    cgt -. exporta .-> pdf
    bot -.-> cgt
```

## Legenda

- **ciu / cln / cgd** — as três camadas da partição.
- **Setas cheias** — fluxo de controle descendente (visão → controle → aplicação → domínio → persistência).
- **Setas pontilhadas** — dependências (realimentação visão↔controle e chamadas a integrações externas/utilitário).

> Para exportar como PNG, abra este arquivo no GitHub ou cole o bloco em <https://mermaid.live> e use *Export*.
