"""Create, validate and load the private local development environment.

Never prints environment values. The local Postgres cluster is managed separately.
"""
import os
import re
import secrets
import sys
from pathlib import Path
from urllib.parse import parse_qs, unquote, urlparse

ROOT = Path(__file__).resolve().parents[1]
ENV = ROOT / ".env"
EXAMPLE = ROOT / ".env.example"
REQUIRED = {"DATABASE_URL", "POSTGRES_PASSWORD", "PORT", "NODE_ENV", "TRUST_PROXY"}


def parse(path: Path) -> dict[str, str]:
    result: dict[str, str] = {}
    for line in path.read_text(encoding="utf-8").splitlines():
        stripped = line.strip()
        if not stripped or stripped.startswith("#"):
            continue
        if "=" not in stripped:
            raise ValueError("invalid line")
        key, value = stripped.split("=", 1)
        key = key.strip()
        if not re.fullmatch(r"[A-Z][A-Z0-9_]*", key) or key in result:
            raise ValueError("invalid or duplicate key")
        value = value.strip()
        if len(value) >= 2 and value[0] == value[-1] and value[0] in {'"', "'"}:
            value = value[1:-1]
        result[key] = value
    return result


def check() -> tuple[bool, list[str], dict[str, str]]:
    if not ENV.is_file():
        return False, sorted(REQUIRED), {}
    try:
        values = parse(ENV)
    except (OSError, ValueError):
        return False, ["formato"], {}
    pending = sorted(REQUIRED - values.keys())
    if (ENV.stat().st_mode & 0o077) != 0:
        pending.append("permissoes")
    try:
        url = urlparse(values.get("DATABASE_URL", ""))
        if (
            url.scheme != "postgresql"
            or url.hostname not in {"127.0.0.1", "localhost"}
            or url.port != 55432
            or url.path != "/balancesys_dev_local"
            or url.username != "balancesys_dev"
            or parse_qs(url.query).get("schema") != ["public"]
            or not url.password
            or unquote(url.password) != values.get("POSTGRES_PASSWORD")
        ):
            pending.append("DATABASE_URL")
    except ValueError:
        pending.append("DATABASE_URL")
    if not re.fullmatch(r"[0-9a-f]{48}", values.get("POSTGRES_PASSWORD", "")):
        pending.append("POSTGRES_PASSWORD")
    try:
        if not 1 <= int(values.get("PORT", "")) <= 65535:
            pending.append("PORT")
    except ValueError:
        pending.append("PORT")
    if values.get("NODE_ENV") != "development":
        pending.append("NODE_ENV")
    if values.get("TRUST_PROXY") != "0":
        pending.append("TRUST_PROXY")
    return not pending, sorted(set(pending)), values


def print_status(valid: bool, pending: list[str]) -> None:
    print(f".env: {'presente' if ENV.is_file() else 'ausente'}")
    print(f"configuração: {'válida' if valid else 'inválida'}")
    print(f"chaves pendentes: {', '.join(pending) if pending else 'nenhuma'}")


def init() -> None:
    if not ENV.exists():
        example = parse(EXAMPLE)
        if set(example) != REQUIRED:
            raise ValueError(".env.example keys do not match required keys")
        password = secrets.token_hex(24)
        values = {**example,
            "POSTGRES_PASSWORD": password,
            "DATABASE_URL": f"postgresql://balancesys_dev:{password}@127.0.0.1:55432/balancesys_dev_local?schema=public",
        }
        lines = ["# Configuração privada de desenvolvimento local; não versionar."]
        lines += [f"{key}={value}" for key, value in values.items()]
        fd = os.open(ENV, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600)
        with os.fdopen(fd, "w", encoding="utf-8") as file:
            file.write("\n".join(lines) + "\n")
    valid, pending, _ = check()
    print_status(valid, pending)
    if not valid:
        raise SystemExit(1)


def main() -> None:
    action = sys.argv[1] if len(sys.argv) > 1 else "check"
    if action == "init":
        init()
    elif action == "check":
        valid, pending, _ = check()
        print_status(valid, pending)
        if not valid:
            raise SystemExit(1)
    elif action == "exec":
        valid, pending, values = check()
        if not valid:
            print_status(valid, pending)
            raise SystemExit(1)
        if len(sys.argv) < 3:
            raise SystemExit("Usage: local_env.py exec COMMAND [ARGS...]")
        env = os.environ.copy()
        env.update(values)
        os.execvpe(sys.argv[2], sys.argv[2:], env)
    else:
        raise SystemExit("Usage: local_env.py init|check|exec")


if __name__ == "__main__":
    main()
