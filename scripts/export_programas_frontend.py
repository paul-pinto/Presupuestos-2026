from pathlib import Path
import json

import duckdb
import pandas as pd


DB_PATH = Path("data/warehouse/sigep_2026.duckdb")
OUT_PATH = Path("frontend/public/data/programas.json")


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

    con = duckdb.connect(str(DB_PATH), read_only=True)

    df = con.execute(
        """
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
        """
    ).fetchdf()

    write_json(df, OUT_PATH)

    print(f"[OK] programas completos: {len(df):,} filas -> {OUT_PATH}")
    print(f"[OK] tamaÃ±o: {OUT_PATH.stat().st_size:,} bytes")

    con.close()


if __name__ == "__main__":
    main()
