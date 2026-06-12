import argparse
from pathlib import Path

import pandas as pd


RAW_DIR = Path("data/raw/sigep_2026/categoria_programatica_grupo_gasto_total_gastos")
STATUS_PATH = Path("data/logs/scrape_status.csv")
PARSED_PATH = Path("data/parsed/sigep_2026_categoria_programatica_grupo_gasto_total_gastos.csv")
TOTALS_PATH = Path("data/parsed/sigep_2026_categoria_programatica_grupo_gasto_total_gastos_totales.csv")


def main():
    parser = argparse.ArgumentParser(description="Audita avance del pipeline SIGEP.")
    parser.add_argument("--entities", default="config/entidades_sigep.csv")
    args = parser.parse_args()

    entities_path = Path(args.entities)
    if not entities_path.exists():
        raise SystemExit(f"No existe {entities_path}")

    entidades = pd.read_csv(entities_path, dtype={"codigo_entidad": str})
    expected = set(entidades["codigo_entidad"].astype(str))

    pdfs = list(RAW_DIR.glob("*.pdf"))
    pdf_codes = set()
    for p in pdfs:
        parts = p.name.split("_")
        if len(parts) >= 2:
            pdf_codes.add(parts[1])

    print("[+] Entidades esperadas:", len(expected))
    print("[+] PDFs descargados:", len(pdfs))
    print("[+] Códigos con PDF:", len(pdf_codes))

    missing = sorted(expected - pdf_codes)
    extra = sorted(pdf_codes - expected)

    print("[+] Faltantes:", len(missing))
    if missing:
        print(missing[:50])

    print("[+] Extras:", len(extra))
    if extra:
        print(extra[:50])

    if STATUS_PATH.exists():
        status = pd.read_csv(STATUS_PATH, dtype={"codigo_entidad": str})
        print("\n[+] Status scrape:")
        print(status.groupby("status").size().reset_index(name="cantidad").to_string(index=False))

    if PARSED_PATH.exists():
        parsed = pd.read_csv(PARSED_PATH, dtype={"codigo_entidad": str})
        print("\n[+] Parsed:")
        print("filas:", len(parsed))
        print("entidades parseadas:", parsed["codigo_entidad"].nunique())

    if TOTALS_PATH.exists():
        totals = pd.read_csv(TOTALS_PATH, dtype={"codigo_entidad": str})
        print("\n[+] Totales PDF:")
        print("entidades con total:", totals["codigo_entidad"].nunique())


if __name__ == "__main__":
    main()
