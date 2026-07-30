from pathlib import Path
import json

import duckdb
import pandas as pd


DB_PATH = Path("data/warehouse/sigep_2026.duckdb")
OUT_DIR = Path("frontend/public/data")


def write_json(df: pd.DataFrame, name: str) -> None:
    path = OUT_DIR / name
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

    print(f"[OK] {name}: {len(df):,} filas -> {path}")


def main() -> None:
    con = duckdb.connect(str(DB_PATH), read_only=True)

    recursos = con.execute(
        """
        SELECT
            codigo_entidad,
            nombre_entidad,
            departamento,
            grupo_eta,
            tipo,
            rubro,
            descripcion,
            importe
        FROM mart_recursos_detalle
        WHERE importe IS NOT NULL
          AND importe <> 0
        """
    ).fetchdf()

    objeto = con.execute(
        """
        SELECT
            codigo_entidad,
            nombre_entidad,
            departamento,
            grupo_eta,
            tipo,
            objeto_gasto,
            descripcion,
            total
        FROM mart_objeto_gasto_detalle
        WHERE total IS NOT NULL
          AND total <> 0
        """
    ).fetchdf()

    fuentes = con.execute(
        """
        SELECT
            codigo_entidad,
            nombre_entidad,
            departamento,
            grupo_eta,
            tipo,
            fuente_columna,
            monto
        FROM mart_objeto_fuente_largo
        WHERE monto IS NOT NULL
          AND monto <> 0
        """
    ).fetchdf()

    write_json(recursos, "recursos_detalle.json")
    write_json(objeto, "objeto_gasto_detalle.json")
    write_json(fuentes, "fuentes_objeto_largo.json")

    con.close()


if __name__ == "__main__":
    main()
