# BalanceSys GPS

Monólito modular em TypeScript, Express, Prisma 5.22 e PostgreSQL. As camadas existentes separam domínio, casos de uso, persistência e HTTP/interface. A autenticação atual usa **nome de usuário (nickname) e senha**. Não há e-mail no cadastro nem entrega de links. Verificação de endereço eletrônico fica como melhoria futura.

## Preparação local no NixOS

Node.js 22, npm 10 e PostgreSQL 16 são as versões usadas na verificação. `package.json` e `package-lock.json` fixam as dependências. No NixOS, `scripts/nix-run.sh` disponibiliza Node, PostgreSQL e OpenSSL 3, além de apontar Prisma 5.22 aos engines Debian da mesma versão. `GPS/.env` deve existir, ser privado e conter `DATABASE_URL`, `POSTGRES_PASSWORD`, `PORT`, `NODE_ENV=development` e `TRUST_PROXY=0`. O exemplo `.env.example` contém somente valores de demonstração; configure os segredos no arquivo local. Não use banco de produção nos comandos seguintes.

A partir da raiz do clone:

```bash
python3 GPS/scripts/local_env.py check
python3 GPS/scripts/local_env.py exec bash GPS/scripts/nix-run.sh npm ci
python3 GPS/scripts/local_env.py exec bash GPS/scripts/nix-run.sh bash scripts/local-postgres.sh start
python3 GPS/scripts/local_env.py exec bash GPS/scripts/nix-run.sh npm run prisma:generate
python3 GPS/scripts/local_env.py exec bash GPS/scripts/nix-run.sh npm run prisma:migrate
python3 GPS/scripts/local_env.py exec bash GPS/scripts/nix-run.sh npm run build
python3 GPS/scripts/local_env.py exec bash GPS/scripts/nix-run.sh npm start
```

Deixe o último terminal aberto e visite `http://localhost:3000/` quando `PORT=3000`. Em outro terminal, `curl -fsS http://localhost:3000/health` deve devolver `{"status":"ok"}`. `Ctrl+C` encerra a API; `python3 GPS/scripts/local_env.py exec bash GPS/scripts/nix-run.sh bash scripts/local-postgres.sh stop` encerra o banco sem apagar dados. Para testes automatizados, use exclusivamente `TEST_DATABASE_URL` com nome `balancesys_test_*` e migrações aplicadas. Veja [MANUAL_TEST.md](MANUAL_TEST.md).

## Contas e troca de senha

O nickname é obrigatório, único sem distinção de maiúsculas e minúsculas, tem 3–30 caracteres, começa com letra ASCII, número ou `_` e aceita letras sem acentos, números, `.`, `_` e `-`. `admin`, `root`, `support`, `suporte` e `balancesys` são reservados. O cadastro não cria sessão. A senha nova exige 6–20 caracteres, maiúscula, minúscula, número e caractere especial. A composição curta é decisão de produto; senhas mais longas e passphrases merecem revisão futura. Duplicidade é informada no cadastro, o que permite enumeração limitada de nicknames; o limite por IP/nickname ainda é por processo.

`POST /api/auth/cadastro` recebe `nome`, `nickname`, `senha` e `confirmarSenha`; não cria sessão. `POST /api/auth/login` recebe nickname e senha. A pessoa autenticada pode alterar a própria senha em **Minha conta**, informando senha atual, nova senha e confirmação; a operação exige CSRF e revoga todas as sessões. O cookie é HttpOnly, SameSite=Lax e Secure em produção. O token de sessão fica como hash no banco e expira em 12 horas. Não há recuperação pública por código ou e-mail.

Para senha esquecida, o operador deve conferir a identidade fora da aplicação e usar `npm run account:reset -- NICKNAME CAMINHO_DO_ARQUIVO_PRIVADO` no GPS, com arquivo de senha modo 600. O comando substitui o hash e revoga as sessões. **Nickname sozinho não comprova identidade** e não autoriza a troca. Este procedimento operacional é a limitação atual até existir um segundo fator de recuperação seguro.

A migração `20261125020000_remove_recovery_code` remove as colunas de códigos da versão anterior, sem modificar contas, senhas, sessões ou dados financeiros. O histórico de migrações anterior permanece para bancos já migrados. A migração `20261125000000_nickname_accounts` atribui nicknames provisórios `usuario_1`, `usuario_2` etc. por ordem de ID, mantém IDs, senhas, sessões, transações e metas, e remove colunas e tokens de e-mail. Antes de aplicá-la a um banco existente, gere `pg_dump -Fc` e um mapa privado de antigo identificador para nickname. O operador deve comunicar o nickname provisório após conferir a identidade do titular. A pessoa pode alterá-lo em Minha conta informando a senha atual. O backup local desta revisão e o mapa ficam em `GPS/.local/backup/`, fora do Git. Não publique o mapa.

## Transferência de SQLite existente

Não foi encontrado `*.db` neste clone. O histórico SQLite foi preservado em `prisma/sqlite_migrations/` e a linha PostgreSQL começou em `prisma/migrations/`. O Prisma 5.22.0 exige que `migration_lock.toml` e SQL sejam do mesmo provider; trocar apenas o provider e executar `migrate deploy` não migra dados SQLite.

Antes de usar um arquivo pessoal, feche a aplicação SQLite e mantenha o original intacto. A exportação usa a API de backup do SQLite para obter um snapshot consistente, cria `*.backup.db`, registra SHA-256, contagens e soma por tipo, e recusa valores com fração de centavo. A conversão de `Float` para `Decimal(18,2)` não arredonda silenciosamente valores ou datas com precisão superior a milissegundos.

```bash
python3 scripts/export_sqlite.py prisma/dev.db prisma/backup/data.export.json
# Crie um PostgreSQL novo e vazio; aplique a migração antes da importação.
npm run prisma:migrate
npx ts-node scripts/import_sqlite.ts prisma/backup/data.export.json
```

A importação preserva IDs, relações, categorias e datas, e pode ser repetida. Ela recusa linhas não relacionadas já existentes no destino; divergências durante a verificação anulam a transação PostgreSQL. A exportação não sobrescreve um backup anterior: escolha outro nome de saída para um novo snapshot. A saída contém `divergence: []` quando contagens, valores agregados, IDs, vínculos e datas conferem. **Importe antes de iniciar a API ou executar seed**: o seed criaria categorias com novos IDs. Mantenha o backup SQLite até a conferência e o aceite; para retorno, pare a API PostgreSQL, restaure o banco SQLite original em uma cópia e volte ao commit/configuração anterior. Não há sincronização reversa automática.

No Compose, o banco não está exposto. Para importar antes de subir a API:

```bash
docker compose up -d db
docker compose run --rm migrate
docker compose run --rm -v ./prisma/backup:/app/prisma/backup:ro migrate npx ts-node scripts/import_sqlite.ts prisma/backup/data.export.json
docker compose up -d api
```

Usuários importados não possuíam senha no schema anterior. A conta fica preservada com `senhaHash = NULL`; não consegue entrar até receber credencial por procedimento administrativo. O operador pode atribuir a primeira senha com `claim_imported_user.ts` e arquivo privado 0600. A importação atribui `usuario_1`, `usuario_2` etc. em ordem de ID; informe o nickname ao titular somente após conferir sua identidade fora da aplicação. Contas importadas sem senha exigem atribuição administrativa de uma senha inicial.

## Docker Compose local

`compose.yaml` possui `db` PostgreSQL com volume, tarefa única `migrate` e API dependente dela. O banco não publica porta. Dentro do Compose, `DATABASE_URL` usa `db:5432`; a API executada no host usa `127.0.0.1:55432`. O Compose é desenvolvimento e não constitui deploy pronto. Com Docker Engine disponível, no GPS use `docker compose config --quiet` para validar a configuração e `docker compose up --build -d`; consulte `docker compose ps` e `/health`. Não use `down -v` se houver dados.

## Entrega de imagens

A entrega ao servidor está descrita em [DEPLOY_HANDOFF.md](DEPLOY_HANDOFF.md). O arquivo Docker compactado e seu SHA-256 ficam em `GPS/.local/exports/` (ignorados pelo Git). Inclui imagens separadas de API e migração; o Compose de servidor está em `compose.release.yaml`. As imagens foram construídas e executadas com Podman rootless; Docker Engine não está disponível nesta máquina.

## Deploy futuro

Publique a imagem após build, testes e revisão. Configure domínio e TLS em proxy reverso, mantendo a API e PostgreSQL em rede privada; ajuste `TRUST_PROXY=1` somente se o proxy for confiável e defina `APP_BASE_URL` como origem HTTPS pública. Injete segredos fora do repositório e use senha codificada na URL. Execute `prisma migrate deploy` como tarefa única antes de liberar tráfego, preserve backup `pg_dump` testado com `pg_restore`, registre métricas/logs sem dados sensíveis, monitore `/health`, e planeje rollback de imagem e de banco com restauração testada. Uma migração de schema pode não ser reversível; mantenha backup antes de atualizar. O Compose local não significa prontidão para produção.
