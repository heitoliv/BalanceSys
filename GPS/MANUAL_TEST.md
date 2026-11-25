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

Esperado: branch `feature/postgres-auth-foundation`; `.env: presente`, `configuração: válida`, `chaves pendentes: nenhuma`; `git check-ignore` aponta para `.gitignore`; Node 22, npm 10, PostgreSQL 16 e Prisma 5.22; banco ativo; `npm ci` sem vulnerabilidades; Prisma Client 5.22 gerado; build e testes aprovados (as integrações são puladas sem `TEST_DATABASE_URL`); apenas migrações pendentes aplicadas; seed confirma categorias; API informa a porta 3000. **Mantenha este terminal aberto** enquanto testa. O wrapper `nix-run.sh` seleciona os engines Debian do Prisma 5.22 no NixOS.

`local_env.py init` só cria o arquivo se estiver ausente. Não substitui um `.env` existente. Se a validação disser `inválida`, não rode a API; ajuste apenas as chaves nomeadas no arquivo privado, sem enviá-lo no chat. O gerador cria uma senha aleatória forte para o banco, com permissão 600, e não imprime seu valor.

## Terminal 2: conferir

```bash
cd /home/caipira/BalanceSys
curl --fail --silent --show-error http://localhost:3000/health
curl --silent --output /dev/null --write-out '%{http_code}\n' http://localhost:3000/api/resumo
```

Esperado: `{"status":"ok"}`, código `401` para a rota protegida sem login. Abra **http://localhost:3000/** no navegador. A página inicial deve mostrar o formulário **Entrar**. Depois dos testes, pressione **Ctrl+C no Terminal 1**. A porta 3000 fica livre; o banco e seus dados permanecem. Para parar também o PostgreSQL sem apagar dados:

```bash
python3 GPS/scripts/local_env.py exec bash GPS/scripts/nix-run.sh bash scripts/local-postgres.sh stop
```

## Teste manual no navegador

Use `_teste_a_2026` e `2teste_b_2026` se ainda não existirem; para repetição, escolha novos nicknames válidos. Senhas de exemplo podem ser escolhidas localmente, sem enviá-las no chat. Os PBIs continuam dependentes de aceite funcional.

| Ação | Resultado esperado | PBI |
|---|---|---|
| Criar conta A com nickname, nome, senha válida e confirmação | Cadastro persistido, código de recuperação exibido uma vez; guarde-o, depois vá ao login sem sessão automática | 01, 02 |
| Repetir o mesmo nickname com caixa diferente | Erro claro de duplicidade | 01 |
| Tentar nickname curto, com arroba ou reservado; senha fraca e confirmação diferente | Erros junto aos campos | 01 |
| Login com senha errada e depois correta | Erro genérico, depois painel próprio | 02 |
| Registrar receita R$ 100,00 e despesa R$ 25,00 hoje | Saldo atual R$ 75,00 e histórico atualizado sem recarga | 03, 04, 05, 11, 12 |
| Registrar lançamento futuro | Não altera saldo atual; aparece no período futuro | 11 |
| Criar e editar meta da categoria da despesa | Progresso usa o gasto daquele mês | 08, 09, 10 |
| Em Minha conta, alterar nickname com senha atual | Novo nickname aparece; antigo deixa de autenticar | 02 |
| Alterar senha com senha atual, nova senha e confirmação | Sessões revogadas; novo login obrigatório | 02 |
| Na tela inicial, usar Esqueci minha senha com código guardado | Senha muda, sessões são revogadas e novo código é mostrado uma vez; código antigo falha | 02 |
| Em Minha conta, gerar outro código com a senha atual | Código anterior é invalidado; novo código é exibido uma vez | 02 |
| Sair da conta e abrir `/api/auth/me` | Resposta 401 e valores ocultos | 02 |
| Criar conta B; consultar histórico e metas | B não vê nem altera dados de A | 02, 07, 08, 11, 12 |

Contas anteriores à migração devem gerar o primeiro código em Minha conta enquanto ainda conseguem entrar. Sem senha nem código, o operador precisa verificar a identidade fora da aplicação para o procedimento legado. Confira teclado, foco e mensagens durante cada etapa.

## Conferir o progresso das metas (PBI-09)

Na conta A, crie uma meta de **R$ 100,00** para Lazer no mês atual. Registre uma despesa de **R$ 25,50** em Lazer com data de hoje. Em **Metas de gasto**, confira **R$ 25,50 gastos**, **R$ 74,50 restantes** e **25,5%**. Edite a despesa para **R$ 100,00**: o texto deve dizer **Limite alcançado**, com **100%**. Edite novamente para **R$ 120,50**: devem aparecer **R$ 20,50 excedidos** e **120,5%**; a barra fica cheia, sem esconder o percentual real. Exclua a despesa: o progresso retorna a zero sem recarregar a página. Mude **Mês exibido** para um mês sem meta e depois volte; a lista deve acompanhar a escolha. Crie também meta para um mês futuro, registre despesas nos dias 1, 5 e 10 desse mês e confira que o progresso muda imediatamente, enquanto o saldo atual não muda. Na conta B, a meta e as despesas de A não aparecem. Estes passos são revisão funcional, não homologação automática.

## Conferir alertas de metas (PBI-10)

Na conta A, mantenha uma meta de **R$ 100,00** para Lazer no mês atual. Com gasto de R$ 25,50, o painel já deve informar categoria, mês, gasto, limite, percentual e restante. Edite para R$ 79,99: o aviso deve atualizar. Em R$ 80,00, deve indicar atenção; em R$ 90,00, atualizar o gasto sem criar um segundo aviso para a mesma meta. Em R$ 100,00, deve indicar **Limite alcançado**. Em R$ 120,50, deve mostrar **META ULTRAPASSADA**, R$ 20,50 de excesso e destaque visual forte, também legível sem distinguir cores. Atualize a página: permanece um aviso de estado para essa meta, sem cópias. Reduza o valor: o aviso acompanha o novo total; exclua a única despesa e ele desaparece. Uma edição retroativa para outro mês deve retirar o aviso do mês atual e atualizar a meta do mês afetado. Uma despesa com data futura no mês da meta deve atualizá-la imediatamente. Entre na conta B e confirme que não há avisos da conta A. Os limiares usam centavos exatos, mesmo que o percentual exibido arredonde para 80,00%.

Ao registrar uma despesa com meta existente, confira também a mensagem junto ao formulário: ela informa categoria, mês, gasto, limite, percentual e restante/excedente. Para uma despesa retroativa, essa mensagem se refere ao mês do lançamento; o painel de alertas da visão geral permanece no mês atual. Se a gravação foi confirmada mas alguma consulta posterior falhou, a tela informa **atualização parcial** e pede que confira o histórico antes de repetir, para evitar lançamento duplicado.

## Erros prováveis

- **Conexão ao banco / health 503:** execute `local_env.py check`, depois `local-postgres.sh start` e `status`. O script não conecta a bancos remotos.
- **Porta 3000 ocupada:** encerre a instância anterior com Ctrl+C; use `ss -ltnp '( sport = :3000 )'` para identificar o processo. Não altere `.env` às cegas.
- **Engine Prisma no NixOS:** use `nix-run.sh` e o comando direto `./node_modules/.bin/prisma generate` mostrado acima. Se os binários Debian 5.22.0 faltarem após `npm ci`, o wrapper tentará reconstruí-los automaticamente com `npm rebuild @prisma/engines`; uma falha nessa etapa indica que é preciso conferir o acesso à rede. A versão Prisma não deve ser atualizada por causa desse erro.
- **Login não persiste:** use sempre `http://localhost:3000/` nesta sessão, confirme `NODE_ENV=development` via `local_env.py check`, e verifique no DevTools se o cookie `balancesys_session` foi aceito. O cookie é HttpOnly e não aparece em `document.cookie`; produção exige HTTPS e cookie Secure.
- **429 no login:** após cinco senhas erradas para o mesmo IP/nickname, aguarde 15 minutos ou use outra conta de teste. A limitação é por processo.
- **Categoria ausente:** execute `npm run seed` pelo wrapper após a migração. O seed não cria usuários.
- **Senha esquecida:** use Esqueci minha senha com o código guardado. Sem senha e sem código previamente emitido, o procedimento administrativo legado ainda é necessário; veja o README.

## Compose, somente quando houver Docker Engine

Nesta máquina, o Engine não estava disponível; apenas `docker compose config --quiet` foi validado. Se o Engine for instalado depois, pare a API do Terminal 1 para liberar a porta 3000. O Compose usa um banco **diferente**, no serviço `db`, sem publicar a porta do PostgreSQL no host:

```bash
cd /home/caipira/BalanceSys
docker version
docker compose version
python3 GPS/scripts/local_env.py check
docker compose --env-file GPS/.env -f GPS/compose.yaml config --quiet
docker compose --env-file GPS/.env -f GPS/compose.yaml up --build
```

Somente após `docker version` confirmar o Engine, abra `http://localhost:3000/` e rode o mesmo teste manual. Encerre com Ctrl+C e `docker compose --env-file GPS/.env -f GPS/compose.yaml down`; **não use `down -v`**, pois isso apagaria o volume do banco.
