# Diagrama de Arquitetura — BalanceSys

> Artefato canônico referenciado pela Seção 4.3 da Especificação de Projeto (Issue #24).
> Formato: Mermaid (renderização nativa no GitHub).

## Visão em Camadas (MVC + Service Layer)

```mermaid
flowchart TB
    actor(("Usuário"))

    subgraph APP["Aplicação BalanceSys — MVC + Service Layer"]
        direction TB
        subgraph UI["1. Camada de Apresentação (View)"]
            V["Telas Web — HTML / CSS / JS / Bootstrap / Chart.js"]
        end
        subgraph CTRL["2. Camada de Controle (Controller)"]
            C["Controllers — Auth · Transacao · Meta · Relatorio · Recorrencia"]
        end
        subgraph SVC["3. Camada de Lógica de Negócio (Services)"]
            S1["TransacaoService"]
            S2["CategoriaService"]
            S3["MetaService"]
            S4["RecorrenciaService"]
            S5["ComprovanteService"]
            S6["ProjecaoService"]
            S7["NotificacaoService"]
            S8["MensageriaService"]
        end
        subgraph DOM["4. Camada de Domínio (Model)"]
            D["Usuario · Sessao · Transacao · Categoria · Comprovante · TransacaoRecorrente · Meta · Notificacao · Dashboard · Projecao"]
        end
        subgraph PERS["5. Camada de Persistência"]
            R["Repositórios / DAO"]
            DB[("Banco de Dados Relacional")]
        end
    end

    subgraph EXT["Integrações Externas"]
        OAuth["OAuthGoogle"]
        Bot["BotMensageria — WhatsApp / Telegram"]
        SMTP["ServicoEmail — SMTP"]
        PDFEXP["ServicoExportacao — dompdf"]
    end

    actor --> V
    V --> C
    C --> S1 & S2 & S3 & S4 & S5 & S6 & S7
    S1 --> D
    S2 --> D
    S3 --> D
    S4 --> D
    S5 --> D
    S6 --> D
    S7 --> D
    D --> R
    R --> DB

    Bot --> S8
    S8 --> S1
    C -. autentica .-> OAuth
    S7 -. envia alerta .-> SMTP
    C -. exporta RF07 .-> PDFEXP
```

## Legenda

- **Setas cheias** — fluxo de controle interno (pedido → execução → persistência).
- **Setas pontilhadas** — chamadas a serviços externos.
- A numeração das camadas (1 a 5) indica a direção do fluxo de uma requisição típica.

> Para exportar como PNG, abra este arquivo no GitHub (que renderiza o Mermaid) ou cole o bloco em <https://mermaid.live> e use *Export*.
