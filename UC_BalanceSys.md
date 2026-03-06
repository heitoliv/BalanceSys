# Especificação de Casos de Uso — BalanceSys

Este documento detalha os Casos de Uso (UCs) do sistema BalanceSys, definindo o comportamento do sistema, os fluxos de interação com os usuários e a rastreabilidade com os Requisitos Funcionais (RFs) e Regras de Negócio (RNs).

## Atores do Sistema
* **Usuário:** Pessoa física que utiliza o sistema ou aplicativo de mensageria para gerenciar suas finanças pessoais.
* **Sistema (BalanceSys):** Processa dados, valida regras de negócio, aplica automações e atualiza os dashboards.

---

### Identificador: UC01 — Cadastrar Usuário
**Atores:** Usuário, Sistema
**Requisitos Relacionados:** RF01, RN03
**Objetivo:** Permitir que um novo usuário crie uma conta no sistema.
**Pré-condições:** O usuário não possui uma conta cadastrada com o e-mail informado.
**Pós-condições:** Conta única criada com sucesso e usuário redirecionado para login.

**Fluxo Básico:**
1. O Usuário acessa a página de cadastro.
2. O Usuário preenche os campos obrigatórios.
3. O Sistema valida se os dados são únicos e atende aos critérios de segurança.
4. O Sistema cria a conta no banco de dados.
5. O Sistema redireciona o Usuário para a tela de login.

**Fluxos Alternativos / Exceções:**
* **E1: Conta já existente:** O Sistema detecta que já existe um registro (RN03), exibe uma mensagem de erro e interrompe o cadastro.
* **E2: Campos obrigatórios vazios:** O Sistema bloqueia o envio do formulário e destaca os campos faltantes.

---

### Identificador: UC02 — Fazer Login
**Atores:** Usuário, Sistema
**Requisitos Relacionados:** RF01, RN04
**Objetivo:** Autenticar o usuário e conceder acesso seguro.
**Pré-condições:** O usuário deve possuir uma conta cadastrada.
**Pós-condições:** Sessão iniciada.

**Fluxo Básico:**
1. O Usuário acessa a página de login e informa suas credenciais.
2. O Sistema consulta o banco de dados e valida as credenciais.
3. O Sistema inicia a sessão do usuário, garantindo acesso apenas aos seus próprios dados (RN04).
4. O Sistema redireciona o Usuário para o Dashboard.

**Fluxos Alternativos / Exceções:**
* **A1: Usuário já logado:** O Sistema redireciona automaticamente para o Dashboard.
* **E1: Credenciais inválidas:** O Sistema exibe erro e solicita nova digitação.

---

### Identificador: UC03 — Registrar Transação
**Atores:** Usuário, Sistema
**Requisitos Relacionados:** RF03, RF10, RN01, RN05
**Objetivo:** Registrar uma nova movimentação financeira (receita ou despesa).
**Pré-condições:** Usuário autenticado.
**Pós-condições:** Transação salva no banco de dados e saldos atualizados.

**Fluxo Básico:**
1. O Usuário acessa o formulário de nova transação.
2. O Usuário seleciona o tipo (*Receita* ou *Despesa*), informa valor, data, descrição e ordem de importância (RN01).
3. O Usuário pode, opcionalmente, fazer o upload de uma imagem ou PDF como comprovante (RF10).
4. O Sistema analisa a descrição e categoriza automaticamente (UC12).
5. O Sistema salva o registro no banco de dados.
6. O Sistema recalcula os totais e atualiza o dashboard.

**Fluxos Alternativos / Exceções:**
* **A1: Alerta de Saldo Negativo (RN05):** Ao registrar uma despesa, o Sistema identifica que o saldo ficará negativo e exibe um alerta de advertência antes da confirmação final.
* **E1: Formato de arquivo inválido:** No upload do comprovante (RF10), o Sistema recusa arquivos que não sejam imagens ou PDFs.
* **E2: Valor inválido:** O Sistema bloqueia o envio se o valor for nulo.

---

### Identificador: UC04 — Excluir Transação
**Atores:** Usuário, Sistema
**Requisitos Relacionados:** RF04, RN04, RN06
**Objetivo:** Remover uma transação previamente registrada.
**Pré-condições:** Usuário autenticado e ser o proprietário da transação.
**Pós-condições:** Registro removido e saldos recalculados.

**Fluxo Básico:**
1. O Usuário localiza a transação no histórico e clica em "Excluir".
2. O Sistema verifica a data da transação.
3. O Sistema exibe um modal solicitando a confirmação.
4. O Usuário confirma a operação.
5. O Sistema remove a transação do banco de dados e recalcula o saldo.

**Fluxos Alternativos / Exceções:**
* **E1: Prazo de alteração expirado (RN06):** A transação possui mais de "X dias" de registro. O Sistema impede a exclusão para garantir a integridade do histórico e exibe mensagem de bloqueio.
* **E2: Violação de permissão (RN04):** Tentativa de excluir transação de terceiros. Ação bloqueada.

---

### Identificador: UC05 — Editar Transação
**Atores:** Usuário, Sistema
**Requisitos Relacionados:** RF04, RF10, RN06
**Objetivo:** Atualizar os dados de uma transação já existente.
**Pré-condições:** Usuário autenticado.
**Pós-condições:** Transação modificada e saldos consolidados.

**Fluxo Básico:**
1. O Usuário localiza a transação e aciona "Editar".
2. O Sistema verifica a janela de tempo do registro.
3. O Sistema abre um formulário com os dados preenchidos, incluindo acesso ao comprovante anexado (RF10).
4. O Usuário altera os campos desejados e confirma.
5. O Sistema atualiza o banco de dados e a interface.

**Fluxos Alternativos / Exceções:**
* **E1: Edição bloqueada (RN06):** Se a transação ultrapassou "X dias", o Sistema bloqueia a abertura do formulário de edição.

---

### Identificador: UC06 — Agendar Transação Recorrente
**Atores:** Usuário, Sistema
**Requisitos Relacionados:** RF09
**Objetivo:** Configurar despesas ou receitas que se repetem periodicamente.
**Pré-condições:** Usuário autenticado.
**Pós-condições:** Agendamento ativo.

**Fluxo Básico:**
1. O Usuário acessa a tela de Agendamentos.
2. O Usuário informa os dados da transação (valor, categoria) e a periodicidade (ex: mensal).
3. O Sistema salva a regra de recorrência.
4. O Sistema passa a lançar automaticamente a transação nas datas programadas.

**Fluxos Alternativos / Exceções:**
* **A1: Cancelamento de Recorrência:** O Usuário interrompe um agendamento. O Sistema cessa os lançamentos futuros sem afetar o histórico já processado.

---

### Identificador: UC07 — Filtrar Histórico de Transações
**Atores:** Usuário, Sistema
**Requisitos Relacionados:** RF06
**Objetivo:** Buscar transações por critérios específicos para facilitar a busca.
**Pré-condições:** Usuário autenticado.
**Pós-condições:** Lista atualizada com os resultados.

**Fluxo Básico:**
1. O Usuário acessa o histórico.
2. O Usuário define os filtros (mês, ano, categoria, tipo).
3. O Sistema processa a busca e exibe apenas as transações correspondentes.

---

### Identificador: UC08 — Visualizar Dashboard
**Atores:** Usuário, Sistema
**Requisitos Relacionados:** RF02
**Objetivo:** Prover acesso a um painel consolidado com gastos e ganhos.
**Pré-condições:** Usuário autenticado.
**Pós-condições:** Nenhuma (operação de leitura).

**Fluxo Básico:**
1. O Usuário navega para a tela inicial.
2. O Sistema soma as receitas e despesas.
3. O Sistema renderiza os painéis de resumo financeiro.

---

### Identificador: UC09 — Visualizar Relatórios com Gráficos
**Atores:** Usuário, Sistema
**Requisitos Relacionados:** RF14
**Objetivo:** Gerar gráficos personalizados por período, categoria ou tipo.
**Pré-condições:** Usuário autenticado.
**Pós-condições:** Nenhuma (operação de leitura).

**Fluxo Básico:**
1. O Usuário acessa a área de Relatórios.
2. O Usuário define a parametrização do gráfico.
3. O Sistema compila os dados e renderiza os gráficos interativos.

---

### Identificador: UC10 — Exportar Dados
**Atores:** Usuário, Sistema
**Requisitos Relacionados:** RF07
**Objetivo:** Gerar um arquivo com os dados das transações e gráficos.
**Pré-condições:** Usuário autenticado.
**Pós-condições:** Arquivo PDF ou Planilha baixado pelo usuário.

**Fluxo Básico:**
1. O Usuário clica em "Exportar" em um histórico ou relatório.
2. O Usuário seleciona o formato (PDF ou Planilha).
3. O Sistema compila os dados, gera o arquivo e inicia o download.

---

### Identificador: UC11 — Gerenciar Metas Financeiras
**Atores:** Usuário, Sistema
**Requisitos Relacionados:** RF05
**Objetivo:** Definir e acompanhar metas de economia ou limites de gastos.
**Pré-condições:** Usuário autenticado.
**Pós-condições:** Meta salva e sendo monitorada pelo sistema.

**Fluxo Básico:**
1. O Usuário acessa a aba de Metas e estipula um valor.
2. O Sistema salva a meta.
3. O Sistema exibe o progresso atualizado no dashboard, confrontando a meta com os gastos reais.

---

### Identificador: UC12 — Classificar Transação Automaticamente
**Atores:** Sistema
**Requisitos Relacionados:** RN02
**Objetivo:** Categorizar as transações sem esforço manual.
**Pré-condições:** Registro de uma nova movimentação.
**Pós-condições:** Categoria atribuída.

**Fluxo Básico:**
1. O Usuário insere a descrição durante o registro.
2. O Sistema analisa a string, cruza com o banco de palavras-chave ou histórico do usuário e seleciona a categoria correspondente.

---

### Identificador: UC13 — Visualizar Projeção de Saldo Futuro
**Atores:** Usuário, Sistema
**Requisitos Relacionados:** RF08
**Objetivo:** Exibir uma projeção financeira baseada em algoritmos/médias.
**Pré-condições:** Usuário autenticado e com volume de dados suficiente.
**Pós-condições:** Nenhuma (leitura).

**Fluxo Básico:**
1. O Usuário acessa o painel de Projeções.
2. O Sistema calcula tendências de gastos e ganhos baseando-se no histórico.
3. O Sistema exibe a linha de projeção futura do saldo.

---

### Identificador: UC14 — Interagir via App de Mensageria
**Atores:** Usuário, Sistema
**Requisitos Relacionados:** RF11, RF12
**Objetivo:** Consultar saldos ou registrar transações através do WhatsApp/Mensageria.
**Pré-condições:** Número de telefone do usuário vinculado à conta do BalanceSys.
**Pós-condições:** Resposta gerada no chat ou transação registrada no banco.

**Fluxo Básico:**
1. O Usuário envia uma mensagem de texto ou áudio para o bot do sistema ("Gastei 50 no mercado" ou "Qual meu saldo?").
2. O Sistema processa a linguagem natural da mensagem.
3. O Sistema executa a ação correspondente (Registro de saída via RF11 ou Consulta via RF12).
4. O Sistema responde no chat com a confirmação ou a informação solicitada.

**Fluxos Alternativos / Exceções:**
* **E1: Número não vinculado:** O Sistema não reconhece o telefone e envia um link para autenticação e vínculo da conta.
* **E2: Mensagem incompreendida:** O Sistema solicita que o Usuário reformule a requisição de forma mais clara.

---

### Identificador: UC15 — Receber Notificações Push
**Atores:** Sistema
**Requisitos Relacionados:** RF13
**Objetivo:** Alertar o usuário sobre saldo baixo, vencimentos e metas atingidas.
**Pré-condições:** Gatilho interno disparado (ex: data de vencimento próxima).
**Pós-condições:** Alerta entregue via Push na interface do aplicativo/web.

**Fluxo Básico:**
1. O Sistema monitora ativamente as metas e datas de agendamentos.
2. O Sistema identifica que uma condição de alerta foi atingida (ex: saldo crítico).
3. O Sistema gera uma notificação interna (Push notification) para o Usuário logado.

---

### Identificador: UC16 — Fazer Logout
**Atores:** Usuário, Sistema
**Requisitos Relacionados:** RF01
**Objetivo:** Encerrar a sessão ativa.
**Pré-condições:** Sessão iniciada.
**Pós-condições:** Acesso restrito revogado e redirecionamento para a tela pública.

**Fluxo Básico:**
1. O Usuário seleciona a opção "Sair".
2. O Sistema invalida o token de sessão e redireciona a interface.