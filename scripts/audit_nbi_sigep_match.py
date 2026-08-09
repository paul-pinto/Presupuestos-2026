
import json
import re
import unicodedata
from pathlib import Path

import pandas as pd


ROOT = Path(__file__).resolve().parents[1]

NBI_CSV = ROOT / "data" / "manual" / "NBI.csv"
ENTIDADES_JSON = ROOT / "frontend" / "public" / "data" / "entidades.json"

OUT_DIR = ROOT / "data" / "auditoria"
OUT_DIR.mkdir(parents=True, exist_ok=True)

OUT_BASE = OUT_DIR / "audit_nbi_sigep_matching.csv"
OUT_NBI_NO_MATCH = OUT_DIR / "audit_nbi_sin_entidad_sigep.csv"
OUT_SIGEP_NO_MATCH = OUT_DIR / "audit_sigep_gam_sin_nbi.csv"
OUT_DUPLICATES = OUT_DIR / "audit_nbi_sigep_posibles_duplicados.csv"
EQUIV_CSV = ROOT / "data" / "manual" / "equivalencias_nbi_sigep.csv"


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
    "la paz": "la paz",
    "puerto guayaramerin": "guayaramerin",
    "guayaramerin": "guayaramerin",
    "villa montes": "villamontes",
    "villamontes": "villamontes",
    "moro moro": "moromoro",
    "moromoro": "moromoro",
    "postrer valle": "postrervalle",
    "postrervalle": "postrervalle",
    "yunguyo del litoral": "yunguyo de litoral",
    "yunguyo de litoral": "yunguyo de litoral",
    "puerto mayor de carabuco": "carabuco",
    "puerto carabuco": "carabuco",
    "carabuco": "carabuco",
    "villa ricardo mugia icla": "icla",
    "icla r mujia": "icla",
    "icla": "icla",
    "general agustin saavedra": "general saavedra",
    "general saavedra": "general saavedra",
    "salinas de garci mendoza": "salinas",
    "salinas de garcí mendoza": "salinas",
    "chipaya": "chipaya",
    "gobierno autonomo indigena originario campesino de salinas": "salinas",
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


def parse_int(value):
    if pd.isna(value):
        return None
    text = str(value).strip()
    if not text:
        return None
    text = text.replace(".", "").replace(",", ".")
    try:
        return int(round(float(text)))
    except ValueError:
        return None


def parse_pct(value):
    if pd.isna(value):
        return None
    text = str(value).strip()
    if not text:
        return None
    text = text.replace(".", "").replace(",", ".")
    try:
        return float(text)
    except ValueError:
        return None


def main() -> None:
    if not NBI_CSV.exists():
        raise SystemExit(f"No existe {NBI_CSV}")

    if not ENTIDADES_JSON.exists():
        raise SystemExit(f"No existe {ENTIDADES_JSON}")

    raw = pd.read_csv(NBI_CSV, sep=";", header=1, dtype=str, encoding="utf-8-sig")
    raw.columns = [str(c).strip() for c in raw.columns]

    municipios = raw[
        raw["NIVEL"].astype(str).str.strip().eq("Municipio")
        & raw["MUNICIPIO / TIOC"].notna()
        & raw["ÁREA"].notna()
        & raw["ÁREA"].astype(str).str.strip().eq(raw["MUNICIPIO / TIOC"].astype(str).str.strip())
    ].copy()

    # Dataset limpio municipal/TIOC total.
    municipios["departamento_nbi"] = municipios["DEPARTAMENTO"].astype(str).str.strip()
    municipios["provincia_nbi"] = municipios["PROVINCIA"].astype(str).str.strip()
    municipios["municipio_nbi"] = municipios["MUNICIPIO / TIOC"].astype(str).str.strip()
    municipios["nbi_key"] = municipios["municipio_nbi"].map(normalize)
    municipios["depto_key"] = municipios["departamento_nbi"].map(normalize)

    count_cols = {
        "nbi_inadecuados_materiales_vivienda": "Inadecuados Materiales de la Vivienda",
        "nbi_insuficientes_espacios_vivienda": "Insuficientes Espacios en la Vivienda",
        "nbi_inadecuados_agua_saneamiento": "Inadecuados Servicios de Agua y Saneamiento",
        "nbi_inadecuados_insumos_energeticos": "Inadecuados Insumos Energéticos",
        "nbi_insuficiencia_educacion": "Insuficiencia en educación",
        "nbi_inadecuada_atencion_salud": "Inadecuada atención en salud",
    }

    pct_cols = {
        "nbi_no_pobre_pct": "Total Población No Pobre",
        "nbi_necesidades_basicas_satisfechas_pct": "Necesidades Básicas Satisfechas",
        "nbi_umbral_pct": "Umbral",
        "nbi_pobre_pct": "Total Población Pobre",
        "nbi_pobre_moderada_pct": "Moderada",
        "nbi_pobre_indigente_pct": "Indigente",
        "nbi_pobre_marginal_pct": "Marginal",
    }

    for out_col, src_col in count_cols.items():
        municipios[out_col] = municipios[src_col].map(parse_int)

    for out_col, src_col in pct_cols.items():
        municipios[out_col] = municipios[src_col].map(parse_pct)

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
                normalize(row.get("departamento_nbi")),
                normalize(row.get("municipio_nbi")),
            )
            equivalencias[key] = str(row.get("codigo_entidad")).strip()

    rows = []

    for _, n in municipios.iterrows():
        candidates = gam[gam["depto_key"].eq(n["depto_key"])].copy()

        manual_key = (n["depto_key"], n["nbi_key"])
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
            exact = candidates[candidates["sigep_key"].eq(n["nbi_key"])]

            if len(exact) == 1:
                s = exact.iloc[0]
                status = "match_exacto"
            elif len(exact) > 1:
                s = exact.iloc[0]
                status = "duplicado_exacto"
            else:
                contains = candidates[
                    candidates["sigep_key"].str.contains(re.escape(n["nbi_key"]), na=False)
                    | pd.Series([n["nbi_key"] in x for x in candidates["sigep_key"]], index=candidates.index)
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

        row = {
            "status": status,
            "departamento_nbi": n["departamento_nbi"],
            "provincia_nbi": n["provincia_nbi"],
            "municipio_nbi": n["municipio_nbi"],
            "nbi_key": n["nbi_key"],
            "codigo_entidad": None if s is None else s.get("codigo_entidad"),
            "nombre_entidad": None if s is None else s.get("nombre_entidad"),
            "departamento_sigep": None if s is None else s.get("departamento"),
            "grupo_eta": None if s is None else s.get("grupo_eta"),
            "tipo": None if s is None else s.get("tipo"),
        }

        for col in list(count_cols.keys()) + list(pct_cols.keys()):
            row[col] = n[col]

        rows.append(row)

    audit = pd.DataFrame(rows)

    matched_codes = set(audit.loc[audit["codigo_entidad"].notna(), "codigo_entidad"].astype(str))
    sigep_no_match = gam[~gam["codigo_entidad"].astype(str).isin(matched_codes)].copy()
    nbi_no_match = audit[audit["status"].eq("sin_match")].copy()
    duplicates = audit[audit["status"].str.contains("duplicado", na=False)].copy()

    audit.to_csv(OUT_BASE, index=False, encoding="utf-8-sig")
    nbi_no_match.to_csv(OUT_NBI_NO_MATCH, index=False, encoding="utf-8-sig")
    sigep_no_match.to_csv(OUT_SIGEP_NO_MATCH, index=False, encoding="utf-8-sig")
    duplicates.to_csv(OUT_DUPLICATES, index=False, encoding="utf-8-sig")

    print("NBI municipal/TIOC total:", len(municipios))
    print("SIGEP GAM/GAIOC candidatos:", len(gam))
    print()
    print(audit["status"].value_counts(dropna=False).to_string())
    print()
    print("NBI sin match:", len(nbi_no_match))
    print("SIGEP GAM/GAIOC sin NBI:", len(sigep_no_match))
    print("Duplicados:", len(duplicates))
    print()
    print("OK:", OUT_BASE)
    print("OK:", OUT_NBI_NO_MATCH)
    print("OK:", OUT_SIGEP_NO_MATCH)
    print("OK:", OUT_DUPLICATES)

    if len(nbi_no_match):
        print("\nNBI sin match muestra:")
        print(nbi_no_match[[
            "departamento_nbi",
            "provincia_nbi",
            "municipio_nbi",
            "nbi_pobre_pct",
        ]].head(40).to_string(index=False))

    if len(sigep_no_match):
        print("\nSIGEP sin NBI muestra:")
        print(sigep_no_match[[
            "codigo_entidad",
            "nombre_entidad",
            "departamento",
            "grupo_eta",
            "tipo",
        ]].head(40).to_string(index=False))


if __name__ == "__main__":
    main()
