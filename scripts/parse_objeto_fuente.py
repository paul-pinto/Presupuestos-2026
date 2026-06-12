import re
from pathlib import Path

import pandas as pd
import pdfplumber


GESTION = 2026

RAW_DIR = Path("data/raw/sigep_2026/objeto_gasto_fuente_total_gastos")
OUT_DIR = Path("data/parsed")
OUT_DIR.mkdir(parents=True, exist_ok=True)

OUT_CSV = OUT_DIR / "sigep_2026_objeto_gasto_fuente_total_gastos.csv"
OUT_PARQUET = OUT_DIR / "sigep_2026_objeto_gasto_fuente_total_gastos.parquet"
OUT_TOTALS_CSV = OUT_DIR / "sigep_2026_objeto_gasto_fuente_total_gastos_totales.csv"
OUT_VALIDACION_CSV = OUT_DIR / "sigep_2026_objeto_gasto_fuente_total_gastos_validacion.csv"
OUT_PARSE_STATUS_CSV = OUT_DIR / "sigep_2026_objeto_gasto_fuente_total_gastos_parse_status.csv"


ENTITY_RE = re.compile(
    r"Entidad\s*:\s*(?P<codigo>\d+)\s+(?P<nombre>.+)$",
    re.IGNORECASE,
)

TOTAL_RE = re.compile(
    r"^TOTAL\s+GENERAL\s+GASTOS\s+(?P<amounts>(?:-?[\d,]+\s+)+-?[\d,]+)$",
    re.IGNORECASE,
)

OBJ_RE = re.compile(r"^(?P<objeto>\d+(?:\.\d+)*)\s+(?P<rest>.+)$")

AMOUNT_RE = re.compile(r"-?[\d,]+$")

# El reporte trae 18 columnas numéricas después de descripción / Ent. Trf.
# La última es TOTAL. Las anteriores son columnas de fuente/organismo según el encabezado del PDF.
AMOUNT_COLS = [
    "monto_01_tgn",
    "monto_02_tgn_p",
    "monto_03_tgn_ct",
    "monto_04_recon",
    "monto_05_tgn_fcom",
    "monto_06_tgn_pg_n",
    "monto_07_tgn_iehd",
    "monto_08_tgn_idh",
    "monto_09_tgn_ipj",
    "monto_10_tgn_ppet",
    "monto_11_ot_gob",
    "monto_12_total_tgn",
    "monto_13_otros_ingresos",
    "monto_14_recursos_especificos",
    "monto_15_donaciones_internas",
    "monto_16_credito_externo",
    "monto_17_donaciones_externas",
    "total",
]

BASE_COLS = [
    "gestion",
    "codigo_entidad",
    "nombre_entidad",
    "objeto_gasto",
    "objeto_padre",
    "nivel_objeto",
    "descripcion",
    "entidad_transferencia",
    "es_detalle",
    "es_resumen",
    *AMOUNT_COLS,
    "file",
]


def normalize_codigo_entidad(value: str | None) -> str | None:
    if value is None:
        return None

    value = str(value).strip()

    if not value:
        return None

    return value.lstrip("0") or "0"


def normalize_line(line: str) -> str:
    line = str(line or "")
    line = line.replace("\u00a0", " ")
    line = re.sub(r"\s+", " ", line)
    return line.strip()


def parse_amount(value: str) -> int:
    value = str(value or "").strip()

    if not value:
        return 0

    value = value.replace(".", "").replace(",", "")

    return int(value)


def objeto_padre(objeto: str | None) -> str | None:
    if not objeto:
        return None

    parts = str(objeto).split(".")

    if len(parts) <= 1:
        return None

    return ".".join(parts[:-1])


def nivel_objeto(objeto: str | None) -> int | None:
    if not objeto:
        return None

    return len(str(objeto).split("."))


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


def is_noise(line: str) -> bool:
    upper = line.upper()

    return (
        upper.startswith("MINISTERIO DE ECONOMIA")
        or upper.startswith("MINISTERIO DE ECONOMÍA")
        or upper.startswith("VICEMINISTERIO")
        or upper.startswith("PRESUPUESTO INSTITUCIONAL")
        or upper.startswith("FUENTE DE FINANCIAMIENTO")
        or upper.startswith("TOTAL GASTOS")
        or upper.startswith("(EN BOLIVIANOS)")
        or upper.startswith("LEY N")
        or upper.startswith("C O O B")
        or upper.startswith("ENTIDAD:")
        or upper.startswith("ENTIDAD :")
    )


def split_tail_amounts(rest: str, expected_amounts: int = 18):
    """
    Divide la línea en:
      - parte izquierda: descripción + opcional Ent. Trf.
      - cola numérica: 18 montos

    Ejemplo detalle:
      Personal Eventual 0000 0 0 3,978,494 ... 4,218,713

    Ejemplo resumen:
      SERVICIOS PERSONALES 0 0 14,243,684 ... 14,631,675
    """
    tokens = rest.split()

    amount_tokens = []

    while tokens and AMOUNT_RE.match(tokens[-1]):
        amount_tokens.append(tokens.pop())

        if len(amount_tokens) == expected_amounts:
            break

    amount_tokens = list(reversed(amount_tokens))

    if len(amount_tokens) != expected_amounts:
        return None, None

    left = " ".join(tokens).strip()

    return left, amount_tokens


def parse_objeto_line(line: str) -> dict | None:
    m = OBJ_RE.match(line)

    if not m:
        return None

    objeto = m.group("objeto")
    rest = m.group("rest").strip()

    left, amount_tokens = split_tail_amounts(rest, expected_amounts=len(AMOUNT_COLS))

    if left is None:
        return None

    left_tokens = left.split()

    entidad_transferencia = None

    if left_tokens and re.fullmatch(r"\d{4}", left_tokens[-1]):
        entidad_transferencia = left_tokens[-1]
        descripcion = " ".join(left_tokens[:-1]).strip()
        es_detalle = True
    else:
        descripcion = left.strip()
        es_detalle = False

    if not descripcion:
        descripcion = None

    amounts = [parse_amount(x) for x in amount_tokens]

    row = {
        "objeto_gasto": objeto,
        "objeto_padre": objeto_padre(objeto),
        "nivel_objeto": nivel_objeto(objeto),
        "descripcion": descripcion,
        "entidad_transferencia": entidad_transferencia,
        "es_detalle": bool(es_detalle),
        "es_resumen": not bool(es_detalle),
    }

    for col, value in zip(AMOUNT_COLS, amounts):
        row[col] = value

    return row


def parse_total_line(line: str) -> dict | None:
    m = TOTAL_RE.match(line)

    if not m:
        return None

    amounts = [parse_amount(x) for x in m.group("amounts").split()]

    if len(amounts) != len(AMOUNT_COLS):
        return None

    row = {}

    for col, value in zip(AMOUNT_COLS, amounts):
        row[col] = value

    return row


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

    for line in lines:
        if is_noise(line):
            continue

        total_row = parse_total_line(line)

        if total_row:
            total_general = {
                "gestion": GESTION,
                "codigo_entidad": codigo_entidad,
                "nombre_entidad": nombre_entidad,
                **total_row,
                "file": str(pdf_path),
            }
            continue

        parsed = parse_objeto_line(line)

        if parsed:
            records.append(
                {
                    "gestion": GESTION,
                    "codigo_entidad": codigo_entidad,
                    "nombre_entidad": nombre_entidad,
                    **parsed,
                    "file": str(pdf_path),
                }
            )

    return records, total_general


def aggregate_detail(df: pd.DataFrame) -> pd.DataFrame:
    det = df[df["es_detalle"]].copy()

    agg_dict = {col: "sum" for col in AMOUNT_COLS}

    return (
        det.groupby(["codigo_entidad", "nombre_entidad"], dropna=False)
        .agg(agg_dict)
        .reset_index()
    )


def validate_against_total(df: pd.DataFrame, totals_df: pd.DataFrame) -> pd.DataFrame:
    agg = aggregate_detail(df)

    merged = agg.merge(
        totals_df[["codigo_entidad", "nombre_entidad", *AMOUNT_COLS]],
        on=["codigo_entidad", "nombre_entidad"],
        how="outer",
        suffixes=("_detalle", "_pdf"),
    )

    for col in AMOUNT_COLS:
        dcol = f"{col}_detalle"
        pcol = f"{col}_pdf"
        diff_col = f"{col}_diff"

        merged[dcol] = merged[dcol].fillna(0).astype("int64")
        merged[pcol] = merged[pcol].fillna(0).astype("int64")
        merged[diff_col] = merged[dcol] - merged[pcol]

    merged["total_detalle"] = merged["total_detalle"].astype("int64")
    merged["total_pdf"] = merged["total_pdf"].astype("int64")
    merged["total_diff"] = merged["total_detalle"] - merged["total_pdf"]

    return merged


def build_long_from_detail(df: pd.DataFrame) -> pd.DataFrame:
    """
    Versión larga para análisis por fuente/organismo.
    Solo usa filas detalle para evitar doble conteo.
    """
    det = df[df["es_detalle"]].copy()

    id_cols = [
        "gestion",
        "codigo_entidad",
        "nombre_entidad",
        "objeto_gasto",
        "objeto_padre",
        "nivel_objeto",
        "descripcion",
        "entidad_transferencia",
        "file",
    ]

    value_cols = [col for col in AMOUNT_COLS if col != "total"]

    long_df = det.melt(
        id_vars=id_cols,
        value_vars=value_cols,
        var_name="fuente_columna",
        value_name="monto",
    )

    long_df = long_df[long_df["monto"] != 0].copy()

    return long_df


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
            records, total = parse_pdf(pdf_path)

            print(f"    filas extraídas: {len(records)}")

            if total:
                print(f"    total_general_gastos: {total['total']:,}")
                all_totals.append(total)
            else:
                print("    [WARN] No encontré TOTAL GENERAL GASTOS")

            all_records.extend(records)

            codigo = None
            nombre = None

            if records:
                codigo = records[0].get("codigo_entidad")
                nombre = records[0].get("nombre_entidad")
            elif total:
                codigo = total.get("codigo_entidad")
                nombre = total.get("nombre_entidad")

            parse_status.append(
                {
                    "file": str(pdf_path),
                    "filename": pdf_path.name,
                    "codigo_entidad": codigo,
                    "nombre_entidad": nombre,
                    "filas": len(records),
                    "tiene_total_general": total is not None,
                    "status": "ok" if records and total else "warning",
                    "error": "",
                }
            )

        except Exception as e:
            print(f"    [ERROR] {pdf_path.name}: {e}")

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

    df["codigo_entidad"] = df["codigo_entidad"].apply(normalize_codigo_entidad)

    for col in AMOUNT_COLS:
        df[col] = pd.to_numeric(df[col], errors="coerce").fillna(0).astype("int64")

    df = df[BASE_COLS]

    df.to_csv(OUT_CSV, index=False, encoding="utf-8-sig")
    print(f"[OK] CSV: {OUT_CSV}")

    try:
        df.to_parquet(OUT_PARQUET, index=False)
        print(f"[OK] Parquet: {OUT_PARQUET}")
    except Exception as e:
        print(f"[WARN] No pude guardar Parquet: {e}")

    long_df = build_long_from_detail(df)
    long_csv = OUT_DIR / "sigep_2026_objeto_gasto_fuente_total_gastos_largo.csv"
    long_parquet = OUT_DIR / "sigep_2026_objeto_gasto_fuente_total_gastos_largo.parquet"

    long_df.to_csv(long_csv, index=False, encoding="utf-8-sig")
    print(f"[OK] CSV largo: {long_csv}")

    try:
        long_df.to_parquet(long_parquet, index=False)
        print(f"[OK] Parquet largo: {long_parquet}")
    except Exception as e:
        print(f"[WARN] No pude guardar Parquet largo: {e}")

    totals_df = pd.DataFrame(all_totals)

    if not totals_df.empty:
        totals_df["codigo_entidad"] = totals_df["codigo_entidad"].apply(
            normalize_codigo_entidad
        )

        for col in AMOUNT_COLS:
            totals_df[col] = (
                pd.to_numeric(totals_df[col], errors="coerce").fillna(0).astype("int64")
            )

        totals_df.to_csv(OUT_TOTALS_CSV, index=False, encoding="utf-8-sig")
        print(f"[OK] Totales CSV: {OUT_TOTALS_CSV}")

        validacion = validate_against_total(df, totals_df)
        validacion.to_csv(OUT_VALIDACION_CSV, index=False, encoding="utf-8-sig")
        print(f"[OK] Validación CSV: {OUT_VALIDACION_CSV}")

        print("\n[+] Totales detalle vs TOTAL GENERAL GASTOS:")
        print(
            validacion[
                [
                    "codigo_entidad",
                    "nombre_entidad",
                    "total_detalle",
                    "total_pdf",
                    "total_diff",
                ]
            ].to_string(index=False)
        )

        diff_cols = [col for col in validacion.columns if col.endswith("_diff")]
        bad = validacion[validacion[diff_cols].abs().sum(axis=1) != 0]

        if bad.empty:
            print("\n[OK] Objeto del gasto + fuente cuadra contra TOTAL GENERAL GASTOS")
        else:
            print("\n[WARN] Hay diferencias contra TOTAL GENERAL GASTOS:")
            print(
                bad[
                    [
                        "codigo_entidad",
                        "nombre_entidad",
                        "total_detalle",
                        "total_pdf",
                        "total_diff",
                    ]
                ].to_string(index=False)
            )

    print("\n[+] Conteo por tipo de fila:")
    print(
        df.groupby(["codigo_entidad", "es_detalle", "es_resumen"])
        .size()
        .reset_index(name="filas")
        .to_string(index=False)
    )

    print("\n[+] Detalle contable:")
    print(
        df[df["es_detalle"]]
        .groupby(["codigo_entidad", "nombre_entidad"], dropna=False)["total"]
        .sum()
        .reset_index(name="total_detalle")
        .to_string(index=False)
    )


if __name__ == "__main__":
    main()