# Sistema de Controle Financeiro Pessoal

## 1. Requisitos Funcionais (RF)

| ID | Descrição | Prioridade | Dependências |
|----|-----------|------------|--------------|
| RF01 | O sistema deve permitir que o usuário crie e acesse uma conta | Must | - |
| RF02 | O sistema deve apresentar um dashboard com visão geral de gastos, receitas e saldo | Must | RF01, RF03 |
| RF03 | O sistema deve permitir registrar receitas e despesas | Must | RF01 |
| RF04 | O sistema deve permitir editar e excluir transações registradas | Must | RF03 |
| RF05 | O sistema deve permitir que o usuário defina metas financeiras e acompanhe seu progresso | Should | RF03 |
| RF06 | O sistema deve permitir visualizar histórico de transações com filtros por período, categoria ou tipo | Must | RF03 |
| RF07 | O sistema deve permitir exportar dados e gráficos financeiros em PDF ou planilha | Should | RF03, RF14 |
| RF08 | O sistema deve gerar projeções de saldo futuro com base nas transações registradas | Could | RF03 |
| RF09 | O sistema deve permitir cadastrar receitas e despesas recorrentes (ex: aluguel, salário) | Must | RF03 |
| RF10 | O sistema deve permitir anexar imagens ou PDFs como comprovantes de transações | Could | RF03 |
| RF11 | O sistema deve permitir registrar transações via mensagem de texto ou áudio em aplicativo de mensageria (ex: WhatsApp) | Could | RF03 |
| RF12 | O sistema deve permitir consultar saldo e gastos via aplicativo de mensageria | Could | RF03 |
| RF13 | O sistema deve enviar notificações sobre saldo baixo, vencimento de contas ou metas atingidas | Could | RF03, RF05 |
| RF14 | O sistema deve gerar gráficos e relatórios personalizados por período, categoria ou tipo de transação | Must | RF03 |
| RF15 | O sistema deve exibir feedback motivacional ou de parabenização após ações relevantes (ex: registrar transações ou progresso financeiro) | Could | RF03 |
| RF16 | O sistema deve apresentar indicadores visuais de progresso das metas financeiras | Could | RF05 |
| RF17 | O sistema deve enviar alertas motivacionais ou de parabenização quando o usuário estiver próximo de atingir metas financeiras (ex: 80% da meta atingida) | Could | RF05 |

---

## 2. Requisitos Não Funcionais (RNF)

| ID | Descrição | Prioridade | Impacto |
|----|-----------|------------|--------|
| RNF01 | A interface deve ser simples, intuitiva e responsiva para uso em navegadores web | Must | Alto |
| RNF02 | O sistema deve permitir registrar transações de forma rápida, inclusive por foto ou texto | Must | Alto |
| RNF03 | O sistema deve garantir que usuários acessem apenas seus próprios dados através de mecanismos de autenticação e autorização | Must | Alto |
| RNF04 | O sistema deve realizar backup automático dos dados dos usuários | Must | Moderado |
| RNF05 | O sistema deve suportar os idiomas português e inglês | Could | Baixo |
| RNF06 | O sistema deve proteger os dados dos usuários por meio de criptografia e boas práticas de segurança | Must | Alto |
| RNF07 | A interface deve seguir princípios de Design Persuasivo, priorizando: Primary Task Support, Dialogue Support e Self-Monitoring | Could | Moderado |

---

## 3. Regras de Negócio (RN)

| ID | Descrição | Prioridade | RF Impactados |
|----|-----------|------------|---------------|
| RN01 | O sistema deve permitir que o usuário estabeleça prioridades para seus gastos | Should | RF03 |
| RN02 | O sistema deve categorizar automaticamente as transações registradas | Must | RF03, RF06, RF14 |
| RN03 | Cada usuário deve possuir apenas uma conta no sistema | Must | RF01 |
| RN04 | O usuário pode acessar somente seus próprios dados financeiros | Must | RF01, RF03, RF04 |
| RN05 | O sistema deve alertar o usuário ao registrar despesas que resultem em saldo negativo | Should | RF03, RF13 |
| RN06 | O sistema deve impedir alterações em transações após um período definido de dias para preservar a integridade do histórico | Could | RF04 |

---

## 4. Classificação de Prioridade (MoSCoW)

| Prioridade | Significado |
|------------|-------------|
| Must | Funcionalidade essencial para o funcionamento do sistema |
| Should | Funcionalidade importante, mas não crítica |
| Could | Funcionalidade desejável, mas opcional |