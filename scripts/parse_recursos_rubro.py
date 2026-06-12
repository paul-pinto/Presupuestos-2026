import re
from pathlib import Path

import pandas as pd
import pdfplumber


GESTION = 2026

RAW_DIR = Path("data/raw/sigep_2026/recursos_por_rubro")
OUT_DIR = Path("data/parsed")
OUT_DIR.mkdir(parents=True, exist_ok=True)

OUT_CSV = OUT_DIR / "sigep_2026_recursos_por_rubro.csv"
OUT_PARQUET = OUT_DIR / "sigep_2026_recursos_por_rubro.parquet"
OUT_TOTALS_CSV = OUT_DIR / "sigep_2026_recursos_por_rubro_totales.csv"
OUT_VALIDACION_CSV = OUT_DIR / "sigep_2026_recursos_por_rubro_validacion.csv"
OUT_PARSE_STATUS_CSV = OUT_DIR / "sigep_2026_recursos_por_rubro_parse_status.csv"


ENTITY_RE = re.compile(
    r"Entidad\s*:\s*(?P<codigo>\d+)\s+(?P<nombre>.+)$",
    re.IGNORECASE,
)

TOTAL_RE = re.compile(
    r"^TOTAL\s+GENERAL\s+DE\s+INGRESOS\s+(?P<total>-?[\d,.]+)$",
    re.IGNORECASE,
)

# Fila con detalle final:
# 19.2.1.2 Por Coparticipación Tributaria 0099 41 113 33,886,197
# Por Coparticipación Tributaria 0099 41 119 12,160,817
DETAIL_RE = re.compile(
    r"""
    ^
    (?:(?P<rubro>\d+(?:\.\d+)*)\s+)?
    (?P<descripcion>.+?)
    \s+
    (?P<entidad_otorgante>\d{4})
    \s+
    (?P<fuente>\d{2})
    \s+
    (?P<organismo>\d{3})
    \s+
    (?P<importe>-?[\d,]+)
    $
    """,
    re.VERBOSE,
)

# Fila agregada/sumarizada:
# 19 TRANSFERENCIAS CORRIENTES 46.104.653
# 19.2 Del Sector Público No Financiero 46.104.653
# 15.3 Patentes y Concesiones 945.316
SUMMARY_RE = re.compile(
    r"""
    ^
    (?P<rubro>\d+(?:\.\d+)*)
    \s+
    (?P<descripcion>.+?)
    \s+
    (?P<importe>-?[\d,.]+)
    $
    """,
    re.VERBOSE,
)

BASE_COLS = [
    "gestion",
    "codigo_entidad",
    "nombre_entidad",
    "rubro",
    "rubro_padre",
    "nivel_rubro",
    "descripcion",
    "entidad_otorgante",
    "fuente",
    "organismo",
    "importe",
    "es_detalle",
    "es_resumen",
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
    line = line.replace("\u00a0", " ")
    line = re.sub(r"\s+", " ", line)
    return line.strip()


def parse_amount(value: str) -> int:
    """
    El PDF usa dos formatos:
      - 33,886,197 en filas detalle
      - 46.104.653 en filas resumen

    Ambos deben convertirse a entero.
    """
    value = str(value).strip()

    if not value:
        return 0

    value = value.replace(".", "").replace(",", "")

    return int(value)


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
        upper.startswith("MINISTERIO DE ECONOMÍA")
        or upper.startswith("MINISTERIO DE ECONOMIA")
        or upper.startswith("VICEMINISTERIO")
        or upper.startswith("PRESUPUESTOS DE RECURSOS")
        or upper.startswith("LEY N")
        or upper.startswith("RUBRO DESCRIPCIÓN")
        or upper.startswith("RUBRO DESCRIPCION")
        or upper.startswith("ENTIDAD :")
    )


def rubro_padre(rubro: str | None) -> str | None:
    if not rubro:
        return None

    parts = str(rubro).split(".")

    if len(parts) <= 1:
        return None

    return ".".join(parts[:-1])


def nivel_rubro(rubro: str | None) -> int | None:
    if not rubro:
        return None

    return len(str(rubro).split("."))


def infer_rubro_from_previous(current_rubro: str | None, previous_rubro: str | None) -> str | None:
    """
    Algunas líneas detalle continúan el mismo rubro sin repetir el código.

    Ejemplo:
      19.2.1.2 Por Coparticipación Tributaria 0099 41 113 33,886,197
      Por Coparticipación Tributaria 0099 41 119 12,160,817

    La segunda línea pertenece también al rubro 19.2.1.2.
    """
    if current_rubro:
        return current_rubro

    return previous_rubro


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
    last_detail_rubro = None

    for line in lines:
        if is_noise(line):
            continue

        total_match = TOTAL_RE.match(line)

        if total_match:
            total_general = {
                "gestion": GESTION,
                "codigo_entidad": codigo_entidad,
                "nombre_entidad": nombre_entidad,
                "total_general_ingresos": parse_amount(total_match.group("total")),
                "file": str(pdf_path),
            }
            continue

        detail_match = DETAIL_RE.match(line)

        if detail_match:
            raw_rubro = detail_match.group("rubro")
            rubro = infer_rubro_from_previous(raw_rubro, last_detail_rubro)

            if rubro:
                last_detail_rubro = rubro

            records.append(
                {
                    "gestion": GESTION,
                    "codigo_entidad": codigo_entidad,
                    "nombre_entidad": nombre_entidad,
                    "rubro": rubro,
                    "rubro_padre": rubro_padre(rubro),
                    "nivel_rubro": nivel_rubro(rubro),
                    "descripcion": detail_match.group("descripcion").strip(),
                    "entidad_otorgante": detail_match.group("entidad_otorgante"),
                    "fuente": detail_match.group("fuente"),
                    "organismo": detail_match.group("organismo"),
                    "importe": parse_amount(detail_match.group("importe")),
                    "es_detalle": True,
                    "es_resumen": False,
                    "file": str(pdf_path),
                }
            )
            continue

        summary_match = SUMMARY_RE.match(line)

        if summary_match:
            rubro = summary_match.group("rubro")

            records.append(
                {
                    "gestion": GESTION,
                    "codigo_entidad": codigo_entidad,
                    "nombre_entidad": nombre_entidad,
                    "rubro": rubro,
                    "rubro_padre": rubro_padre(rubro),
                    "nivel_rubro": nivel_rubro(rubro),
                    "descripcion": summary_match.group("descripcion").strip(),
                    "entidad_otorgante": None,
                    "fuente": None,
                    "organismo": None,
                    "importe": parse_amount(summary_match.group("importe")),
                    "es_detalle": False,
                    "es_resumen": True,
                    "file": str(pdf_path),
                }
            )
            continue

    return records, total_general


def aggregate_detail(df: pd.DataFrame) -> pd.DataFrame:
    det = df[df["es_detalle"]].copy()

    return (
        det.groupby(["codigo_entidad", "nombre_entidad"], dropna=False)["importe"]
        .sum()
        .reset_index(name="total_detalle")
    )


def validate_against_total(df: pd.DataFrame, totals_df: pd.DataFrame) -> pd.DataFrame:
    agg = aggregate_detail(df)

    merged = agg.merge(
        totals_df[
            [
                "codigo_entidad",
                "nombre_entidad",
                "total_general_ingresos",
            ]
        ],
        on=["codigo_entidad", "nombre_entidad"],
        how="outer",
    )

    merged["total_detalle"] = merged["total_detalle"].fillna(0).astype("int64")
    merged["total_general_ingresos"] = (
        merged["total_general_ingresos"].fillna(0).astype("int64")
    )
    merged["total_diff"] = merged["total_detalle"] - merged["total_general_ingresos"]

    return merged


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
                print(f"    total_general_ingresos: {total['total_general_ingresos']:,}")
                all_totals.append(total)
            else:
                print("    [WARN] No encontré TOTAL GENERAL DE INGRESOS")

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
    df = df[BASE_COLS]

    df.to_csv(OUT_CSV, index=False, encoding="utf-8-sig")
    print(f"[OK] CSV: {OUT_CSV}")

    try:
        df.to_parquet(OUT_PARQUET, index=False)
        print(f"[OK] Parquet: {OUT_PARQUET}")
    except Exception as e:
        print(f"[WARN] No pude guardar Parquet: {e}")

    totals_df = pd.DataFrame(all_totals)

    if not totals_df.empty:
        totals_df["codigo_entidad"] = totals_df["codigo_entidad"].apply(
            normalize_codigo_entidad
        )
        totals_df.to_csv(OUT_TOTALS_CSV, index=False, encoding="utf-8-sig")
        print(f"[OK] Totales CSV: {OUT_TOTALS_CSV}")

        validacion = validate_against_total(df, totals_df)
        validacion.to_csv(OUT_VALIDACION_CSV, index=False, encoding="utf-8-sig")
        print(f"[OK] Validación CSV: {OUT_VALIDACION_CSV}")

        print("\n[+] Totales detalle vs TOTAL GENERAL DE INGRESOS:")
        print(validacion.to_string(index=False))

        bad = validacion[validacion["total_diff"] != 0]

        if bad.empty:
            print("\n[OK] Los ingresos por rubro cuadran contra TOTAL GENERAL DE INGRESOS")
        else:
            print("\n[WARN] Hay diferencias contra TOTAL GENERAL DE INGRESOS:")
            print(bad.to_string(index=False))

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
        .groupby(["codigo_entidad", "nombre_entidad"], dropna=False)["importe"]
        .sum()
        .reset_index(name="total_detalle")
        .to_string(index=False)
    )


if __name__ == "__main__":
    main()