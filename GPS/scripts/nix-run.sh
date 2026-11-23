#!/usr/bin/env bash
# Run the locked Node/Prisma toolchain on NixOS with same-version Debian engines.
set -euo pipefail
cd "$(dirname "$0")/.."
if [[ $# -eq 0 ]]; then
  echo "Uso: bash scripts/nix-run.sh COMANDO [ARGUMENTOS...]" >&2
  exit 2
fi
if [[ "${BALANCESYS_NIX_READY:-}" != "1" ]]; then
  printf -v quoted '%q ' "$@"
  exec nix-shell -p nodejs_22 postgresql_16 openssl --run "BALANCESYS_NIX_READY=1 bash scripts/nix-run.sh $quoted"
fi

export PRISMA_CLI_BINARY_TARGETS=debian-openssl-3.0.x
for flag in ${NIX_LDFLAGS:-}; do
  if [[ "$flag" == -L/nix/store/*-openssl-*/lib ]]; then
    lib_path="${flag#-L}"
    if [[ -f "$lib_path/libssl.so.3" ]]; then
      export LD_LIBRARY_PATH="$lib_path${LD_LIBRARY_PATH:+:$LD_LIBRARY_PATH}"
      break
    fi
  fi
done
if [[ -z "${lib_path:-}" || ! -f "$lib_path/libssl.so.3" ]]; then
  echo "OpenSSL 3 não disponível no shell Nix." >&2
  exit 1
fi

engine_dir="$PWD/node_modules/@prisma/engines"
query_engine="$engine_dir/libquery_engine-debian-openssl-3.0.x.so.node"
schema_engine="$engine_dir/schema-engine-debian-openssl-3.0.x"
if [[ ( "$1" == "npm" || "$1" == */npm ) && ( "${2:-}" == "ci" || "${2:-}" == "install" || "${2:-}" == "rebuild" ) ]]; then
  exec "$@"
fi
if [[ -f "$engine_dir/package.json" && !( -f "$query_engine" && -f "$schema_engine" ) ]]; then
  echo "Engines Prisma ausentes; reconstruindo os binários da versão instalada..." >&2
  if ! npm rebuild @prisma/engines; then
    echo "Falha ao baixar os engines Prisma. Confira a rede e repita o comando." >&2
    exit 1
  fi
fi
if [[ -f "$engine_dir/package.json" ]]; then
  if [[ ! -f "$query_engine" || ! -f "$schema_engine" ]]; then
    echo "Falha ao preparar os engines Prisma. Confira a rede e execute npm rebuild @prisma/engines neste shell Nix." >&2
    exit 1
  fi
  export PRISMA_QUERY_ENGINE_LIBRARY="$query_engine"
  export PRISMA_SCHEMA_ENGINE_BINARY="$schema_engine"
fi
exec "$@"
