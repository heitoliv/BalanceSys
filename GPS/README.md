# BalanceSys GPS

Aplicação TypeScript, Express 4.22.3 e Prisma 5.22.0. A fonte de dependências Node é [package.json](package.json) com [package-lock.json](package-lock.json). A API e a interface são servidas pela mesma origem.

## Estado e pré-requisitos

Node.js 22 e npm 10 foram usados nesta verificação. O lockfile v3 é consistente: `npm ci` instalou 406 pacotes. O projeto usa TypeScript 5.6.3, Jest 29.7.0, ts-jest 29.2.5 e ts-node 10.9.2 em desenvolvimento; `@prisma/client` e Express são dependências de execução. PostgreSQL 16 é o banco alvo. Docker e Docker Compose são necessários apenas para o caminho por contêineres. O Compose foi validado estaticamente, mas os contêineres não foram executados nesta máquina.

| Escopo | Pacote fixado | Uso |
|---|---|---|
| Execução | `express@4.22.3`, `@prisma/client@5.22.0` | HTTP e acesso ao banco |
| Build/CLI | `typescript@5.6.3`, `ts-node@10.9.2`, `prisma@5.22.0` | Compilação, seed, importação e migrações |
| Testes | `jest@29.7.0`, `ts-jest@29.2.5`, `supertest@7.0.0` | Testes TypeScript e HTTP |
| Tipos | `@types/node@20.17.6`, `@types/express@4.17.21`, `@types/jest@29.5.14`, `@types/supertest@6.0.2` | Verificação estática |

Python 3 com `sqlite3` da biblioteca padrão é necessário somente para exportar dados SQLite e rodar seus testes. OpenSSL 3 é necessário para o engine Prisma na imagem Debian. Não foi adicionado framework ou pacote Node para autenticação: hash e tokens usam o módulo `crypto` do Node.

No NixOS desta máquina, o Prisma 5.22.0 não publica engine `linux-nixos`; usamos o engine Debian da mesma versão para validar e testar. Isso não altera o lockfile nem a versão Prisma. A imagem Docker usa Debian e não depende desse ajuste local.

## Instalação com PostgreSQL local no NixOS

O roteiro copiável e o teste no navegador estão em [MANUAL_TEST.md](MANUAL_TEST.md). Execute a partir da raiz do clone:

```bash
cd /home/caipira/BalanceSys
python3 GPS/scripts/local_env.py init
python3 GPS/scripts/local_env.py check
python3 GPS/scripts/local_env.py exec bash GPS/scripts/nix-run.sh bash scripts/local-postgres.sh start
python3 GPS/scripts/local_env.py exec bash GPS/scripts/nix-run.sh npm ci
python3 GPS/scripts/local_env.py exec bash GPS/scripts/nix-run.sh ./node_modules/.bin/prisma generate
python3 GPS/scripts/local_env.py exec bash GPS/scripts/nix-run.sh npm run build
python3 GPS/scripts/local_env.py exec bash GPS/scripts/nix-run.sh npm test
python3 GPS/scripts/local_env.py exec bash GPS/scripts/nix-run.sh npm run prisma:migrate
python3 GPS/scripts/local_env.py exec bash GPS/scripts/nix-run.sh npm run seed
python3 GPS/scripts/local_env.py exec bash GPS/scripts/nix-run.sh npm run dev
```

`local_env.py init` cria `GPS/.env` com senha aleatória forte e permissão 600 apenas se estiver ausente; nunca o sobrescreve. O validador só aceita `balancesys_dev_local` em `127.0.0.1:55432`, `NODE_ENV=development` e `TRUST_PROXY=0`. A sessão usa tokens opacos aleatórios persistidos no banco, portanto não exige `SESSION_SECRET` estático. Não copie `.env.example` diretamente sobre um `.env` existente.

O wrapper `nix-run.sh` usa Node 22, PostgreSQL 16, OpenSSL 3 e os engines Debian da **mesma** versão Prisma 5.22.0. Se os engines estiverem ausentes após a instalação, ele executa `npm rebuild @prisma/engines` e confirma os dois binários antes de iniciar o Prisma. A recuperação foi verificada removendo temporariamente os binários gerados e executando `prisma --version`. Use o comando direto `./node_modules/.bin/prisma generate` pelo wrapper no NixOS; `npm run prisma:generate` tentou buscar o engine `linux-nixos` inexistente na primeira execução. Em Linux compatível fora do NixOS, os scripts normais de `package.json` continuam disponíveis.

`npm run prisma:migrate` usa `prisma migrate deploy` e aplica apenas migrações pendentes. `npm run prisma:migrate:dev` serve para criar novas migrações em banco descartável. `npm run seed` cria somente categorias. A API e a interface ficam em **http://localhost:3000/**; `/health` retorna `{"status":"ok"}` quando o banco responde. Mantenha o terminal de `npm run dev` aberto; Ctrl+C encerra a API sem apagar o banco.

O teste automatizado de navegador está em `tests/browser/smoke.py`. Ele requer Firefox, geckodriver e Selenium fornecidos temporariamente pelo Nix e recusa execução sem `BALANCESYS_BROWSER_TEST=1` e `TEST_DATABASE_URL` com nome `balancesys_test_*`. Inicie a API com **o mesmo banco de teste já migrado e semeado**; o teste cria contas fictícias e mensagens locais nesse banco. O roteiro manual abaixo usa o banco de desenvolvimento e não executa esse teste automaticamente.

## Docker Compose local (condicional)

O Docker Engine não estava disponível nesta máquina. `docker-compose config --quiet` confirmou apenas a sintaxe do Compose. Quando `docker version` confirmar um Engine funcional, pare a API local para liberar a porta 3000 e execute, a partir da raiz:

```bash
docker compose --env-file GPS/.env -f GPS/compose.yaml config --quiet
docker compose --env-file GPS/.env -f GPS/compose.yaml up --build
```

O Compose usa um banco separado no serviço `db` (porta interna 5432) e sobrescreve `DATABASE_URL` para esse hostname. A API executada diretamente no host usa `127.0.0.1:55432`; `db` não é um hostname válido fora da rede Compose. O banco Compose tem volume persistente e não publica porta no host. A API publica somente `127.0.0.1:3000`; `migrate` executa uma vez após o healthcheck do banco, antes da API. O Compose local define `NODE_ENV=development` para cookie por HTTP em loopback. Produção requer HTTPS e `NODE_ENV=production`, que adiciona `Secure` ao cookie.

O `.env.example` contém apenas placeholders. O `GPS/.env` privado gerado contém o segredo do banco e não deve ser enviado ao Git, ao chat ou a logs.

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

Usuários importados não possuíam senha no schema anterior. A conta fica preservada com `senhaHash = NULL` e `emailVerificadoEm = NULL`. O operador pode atribuir senha de forma controlada com `claim_imported_user.ts` e arquivo privado 0600; depois o titular deve solicitar **Reenviar verificação** e usar o link antes do login. O comando só altera conta importada ainda sem senha. Planeje contato individual com o titular antes de entregar a credencial. Contas com senha criadas **antes** da migração de verificação recebem `emailVerificadoEm` na migração para preservar acesso: essa marca é uma exceção de compatibilidade, não prova de posse histórica do endereço.

## API e segurança

`POST /api/auth/cadastro`, `/login`, `/logout`, `/verificar`, `/reenviar-verificacao`, `/solicitar-recuperacao`, `/redefinir-senha` e `GET /api/auth/me` gerenciam conta e sessão. Cadastro não cria sessão; a conta fica pendente até o uso único do link de verificação (30 minutos). Recuperação usa token de uso único, guarda só SHA-256 no banco e revoga todas as sessões ao trocar a senha. Link expirado ou usado é rejeitado; um novo link invalida os anteriores do mesmo tipo. Pedidos de recuperação e reenvio têm resposta igual para e-mails conhecidos ou desconhecidos e intervalo mínimo de dois minutos por conta. Em desenvolvimento, a mensagem é gravada em `GPS/.local/mail` com permissão 0600; a recuperação é manual: confira o destinatário, abra o link local no navegador e defina a nova senha. Nenhum link é enviado à caixa pessoal. Veja [MANUAL_TEST.md](MANUAL_TEST.md). Em Compose, o volume `mail_data` preserva as mensagens locais; inspecione com `docker compose --env-file GPS/.env -f GPS/compose.yaml exec api ls -t /app/.local/mail`. Em produção, configure `APP_BASE_URL` com HTTPS e `MAIL_SENDMAIL_PATH` para um MTA local operante, com reputação, SPF/DKIM, monitoramento de falhas e segredos geridos fora do Git; a imagem atual não instala nem configura esse MTA.

A política de **6 a 20 caracteres**, com letra maiúscula, minúscula, número e caractere especial, vale para novos cadastros e redefinições; contas existentes podem continuar usando a senha atual. É uma decisão solicitada de produto. Recomendamos avaliar senhas mais longas e passphrases em futura revisão. O cadastro responde claramente ao e-mail duplicado, o que permite enumeração limitada de contas; a decisão melhora o feedback do cadastro e está protegida por limite de pedidos por IP/e-mail **por processo**. Antes de produção com múltiplas réplicas, use rate limit compartilhado e avalie monitoramento contra abuso. O e-mail é guardado com caixa local preservada e domínio em minúsculas; a chave de busca em minúsculas aplica unicidade sem diferenciar caixa, inclusive no login e recuperação.

As rotas financeiras `POST/GET /api/transacoes`, `DELETE /api/transacoes/:id`, `GET /api/resumo`, `GET /api/categorias` e `GET /api/categorias/historico` exigem sessão. A senha usa scrypt com salt aleatório. O token de sessão aleatório é armazenado como hash no banco, expira em 12 horas e é revogado no logout. O cookie é HttpOnly, SameSite=Lax e Secure em produção. Requisições de mutação protegidas exigem `X-CSRF-Token`, devolvido pelo login ou `/api/auth/me`. Cadastro e login aceitam apenas JSON e rejeitam Origin de outro host. Login tem limite de cinco falhas em 15 minutos por IP/e-mail **por processo**; para múltiplas réplicas, mova o limite para infraestrutura compartilhada antes de produção.

O corpo da transação não pode escolher o proprietário: `usuarioId` é obtido da sessão. A seleção de categoria valida compatibilidade de tipo. Valores aceitam no máximo dois decimais; o banco usa `Decimal(18,2)` e o saldo soma centavos inteiros. O contrato JSON ainda usa número; acima do limite seguro de centavos do JavaScript a API rejeita o registro.

RN01 classifica a prioridade dos **gastos**: despesas exigem `ESSENCIAL`, `IMPORTANTE` ou `OPCIONAL`; receitas não pedem prioridade. O campo legado `transacoes.prioridade` permanece não nulo no banco: novas receitas recebem o marcador interno `NAO_APLICA`, e a API apresenta `null` para receitas. Valores de receitas antigas permanecem armazenados sem alteração, mas não são exibidos como prioridade de gasto. Não foi necessária migração de dados.

PBI-07: `PUT /api/transacoes/:id` substitui os campos de uma transação própria (tipo, valor, descrição, data, categoria e prioridade quando despesa); `DELETE` remove a própria transação após confirmação na interface. RN06 usa o `criadoEm` imutável, não a data financeira: a requisição iniciada até o instante exato de criação + 30×24 horas é permitida; um milissegundo depois é bloqueada. A condição de usuário e prazo também participa da escrita PostgreSQL. Respostas: 404 para registro ausente ou de outra conta, 409 para prazo expirado e 422 para valores inválidos. Edição e exclusão atualizam histórico, filtros e saldo. Metas e alertas são geridos separadamente nos PBIs 08–10.

PBI-08: `GET/POST /api/metas` e `PUT/DELETE /api/metas/:id` exigem sessão; mutações exigem CSRF. Cada meta define um limite positivo em BRL, com até dois decimais, para uma categoria `DESPESA` ou `AMBOS` e um mês civil (`AAAA-MM`) no fuso `America/Sao_Paulo`. O início é o primeiro dia desse mês, o fim é o primeiro dia do mês seguinte, exclusivo. Não há renovação automática: o usuário cria outra meta para o próximo mês. A combinação usuário/categoria/mês é única, inclusive no banco; outro usuário não vê nem altera a meta. Categorias `AMBOS` podem receber metas porque também classificam despesas. Receita não integra gasto da meta. A tela permite criar, consultar, editar e excluir com confirmação. Progresso consumido é acrescentado no PBI-09; renovação automática segue pendente; alertas ativos são tratados no PBI-10.

PBI-09: `GET /api/metas?mes=AAAA-MM` agora inclui `progresso` por meta: `gastoConsiderado`, `restante`, `excedente` e `percentualUtilizacao`. O cálculo soma no PostgreSQL apenas `DESPESA` do proprietário e da categoria da meta no mês civil de `America/Sao_Paulo`, com início inclusivo e fim exclusivo. O corte adicional é o instante da consulta: lançamento futuro, mesmo no mês da meta, não consome o limite até sua data; meta de mês futuro começa em zero. Receita não consome meta, inclusive em categoria `AMBOS`. Edição retroativa, mudança de categoria ou exclusão alteram o progresso na consulta seguinte. Valores são somados como `Decimal` e calculados em centavos inteiros; o percentual tem duas casas. A barra visual termina em 100%, mas o texto mostra percentual real acima do limite. Exemplo: meta R$ 100,00 e gasto R$ 25,50 mostram 25,5% e R$ 74,50 restantes; gasto R$ 100,00 mostra limite alcançado; R$ 120,50 mostra 120,5% e R$ 20,50 excedidos. Nenhuma migração nova foi necessária.

Após registrar, editar ou excluir uma despesa, a interface consulta novamente saldo, histórico, progresso e alertas. O formulário mostra a meta da categoria e mês afetados, incluindo lançamentos retroativos; o painel principal de alertas mostra somente o mês atual. Uma falha ao recarregar a tela depois de a API confirmar a mutação é apresentada como **atualização parcial**, mantendo claro que o lançamento foi salvo e pedindo conferência do histórico antes de tentar de novo.

PBI-10: a API de metas acrescenta `alertas: [] | [80] | [80,100]`, derivados dos mesmos centavos usados no progresso. Um alerta de 80% exige `gasto × 100 ≥ limite × 80`; o de 100% exige `gasto ≥ limite`. A comparação ocorre antes do arredondamento do percentual exibido. Uma despesa que salta diretamente a 100% ou mais ativa ambos os limiares. Edição, exclusão, mudança retroativa, mudança de limite e chegada da data de um lançamento futuro recalculam os alertas. Ao cair abaixo do limiar, o alerta deixa de aparecer; ao voltar a atingi-lo, reaparece. A interface mostra os alertas ativos no painel do mês atual e junto a cada meta do mês escolhido, sempre com categoria, mês, gasto e limite, em texto e sem depender só da cor. Atualizar a página não cria registros nem duplica os limiares. A [issue #47](https://github.com/heitoliv/BalanceSys/issues/47) pede exibição e recálculo sem duplicação, mas não pede caixa de entrada, estado visto, histórico de emissão ou canal externo; portanto este incremento não cria tabela, e-mail nem push. Se esses recursos forem aprovados depois, exigirão persistência e regras próprias de entrega/leitura.

**Minha conta** consulta nome, e-mail, data de criação e estado de verificação somente pela sessão atual. A ação de alterar senha envia o link de recuperação existente para o próprio e-mail; a troca efetiva revoga sessões anteriores. Não há eventos confiáveis de acesso ou mudanças anteriores, portanto o histórico de uso permanece pendente, sem linhas inventadas.

O fuso da aplicação é `America/Sao_Paulo` até haver preferência por usuário. `GET /api/resumo?periodicidade=dia|semana|mes|ano&referencia=AAAA-MM-DD` devolve `saldoAtual` acumulado até o instante da consulta, `resultadoPeriodo` apenas no intervalo escolhido e limites `inicio`/`fimExclusivo`. A semana começa na segunda-feira. O histórico usa a mesma periodicidade; suas categorias de filtro vêm somente dos lançamentos do usuário no contexto de tipo e período, enquanto o formulário de registro continua oferecendo todas as categorias compatíveis. Exemplo: receita de R$ 100,00 no mês anterior, despesa de R$ 25,00 hoje e receita de R$ 50,00 daqui a dois meses produzem saldo atual de R$ 75,00 e resultado do mês de −R$ 25,00. A receita futura só aparece no período futuro escolhido. A interface não apresenta projeção estatística.

## Deploy futuro

Publique a imagem após build, testes e revisão. Configure domínio e TLS em proxy reverso, mantendo a API e PostgreSQL em rede privada; ajuste `TRUST_PROXY=1` somente se o proxy for confiável. Injete segredos fora do repositório e use senha codificada na URL. Execute `prisma migrate deploy` como tarefa única antes de liberar tráfego, preserve backup `pg_dump` testado com `pg_restore`, registre métricas/logs sem dados sensíveis, monitore `/health`, e planeje rollback de imagem e de banco com restauração testada. Uma migração de schema pode não ser reversível; mantenha backup antes de atualizar. O Compose local não significa prontidão para produção.
