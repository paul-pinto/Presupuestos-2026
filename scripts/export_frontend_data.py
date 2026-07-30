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

        "grupos_gasto": """
            SELECT 'grupo_1' AS grupo_gasto, 'Grupo 1' AS grupo_gasto_label, SUM(grupo_1) AS monto FROM mart_presupuesto_entidad
            UNION ALL
            SELECT 'grupo_2', 'Grupo 2', SUM(grupo_2) FROM mart_presupuesto_entidad
            UNION ALL
            SELECT 'grupo_3', 'Grupo 3', SUM(grupo_3) FROM mart_presupuesto_entidad
            UNION ALL
            SELECT 'grupo_4', 'Grupo 4', SUM(grupo_4) FROM mart_presupuesto_entidad
            UNION ALL
            SELECT 'grupo_5', 'Grupo 5', SUM(grupo_5) FROM mart_presupuesto_entidad
            UNION ALL
            SELECT 'grupo_6', 'Grupo 6', SUM(grupo_6) FROM mart_presupuesto_entidad
            UNION ALL
            SELECT 'grupo_7', 'Grupo 7', SUM(grupo_7) FROM mart_presupuesto_entidad
            UNION ALL
            SELECT 'grupo_8', 'Grupo 8', SUM(grupo_8) FROM mart_presupuesto_entidad
            UNION ALL
            SELECT 'grupo_9', 'Grupo 9', SUM(grupo_9) FROM mart_presupuesto_entidad
            ORDER BY monto DESC
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

        "recursos_entidad_top": """
            SELECT
                codigo_entidad,
                nombre_entidad,
                departamento,
                grupo_eta,
                tipo,
                ingresos_total
            FROM mart_recursos_entidad
            ORDER BY ingresos_total DESC
            LIMIT 100
        """,

        "ingresos_vs_gastos": """
            SELECT
                codigo_entidad,
                nombre_entidad,
                departamento,
                grupo_eta,
                tipo,
                ingresos_total,
                gastos_total,
                ingresos_menos_gastos
            FROM mart_ingresos_vs_gastos
            ORDER BY gastos_total DESC
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

        "objeto_gasto_entidad_top": """
            SELECT
                codigo_entidad,
                nombre_entidad,
                departamento,
                grupo_eta,
                tipo,
                gasto_total_objeto
            FROM mart_objeto_gasto_entidad
            ORDER BY gasto_total_objeto DESC
            LIMIT 100
        """,

        "fuentes_objeto_gasto": """
            SELECT
                fuente_columna,
                SUM(monto) AS monto
            FROM mart_objeto_fuente_largo
            GROUP BY fuente_columna
            ORDER BY monto DESC
        """,

        "validacion_integrada": """
            SELECT *
            FROM mart_validacion_integrada
            ORDER BY codigo_entidad
        """,

        "validacion_diferencias": """
            SELECT *
            FROM mart_validacion_integrada
            WHERE ABS(diff_ingresos_vs_gastos) > 1
               OR ABS(diff_objeto_vs_categoria) > 1
            ORDER BY ABS(diff_ingresos_vs_gastos) + ABS(diff_objeto_vs_categoria) DESC
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
            COUNT(DISTINCT departamento) AS departamentos,
            SUM(grupo_1) AS grupo_1,
            SUM(grupo_2) AS grupo_2,
            SUM(grupo_3) AS grupo_3,
            SUM(grupo_4) AS grupo_4,
            SUM(grupo_5) AS grupo_5,
            SUM(grupo_6) AS grupo_6,
            SUM(grupo_7) AS grupo_7,
            SUM(grupo_8) AS grupo_8,
            SUM(grupo_9) AS grupo_9
        FROM mart_presupuesto_entidad
        """
    ).fetchdf()

    ingresos = con.execute(
        """
        SELECT
            SUM(ingresos_total) AS ingresos_total
        FROM mart_recursos_entidad
        """
    ).fetchdf()

    objeto = con.execute(
        """
        SELECT
            SUM(gasto_total_objeto) AS gasto_total_objeto
        FROM mart_objeto_gasto_entidad
        """
    ).fetchdf()

    validacion = con.execute(
        """
        SELECT
            COUNT(*) AS entidades_con_diferencias
        FROM mart_validacion_integrada
        WHERE ABS(diff_ingresos_vs_gastos) > 1
           OR ABS(diff_objeto_vs_categoria) > 1
        """
    ).fetchdf()

    summary_path = OUT_DIR / "summary.json"
    summary_payload = {
        "gasto_total": float(summary.loc[0, "gasto_total"] or 0),
        "ingresos_total": float(ingresos.loc[0, "ingresos_total"] or 0),
        "gasto_total_objeto": float(objeto.loc[0, "gasto_total_objeto"] or 0),
        "entidades": int(summary.loc[0, "entidades"] or 0),
        "departamentos": int(summary.loc[0, "departamentos"] or 0),
        "entidades_con_diferencias": int(validacion.loc[0, "entidades_con_diferencias"] or 0),
        "grupos": {
            "grupo_1": float(summary.loc[0, "grupo_1"] or 0),
            "grupo_2": float(summary.loc[0, "grupo_2"] or 0),
            "grupo_3": float(summary.loc[0, "grupo_3"] or 0),
            "grupo_4": float(summary.loc[0, "grupo_4"] or 0),
            "grupo_5": float(summary.loc[0, "grupo_5"] or 0),
            "grupo_6": float(summary.loc[0, "grupo_6"] or 0),
            "grupo_7": float(summary.loc[0, "grupo_7"] or 0),
            "grupo_8": float(summary.loc[0, "grupo_8"] or 0),
            "grupo_9": float(summary.loc[0, "grupo_9"] or 0),
        },
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
