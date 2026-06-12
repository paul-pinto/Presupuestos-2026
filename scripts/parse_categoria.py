import re
from pathlib import Path

import pandas as pd
import pdfplumber


RAW_DIR = Path("data/raw/sigep_2026/categoria_programatica_grupo_gasto_total_gastos")
OUT_DIR = Path("data/parsed")
OUT_DIR.mkdir(parents=True, exist_ok=True)

OUT_CSV = OUT_DIR / "sigep_2026_categoria_programatica_grupo_gasto_total_gastos.csv"
OUT_PARQUET = OUT_DIR / "sigep_2026_categoria_programatica_grupo_gasto_total_gastos.parquet"
OUT_TOTALS_CSV = OUT_DIR / "sigep_2026_categoria_programatica_grupo_gasto_total_gastos_totales.csv"
OUT_COMPARISON_CSV = OUT_DIR / "sigep_2026_categoria_programatica_grupo_gasto_total_gastos_validacion.csv"
OUT_PARSE_STATUS_CSV = OUT_DIR / "sigep_2026_categoria_programatica_grupo_gasto_total_gastos_parse_status.csv"

ROW_RE = re.compile(
    r"""
    ^
    (?P<prg>\d{2,3})\s+
    (?P<proyecto>\d+)\s+
    (?P<actividad>\d{3})\s+
    (?P<rest>.+?)
    \s+
    (?P<g1>-?[\d,]+)\s+
    (?P<g2>-?[\d,]+)\s+
    (?P<g3>-?[\d,]+)\s+
    (?P<g4>-?[\d,]+)\s+
    (?P<g5>-?[\d,]+)\s+
    (?P<g6>-?[\d,]+)\s+
    (?P<g7>-?[\d,]+)\s+
    (?P<g8>-?[\d,]+)\s+
    (?P<g9>-?[\d,]+)\s+
    (?P<total>-?[\d,]+)
    $
    """,
    re.VERBOSE,
)

TOTAL_RE = re.compile(
    r"""
    ^TOTAL\s+GENERAL:\s+
    (?P<g1>-?[\d,]+)\s+
    (?P<g2>-?[\d,]+)\s+
    (?P<g3>-?[\d,]+)\s+
    (?P<g4>-?[\d,]+)\s+
    (?P<g5>-?[\d,]+)\s+
    (?P<g6>-?[\d,]+)\s+
    (?P<g7>-?[\d,]+)\s+
    (?P<g8>-?[\d,]+)\s+
    (?P<g9>-?[\d,]+)\s+
    (?P<total>-?[\d,]+)
    $
    """,
    re.VERBOSE,
)

# Ejemplos esperados:
#   Entidad 1805 Gobierno Autónomo Municipal de Puerto Guayaramerín
#   Entidad 0901 Gobierno Autónomo Departamental de Chuquisaca
ENTITY_RE = re.compile(r"Entidad\s+(?P<codigo>\d+)\s+(?P<nombre>.+)$")

GROUP_COLS = [
    "grupo_1",
    "grupo_2",
    "grupo_3",
    "grupo_4",
    "grupo_5",
    "grupo_6",
    "grupo_7",
    "grupo_8",
    "grupo_9",
]

BASE_COLS = [
    "gestion",
    "codigo_entidad",
    "nombre_entidad",
    "prg",
    "proyecto",
    "actividad",
    "nivel",
    "es_resumen_programa",
    "es_fila_residual",
    "descripcion",
    *GROUP_COLS,
    "total",
    "total_calculado",
    "total_diff",
    "file",
]


def normalize_codigo_entidad(value: str | None) -> str | None:
    """
    Normaliza códigos institucionales.

    Caso importante:
      El Clasificador usa GAD como 901, 902, ..., 909.
      Algunos PDFs SIGEP pueden imprimirlos como 0901, 0902, ..., 0909.

    Para cruzar correctamente con config/entidades_sigep.csv:
      0901 -> 901
      0902 -> 902
      ...
    """
    if value is None:
        return None

    value = str(value).strip()

    if not value:
        return None

    return value.lstrip("0") or "0"


def to_int(value: str) -> int:
    return int(value.replace(",", "").strip())


def normalize_line(line: str) -> str:
    line = line.replace("\u00a0", " ")
    line = re.sub(r"\s+", " ", line)
    return line.strip()


def extract_text_lines(pdf_path: Path) -> list[str]:
    lines = []

    with pdfplumber.open(pdf_path) as pdf:
        for page in pdf.pages:
            text = page.extract_text(x_tolerance=1, y_tolerance=3) or ""

            for raw_line in text.splitlines():
                line = normalize_line(raw_line)

                if line:
                    lines.append(line)

    return lines


def is_header_or_noise(line: str) -> bool:
    return (
        line.startswith("MINISTERIO")
        or line.startswith("LEY N")
        or line.startswith("VICEMINISTERIO")
        or line.startswith("PRESUPUESTO INSTITUCIONAL")
        or line == "TOTAL GASTOS"
        or line == "(En Bolivianos)"
        or line.startswith("Entidad ")
        or line.startswith("Prg. Proyecto Descripción")
    )


def build_record(
    pdf_path: Path,
    codigo_entidad: str | None,
    nombre_entidad: str | None,
    match: re.Match,
) -> dict:
    proyecto = match.group("proyecto")
    actividad = match.group("actividad")

    # Regla anti-doble-conteo base:
    #   resumen_programa = proyecto == "0" AND actividad == "000"
    #   detalle          = todo lo demás
    #
    # Luego se agregan filas residuales cuando una fila resumen contiene
    # presupuesto que no está desagregado en filas hijas.
    es_resumen_programa = proyecto == "0" and actividad == "000"

    return {
        "gestion": 2026,
        "file": str(pdf_path),
        "codigo_entidad": codigo_entidad,
        "nombre_entidad": nombre_entidad,
        "prg": match.group("prg"),
        "proyecto": proyecto,
        "actividad": actividad,
        "nivel": "resumen_programa" if es_resumen_programa else "detalle",
        "es_resumen_programa": es_resumen_programa,
        "es_fila_residual": False,
        "descripcion": match.group("rest").strip(" -"),
        "grupo_1": to_int(match.group("g1")),
        "grupo_2": to_int(match.group("g2")),
        "grupo_3": to_int(match.group("g3")),
        "grupo_4": to_int(match.group("g4")),
        "grupo_5": to_int(match.group("g5")),
        "grupo_6": to_int(match.group("g6")),
        "grupo_7": to_int(match.group("g7")),
        "grupo_8": to_int(match.group("g8")),
        "grupo_9": to_int(match.group("g9")),
        "total": to_int(match.group("total")),
    }


def parse_pdf(pdf_path: Path) -> tuple[list[dict], dict | None]:
    lines = extract_text_lines(pdf_path)

    codigo_entidad = None
    nombre_entidad = None

    for line in lines:
        m = ENTITY_RE.search(line)

        if m:
            codigo_entidad = normalize_codigo_entidad(m.group("codigo"))
            nombre_entidad = m.group("nombre").strip()
            break

    records = []
    total_general = None
    last_record_idx = None

    for line in lines:
        if is_header_or_noise(line):
            continue

        total_match = TOTAL_RE.match(line)

        if total_match:
            total_general = {
                "gestion": 2026,
                "file": str(pdf_path),
                "codigo_entidad": codigo_entidad,
                "nombre_entidad": nombre_entidad,
                **{
                    f"grupo_{i}": to_int(total_match.group(f"g{i}"))
                    for i in range(1, 10)
                },
                "total": to_int(total_match.group("total")),
            }
            continue

        row_match = ROW_RE.match(line)

        if row_match:
            rec = build_record(
                pdf_path=pdf_path,
                codigo_entidad=codigo_entidad,
                nombre_entidad=nombre_entidad,
                match=row_match,
            )
            records.append(rec)
            last_record_idx = len(records) - 1
            continue

        # Continuaciones de descripción:
        # El PDF a veces corta descripciones en líneas separadas.
        if last_record_idx is not None:
            if not line.startswith("TOTAL GENERAL") and not ROW_RE.match(line):
                records[last_record_idx]["descripcion"] = (
                    records[last_record_idx]["descripcion"] + " " + line
                ).strip()

    return records, total_general


def add_program_residual_rows(df: pd.DataFrame) -> pd.DataFrame:
    """
    Ajuste clave para evitar pérdida de montos no desagregados.

    Caso:
      Programa resumen:
        proyecto == "0" and actividad == "000"
      Hijos:
        filas detalle del mismo prg

    Normalmente:
      resumen == suma(hijos)

    Pero en algunos municipios:
      resumen > suma(hijos)

    Esa diferencia representa presupuesto del programa no desagregado en filas hijas.
    Para no perderlo, generamos una fila artificial:

      nivel = residual_programa_no_desagregado
      actividad = "RES"
      monto = resumen - suma(hijos)

    No se suma el resumen completo, solo el residual positivo.
    """

    if df.empty:
        return df

    df = df.copy()
    residual_records = []

    resumen_df = df[df["es_resumen_programa"]].copy()
    detalle_df = df[~df["es_resumen_programa"]].copy()

    for _, resumen in resumen_df.iterrows():
        mask = (
            (detalle_df["gestion"] == resumen["gestion"])
            & (detalle_df["codigo_entidad"] == resumen["codigo_entidad"])
            & (detalle_df["prg"] == resumen["prg"])
        )

        hijos = detalle_df[mask]

        if hijos.empty:
            # Programa sin detalle:
            # Para análisis, el resumen completo debe contarse como una fila contable.
            residual = resumen.copy()
            residual["proyecto"] = "0"
            residual["actividad"] = "RES"
            residual["nivel"] = "programa_no_desagregado"
            residual["es_resumen_programa"] = False
            residual["es_fila_residual"] = True
            residual["descripcion"] = "PROGRAMA NO DESAGREGADO - " + str(
                resumen["descripcion"]
            )
            residual_records.append(residual.to_dict())
            continue

        diff_values = {}
        for col in GROUP_COLS:
            diff_values[col] = int(resumen[col]) - int(hijos[col].sum())

        diff_total = int(resumen["total"]) - int(hijos["total"].sum())

        if diff_total == 0 and all(value == 0 for value in diff_values.values()):
            continue

        # Si hay negativos, no fabricamos fila porque podría indicar:
        # - hijos cruzados de otra jerarquía,
        # - PDF con estructura más compleja,
        # - o captura duplicada por el parser.
        if diff_total < 0 or any(value < 0 for value in diff_values.values()):
            print(
                "[WARN] Residual negativo; no se agregará fila residual "
                f"entidad={resumen['codigo_entidad']} "
                f"prg={resumen['prg']} "
                f"diff_total={diff_total}"
            )
            continue

        residual = resumen.copy()
        residual["proyecto"] = "0"
        residual["actividad"] = "RES"
        residual["nivel"] = "residual_programa_no_desagregado"
        residual["es_resumen_programa"] = False
        residual["es_fila_residual"] = True
        residual["descripcion"] = "NO DESAGREGADO EN DETALLE - " + str(
            resumen["descripcion"]
        )

        for col, value in diff_values.items():
            residual[col] = value

        residual["total"] = diff_total
        residual_records.append(residual.to_dict())

    if residual_records:
        residual_df = pd.DataFrame(residual_records)
        print(f"\n[+] Filas residuales agregadas: {len(residual_df)}")

        preview_cols = [
            "codigo_entidad",
            "nombre_entidad",
            "prg",
            "actividad",
            "nivel",
            "descripcion",
            *GROUP_COLS,
            "total",
        ]

        print(residual_df[preview_cols].to_string(index=False))

        df = pd.concat([df, residual_df], ignore_index=True)

    return df


def validate_row_totals(df: pd.DataFrame) -> pd.DataFrame:
    df = df.copy()
    df["total_calculado"] = df[GROUP_COLS].sum(axis=1)
    df["total_diff"] = df["total"] - df["total_calculado"]
    return df


def aggregate_detail_rows(df: pd.DataFrame) -> pd.DataFrame:
    """
    Agrega solo filas contables para análisis.

    Excluye:
      - resumen_programa original

    Incluye:
      - detalle real
      - programa_no_desagregado
      - residual_programa_no_desagregado
    """
    df_detalle = df[~df["es_resumen_programa"]].copy()

    return (
        df_detalle.groupby(["codigo_entidad", "nombre_entidad"], dropna=False)[
            GROUP_COLS + ["total"]
        ]
        .sum()
        .reset_index()
    )


def compare_with_pdf_totals(df: pd.DataFrame, totals_df: pd.DataFrame) -> pd.DataFrame:
    agg = aggregate_detail_rows(df)

    merged = agg.merge(
        totals_df[["codigo_entidad", "nombre_entidad", *GROUP_COLS, "total"]],
        on=["codigo_entidad", "nombre_entidad"],
        how="left",
        suffixes=("_detalle", "_pdf"),
    )

    for col in GROUP_COLS + ["total"]:
        merged[f"{col}_diff"] = merged[f"{col}_detalle"] - merged[f"{col}_pdf"]

    return merged


def print_summary(df: pd.DataFrame, all_totals: list[dict]):
    bad_rows = df[df["total_diff"] != 0]

    if not bad_rows.empty:
        print("\n[WARN] Hay filas donde total != suma grupos:")
        print(
            bad_rows[
                [
                    "codigo_entidad",
                    "prg",
                    "proyecto",
                    "actividad",
                    "nivel",
                    "descripcion",
                    "total",
                    "total_calculado",
                    "total_diff",
                ]
            ]
            .head(30)
            .to_string(index=False)
        )
    else:
        print("\n[OK] Todas las filas cuadran: total == suma grupos")

    print("\n[+] Conteo por nivel:")
    print(
        df.groupby(["codigo_entidad", "nivel"])
        .size()
        .reset_index(name="filas")
        .to_string(index=False)
    )

    print("\n[+] Conteo global por nivel:")
    print(df.groupby("nivel").size().reset_index(name="filas").to_string(index=False))

    print("\n[+] Totales agregados desde filas contables:")
    detalle_agg = aggregate_detail_rows(df)
    print(detalle_agg.to_string(index=False))

    if all_totals:
        totals_df = pd.DataFrame(all_totals)

        # Asegurar código normalizado también en totals_df.
        totals_df["codigo_entidad"] = totals_df["codigo_entidad"].apply(
            normalize_codigo_entidad
        )

        totals_df.to_csv(OUT_TOTALS_CSV, index=False, encoding="utf-8-sig")
        print(f"\n[OK] Totales PDF CSV: {OUT_TOTALS_CSV}")

        comparison = compare_with_pdf_totals(df, totals_df)
        comparison.to_csv(OUT_COMPARISON_CSV, index=False, encoding="utf-8-sig")
        print(f"[OK] Validación CSV: {OUT_COMPARISON_CSV}")

        print("\n[+] Comparación detalle/residual vs PDF:")
        print(
            comparison[
                [
                    "codigo_entidad",
                    "nombre_entidad",
                    "total_detalle",
                    "total_pdf",
                    "total_diff",
                ]
            ].to_string(index=False)
        )

        diff_cols = [f"{col}_diff" for col in GROUP_COLS + ["total"]]
        mismatches = comparison[comparison[diff_cols].ne(0).any(axis=1)]

        if mismatches.empty:
            print("\n[OK] Los totales contables cuadran contra TOTAL GENERAL del PDF")
        else:
            print("\n[WARN] Hay diferencias entre filas contables y TOTAL GENERAL:")
            print(mismatches.to_string(index=False))


def main():
    pdfs = sorted(RAW_DIR.glob("*.pdf"))

    if not pdfs:
        raise SystemExit(f"No encontré PDFs en {RAW_DIR}")

    all_records = []
    all_totals = []
    parse_status = []

    for pdf_path in pdfs:
        print(f"[+] Parseando {pdf_path.name}")

        try:
            records, total_general = parse_pdf(pdf_path)

            print(f"    filas extraídas: {len(records)}")

            if total_general:
                print(f"    total_general PDF: {total_general['total']:,}")
                all_totals.append(total_general)
            else:
                print("    [WARN] No encontré TOTAL GENERAL")

            all_records.extend(records)

            parse_status.append(
                {
                    "file": str(pdf_path),
                    "filename": pdf_path.name,
                    "codigo_entidad": records[0]["codigo_entidad"]
                    if records
                    else (
                        total_general["codigo_entidad"]
                        if total_general
                        else None
                    ),
                    "nombre_entidad": records[0]["nombre_entidad"]
                    if records
                    else (
                        total_general["nombre_entidad"]
                        if total_general
                        else None
                    ),
                    "filas": len(records),
                    "tiene_total_general": total_general is not None,
                    "status": "ok" if records and total_general else "warning",
                    "error": "",
                }
            )

        except Exception as e:
            print(f"    [ERROR] No pude parsear {pdf_path.name}: {e}")

            parse_status.append(
                {
                    "file": str(pdf_path),
                    "filename": pdf_path.name,
                    "codigo_entidad": None,
                    "nombre_entidad": None,
                    "filas": 0,
                    "tiene_total_general": False,
                    "status": "error",
                    "error": repr(e),
                }
            )

    pd.DataFrame(parse_status).to_csv(
        OUT_PARSE_STATUS_CSV,
        index=False,
        encoding="utf-8-sig",
    )
    print(f"\n[OK] Parse status CSV: {OUT_PARSE_STATUS_CSV}")

    df = pd.DataFrame(all_records)

    if df.empty:
        raise SystemExit("No se extrajo ninguna fila.")

    # Normalización defensiva.
    df["codigo_entidad"] = df["codigo_entidad"].apply(normalize_codigo_entidad)

    # Primero agrega residuales, luego valida total por fila.
    df = add_program_residual_rows(df)
    df = validate_row_totals(df)

    # Asegurar tipos string en claves jerárquicas.
    df["codigo_entidad"] = df["codigo_entidad"].astype(str)
    df["prg"] = df["prg"].astype(str)
    df["proyecto"] = df["proyecto"].astype(str)
    df["actividad"] = df["actividad"].astype(str)

    df = df[BASE_COLS]

    df.to_csv(OUT_CSV, index=False, encoding="utf-8-sig")
    print(f"[OK] CSV: {OUT_CSV}")

    try:
        df.to_parquet(OUT_PARQUET, index=False)
        print(f"[OK] Parquet: {OUT_PARQUET}")
    except Exception as e:
        print(f"[WARN] No pude guardar Parquet: {e}")

    print_summary(df, all_totals)


if __name__ == "__main__":
    main()