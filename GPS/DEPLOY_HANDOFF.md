# Entrega das imagens ao servidor

O novo arquivo `balancesys-images-20261125-r2-amd64.tar.gz` substitui o pacote anterior e contém duas imagens Docker: `localhost/balancesys-api:20261125-r2` (API) e `localhost/balancesys-migrate:20261125-r2` (tarefa Prisma). Não contém PostgreSQL nem dados do banco, segredos, `.env` ou backups. A imagem `postgres:16-alpine` é obtida no servidor pelo Compose. Confira a arquitetura `amd64` antes de usar. O arquivo `balancesys-images-20261125-r2-amd64.tar.gz.sha256` permite conferir a transferência.

No servidor com Docker Engine e Compose:

```bash
sha256sum -c balancesys-images-20261125-r2-amd64.tar.gz.sha256
docker load -i balancesys-images-20261125-r2-amd64.tar.gz
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

O serviço `migrate` executa uma vez após o banco ficar saudável; rode apenas uma tarefa de migração por atualização. A API escuta somente no loopback do host; o professor precisa configurar proxy reverso com domínio e TLS antes de acesso público. `NODE_ENV=production` marca o cookie como Secure, então login público exige HTTPS. Faça backup e teste restauração do PostgreSQL antes de atualizar imagem ou schema. O volume do banco persiste entre reinicializações: não execute `down -v` para parar o serviço. Monitore healthcheck e logs sem registrar senhas ou dados sensíveis. A limitação de tentativas ainda é por processo; para múltiplas réplicas, implemente controle compartilhado antes de abrir a aplicação amplamente.

A troca de senha pela própria pessoa exige sessão e senha atual. Senha esquecida requer redefinição administrativa após conferir a identidade fora da aplicação; não existe recuperação por código ou e-mail.
