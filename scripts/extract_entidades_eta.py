import re
import argparse
from pathlib import Path

import pandas as pd
import pdfplumber


DEPT_NAMES = [
    "Chuquisaca",
    "La Paz",
    "Cochabamba",
    "Oruro",
    "Potosí",
    "Tarija",
    "Santa Cruz",
    "Beni",
    "Pando",
]


SECTION_STOP_HEADERS = [
    "ENTIDADES DESCENTRALIZADAS Y EMPRESAS DE LAS ENTIDADES",
    "EMPRESAS REGIONALES",
    "EMPRESAS DEPARTAMENTALES",
    "EMPRESAS MUNICIPALES",
    "ENTIDADES DESCENTRALIZADAS DEPARTAMENTALES",
    "ENTIDADES DESCENTRALIZADAS MUNICIPALES",
    "ADMINISTRACIÓN PÚBLICA FINANCIERA",
]


GAD_RE = re.compile(
    r"^(?P<codigo>90[1-9])\s+"
    r"(?P<nombre>Gobierno Autónomo Departamental(?:\s+de|\s+del)\s+.+?)\s+"
    r"(?P<sigla>GAD-[A-Z]+)$"
)

GAR_RE = re.compile(
    r"^(?P<codigo>4601)\s+"
    r"(?P<nombre>Gobierno Autónomo Regional.+?)\s+"
    r"(?P<sigla>GAR\s*-\s*[A-Z]+)$"
)

GAM_RE = re.compile(
    r"^(?P<codigo>1[1-9]\d{2})\s+"
    r"(?P<nombre>Gobierno Autónomo Municipal.+?)\s+"
    r"(?P<sigla>[A-ZÁÉÍÓÚÑ°-]{2,20}[A-Za-zÁÉÍÓÚÑñ°-]*)$"
)

GAIOC_RE = re.compile(
    r"^(?P<codigo>3[1-8]\d{2})\s+"
    r"(?P<nombre>.+?)\s+"
    r"(?P<sigla>[A-ZÁÉÍÓÚÑ][A-ZÁÉÍÓÚÑ\s\-–]+[A-ZÁÉÍÓÚÑ])$"
)

MUNICIPAL_DEPT_HEADER_RE = re.compile(
    r"^Gobiernos Autónomos Municipales del Departamento (?:de|del)\s+(?P<departamento>.+)$",
    re.IGNORECASE,
)

GAIOC_DEPT_HEADER_RE = re.compile(
    r"^Departamento (?:de|del)\s+(?P<departamento>.+)$",
    re.IGNORECASE,
)


def normalize_line(line: str) -> str:
    line = line.replace("\u00a0", " ")
    line = line.replace("–", "-")
    line = re.sub(r"\s+", " ", line)
    return line.strip()


def clean_departamento(value: str | None) -> str | None:
    if value is None:
        return None

    value = value.strip()

    replacements = {
        "del Beni": "Beni",
        "de Beni": "Beni",
        "del Pando": "Pando",
        "de Pando": "Pando",
    }

    return replacements.get(value, value)


def infer_departamento_from_name(nombre: str) -> str | None:
    low = nombre.lower()

    for dept in DEPT_NAMES:
        if dept.lower() in low:
            return dept

    if "del beni" in low:
        return "Beni"

    return None


def extract_lines(pdf_path: Path) -> list[str]:
    lines = []

    with pdfplumber.open(pdf_path) as pdf:
        for page_no, page in enumerate(pdf.pages, start=1):
            text = page.extract_text(x_tolerance=1, y_tolerance=3) or ""

            for raw_line in text.splitlines():
                line = normalize_line(raw_line)

                if line:
                    lines.append(line)

    return lines


def should_stop_section(line: str) -> bool:
    return any(line.startswith(header) for header in SECTION_STOP_HEADERS)


def join_multiline_gaioc(lines: list[str]) -> list[str]:
    """
    El PDF parte algunas filas GAIOC en varias líneas, por ejemplo:

    3101
    Departamento de Chuquisaca
    Autonomía del Territorio Indígena Originario Campesino Guaraní Chaqueño de
    Huacaya
    ATIOCGCH

    Esta función intenta dejar esas filas en una sola línea:
    3101 Autonomía del Territorio Indígena Originario Campesino Guaraní Chaqueño de Huacaya ATIOCGCH
    """

    out = []
    i = 0

    while i < len(lines):
        line = lines[i]

        # Caso de código solo: 3101
        if re.fullmatch(r"3[1-8]\d{2}", line):
            codigo = line
            i += 1

            nombre_parts = []
            sigla = None

            # Saltar header Departamento si aparece entre medio.
            if i < len(lines) and GAIOC_DEPT_HEADER_RE.match(lines[i]):
                out.append(lines[i])
                i += 1

            while i < len(lines):
                cur = lines[i]

                if should_stop_section(cur):
                    break

                if re.fullmatch(r"3[1-8]\d{2}", cur):
                    break

                if cur.startswith("Departamento "):
                    break

                # Siglas típicas en una línea suelta.
                if re.fullmatch(r"[A-ZÁÉÍÓÚÑ][A-ZÁÉÍÓÚÑ\s\-–]{1,30}[A-ZÁÉÍÓÚÑ]", cur):
                    sigla = cur
                    i += 1
                    break

                nombre_parts.append(cur)
                i += 1

            if nombre_parts and sigla:
                out.append(f"{codigo} {' '.join(nombre_parts)} {sigla}")
                continue

            # Fallback si no se pudo armar.
            out.append(codigo)
            continue

        out.append(line)
        i += 1

    return out


def parse_entidades(lines: list[str]) -> pd.DataFrame:
    lines = join_multiline_gaioc(lines)

    records = []

    section = None
    current_departamento = None

    for line in lines:
        if should_stop_section(line):
            section = None
            current_departamento = None
            continue

        if line == "GOBIERNOS AUTÓNOMOS DEPARTAMENTALES GAD":
            section = "gad"
            current_departamento = None
            continue

        if line == "GOBIERNOS AUTÓNOMOS REGIONALES GAR":
            section = "gar"
            current_departamento = None
            continue

        if line == "GOBIERNOS AUTÓNOMOS MUNICIPALES GAM":
            section = "gam"
            current_departamento = None
            continue

        if line.startswith("GOBIERNOS AUTÓNOMOS INDÍGENA ORIGINARIO CAMPESINOS"):
            section = "gaioc"
            current_departamento = None
            continue

        mh = MUNICIPAL_DEPT_HEADER_RE.match(line)
        if mh:
            section = "gam"
            current_departamento = clean_departamento(mh.group("departamento"))
            continue

        gh = GAIOC_DEPT_HEADER_RE.match(line)
        if gh and section == "gaioc":
            current_departamento = clean_departamento(gh.group("departamento"))
            continue

        if section == "gad":
            m = GAD_RE.match(line)

            if m:
                nombre = m.group("nombre").strip()

                records.append(
                    {
                        "codigo_entidad": m.group("codigo"),
                        "nombre_entidad": nombre,
                        "sigla": m.group("sigla").strip(),
                        "tipo": "departamental",
                        "grupo_eta": "GAD",
                        "departamento": infer_departamento_from_name(nombre),
                        "fuente": "Clasificadores Presupuestarios 2026",
                    }
                )

            continue

        if section == "gar":
            m = GAR_RE.match(line)

            if m:
                nombre = m.group("nombre").strip()

                records.append(
                    {
                        "codigo_entidad": m.group("codigo"),
                        "nombre_entidad": nombre,
                        "sigla": m.group("sigla").strip(),
                        "tipo": "regional",
                        "grupo_eta": "GAR",
                        "departamento": "Tarija",
                        "fuente": "Clasificadores Presupuestarios 2026",
                    }
                )

            continue

        if section == "gam":
            m = GAM_RE.match(line)

            if m:
                records.append(
                    {
                        "codigo_entidad": m.group("codigo"),
                        "nombre_entidad": m.group("nombre").strip(),
                        "sigla": m.group("sigla").strip(),
                        "tipo": "municipal",
                        "grupo_eta": "GAM",
                        "departamento": current_departamento,
                        "fuente": "Clasificadores Presupuestarios 2026",
                    }
                )

            continue

        if section == "gaioc":
            m = GAIOC_RE.match(line)

            if m:
                nombre = m.group("nombre").strip()

                # Evitar capturar basura de otras secciones.
                if "Gobierno" not in nombre and "Autonomía" not in nombre:
                    continue

                records.append(
                    {
                        "codigo_entidad": m.group("codigo"),
                        "nombre_entidad": nombre,
                        "sigla": m.group("sigla").strip(),
                        "tipo": "indigena_originario_campesino",
                        "grupo_eta": "GAIOC",
                        "departamento": current_departamento,
                        "fuente": "Clasificadores Presupuestarios 2026",
                    }
                )

            continue

    df = pd.DataFrame(records)

    if df.empty:
        raise RuntimeError("No se extrajo ninguna entidad ETA del PDF.")

    df["codigo_entidad"] = df["codigo_entidad"].astype(str)

    df = (
        df.drop_duplicates(subset=["codigo_entidad"])
        .sort_values("codigo_entidad")
        .reset_index(drop=True)
    )

    return df


def validate(df: pd.DataFrame):
    print("\n[+] Conteo por tipo:")
    print(df.groupby("tipo").size().reset_index(name="cantidad").to_string(index=False))

    print("\n[+] Conteo por grupo ETA:")
    print(df.groupby("grupo_eta").size().reset_index(name="cantidad").to_string(index=False))

    print("\n[+] Conteo por departamento y tipo:")
    print(
        df.groupby(["departamento", "tipo"], dropna=False)
        .size()
        .reset_index(name="cantidad")
        .to_string(index=False)
    )

    print("\n[+] Total entidades:", len(df))

    print("\n[+] Primeras filas:")
    print(df.head(20).to_string(index=False))

    print("\n[+] Últimas filas:")
    print(df.tail(20).to_string(index=False))

    missing_dept = df[df["departamento"].isna() | (df["departamento"] == "")]

    if not missing_dept.empty:
        print("\n[WARN] Entidades sin departamento:")
        print(missing_dept.to_string(index=False))

    duplicated = df[df.duplicated(subset=["codigo_entidad"], keep=False)]

    if not duplicated.empty:
        print("\n[WARN] Códigos duplicados:")
        print(duplicated.to_string(index=False))

    expected_groups = {
        "GAD": 9,
        "GAR": 1,
        "GAIOC": 8,
    }

    counts = df.groupby("grupo_eta").size().to_dict()

    for group, expected in expected_groups.items():
        got = counts.get(group, 0)

        if got != expected:
            print(f"\n[WARN] Conteo inesperado para {group}: esperado={expected}, obtenido={got}")

    gam_count = counts.get("GAM", 0)

    if gam_count < 330:
        print(f"\n[WARN] GAM parece bajo: obtenido={gam_count}. Revisa extracción municipal.")

    if gam_count > 340:
        print(f"\n[WARN] GAM parece alto: obtenido={gam_count}. Revisa falsos positivos.")


def main():
    parser = argparse.ArgumentParser(
        description="Extrae GAD, GAR, GAM y GAIOC del Clasificador Institucional 2026."
    )

    parser.add_argument(
        "--pdf",
        default="Clasificadores_Presupuestarios_2026_0.pdf",
        help="Ruta al PDF de clasificadores presupuestarios.",
    )

    parser.add_argument(
        "--out-csv",
        default="config/entidades_sigep.csv",
        help="CSV de salida.",
    )

    parser.add_argument(
        "--out-xlsx",
        default="config/entidades_sigep.xlsx",
        help="XLSX de salida.",
    )

    args = parser.parse_args()

    pdf_path = Path(args.pdf)
    out_csv = Path(args.out_csv)
    out_xlsx = Path(args.out_xlsx)

    if not pdf_path.exists():
        raise SystemExit(f"No encontré el PDF: {pdf_path}")

    out_csv.parent.mkdir(parents=True, exist_ok=True)
    out_xlsx.parent.mkdir(parents=True, exist_ok=True)

    print(f"[+] Leyendo PDF: {pdf_path}")
    lines = extract_lines(pdf_path)
    print(f"[+] Líneas extraídas: {len(lines)}")

    df = parse_entidades(lines)

    df.to_csv(out_csv, index=False, encoding="utf-8-sig")
    df.to_excel(out_xlsx, index=False)

    print(f"\n[OK] CSV generado:  {out_csv}")
    print(f"[OK] XLSX generado: {out_xlsx}")

    validate(df)


if __name__ == "__main__":
    main()