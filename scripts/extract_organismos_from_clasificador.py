
import csv
import json
import re
from pathlib import Path

import fitz

ROOT = Path(__file__).resolve().parents[1]

PDF = ROOT / "data" / "manual" / "Clasificadores_Presupuestarios_2026_0.pdf"
CSV_OUT = ROOT / "data" / "manual" / "organismos_financiadores.csv"
JSON_OUT = ROOT / "frontend" / "public" / "data" / "organismos_financiadores.json"
DEBUG_OUT = ROOT / "data" / "manual" / "organismos_financiadores_sintetico_debug.txt"

START_PAGE = 139
END_PAGE = 145

doc = fitz.open(str(PDF))

def clean(value: str) -> str:
    return re.sub(r"\s+", " ", str(value or "")).strip()

def is_skip(line: str) -> bool:
    upper = clean(line).upper()
    skips = [
        "CLASIFICADOR",
        "VERSIÓN",
        "VERSION",
        "CÓDIGO",
        "CODIGO",
        "DENOMINACIÓN",
        "DENOMINACION",
        "SIGLA",
        "ORGANISMOS FINANCIADORES INTERNOS",
        "ORGANISMOS FINANCIADORES EXTERNOS",
        "ORGANISMOS MULTILATERALES",
        "ORGANISMOS BILATERALES",
        "GOBIERNO",
        "TGN OTROS INGRESOS",
        "ORGANISMOS DE RECURSOS ESPECÍFICOS",
        "ORGANISMOS DE RECURSOS ESPECIFICOS",
    ]
    return any(s in upper for s in skips)

def label_from_sigla(nombre: str, sigla: str) -> str:
    sigla = clean(sigla)
    nombre = clean(nombre)

    labels = {
        "TGN": "TGN",
        "TGN-P": "TGN - Papeles",
        "TGN-CT": "Coparticipación Tributaria",
        "RECON": "Recursos de Contravalor",
        "TGN-FCOMP": "Fondo de Compensación Departamental",
        "TGN-IEHD": "IEHD",
        "TGN-IDH": "IDH",
        "TGN-IPJ": "IPJ",
        "TGN-PPET": "Patentes Petroleras",
        "OT-GOB": "Otros organismos del Gobierno",
        "TGN-OT": "TGN Otros Ingresos",
        "RECESP": "Recursos Específicos",
        "REG": "Regalías",
        "OTPRO": "Otros recursos específicos",
    }

    return labels.get(sigla) or sigla or nombre

def parse_line(line: str):
    line = clean(line)

    match = re.match(r"^(\d{3})\s+(.+)$", line)
    if not match:
        return None

    codigo = match.group(1)
    rest = clean(match.group(2))

    parts = rest.split(" ")
    if len(parts) < 2:
        return None

    sigla = parts[-1]
    nombre = clean(" ".join(parts[:-1]))

    if not re.fullmatch(r"[A-ZÁÉÍÓÚÜÑ0-9.-]{2,}", sigla):
        return {
            "codigo": codigo,
            "nombre_oficial": rest,
            "sigla": "",
        }

    return {
        "codigo": codigo,
        "nombre_oficial": nombre,
        "sigla": sigla,
    }

def finish(current, rows, seen):
    if not current:
        return

    codigo = clean(current["codigo"])
    nombre = clean(current["nombre_oficial"])
    sigla = clean(current["sigla"])

    if codigo in seen:
        return

    if not re.fullmatch(r"\d{3}", codigo):
        return

    if not nombre or is_skip(nombre):
        return

    seen.add(codigo)

    label = label_from_sigla(nombre, sigla)

    rows.append({
        "codigo": codigo,
        "organismo": codigo,
        "nombre_oficial": nombre,
        "sigla": sigla,
        "nombre_corto": label,
        "label": label,
    })

lines = []
debug = []

for page_number in range(START_PAGE, END_PAGE + 1):
    page = doc[page_number - 1]
    words = page.get_text("words")

    y_lines = {}

    for x0, y0, x1, y1, word, block, line, wordno in words:
        y_key = round(y0 / 4) * 4
        y_lines.setdefault(y_key, []).append((x0, word))

    debug.append(f"===== PÁGINA {page_number} =====")

    for y, items in sorted(y_lines.items()):
        full = clean(" ".join(word for _, word in sorted(items)))
        if not full:
            continue

        debug.append(full)
        lines.append(full)

DEBUG_OUT.write_text("\n".join(debug), encoding="utf-8")

rows = []
seen = set()
current = None

for line in lines:
    if is_skip(line):
        continue

    parsed = parse_line(line)

    if parsed:
        finish(current, rows, seen)
        current = parsed
        continue

    if current and not re.fullmatch(r"\d+", line) and not is_skip(line):
        # Continuación de nombre partido en dos líneas.
        current["nombre_oficial"] = clean(current["nombre_oficial"] + " " + line)

finish(current, rows, seen)

rows = sorted(rows, key=lambda r: int(r["codigo"]))

CSV_OUT.parent.mkdir(parents=True, exist_ok=True)
JSON_OUT.parent.mkdir(parents=True, exist_ok=True)

with CSV_OUT.open("w", encoding="utf-8-sig", newline="") as f:
    writer = csv.DictWriter(
        f,
        fieldnames=["codigo", "organismo", "nombre_oficial", "sigla", "nombre_corto", "label"],
    )
    writer.writeheader()
    writer.writerows(rows)

JSON_OUT.write_text(json.dumps(rows, ensure_ascii=False, indent=2), encoding="utf-8")

codes = {row["codigo"]: row for row in rows}

print("OK CSV :", CSV_OUT)
print("OK JSON:", JSON_OUT)
print("Debug  :", DEBUG_OUT)
print("Total organismos:", len(rows))

for code in ["111", "113", "114", "116", "117", "119", "210", "220", "230", "314", "413", "415", "516"]:
    item = codes.get(code)
    print(code, "=>", item["label"] if item else "NO ENCONTRADO")
