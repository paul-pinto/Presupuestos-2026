from pathlib import Path
import json

import duckdb
import pandas as pd


DB_PATH = Path("data/warehouse/sigep_2026.duckdb")
OUT_DIR = Path("frontend/public/data")


def write_json(df: pd.DataFrame, path: Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)

    records = json.loads(
        df.to_json(
            orient="records",
            force_ascii=False,
            date_format="iso",
        )
    )

    path.write_text(
        json.dumps(records, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )


def main() -> None:
    if not DB_PATH.exists():
        raise FileNotFoundError(f"No existe DuckDB: {DB_PATH}")

    OUT_DIR.mkdir(parents=True, exist_ok=True)

    con = duckdb.connect(str(DB_PATH), read_only=True)

    datasets = {
        "entidades": """
            SELECT
                codigo_entidad,
                nombre_entidad,
                departamento,
                grupo_eta,
                tipo,
                presupuesto_total,
                grupo_1,
                grupo_2,
                grupo_3,
                grupo_4,
                grupo_5,
                grupo_6,
                grupo_7,
                grupo_8,
                grupo_9
            FROM mart_presupuesto_entidad
            ORDER BY presupuesto_total DESC
        """,
        "departamentos": """
            SELECT
                departamento,
                SUM(presupuesto_total) AS presupuesto_total,
                COUNT(DISTINCT codigo_entidad) AS entidades
            FROM mart_presupuesto_entidad
            GROUP BY departamento
            ORDER BY presupuesto_total DESC
        """,
        "grupos_eta": """
            SELECT
                grupo_eta,
                tipo,
                SUM(presupuesto_total) AS presupuesto_total,
                COUNT(DISTINCT codigo_entidad) AS entidades
            FROM mart_presupuesto_entidad
            GROUP BY grupo_eta, tipo
            ORDER BY presupuesto_total DESC
        """,
        "programas_top": """
            SELECT
                codigo_entidad,
                nombre_entidad,
                departamento,
                grupo_eta,
                tipo,
                prg,
                descripcion,
                total,
                grupo_1,
                grupo_2,
                grupo_3,
                grupo_4,
                grupo_5,
                grupo_6,
                grupo_7,
                grupo_8,
                grupo_9
            FROM mart_programas
            WHERE total > 0
            ORDER BY total DESC
            LIMIT 500
        """,
        "recursos_rubro": """
            SELECT
                rubro,
                descripcion,
                SUM(importe) AS importe
            FROM mart_recursos_rubro_nivel1
            GROUP BY rubro, descripcion
            ORDER BY importe DESC
        """,
        "objeto_gasto_nivel1": """
            SELECT
                objeto_gasto,
                descripcion,
                SUM(total) AS total
            FROM mart_objeto_gasto_nivel1
            GROUP BY objeto_gasto, descripcion
            ORDER BY total DESC
        """,
        "validacion_integrada": """
            SELECT *
            FROM mart_validacion_integrada
            ORDER BY codigo_entidad
        """,
    }

    manifest = {}

    for name, query in datasets.items():
        df = con.execute(query).fetchdf()
        out_path = OUT_DIR / f"{name}.json"
        write_json(df, out_path)

        manifest[name] = {
            "file": f"/data/{name}.json",
            "rows": int(len(df)),
            "bytes": int(out_path.stat().st_size),
        }

        print(f"[OK] {name}: {len(df):,} filas -> {out_path}")

    summary = con.execute(
        """
        SELECT
            SUM(presupuesto_total) AS gasto_total,
            COUNT(DISTINCT codigo_entidad) AS entidades,
            COUNT(DISTINCT departamento) AS departamentos
        FROM mart_presupuesto_entidad
        """
    ).fetchdf()

    summary_path = OUT_DIR / "summary.json"
    summary_payload = {
        "gasto_total": float(summary.loc[0, "gasto_total"] or 0),
        "entidades": int(summary.loc[0, "entidades"] or 0),
        "departamentos": int(summary.loc[0, "departamentos"] or 0),
        "manifest": manifest,
    }

    summary_path.write_text(
        json.dumps(summary_payload, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )

    print(f"[OK] summary -> {summary_path}")

    con.close()


if __name__ == "__main__":
    main()
