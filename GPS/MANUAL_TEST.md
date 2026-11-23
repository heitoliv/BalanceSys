# Executar e revisar no navegador (NixOS, 19/11/2026)

Este roteiro usa somente o cluster PostgreSQL privado `GPS/.local/postgres`, o banco `balancesys_dev_local` em `127.0.0.1:55432`, e a API em `http://localhost:3000`. Ele não apaga dados nem executa `migrate reset`. O `.env` privado é lido sem mostrar seus valores. A sessão usa tokens aleatórios no banco; não há `SESSION_SECRET` estático exigido pelo código.

## Terminal 1: preparar e iniciar

Execute a partir da raiz do clone:

```bash
cd /home/caipira/BalanceSys
git branch --show-current
python3 GPS/scripts/local_env.py init
python3 GPS/scripts/local_env.py check
git check-ignore GPS/.env
python3 GPS/scripts/local_env.py exec bash GPS/scripts/nix-run.sh node --version
python3 GPS/scripts/local_env.py exec bash GPS/scripts/nix-run.sh npm --version
python3 GPS/scripts/local_env.py exec bash GPS/scripts/nix-run.sh postgres --version
python3 GPS/scripts/local_env.py exec bash GPS/scripts/nix-run.sh bash scripts/local-postgres.sh start
python3 GPS/scripts/local_env.py exec bash GPS/scripts/nix-run.sh bash scripts/local-postgres.sh status
python3 GPS/scripts/local_env.py exec bash GPS/scripts/nix-run.sh npm ci
python3 GPS/scripts/local_env.py exec bash GPS/scripts/nix-run.sh ./node_modules/.bin/prisma --version
python3 GPS/scripts/local_env.py exec bash GPS/scripts/nix-run.sh ./node_modules/.bin/prisma generate
python3 GPS/scripts/local_env.py exec bash GPS/scripts/nix-run.sh npm run build
python3 GPS/scripts/local_env.py exec bash GPS/scripts/nix-run.sh npm test
python3 GPS/scripts/local_env.py exec bash GPS/scripts/nix-run.sh npm run prisma:migrate
python3 GPS/scripts/local_env.py exec bash GPS/scripts/nix-run.sh npm run seed
python3 GPS/scripts/local_env.py exec bash GPS/scripts/nix-run.sh npm run dev
```

Esperado: branch `feature/postgres-auth-foundation`; `.env: presente`, `configuração: válida`, `chaves pendentes: nenhuma`; `git check-ignore` aponta para `.gitignore`; Node 22, npm 10, PostgreSQL 16 e Prisma 5.22; banco ativo; `npm ci` sem vulnerabilidades; Prisma Client 5.22 gerado; build e testes aprovados (as duas integrações são puladas sem `TEST_DATABASE_URL`); migração pendente `20261119010000_email_tokens` aplicada; seed confirma categorias; API informa a porta 3000. **Mantenha este terminal aberto** enquanto testa. O comando direto `./node_modules/.bin/prisma generate` é intencional no NixOS: depois de um `npm ci` limpo, `npm run prisma:generate` tentou obter o engine `linux-nixos` inexistente; o comando direto com `nix-run.sh` usa os engines Debian da mesma versão.

`local_env.py init` só cria o arquivo se estiver ausente. Não substitui um `.env` existente. Se a validação disser `inválida`, não rode a API; ajuste apenas as chaves nomeadas no arquivo privado, sem enviá-lo no chat. O gerador cria uma senha aleatória forte para o banco, com permissão 600, e não imprime seu valor.

## Terminal 2: conferir

```bash
cd /home/caipira/BalanceSys
curl --fail --silent --show-error http://localhost:3000/health
curl --silent --output /dev/null --write-out '%{http_code}\n' http://localhost:3000/api/resumo
```

Esperado: `{"status":"ok"}` e código `401` para a rota protegida sem login. Abra **http://localhost:3000/** no navegador. A página inicial deve mostrar o formulário **Entrar**. Depois dos testes, pressione **Ctrl+C no Terminal 1**. A porta 3000 fica livre; o banco e seus dados permanecem. Para parar também o PostgreSQL sem apagar dados:

```bash
python3 GPS/scripts/local_env.py exec bash GPS/scripts/nix-run.sh bash scripts/local-postgres.sh stop
```

## Teste manual no navegador

Use e-mails de teste, por exemplo `a-balancesys-20261119@example.test` e `b-balancesys-20261119@example.test`. Escolha senhas distintas com 6 a 20 caracteres, maiúscula, minúscula, número e caractere especial; não as envie no chat. Se repetir o roteiro, use novos e-mails de teste. O cadastro não abre sessão: é obrigatório usar o link de verificação recebido. Cada mensagem local fica em `GPS/.local/mail` com permissão 0600. Em outro terminal, após cada pedido, execute:

```bash
cd /home/caipira/BalanceSys
find GPS/.local/mail -maxdepth 1 -type f -name '*.eml' -printf '%T@ %p\n' | sort -nr | head -5
mail_file=$(find GPS/.local/mail -maxdepth 1 -type f -name '*.eml' -printf '%T@ %p\n' | sort -nr | head -1 | cut -d' ' -f2-)
sed -n '1,8p' "$mail_file"
```

O último comando mostra o link **apenas no seu terminal**. Confirme o destinatário antes de copiá-lo para o navegador; não envie o link nem o arquivo a terceiros. O link expira em 30 minutos e funciona uma vez. Um novo pedido é permitido após 2 minutos, com resposta genérica tanto para e-mail conhecido quanto desconhecido.

| Etapa | Ação | Resultado esperado | PBI |
|---|---|---|---|
| 1 | Clique em **Criar conta**. Digite senha fraca e confirmação diferente; use os botões Mostrar/Ocultar. | Cada requisito é indicado antes do envio, erro de confirmação fica junto ao campo e o valor digitado permanece ao alternar visibilidade. | 01 |
| 2 | Cadastre A com dados válidos. | Confirmação do cadastro e retorno ao login, sem sessão; entrar antes da verificação mostra estado pendente. | 01, 02 |
| 3 | Tente cadastrar A novamente. | Mensagem clara de conta já cadastrada, sem dados da conta existente. | 01 |
| 4 | Inspecione a última mensagem local, abra o link e clique **Verificar e-mail**. Repita o link. | Primeiro uso libera o login; segundo informa link já utilizado. | 01, 02 |
| 5 | Tente senha errada e depois a correta. | Erro genérico pedido; login correto abre cartões vazios. | 02 |
| 6 | Registre receita R$ 100,00 com data no mês anterior, descrição e categoria Renda. Registre despesa R$ 25,00 hoje, categoria Lazer. | Saldo atual R$ 75,00 sem recarga; resultado do mês atual −R$ 25,00; histórico mostra ambas no contexto anual, e apenas despesa no mês atual. | 03, 04, 05, 11, 12 |
| 7 | Registre receita R$ 50,00 com data daqui a dois meses. | Saldo atual continua R$ 75,00; o lançamento aparece ao escolher o período futuro correspondente. | 03, 11 |
| 8 | No histórico mensal, selecione despesa e Lazer; depois mude tipo para receita. | O filtro oferece só categorias usadas no contexto; Lazer é limpo com aviso quando deixa de ter resultado. | 05, 12 |
| 9 | Alterne dia/semana/mês/ano e a data de referência; exclua um lançamento de teste. | Intervalo exibido usa America/Sao_Paulo; resultado e histórico mudam juntos e são atualizados após exclusão. | 11, 12 |
| 10 | Tente valor zero, data vazia e descrição vazia; use Tab/Shift+Tab e Enter. | Erro próximo do formulário, sem alteração do saldo; foco visível, rótulos e controles operáveis por teclado. | 03, 04, usabilidade |
| 11 | Ainda como A, guarde o ID de uma transação pelo código abaixo. Saia e abra `/api/resumo`. | API retorna 401 e a tela limpa os valores. | 02 |
| 12 | Cadastre e verifique B com outro e-mail; entre e execute o segundo código abaixo. | B vê saldo/histórico/filtro de categorias vazios e não consegue excluir o lançamento de A (404). | 02, 07, 11, 12 |
| 13 | Mantenha B logado nesta aba. Em janela privativa, abra a aplicação, use **Recuperar senha**, leia a última mensagem local e defina senha nova com confirmação. Atualize a primeira aba. | Senha antiga deixa de entrar; a sessão anterior retorna 401; token usado não funciona de novo. | 02 |
| 14 | Em **Metas de gasto**, crie meta mensal de R$ 120,25 para Lazer; edite para R$ 150,50. Tente a mesma categoria/mês outra vez e exclua com confirmação. | A lista atualiza sem recarga, duplicidade é recusada e a meta some após exclusão. Na conta B, a lista de A não aparece. | 08 |
| 15 | Saia de B e atualize `/api/auth/me`. | Código 401. Sessão expira em 12 horas; o teste automatizado cobre expiração e o logout permite conferência imediata. | 02 |

Na etapa 9, abra o console do navegador **na aba da aplicação** e execute:

```js
fetch('/api/transacoes').then(r => r.json()).then(rows => sessionStorage.setItem('balancesys_test_tx_a', rows[0].id))
```

Na etapa 11, na mesma aba e após entrar como B:

```js
fetch('/api/auth/me').then(r => r.json()).then(({ csrf }) =>
  fetch('/api/transacoes/' + sessionStorage.getItem('balancesys_test_tx_a'), {
    method: 'DELETE',
    headers: { 'X-CSRF-Token': csrf }
  })
).then(r => console.log(r.status))
```

A interface tem edição e exclusão de lançamentos próprios dentro de 30 dias da criação; teste **Editar**, **Salvar alterações** e a confirmação **Excluir** em uma conta de teste. Após o prazo, as ações deixam de aparecer, e a API também bloqueia. Metas podem ser criadas, editadas e excluídas; o progresso aparece por mês. Os alertas de limite aparecem em 80% e 100% na interface. Categorização automática e gráfico também seguem pendentes. A opção de resultado para um período futuro mostra lançamentos agendados, mas não é uma projeção estatística. O teste manual deste roteiro não homologa PBIs; registre observações e falhas para revisão.

Ao selecionar **Receita**, o formulário não mostra prioridade; **Despesa** exige prioridade do gasto. Em **Minha conta**, confira nome, e-mail e verificação; **Enviar link para alterar senha** usa a recuperação por e-mail. **Sair da conta** deve ocultar imediatamente os dados e tornar `/api/auth/me` inacessível. Histórico de uso ainda não existe. Confirme a atualização do saldo e histórico ao criar, editar e excluir.

## Conferir o progresso das metas (PBI-09)

Na conta A, crie uma meta de **R$ 100,00** para Lazer no mês atual. Registre uma despesa de **R$ 25,50** em Lazer com data de hoje. Em **Metas de gasto**, confira **R$ 25,50 gastos**, **R$ 74,50 restantes** e **25,5%**. Edite a despesa para **R$ 100,00**: o texto deve dizer **Limite alcançado**, com **100%**. Edite novamente para **R$ 120,50**: devem aparecer **R$ 20,50 excedidos** e **120,5%**; a barra fica cheia, sem esconder o percentual real. Exclua a despesa: o progresso retorna a zero sem recarregar a página. Mude **Mês exibido** para um mês sem meta e depois volte; a lista deve acompanhar a escolha. Um lançamento futuro não entra no gasto considerado antes da sua data. Na conta B, a meta e as despesas de A não aparecem. Estes passos são revisão funcional, não homologação automática.

## Conferir alertas de metas (PBI-10)

Na conta A, mantenha uma meta de **R$ 100,00** para Lazer no mês atual. Com gasto de R$ 79,99, não deve haver alerta. Edite a despesa para **R$ 80,00**: aparece o alerta de 80% no painel e na meta. Em **R$ 90,00**, permanece um alerta de 80%. Em **R$ 100,00**, aparecem os alertas de 80% e 100%, cada um uma vez. Em **R$ 120,50**, continuam dois, com gasto e limite atualizados no texto. Atualize a página: continuam exatamente dois, sem cópias. Reduza para R$ 79,99 ou exclua a despesa: os alertas desaparecem. Uma edição retroativa para outro mês deve retirar o alerta do mês atual; um lançamento futuro só o ativa quando chegar sua data. Entre na conta B e confirme que não há alertas da conta A. Os limiares usam centavos exatos, mesmo que o percentual exibido arredonde para 80,00%.

Ao registrar uma despesa com meta existente, confira também a mensagem junto ao formulário: ela informa categoria, mês, gasto, limite, percentual e restante/excedente. Para uma despesa retroativa, essa mensagem se refere ao mês do lançamento; o painel de alertas da visão geral permanece no mês atual. Se a gravação foi confirmada mas alguma consulta posterior falhou, a tela informa **atualização parcial** e pede que confira o histórico antes de repetir, para evitar lançamento duplicado.

## Erros prováveis

- **Conexão ao banco / health 503:** execute `local_env.py check`, depois `local-postgres.sh start` e `status`. O script não conecta a bancos remotos.
- **Porta 3000 ocupada:** encerre a instância anterior com Ctrl+C; use `ss -ltnp '( sport = :3000 )'` para identificar o processo. Não altere `.env` às cegas.
- **Engine Prisma no NixOS:** use `nix-run.sh` e o comando direto `./node_modules/.bin/prisma generate` mostrado acima. Se os binários Debian 5.22.0 faltarem após `npm ci`, o wrapper tentará reconstruí-los automaticamente com `npm rebuild @prisma/engines`; uma falha nessa etapa indica que é preciso conferir o acesso à rede. A versão Prisma não deve ser atualizada por causa desse erro.
- **Login não persiste:** use sempre `http://localhost:3000/` nesta sessão, confirme `NODE_ENV=development` via `local_env.py check`, e verifique no DevTools se o cookie `balancesys_session` foi aceito. O cookie é HttpOnly e não aparece em `document.cookie`; produção exige HTTPS e cookie Secure.
- **429 no login:** após cinco senhas erradas para o mesmo IP/e-mail, aguarde 15 minutos ou use outra conta de teste. A limitação é por processo.
- **Categoria ausente:** execute `npm run seed` pelo wrapper após a migração. O seed não cria usuários.
- **E-mail local:** confirme que `GPS/.local/mail` contém arquivo novo com o destinatário correto. Se não, veja a resposta da API e aguarde 2 minutos antes de reenviar; o diretório é ignorado pelo Git.

## Compose, somente quando houver Docker Engine

Nesta máquina, o Engine não estava disponível; apenas `docker-compose config --quiet` foi validado. Se o Engine for instalado depois, pare a API do Terminal 1 para liberar a porta 3000. O Compose usa um banco **diferente**, no serviço `db`, sem publicar a porta do PostgreSQL no host:

```bash
cd /home/caipira/BalanceSys
docker version
docker compose version
python3 GPS/scripts/local_env.py check
docker compose --env-file GPS/.env -f GPS/compose.yaml config --quiet
docker compose --env-file GPS/.env -f GPS/compose.yaml up --build
```

Somente após `docker version` confirmar o Engine, abra `http://localhost:3000/` e rode o mesmo teste manual. Encerre com Ctrl+C e `docker compose --env-file GPS/.env -f GPS/compose.yaml down`; **não use `down -v`**, pois isso apagaria o volume do banco.
