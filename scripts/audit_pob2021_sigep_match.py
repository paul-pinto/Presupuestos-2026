import json
import re
import unicodedata
from pathlib import Path

import pandas as pd


ROOT = Path(__file__).resolve().parents[1]

POB_XLSX = ROOT / "data" / "manual" / "POB2021.xlsx"
ENTIDADES_JSON = ROOT / "frontend" / "public" / "data" / "entidades.json"

OUT_DIR = ROOT / "data" / "auditoria"
OUT_DIR.mkdir(parents=True, exist_ok=True)

OUT_BASE = OUT_DIR / "audit_pob2021_sigep_matching.csv"
OUT_POB_NO_MATCH = OUT_DIR / "audit_pob2021_sin_entidad_sigep.csv"
OUT_SIGEP_NO_MATCH = OUT_DIR / "audit_sigep_gam_sin_pob2021.csv"
OUT_DUPLICATES = OUT_DIR / "audit_pob2021_sigep_posibles_duplicados.csv"
EQUIV_CSV = ROOT / "data" / "manual" / "equivalencias_pob2021_sigep.csv"


DEPARTAMENTOS = {
    "chuquisaca": "Chuquisaca",
    "la paz": "La Paz",
    "cochabamba": "Cochabamba",
    "oruro": "Oruro",
    "potosi": "Potosí",
    "tarija": "Tarija",
    "santa cruz": "Santa Cruz",
    "beni": "Beni",
    "pando": "Pando",
}


STOPWORDS = [
    "gobierno autonomo municipal de",
    "gobierno autonomo municipal del",
    "gobierno autonomo indigena originario campesino de",
    "gobierno autonomo indigena originario campesino del",
    "gobierno indigena autonomo del",
    "autonomia del territorio indigena originario campesino",
    "autonomia originaria",
]


ALIASES = {
    "nuestra senora de la paz": "la paz",
    "puerto guayaramerin": "guayaramerin",
    "pto carabuco": "carabuco",
    "puerto carabuco": "carabuco",
    "puerto mayor de carabuco": "carabuco",
    "villa montes": "villamontes",
    "villamontes": "villamontes",
    "moro moro": "moromoro",
    "postrer valle": "postrervalle",
    "sipesipe": "sipe sipe",
    "sicasica": "sica sica",
    "jesus de machaka": "jesus de machaca",
    "san jose": "san jose de chiquitos",
    "san josede chiquitos": "san jose de chiquitos",
    "gral saavedra": "general agustin saavedra",
    "general saavedra": "general agustin saavedra",
    "ascension de guarayos": "ascencion de guarayos",
    "puerto gonzales moreno": "puerto gonzalo moreno",
    "villa desacaca": "sacaca",
    "villa de sacaca": "sacaca",
    "s p de buena vista": "san pedro de buena vista",
    "san pedro cuarahuara": "san pedro de curahuara",
    "san juan de yapacani": "san juan",
    "toko": "toco",
    "choque cota": "choquecota",
    "salinas de garcia mendoza": "salinas",
    "chipaya": "chipaya",
    "gutierrez": "gutierrez",
    "huacaya": "huacaya",
}


def normalize(value: object) -> str:
    text = str(value or "").strip().lower()
    text = unicodedata.normalize("NFKD", text)
    text = "".join(ch for ch in text if not unicodedata.combining(ch))
    text = text.replace("ñ", "n")
    text = re.sub(r"[^a-z0-9 ]+", " ", text)

    for stopword in STOPWORDS:
        sw = unicodedata.normalize("NFKD", stopword.lower())
        sw = "".join(ch for ch in sw if not unicodedata.combining(ch))
        sw = sw.replace("ñ", "n")
        text = text.replace(sw, " ")

    text = re.sub(r"\s+", " ", text).strip()
    return ALIASES.get(text, text)


def main() -> None:
    if not POB_XLSX.exists():
        raise SystemExit(f"No existe {POB_XLSX}")

    if not ENTIDADES_JSON.exists():
        raise SystemExit(f"No existe {ENTIDADES_JSON}")

    raw = pd.read_excel(POB_XLSX, sheet_name=0, header=0)
    raw = raw.iloc[:, :2].copy()
    raw.columns = ["nombre", "poblacion_proyectada_2021"]

    raw["nombre"] = raw["nombre"].astype(str).str.strip()
    raw["poblacion_proyectada_2021"] = pd.to_numeric(
        raw["poblacion_proyectada_2021"],
        errors="coerce",
    )
    raw["key"] = raw["nombre"].map(normalize)

    rows_pob = []
    current_dept = None

    for i, row in raw.iterrows():
        key = row["key"]
        value = row["poblacion_proyectada_2021"]

        next_value = None
        if i + 1 < len(raw):
            next_value = raw.iloc[i + 1]["poblacion_proyectada_2021"]

        # Fila departamental: viene en MAYÚSCULAS en el Excel.
        # Esto evita confundir municipios como Cochabamba, Tarija o Potosí
        # con el encabezado departamental.
        nombre_raw = str(row["nombre"] or "").strip()
        es_mayuscula = nombre_raw == nombre_raw.upper()

        if key in DEPARTAMENTOS and pd.notna(value) and pd.isna(next_value) and es_mayuscula:
            current_dept = DEPARTAMENTOS[key]
            continue

        # Provincia u otra fila sin población.
        if pd.isna(value):
            continue

        if current_dept is None:
            continue

        rows_pob.append({
            "departamento_pob2021": current_dept,
            "municipio_pob2021": row["nombre"],
            "pob2021_key": key,
            "poblacion_proyectada_2021": int(round(float(value))),
        })

    pob = pd.DataFrame(rows_pob)

    entidades = pd.DataFrame(json.loads(ENTIDADES_JSON.read_text(encoding="utf-8")))

    gam = entidades[
        (entidades["tipo"].astype(str).str.lower().eq("municipal"))
        | (entidades["grupo_eta"].astype(str).str.upper().eq("GAM"))
        | (entidades["grupo_eta"].astype(str).str.upper().eq("GAIOC"))
    ].copy()

    gam["codigo_entidad"] = gam["codigo_entidad"].astype(str).str.replace(r"\.0$", "", regex=True)
    gam["sigep_key"] = gam["nombre_entidad"].map(normalize)
    gam["depto_key"] = gam["departamento"].map(normalize)

    equivalencias = {}
    if EQUIV_CSV.exists():
        equiv = pd.read_csv(EQUIV_CSV, encoding="utf-8-sig")
        for _, row in equiv.iterrows():
            key = (
                normalize(row.get("departamento_pob2021")),
                normalize(row.get("municipio_pob2021")),
            )
            equivalencias[key] = str(row.get("codigo_entidad")).strip()

    rows = []

    for _, p in pob.iterrows():
        candidates = gam[gam["depto_key"].eq(normalize(p["departamento_pob2021"]))].copy()

        manual_key = (normalize(p["departamento_pob2021"]), normalize(p["municipio_pob2021"]))
        manual_codigo = equivalencias.get(manual_key)

        if manual_codigo:
            manual = gam[gam["codigo_entidad"].astype(str).eq(manual_codigo)]
            if len(manual) == 1:
                s = manual.iloc[0]
                status = "match_manual"
            else:
                s = None
                status = "manual_codigo_no_encontrado"
        else:
            exact = candidates[candidates["sigep_key"].eq(p["pob2021_key"])]

            if len(exact) == 1:
                s = exact.iloc[0]
                status = "match_exacto"
            elif len(exact) > 1:
                s = exact.iloc[0]
                status = "duplicado_exacto"
            else:
                contains = candidates[
                    candidates["sigep_key"].str.contains(re.escape(p["pob2021_key"]), na=False)
                    | pd.Series([p["pob2021_key"] in x for x in candidates["sigep_key"]], index=candidates.index)
                ]

                if len(contains) == 1:
                    s = contains.iloc[0]
                    status = "match_contiene"
                elif len(contains) > 1:
                    s = contains.iloc[0]
                    status = "duplicado_contiene"
                else:
                    s = None
                    status = "sin_match"

        rows.append({
            "status": status,
            "departamento_pob2021": p["departamento_pob2021"],
            "municipio_pob2021": p["municipio_pob2021"],
            "pob2021_key": p["pob2021_key"],
            "poblacion_proyectada_2021": p["poblacion_proyectada_2021"],
            "codigo_entidad": None if s is None else s.get("codigo_entidad"),
            "nombre_entidad": None if s is None else s.get("nombre_entidad"),
            "departamento_sigep": None if s is None else s.get("departamento"),
            "grupo_eta": None if s is None else s.get("grupo_eta"),
            "tipo": None if s is None else s.get("tipo"),
        })

    audit = pd.DataFrame(rows)

    matched_codes = set(audit.loc[audit["codigo_entidad"].notna(), "codigo_entidad"].astype(str))
    pob_no_match = audit[audit["status"].eq("sin_match")].copy()
    duplicates = audit[audit["status"].str.contains("duplicado", na=False)].copy()
    sigep_no_match = gam[~gam["codigo_entidad"].astype(str).isin(matched_codes)].copy()

    audit.to_csv(OUT_BASE, index=False, encoding="utf-8-sig")
    pob_no_match.to_csv(OUT_POB_NO_MATCH, index=False, encoding="utf-8-sig")
    sigep_no_match.to_csv(OUT_SIGEP_NO_MATCH, index=False, encoding="utf-8-sig")
    duplicates.to_csv(OUT_DUPLICATES, index=False, encoding="utf-8-sig")

    print("Población 2021 filas municipales candidatas:", len(pob))
    print("SIGEP GAM/GAIOC candidatos:", len(gam))
    print()
    print(audit["status"].value_counts(dropna=False).to_string())
    print()
    print("POB2021 sin match:", len(pob_no_match))
    print("SIGEP GAM/GAIOC sin POB2021:", len(sigep_no_match))
    print("Duplicados:", len(duplicates))
    print()
    print("OK:", OUT_BASE)
    print("OK:", OUT_POB_NO_MATCH)
    print("OK:", OUT_SIGEP_NO_MATCH)
    print("OK:", OUT_DUPLICATES)

    if len(pob_no_match):
        print("\nPOB2021 sin match muestra:")
        print(pob_no_match[[
            "departamento_pob2021",
            "municipio_pob2021",
            "poblacion_proyectada_2021",
        ]].head(80).to_string(index=False))

    if len(duplicates):
        print("\nDuplicados muestra:")
        print(duplicates[[
            "status",
            "departamento_pob2021",
            "municipio_pob2021",
            "pob2021_key",
            "codigo_entidad",
            "nombre_entidad",
        ]].head(80).to_string(index=False))

    if len(sigep_no_match):
        print("\nSIGEP sin POB2021 muestra:")
        print(sigep_no_match[[
            "codigo_entidad",
            "nombre_entidad",
            "departamento",
            "grupo_eta",
            "tipo",
        ]].head(80).to_string(index=False))


if __name__ == "__main__":
    main()
