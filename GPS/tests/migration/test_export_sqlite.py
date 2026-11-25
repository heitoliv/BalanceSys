import sqlite3
import tempfile
import unittest
from pathlib import Path
import sys
from contextlib import closing

sys.path.insert(0, str(Path(__file__).resolve().parents[2] / "scripts"))
from export_sqlite import export


class ExportSqliteTest(unittest.TestCase):
    def fixture(self, folder: Path, value: float) -> Path:
        source = folder / "source.db"
        with closing(sqlite3.connect(source)) as db:
            db.executescript("""
                CREATE TABLE usuarios(id TEXT, nome TEXT, email TEXT, criadoEm DATETIME);
                CREATE TABLE categorias(id TEXT, nome TEXT, tipo TEXT);
                CREATE TABLE transacoes(id TEXT, tipo TEXT, valor REAL, descricao TEXT, data DATETIME, prioridade TEXT, criadoEm DATETIME, usuarioId TEXT, categoriaId TEXT);
                INSERT INTO usuarios VALUES('u','Pessoa','p@example.test',1795000000000);
                INSERT INTO categorias VALUES('c','Renda','RECEITA');
            """)
            db.execute("INSERT INTO transacoes VALUES(?,?,?,?,?,?,?,?,?)", ("t", "RECEITA", value, "Teste", 1795000000000, "IMPORTANTE", 1795000000000, "u", "c"))
            db.commit()
        return source

    def test_exact_cents_and_backup(self):
        with tempfile.TemporaryDirectory() as tmp:
            folder = Path(tmp)
            result = export(self.fixture(folder, 89.9), folder / "out.export.json")
            self.assertEqual(result["totals"]["RECEITA"], "89.90")
            self.assertEqual(result["counts"]["transacoes"], 1)
            self.assertTrue(Path(result["backup"]).is_file())
            with self.assertRaisesRegex(ValueError, "already exists"):
                export(folder / "source.db", folder / "out.export.json")

    def test_rejects_fractional_cent(self):
        with tempfile.TemporaryDirectory() as tmp:
            folder = Path(tmp)
            with self.assertRaisesRegex(ValueError, "non-cent"):
                export(self.fixture(folder, 1.001), folder / "out.export.json")

    def test_rejects_submillisecond_timestamp(self):
        with tempfile.TemporaryDirectory() as tmp:
            folder = Path(tmp)
            source = self.fixture(folder, 1.00)
            with closing(sqlite3.connect(source)) as db:
                db.execute("UPDATE transacoes SET data = ?", ("2026-11-19T00:00:00.123456Z",))
                db.commit()
            with self.assertRaisesRegex(ValueError, "Sub-millisecond"):
                export(source, folder / "out.export.json")


if __name__ == "__main__":
    unittest.main()
