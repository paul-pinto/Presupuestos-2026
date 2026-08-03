import csv
import json
import re
from pathlib import Path

import fitz

BASE = Path(".")
PDF_PATH = BASE / "data/manual/Clasificadores_Presupuestarios_2026_0.pdf"
OUT_CSV = BASE / "data/manual/objeto_gasto_catalogo.csv"
OUT_JSON = BASE / "frontend/public/data/objeto_gasto_catalogo.json"

def nivel_codigo(codigo: str) -> int:
    codigo = str(codigo).zfill(5)

    if codigo.endswith("0000"):
        return 1
    if codigo.endswith("000"):
        return 2
    if codigo.endswith("00"):
        return 3
    if codigo.endswith("0"):
        return 4

    return 5

def padre_codigo(codigo: str) -> str:
    codigo = str(codigo).zfill(5)
    nivel = nivel_codigo(codigo)

    if nivel == 1:
        return ""
    if nivel == 2:
        return codigo[:1] + "0000"
    if nivel == 3:
        return codigo[:2] + "000"
    if nivel == 4:
        return codigo[:3] + "00"
    if nivel == 5:
        return codigo[:4] + "0"

    return ""

def limpiar_nombre(nombre: str) -> str:
    nombre = re.sub(r"\s+", " ", str(nombre or "")).strip()
    return nombre

def limpiar_linea(linea: str) -> str:
    linea = limpiar_nombre(linea)
    linea = linea.replace("COD. DENOMINACIÓN", "")
    linea = linea.replace("COD.", "")
    linea = linea.replace("DENOMINACIÓN", "")
    return limpiar_nombre(linea)

def main():
    if not PDF_PATH.exists():
        raise SystemExit(f"No existe el PDF: {PDF_PATH}")

    doc = fitz.open(str(PDF_PATH))

    start_page = None
    end_page = None

    # Saltamos las primeras páginas para no caer en el índice.
    for i in range(35, len(doc)):
        text = doc[i].get_text("text")
        if "CLASIFICADOR POR OBJETO DEL GASTO" in text:
            start_page = i
            break

    if start_page is None:
        raise SystemExit("No encontré la sección real de Objeto del Gasto")

    for i in range(start_page + 1, len(doc)):
        text = doc[i].get_text("text")
        if "CLASIFICADOR DE GASTOS POR FINALIDAD" in text:
            end_page = i
            break

    if end_page is None:
        raise SystemExit("No encontré el fin de la sección de Objeto del Gasto")

    print(f"Sección Objeto del Gasto: páginas PDF internas {start_page + 1} a {end_page}")

    section_lines = []
    for i in range(start_page, end_page):
        text = doc[i].get_text("text")
        section_lines.extend(text.splitlines())

    rows_by_code = {}

    # Primer pase: líneas tipo "10000 SERVICIOS PERSONALES"
    for raw_line in section_lines:
        line = limpiar_linea(raw_line)

        match = re.match(r"^(\d{5})\s+(.+)$", line)
        if not match:
            continue

        codigo, nombre = match.groups()
        nombre = limpiar_nombre(nombre)

        if not re.match(r"^[1-9]\d{4}$", codigo):
            continue

        if len(nombre) < 2:
            continue

        rows_by_code[codigo] = {
            "codigo": codigo,
            "nivel": nivel_codigo(codigo),
            "padre": padre_codigo(codigo),
            "nombre": nombre,
            "label": f"{codigo} - {nombre}",
        }

    # Segundo pase: a veces PyMuPDF separa el código y la denominación en líneas distintas.
    # Ejemplo:
    # 10000
    # SERVICIOS PERSONALES
    pending_code = None

    for raw_line in section_lines:
        line = limpiar_linea(raw_line)

        if re.fullmatch(r"[1-9]\d{4}", line):
            pending_code = line
            continue

        if pending_code and line and not re.match(r"^\d+$", line):
            nombre = limpiar_nombre(line)

            # Evitar textos descriptivos largos como definición del código.
            if len(nombre) <= 90 and not nombre.lower().startswith(("comprende", "gastos", "incluye", "excluye")):
                rows_by_code.setdefault(
                    pending_code,
                    {
                        "codigo": pending_code,
                        "nivel": nivel_codigo(pending_code),
                        "padre": padre_codigo(pending_code),
                        "nombre": nombre,
                        "label": f"{pending_code} - {nombre}",
                    },
                )

            pending_code = None

    rows = sorted(rows_by_code.values(), key=lambda r: r["codigo"])

    OUT_CSV.parent.mkdir(parents=True, exist_ok=True)
    OUT_JSON.parent.mkdir(parents=True, exist_ok=True)

    with OUT_CSV.open("w", encoding="utf-8", newline="") as f:
        writer = csv.DictWriter(
            f,
            fieldnames=["codigo", "nivel", "padre", "nombre", "label"],
        )
        writer.writeheader()
        writer.writerows(rows)

    OUT_JSON.write_text(
        json.dumps(rows, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )

    print(f"OK CSV : {OUT_CSV}")
    print(f"OK JSON: {OUT_JSON}")
    print(f"Total códigos: {len(rows)}")
    print()

    for codigo in ["10000", "11000", "11100", "11200", "11700", "20000", "30000", "40000", "70000", "90000"]:
        row = rows_by_code.get(codigo)
        print(codigo, "=>", row["label"] if row else "NO ENCONTRADO")

if __name__ == "__main__":
    main()
