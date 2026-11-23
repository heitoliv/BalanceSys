"""Create a consistent SQLite backup and an exact-cent JSON export.

Usage: python3 scripts/export_sqlite.py prisma/dev.db prisma/backup/data.export.json
"""
import hashlib
import json
import sqlite3
import sys
from decimal import Decimal
from datetime import datetime, timezone
from pathlib import Path
from contextlib import closing


def export(source: Path, destination: Path) -> dict:
    if not source.is_file():
        raise ValueError(f"SQLite source does not exist: {source}")
    destination.parent.mkdir(parents=True, exist_ok=True)
    backup_path = destination.with_suffix(".backup.db")
    if destination.exists() or backup_path.exists():
        raise ValueError("Export or backup already exists; choose a new output path")
    with closing(sqlite3.connect(f"{source.resolve().as_uri()}?mode=ro", uri=True)) as origin:
        with closing(sqlite3.connect(backup_path)) as backup:
            origin.backup(backup)
    with closing(sqlite3.connect(backup_path)) as db:
        db.row_factory = sqlite3.Row
        users = [dict(row) for row in db.execute('SELECT * FROM usuarios ORDER BY id')]
        categories = [dict(row) for row in db.execute('SELECT * FROM categorias ORDER BY id')]
        transactions = [dict(row) for row in db.execute('SELECT * FROM transacoes ORDER BY id')]
    def timestamp(value):
        if isinstance(value, (int, float)):
            if value != int(value):
                raise ValueError(f"Sub-millisecond SQLite timestamp cannot be preserved: {value}")
            return datetime.fromtimestamp(value / 1000, timezone.utc).isoformat(timespec="milliseconds").replace("+00:00", "Z")
        parsed = datetime.fromisoformat(str(value).replace("Z", "+00:00"))
        if parsed.tzinfo is None:
            parsed = parsed.replace(tzinfo=timezone.utc)
        if parsed.microsecond % 1000:
            raise ValueError(f"Sub-millisecond SQLite timestamp cannot be preserved: {value}")
        return parsed.astimezone(timezone.utc).isoformat(timespec="milliseconds").replace("+00:00", "Z")
    for row in users:
        row["criadoEm"] = timestamp(row["criadoEm"])
    for row in transactions:
        row["data"] = timestamp(row["data"])
        row["criadoEm"] = timestamp(row["criadoEm"])
    totals = {"RECEITA": Decimal("0"), "DESPESA": Decimal("0")}
    for row in transactions:
        value = Decimal(str(row["valor"]))
        cents = value.quantize(Decimal("0.01"))
        if value != cents or not value.is_finite() or value <= 0:
            raise ValueError(f"Transaction {row['id']} has non-cent or invalid value {value}; resolve explicitly")
        row["valor"] = format(cents, ".2f")
        if row["tipo"] not in totals:
            raise ValueError(f"Invalid transaction type in {row['id']}")
        totals[row["tipo"]] += cents
    result = {
        "source_sha256": hashlib.sha256(backup_path.read_bytes()).hexdigest(),
        "counts": {"usuarios": len(users), "categorias": len(categories), "transacoes": len(transactions)},
        "totals": {key: format(value, ".2f") for key, value in totals.items()},
        "usuarios": users, "categorias": categories, "transacoes": transactions,
    }
    destination.write_text(json.dumps(result, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    return {"backup": str(backup_path), "sha256": result["source_sha256"], "counts": result["counts"], "totals": result["totals"]}


if __name__ == "__main__":
    if len(sys.argv) != 3:
        raise SystemExit("Usage: python3 scripts/export_sqlite.py SOURCE.db OUTPUT.export.json")
    print(json.dumps(export(Path(sys.argv[1]), Path(sys.argv[2])), ensure_ascii=False))
