#!/usr/bin/env bash
# Owns only GPS/.local/postgres. Never resets or removes existing data.
set -euo pipefail
cd "$(dirname "$0")/.."
action="${1:-status}"
root="$PWD/.local"
data="$root/postgres"
socket="$root/run"
port=55432

if ! command -v pg_ctl >/dev/null || ! command -v psql >/dev/null; then
  echo "PostgreSQL 16 indisponível; use scripts/nix-run.sh." >&2
  exit 1
fi

case "$action" in
  start)
    : "${POSTGRES_PASSWORD:?Execute via scripts/local_env.py exec; não mostre a senha.}"
    mkdir -p "$root" "$socket"
    chmod 700 "$root" "$socket"
    if [[ ! -f "$data/PG_VERSION" ]]; then
      if [[ -e "$data" ]]; then
        echo "Diretório de dados preexistente sem PG_VERSION; inspeção manual necessária." >&2
        exit 1
      fi
      initdb -D "$data" --auth-local=peer --auth-host=scram-sha-256 --no-instructions >/dev/null
    fi
    if ! pg_ctl -D "$data" status >/dev/null 2>&1; then
      pg_ctl -D "$data" -l "$root/postgres.log" -o "-h 127.0.0.1 -p $port -k $socket" -w start >/dev/null
    fi
    admin="$(id -un)"
    if [[ "$(psql -h "$socket" -p "$port" -U "$admin" -d postgres -Atqc "SELECT 1 FROM pg_roles WHERE rolname='balancesys_dev'")" != "1" ]]; then
      printf "CREATE ROLE balancesys_dev LOGIN PASSWORD '%s';\n" "$POSTGRES_PASSWORD" | psql -h "$socket" -p "$port" -U "$admin" -d postgres -v ON_ERROR_STOP=1 -q >/dev/null
    fi
    if [[ "$(psql -h "$socket" -p "$port" -U "$admin" -d postgres -Atqc "SELECT 1 FROM pg_database WHERE datname='balancesys_dev_local'")" != "1" ]]; then
      createdb -h "$socket" -p "$port" -U "$admin" -O balancesys_dev balancesys_dev_local
    fi
    PGPASSWORD="$POSTGRES_PASSWORD" psql -h 127.0.0.1 -p "$port" -U balancesys_dev -d balancesys_dev_local -v ON_ERROR_STOP=1 -qAt -c 'SELECT 1' >/dev/null
    echo "PostgreSQL local: ativo; banco de desenvolvimento acessível."
    ;;
  status)
    if [[ -f "$data/PG_VERSION" ]] && pg_ctl -D "$data" status >/dev/null 2>&1; then
      echo "PostgreSQL local: ativo."
    else
      echo "PostgreSQL local: inativo."
      exit 1
    fi
    ;;
  stop)
    if [[ -f "$data/PG_VERSION" ]] && pg_ctl -D "$data" status >/dev/null 2>&1; then
      pg_ctl -D "$data" -m fast -w stop >/dev/null
    fi
    echo "PostgreSQL local: inativo; dados preservados."
    ;;
  *) echo "Uso: local-postgres.sh start|status|stop" >&2; exit 2 ;;
esac
