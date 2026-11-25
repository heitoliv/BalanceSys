# Entrega das imagens ao servidor

O arquivo `balancesys-images-20261125-amd64.tar.gz` contém duas imagens Docker: `localhost/balancesys-api:20261125` (API) e `localhost/balancesys-migrate:20261125` (tarefa Prisma). Não contém PostgreSQL nem dados do banco, segredos, `.env` ou backups. A imagem `postgres:16-alpine` é obtida no servidor pelo Compose. Confira a arquitetura `amd64` antes de usar. O arquivo `balancesys-images-20261125-amd64.tar.gz.sha256` permite conferir a transferência.

No servidor com Docker Engine e Compose:

```bash
sha256sum -c balancesys-images-20261125-amd64.tar.gz.sha256
docker load -i balancesys-images-20261125-amd64.tar.gz
cp release.env.example release.env
chmod 600 release.env
```

Edite `release.env` **no servidor**: substitua a senha por 48 caracteres hexadecimais aleatórios e defina `APP_BASE_URL` para a origem HTTPS pública real. Uma senha hexadecimal não exige codificação adicional na URL PostgreSQL do Compose. Não envie esse arquivo no Git ou em chats. Depois:

```bash
docker compose --env-file release.env -f compose.release.yaml config --quiet
docker compose --env-file release.env -f compose.release.yaml up -d db
docker compose --env-file release.env -f compose.release.yaml run --rm migrate
docker compose --env-file release.env -f compose.release.yaml up -d api
docker compose --env-file release.env -f compose.release.yaml ps
curl -fsS http://127.0.0.1:3000/health
```

O serviço `migrate` executa uma vez após o banco ficar saudável; rode apenas uma tarefa de migração por atualização. A API escuta somente no loopback do host; o professor precisa configurar proxy reverso com domínio e TLS antes de acesso público. `NODE_ENV=production` marca o cookie como Secure, então login público exige HTTPS. Faça backup e teste restauração do PostgreSQL antes de atualizar imagem ou schema. O volume do banco persiste entre reinicializações: não execute `down -v` para parar o serviço. Monitore healthcheck e logs sem registrar senhas ou códigos de recuperação. A limitação de tentativas ainda é por processo; para múltiplas réplicas, implemente controle compartilhado antes de abrir a aplicação amplamente.

Pessoas cadastradas recebem código de recuperação único no cadastro. Contas criadas antes desse recurso precisam gerar o primeiro código em Minha conta enquanto ainda conseguem autenticar. Perder senha e código simultaneamente não permite recuperação autônoma segura.
