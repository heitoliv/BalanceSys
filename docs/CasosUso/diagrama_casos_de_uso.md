# Diagrama de Casos de Uso — BalanceSys

O diagrama abaixo representa os atores internos e externos do sistema e suas interações com os Casos de Uso.

```mermaid
graph LR
    %% Atores Internos
    Usuario([Usuário])
    Sistema([Sistema BalanceSys])

    %% Atores Externos
    Bot([Bot de Mensageria\nWhatsApp/Telegram])
    SMTP([Serviço de E-mail\nSMTP])
    Dompdf([Serviço de Exportação\ndompdf])
    OAuth([OAuth\nGoogle])

    %% UC01 - Cadastrar Usuário
    UC01(UC01\nCadastrar Usuário)
    Usuario --> UC01
    OAuth -->|Autenticação externa| UC01

    %% UC02 - Fazer Login
    UC02(UC02\nFazer Login)
    Usuario --> UC02
    OAuth -->|Autenticação externa| UC02

    %% UC03 - Registrar Transação
    UC03(UC03\nRegistrar Transação)
    Usuario --> UC03
    UC03 -->|inclui| UC12

    %% UC04 - Excluir Transação
    UC04(UC04\nExcluir Transação)
    Usuario --> UC04

    %% UC05 - Editar Transação
    UC05(UC05\nEditar Transação)
    Usuario --> UC05

    %% UC06 - Agendar Transação Recorrente
    UC06(UC06\nAgendar Transação\nRecorrente)
    Usuario --> UC06
    Sistema -->|lança automaticamente| UC06

    %% UC07 - Filtrar Histórico
    UC07(UC07\nFiltrar Histórico\nde Transações)
    Usuario --> UC07

    %% UC08 - Dashboard
    UC08(UC08\nVisualizar Dashboard)
    Usuario --> UC08

    %% UC09 - Relatórios
    UC09(UC09\nVisualizar Relatórios\ncom Gráficos)
    Usuario --> UC09

    %% UC10 - Exportar Dados
    UC10(UC10\nExportar Dados)
    Usuario --> UC10
    Dompdf -->|gera PDF| UC10

    %% UC11 - Metas
    UC11(UC11\nGerenciar Metas\nFinanceiras)
    Usuario --> UC11
    UC11 -->|estende| UC15
    SMTP -->|envia alerta| UC11

    %% UC12 - Classificação Automática
    UC12(UC12\nClassificar Transação\nAutomaticamente)
    Sistema -->|executa| UC12

    %% UC13 - Projeção de Saldo
    UC13(UC13\nVisualizar Projeção\nde Saldo Futuro)
    Usuario --> UC13

    %% UC14 - Mensageria
    UC14(UC14\nInteragir via App\nde Mensageria)
    Usuario --> UC14
    Bot -->|intermedia| UC14

    %% UC15 - Notificações Push
    UC15(UC15\nReceber Notificações\nPush)
    Sistema -->|dispara| UC15

    %% UC16 - Logout
    UC16(UC16\nFazer Logout)
    Usuario --> UC16
```

## Legenda

| Símbolo | Significado |
|---------|------------|
| `-->` | Associação direta entre ator e caso de uso |
| `inclui` | Um UC obrigatoriamente executa outro |
| `estende` | Um UC pode, em certas condições, acionar outro |
| Ator externo | Serviço de terceiros que interage com o sistema |
