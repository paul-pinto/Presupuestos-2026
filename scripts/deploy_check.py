from pathlib import Path
import importlib
import sqlite3
import sys

REQUIRED_IMPORTS = [
    "streamlit",
    "duckdb",
    "pandas",
    "plotly",
]

DB_PATH = Path("data/warehouse/sigep_2026.duckdb")
APP_PATH = Path("app.py")

REQUIRED_TABLES = [
    "mart_presupuesto_entidad",
    "mart_programas",
    "mart_subprogramas",
    "mart_recursos_entidad",
    "mart_recursos_rubro_nivel1",
    "mart_recursos_detalle",
    "mart_ingresos_vs_gastos",
    "mart_objeto_gasto_entidad",
    "mart_objeto_gasto_nivel1",
    "mart_objeto_gasto_detalle",
    "mart_objeto_fuente_largo",
    "mart_objeto_fuente_entidad",
    "mart_validacion",
    "mart_validacion_integrada",
]


def fail(message: str) -> None:
    print(f"[FAIL] {message}")
    sys.exit(1)


def ok(message: str) -> None:
    print(f"[OK] {message}")


def main() -> None:
    if not APP_PATH.exists():
        fail("No existe app.py")

    ok("app.py existe")

    for module in REQUIRED_IMPORTS:
        try:
            importlib.import_module(module)
            ok(f"Import OK: {module}")
        except Exception as exc:
            fail(f"No se pudo importar {module}: {exc}")

    if not DB_PATH.exists():
        fail(f"No existe DuckDB: {DB_PATH}")

    ok(f"DuckDB existe: {DB_PATH} ({DB_PATH.stat().st_size:,} bytes)")

    import duckdb

    con = duckdb.connect(str(DB_PATH), read_only=True)

    tables = {
        row[0]
        for row in con.execute(
            """
            SELECT table_name
            FROM information_schema.tables
            WHERE table_schema = 'main'
            """
        ).fetchall()
    }

    missing = [table for table in REQUIRED_TABLES if table not in tables]

    if missing:
        fail(f"Faltan tablas en DuckDB: {missing}")

    ok("Todas las tablas requeridas existen en DuckDB")

    for table in REQUIRED_TABLES:
        count = con.execute(f"SELECT COUNT(*) FROM {table}").fetchone()[0]
        ok(f"{table}: {count:,} filas")

    con.close()

    ok("Deploy check completado")


if __name__ == "__main__":
    main()
